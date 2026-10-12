'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { warehouseApi, storeApi, type WmsLevelType } from '../../lib/api';
import { useWmsAlert } from '../../stores/wms-alert';

const SIZE_PRESETS = [
  { key: 'small', label: 'Küçük', width: 40, depth: 40 },
  { key: 'wide',  label: 'Geniş', width: 80, depth: 40 },
  { key: 'deep',  label: 'Derin', width: 40, depth: 80 },
] as const;

interface Props {
  warehouseId: number;
  parentId: number | null;
  levelTypes: WmsLevelType[];
  x: number;
  y: number;
  /** Seçilen boyutun mevcut raflarla çakışıp çakışmadığını kontrol eder — konum
      seçildikten SONRA boyut değişebildiği için tekrar doğrulama gerekir. */
  isFree: (width: number, depth: number) => boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function LocationFormDialog({ warehouseId, parentId, levelTypes, x, y, isFree, onClose, onCreated }: Props) {
  const [code, setCode] = useState('');
  const [levelTypeId, setLevelTypeId] = useState<number | ''>(levelTypes[0]?.id ?? '');
  const [storeId, setStoreId] = useState<number | ''>('');
  const [size, setSize] = useState<typeof SIZE_PRESETS[number]>(SIZE_PRESETS[0]);
  const [saving, setSaving] = useState(false);
  const { data: stores } = useQuery({ queryKey: ['wms-stores'], queryFn: storeApi.list });
  const wmsAlert = useWmsAlert();

  // levelTypes prop, sorgu tamamlanmadan önce boş dizi olarak gelebilir — ilk
  // render'da varsayılan seçilemediği için dialog kalıcı olarak devre dışı
  // kalıyordu. Seviye listesi sonradan dolunca varsayılanı yakala.
  useEffect(() => {
    if (levelTypeId === '' && levelTypes[0]) setLevelTypeId(levelTypes[0].id);
  }, [levelTypes, levelTypeId]);

  async function handleSave() {
    if (!code.trim() || levelTypeId === '') return;
    if (!isFree(size.width, size.depth)) {
      wmsAlert.show('Bu boyut seçili konumda başka bir rafla çakışıyor, daha küçük bir boyut dene.');
      return;
    }
    setSaving(true);
    try {
      const location = await warehouseApi.createLocation(warehouseId, {
        warehouseId, parentId, levelTypeId: Number(levelTypeId), code: code.trim(),
        storeId: storeId === '' ? null : Number(storeId),
      });
      await warehouseApi.upsertGeometry(location.id, { x, y, z: 0, width: size.width, depth: size.depth, height: 60, rotationDeg: 0 });
      onCreated();
      onClose();
    } catch (err) {
      console.error('Lokasyon oluşturulamadı:', err);
      wmsAlert.show('Lokasyon eklenemedi, tekrar deneyin.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div style={{ background: 'var(--card)', borderRadius: 12, padding: 20, width: 320, boxShadow: 'var(--shadow-lg)' }}>
        <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, color: 'var(--fg)' }}>Yeni Lokasyon</p>
        <label style={{ fontSize: 11.5, color: 'var(--fg-muted)' }}>Kod</label>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="ör. A"
          style={{ width: '100%', height: 36, borderRadius: 8, border: '1px solid var(--border-soft)', padding: '0 10px', marginTop: 4, marginBottom: 12, background: 'var(--bg)', color: 'var(--fg)' }}
        />
        <label style={{ fontSize: 11.5, color: 'var(--fg-muted)' }}>Boyut</label>
        <div style={{ display: 'flex', gap: 6, marginTop: 4, marginBottom: 12 }}>
          {SIZE_PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setSize(p)}
              style={{
                flex: 1, height: 34, borderRadius: 8, fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
                border: `1px solid ${size.key === p.key ? 'var(--accent)' : 'var(--border-soft)'}`,
                background: size.key === p.key ? 'var(--accent-soft)' : 'var(--bg)',
                color: size.key === p.key ? 'var(--accent)' : 'var(--fg-muted)',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
        <label style={{ fontSize: 11.5, color: 'var(--fg-muted)' }}>Seviye Tipi</label>
        <select
          value={levelTypeId}
          onChange={(e) => setLevelTypeId(Number(e.target.value))}
          style={{ width: '100%', height: 36, borderRadius: 8, border: '1px solid var(--border-soft)', padding: '0 10px', marginTop: 4, marginBottom: 12, background: 'var(--bg)', color: 'var(--fg)' }}
        >
          {levelTypes.map((lt) => <option key={lt.id} value={lt.id}>{lt.name}</option>)}
        </select>
        <label style={{ fontSize: 11.5, color: 'var(--fg-muted)' }}>Mağaza (opsiyonel)</label>
        <select
          value={storeId}
          onChange={(e) => setStoreId(e.target.value === '' ? '' : Number(e.target.value))}
          style={{ width: '100%', height: 36, borderRadius: 8, border: '1px solid var(--border-soft)', padding: '0 10px', marginTop: 4, marginBottom: 16, background: 'var(--bg)', color: 'var(--fg)' }}
        >
          <option value="">Ortak (tüm mağazalar)</option>
          {stores?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        {!isFree(size.width, size.depth) && (
          <p style={{ fontSize: 11.5, color: '#dc2626', marginBottom: 10 }}>Bu boyut başka bir öğeyle çakışıyor.</p>
        )}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border-soft)', background: 'transparent', color: 'var(--fg-muted)', fontSize: 12.5, cursor: 'pointer' }}>İptal</button>
          <button
            onClick={handleSave}
            disabled={saving || !code.trim() || levelTypeId === '' || !isFree(size.width, size.depth)}
            style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}
          >
            {saving ? 'Kaydediliyor...' : 'Ekle'}
          </button>
        </div>
      </div>
    </div>
  );
}
