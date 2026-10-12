'use client';

import { useEffect, useState } from 'react';
import { Save, Settings } from 'lucide-react';
import type { BaseTrackSettings } from '@/lib/api';
import { useBaseTrackSettings, useUpdateBaseTrackSettings } from '@/hooks/basetrack/useBaseTrack';
import { useFeedback } from '../shared/Feedback';

export function SettingsTab() {
  const { data, isLoading } = useBaseTrackSettings();
  const update = useUpdateBaseTrackSettings();
  const [form, setForm] = useState<BaseTrackSettings | null>(null);
  const { notify } = useFeedback();

  useEffect(() => {
    if (data && form === null) setForm(data);
  }, [data, form]);

  if (isLoading || form === null) {
    return <div className="p-8 text-center text-xs text-[var(--fg-muted)]">Ayarlar yükleniyor...</div>;
  }

  const setNum = (key: keyof BaseTrackSettings) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [key]: Number.parseInt(e.target.value, 10) || 0 });

  const save = () => {
    update.mutate(form, {
      onSuccess: (saved) => {
        setForm(saved);
        notify.success('Ayarlar kaydedildi.');
      },
      onError: (e) => notify.error((e as Error).message),
    });
  };

  return (
    <div className="w-full flex-1 p-4 sm:p-5 flex flex-col gap-4 text-xs max-w-2xl">
      <div data-tour="basetrack-settings-header">
        <div className="flex items-center gap-2">
          <Settings size={16} className="text-[var(--fg-muted)]" />
          <h2 className="text-sm font-bold text-[var(--fg)]">BaseTrack Parametre Ayarları</h2>
        </div>
        <p className="text-[11px] text-[var(--fg-muted)] mt-0.5">
          Sevkiyat süresi, risk eşikleri ve ara depo etiketini yapılandırın.
        </p>
      </div>

      <div data-tour="basetrack-settings-form" className="p-4 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] shadow-xs space-y-4">
        <div>
          <label className="block font-bold text-xs text-[var(--fg)]">Transit / Sevkiyat Süresi (Gün)</label>
          <p className="text-[11px] text-[var(--fg-muted)] mb-1.5">TR depodan UK depoya ortalama varış süresi.</p>
          <input
            type="number"
            value={form.transitDays}
            onChange={setNum('transitDays')}
            className="h-8 w-40 rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] font-mono outline-none focus:border-[var(--fg)]"
          />
        </div>

        <div className="space-y-3 border-t border-[var(--border-soft)] pt-4">
          <div>
            <label className="block font-bold text-xs text-[var(--fg)]">Kırmızı Risk Eşiği (%)</label>
            <p className="text-[11px] text-[var(--fg-muted)] mb-1.5">Tükenme riski bu yüzdenin üzerine çıktığında Kritik seviye atanır.</p>
            <input
              type="number"
              value={form.redRiskPct}
              onChange={setNum('redRiskPct')}
              className="h-8 w-40 rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] font-mono outline-none focus:border-[var(--fg)]"
            />
          </div>

          <div>
            <label className="block font-bold text-xs text-[var(--fg)]">Turuncu Uyarı Eşiği (%)</label>
            <p className="text-[11px] text-[var(--fg-muted)] mb-1.5">Tükenme riski bu yüzdenin üzerine çıktığında Uyarı seviyesi atanır.</p>
            <input
              type="number"
              value={form.orangeRiskPct}
              onChange={setNum('orangeRiskPct')}
              className="h-8 w-40 rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] font-mono outline-none focus:border-[var(--fg)]"
            />
          </div>

          <div>
            <label className="block font-bold text-xs text-[var(--fg)]">Sarı Takip Eşiği (%)</label>
            <p className="text-[11px] text-[var(--fg-muted)] mb-1.5">Tükenme riski bu yüzdenin üzerine çıktığında Takip seviyesi atanır.</p>
            <input
              type="number"
              value={form.yellowRiskPct}
              onChange={setNum('yellowRiskPct')}
              className="h-8 w-40 rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] font-mono outline-none focus:border-[var(--fg)]"
            />
          </div>
        </div>

        <div className="border-t border-[var(--border-soft)] pt-4">
          <label className="block font-bold text-xs text-[var(--fg)]">Ara Depo Etiketi</label>
          <p className="text-[11px] text-[var(--fg-muted)] mb-1.5">Sekme ve sütun başlıklarında görünecek ara depo adı.</p>
          <input
            type="text"
            value={form.depotLabel}
            onChange={(e) => setForm({ ...form, depotLabel: e.target.value })}
            className="h-8 w-56 rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] outline-none focus:border-[var(--fg)]"
          />
        </div>

        <div className="pt-2 border-t border-[var(--border-soft)] flex justify-end">
          <button
            type="button"
            onClick={save}
            disabled={update.isPending}
            className="h-8 px-4 rounded-[4px] bg-[var(--fg)] text-xs font-bold text-[var(--bg)] shadow-xs hover:opacity-90 transition cursor-pointer disabled:opacity-40 flex items-center gap-1.5"
          >
            <Save size={13} />
            <span>{update.isPending ? 'Kaydediliyor...' : 'Kaydet'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
