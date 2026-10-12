'use client';

import { useEffect, useState } from 'react';
import { Save, Settings } from 'lucide-react';
import type { SentosTrackSettings } from '@/lib/api/sentostrack';
import { useSentosTrackSettings, useUpdateSentosTrackSettings } from '@/hooks/sentostrack/useSentosTrack';
import { useFeedback } from '../shared/Feedback';
import { StoreSelector } from './shared';

export function SettingsTab() {
  const [store, setStore] = useState('storea');
  const { data } = useSentosTrackSettings(store);
  const update = useUpdateSentosTrackSettings(store);
  const [form, setForm] = useState<SentosTrackSettings | null>(null);
  const { notify } = useFeedback();

  useEffect(() => {
    setForm(null);
  }, [store]);

  useEffect(() => {
    if (data && form === null) setForm(data);
  }, [data, form]);

  const setNum = (key: keyof SentosTrackSettings) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => (f ? { ...f, [key]: Number.parseInt(e.target.value, 10) || 0 } : f));

  const save = () => {
    if (!form) return;
    update.mutate(form, {
      onSuccess: (saved) => {
        setForm(saved);
        notify.success('Eşik ayarları kaydedildi.');
      },
      onError: (e) => notify.error((e as Error).message),
    });
  };

  return (
    <div className="w-full flex-1 p-4 sm:p-5 flex flex-col gap-4 text-xs max-w-2xl">
      <div data-tour="sentostrack-settings-header">
        <div className="flex items-center gap-2">
          <Settings size={16} className="text-[var(--fg-muted)]" />
          <h2 className="text-sm font-bold text-[var(--fg)]">SentosTrack Eşik Ayarları</h2>
        </div>
        <p className="text-[11px] text-[var(--fg-muted)] mt-0.5">
          Mağaza bazlı kritik ve uyarı stok eşiklerini yapılandırın.
        </p>
      </div>

      <div data-tour="sentostrack-settings-form" className="p-4 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] shadow-xs space-y-4">
        <div>
          <label className="block text-[11px] font-semibold text-[var(--fg-muted)] mb-1.5 uppercase tracking-wider">
            Ayarlanacak Mağaza
          </label>
          <StoreSelector value={store} onChange={setStore} />
        </div>

        <div className="space-y-3 border-t border-[var(--border-soft)] pt-4">
          <div>
            <label className="block font-bold text-xs text-[var(--fg)]">Turuncu Uyarı Eşiği (Adet)</label>
            <p className="text-[11px] text-[var(--fg-muted)] mb-1.5">Kalan stok bu adedin altına düştüğünde Turuncu uyarı verir.</p>
            <input
              type="number"
              value={form?.orangeThreshold ?? ''}
              onChange={setNum('orangeThreshold')}
              className="h-8 w-40 rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] font-mono outline-none focus:border-[var(--fg)]"
            />
          </div>

          <div>
            <label className="block font-bold text-xs text-[var(--fg)]">Sarı Dikkat Eşiği (Adet)</label>
            <p className="text-[11px] text-[var(--fg-muted)] mb-1.5">Kalan stok bu adedin altına düştüğünde Sarı dikkat seviyesine geçer.</p>
            <input
              type="number"
              value={form?.yellowThreshold ?? ''}
              onChange={setNum('yellowThreshold')}
              className="h-8 w-40 rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] font-mono outline-none focus:border-[var(--fg)]"
            />
          </div>

          <div>
            <label className="block font-bold text-xs text-[var(--fg)]">Tükenme Riski Eşiği (Gün)</label>
            <p className="text-[11px] text-[var(--fg-muted)] mb-1.5">Günlük satış hızına göre stok tükenme süresi bu günden azsa tükenme riski işaretlenir.</p>
            <input
              type="number"
              value={form?.depletionDaysThreshold ?? ''}
              onChange={setNum('depletionDaysThreshold')}
              className="h-8 w-40 rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] font-mono outline-none focus:border-[var(--fg)]"
            />
          </div>
        </div>

        <div className="pt-2 border-t border-[var(--border-soft)] flex justify-end">
          <button
            type="button"
            onClick={save}
            disabled={!form || update.isPending}
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
