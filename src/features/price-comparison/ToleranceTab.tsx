'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, Check } from 'lucide-react';
import { useMobile } from '../../hooks/useMobile';
import { categoryPriceApi } from '../../lib/api';

export function ToleranceTab() {
  const qc = useQueryClient();
  const isMobile = useMobile();
  const [lower, setLower] = useState('');
  const [upper, setUpper] = useState('');
  const [saved, setSaved] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['category-price-tolerance'],
    queryFn: () => categoryPriceApi.tolerance(),
    staleTime: 60_000,
  });

  useEffect(() => {
    if (data) {
      setLower(String(data.lowerPct));
      setUpper(String(data.upperPct));
    }
  }, [data]);

  const saveMutation = useMutation({
    meta: { successMessage: 'Tolerans kaydedildi' } as const,
    mutationFn: () =>
      categoryPriceApi.setTolerance({
        lowerPct: parseFloat(lower.replace(',', '.')) || 0,
        upperPct: parseFloat(upper.replace(',', '.')) || 0,
      }),
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
      qc.invalidateQueries({ queryKey: ['category-price-tolerance'] });
      qc.invalidateQueries({ queryKey: ['category-price-compare'] });
    },
  });

  const valid =
    !isNaN(parseFloat(lower.replace(',', '.'))) &&
    !isNaN(parseFloat(upper.replace(',', '.'))) &&
    parseFloat(lower.replace(',', '.')) >= 0 &&
    parseFloat(upper.replace(',', '.')) >= 0;

  if (isLoading) return <div className="p-4 text-center text-xs text-[var(--fg-muted)]">Yükleniyor…</div>;
  if (isError) return <div className="p-4 text-center text-xs text-rose-500/85">Veriler yüklenemedi.</div>;

  return (
    <div className={`flex w-full flex-col gap-3 p-3 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] ${isMobile ? 'items-center text-center' : 'items-start text-left'}`}>
      <p className="m-0 text-xs text-[var(--fg-muted)]">
        Gözlemlenen ortalama fiyat, hedef fiyattan bu yüzdelerden fazla saparsa uyarı verilir.
      </p>

      <div className="flex flex-wrap gap-4 w-full">
        <ToleranceField label="Alt sınır toleransı" hint="Fiyat hedefin bu kadar altına inerse uyarılır" value={lower} onChange={setLower} />
        <ToleranceField label="Üst sınır toleransı" hint="Fiyat hedefin bu kadar üstüne çıkarsa uyarılır" value={upper} onChange={setUpper} />
      </div>

      <button
        type="button"
        onClick={() => saveMutation.mutate()}
        disabled={!valid || saveMutation.isPending}
        className={`inline-flex h-8 items-center gap-1.5 rounded-[4px] px-3.5 text-xs font-bold transition ${
          saved
            ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
            : valid
            ? 'border border-[var(--fg)]/40 bg-[var(--bg-subtle)] text-[var(--fg)] hover:bg-[var(--card)]'
            : 'border border-[var(--border-soft)] bg-[var(--bg-subtle)] text-[var(--fg-muted)] cursor-not-allowed'
        }`}
      >
        {saved ? <Check size={13} /> : <Save size={13} />}
        <span>{saved ? 'Kaydedildi' : 'Toleransı Kaydet'}</span>
      </button>
    </div>
  );
}

function ToleranceField({ label, hint, value, onChange }: { label: string; hint: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-1 min-w-[180px]">
      <span className="text-xs font-bold text-[var(--fg)]">{label}</span>
      <div className="relative w-36">
        <input
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-full rounded-[4px] border border-[var(--border)] bg-[var(--card)] pl-2.5 pr-6 text-xs font-bold text-[var(--fg)] outline-none focus:border-[var(--fg)]"
        />
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[var(--fg-muted)]">%</span>
      </div>
      <span className="text-[11px] text-[var(--fg-muted)]">{hint}</span>
    </div>
  );
}
