'use client';

// Preset çubuğu: tedarikçi başına maske + çerçeve + ayarları isimle kaydet/yükle.
// Aynı tedarikçiden yeni ürün geldiğinde tüm kurulum tek tıkla geri gelir.

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BookmarkPlus, Loader2, Trash2 } from 'lucide-react';
import { photoStudioApi, type StudioPreset } from '../../lib/api';
import { btnGhost, icon, input as inputStyle, select as selectStyle, errorText } from '../shared/design';

interface PresetBarProps {
  /** Kaydedilecek anlık durum yoksa (maske çizilmemişse) null döner. */
  buildSnapshot: () => { mask: string; options: string; frame: File | null } | null;
  onLoad: (preset: StudioPreset, frame: File | null) => void;
}

export function PresetBar({ buildSnapshot, onLoad }: PresetBarProps) {
  const queryClient = useQueryClient();
  const presetsQueryKey = ['photo-studio', 'presets'] as const;
  const [selectedId, setSelectedId] = useState<number | ''>('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState<'save' | 'load' | 'delete' | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Liste yüklenemezse çubuk boş kalır; stüdyo akışının geri kalanı çalışmaya devam eder.
  const { data: presets = [] } = useQuery({
    queryKey: presetsQueryKey,
    queryFn: photoStudioApi.getPresets,
    staleTime: 60_000,
  });

  const load = async (id: number) => {
    const preset = presets.find((p) => p.id === id);
    if (!preset) return;
    setBusy('load');
    setError(null);
    try {
      let frame: File | null = null;
      if (preset.hasFrame) {
        const blob = await photoStudioApi.getPresetFrame(id);
        frame = new File([blob], `${preset.name}-cerceve`, { type: blob.type });
      }
      onLoad(preset, frame);
      setName(preset.name); // aynı isimle kaydet = güncelle akışını hazırla
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Preset yüklenemedi');
    } finally {
      setBusy(null);
    }
  };

  const save = async () => {
    const snapshot = buildSnapshot();
    if (!snapshot) { setError('Kaydetmek için önce maske çiz.'); return; }
    if (!name.trim()) { setError('Preset adı gir (örn. tedarikçi adı).'); return; }
    setBusy('save');
    setError(null);
    try {
      await photoStudioApi.savePreset(
        name.trim(),
        JSON.parse(snapshot.mask).polygons,
        JSON.parse(snapshot.options),
        snapshot.frame,
      );
      await queryClient.invalidateQueries({ queryKey: presetsQueryKey });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Preset kaydedilemedi');
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    if (selectedId === '') return;
    setBusy('delete');
    setError(null);
    try {
      await photoStudioApi.deletePreset(selectedId);
      setSelectedId('');
      await queryClient.invalidateQueries({ queryKey: presetsQueryKey });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Preset silinemedi');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
      <select
        value={selectedId}
        style={{ ...selectStyle, width: 190, height: 38 }}
        disabled={busy !== null}
        title="Kayıtlı tedarikçi preset'ini yükle (maske + çerçeve + ayarlar)"
        onChange={(e) => {
          const id = e.target.value === '' ? '' : Number(e.target.value);
          setSelectedId(id);
          if (id !== '') load(id);
        }}
      >
        <option value="">Preset seç…</option>
        {presets.map((p) => <option key={p.id} value={p.id}>{p.name}{p.hasFrame ? ' 🖼' : ''}</option>)}
      </select>
      {selectedId !== '' && (
        <button type="button" style={{ ...btnGhost, height: 38 }} onClick={remove} disabled={busy !== null} title="Seçili preset'i sil">
          {busy === 'delete' ? <Loader2 size={icon.md} strokeWidth={icon.stroke} className="animate-spin" /> : <Trash2 size={icon.md} strokeWidth={icon.stroke} />}
        </button>
      )}
      <input
        value={name}
        placeholder="Preset adı"
        style={{ ...inputStyle, width: 170, height: 38 }}
        onChange={(e) => setName(e.target.value)}
      />
      <button
        type="button"
        style={{ ...btnGhost, height: 38 }}
        onClick={save}
        disabled={busy !== null}
        title="Mevcut maske + çerçeve + ayarları bu isimle kaydet (aynı isim = güncelle)"
      >
        {busy === 'save' ? <Loader2 size={icon.md} strokeWidth={icon.stroke} className="animate-spin" /> : <BookmarkPlus size={icon.md} strokeWidth={icon.stroke} />}
        Kaydet
      </button>
      {error && <p style={{ ...errorText, margin: 0, fontSize: 12, width: '100%', textAlign: 'right' }}>{error}</p>}
    </div>
  );
}
