'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { AlertCircle, Loader2, Search } from 'lucide-react';
import { shippingPoliciesApi } from '../../../lib/api/shipping-policies';
import { COST_ORIGIN_LABELS, ZONE_LABELS } from '../../../lib/shipping-labels';
import { SectionCard } from './ui';

const tryFormat = (value: number) =>
  `₺${value.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// "Test et": bir siparişin kargosunun hangi kuralla ve bölgeyle hesaplandığı. KAYDEDİLMİŞ
// ayarları kullanır, taslağı değil.
export function QuotePreviewSection() {
  const [orderNumber, setOrderNumber] = useState('');
  const preview = useMutation({ mutationFn: (number: string) => shippingPoliciesApi.preview(number) });
  const result = preview.data;

  const submit = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (orderNumber.trim()) preview.mutate(orderNumber.trim());
  };

  return (
    <SectionCard tour="shipping-test" title="Test et" description="Sipariş numarasını girin; kaydedilmiş ayarlarla kargonun nasıl hesaplandığını görün.">
      <form onSubmit={submit} className="flex gap-2">
        <input
          value={orderNumber}
          onChange={(e) => setOrderNumber(e.target.value)}
          placeholder="Sipariş no"
          aria-label="Sipariş numarası"
          className="h-9 min-w-0 flex-1 rounded-[6px] border border-[var(--border)] bg-[var(--bg)] px-2.5 font-mono text-xs text-[var(--fg)] outline-none focus:border-[var(--fg)]"
        />
        <button
          type="submit"
          disabled={preview.isPending || !orderNumber.trim()}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-[6px] border border-[var(--border)] px-3 text-xs font-semibold text-[var(--fg)] transition hover:bg-[var(--bg-subtle)] disabled:opacity-40 cursor-pointer"
        >
          {preview.isPending ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
          Hesapla
        </button>
      </form>

      {preview.isError && (
        <div className="flex items-center gap-1.5 rounded-[6px] bg-rose-500/10 p-2.5 text-xs text-rose-500">
          <AlertCircle size={13} className="shrink-0" />
          <span>{preview.error instanceof Error ? preview.error.message : 'Sipariş bulunamadı.'}</span>
        </div>
      )}

      {result && (
        <div className="flex flex-col gap-3 text-xs">
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-semibold text-[var(--fg)]">#{result.orderNumber}</span>
            <span className={`font-mono text-sm font-bold ${result.isKnown ? 'text-[var(--fg)]' : 'text-amber-500'}`}>
              {result.isKnown ? tryFormat(result.totalTry) : 'Hesaplanamadı'}
            </span>
          </div>
          <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-[11.5px]">
            <dt className="text-[var(--fg-muted)]">Tarih</dt>
            <dd className="m-0 text-right text-[var(--fg)]">{new Date(result.orderDate).toLocaleDateString('tr-TR')}</dd>
            <dt className="text-[var(--fg-muted)]">Kaynak</dt>
            <dd className="m-0 text-right font-semibold text-[var(--fg)]">{COST_ORIGIN_LABELS[result.origin]}</dd>
            <dt className="text-[var(--fg-muted)]">Ayar</dt>
            <dd className="m-0 text-right text-[var(--fg)]">{result.policyScope ?? 'Yok (yalnızca desi tarifesi)'}</dd>
            {result.zone && (
              <>
                <dt className="text-[var(--fg-muted)]">Bölge</dt>
                <dd className="m-0 text-right text-[var(--fg)]">
                  {ZONE_LABELS[result.zone] ?? result.zone}
                  {result.postcode && <span className="ml-1 font-mono text-[var(--fg-muted)]">{result.postcode}</span>}
                </dd>
              </>
            )}
          </dl>
          <ul className="m-0 flex list-none flex-col divide-y divide-[var(--border-soft)] rounded-[6px] border border-[var(--border-soft)] p-0">
            {result.lines.map((line, index) => (
              <li key={`${line.sku ?? 'line'}-${index}`} className="flex items-center justify-between gap-2 px-3 py-2">
                <div className="flex min-w-0 flex-col">
                  <span className="truncate font-semibold text-[var(--fg)]">{line.quantity} × {line.productName}</span>
                  <span className="truncate text-[10.5px] text-[var(--fg-muted)]">
                    {[line.sku, line.categoryName, line.desi > 0 ? `${line.desi} desi` : null].filter(Boolean).join(' · ')}
                  </span>
                </div>
                <span className={`shrink-0 font-mono ${line.isKnown ? 'text-[var(--fg)]' : 'text-amber-500'}`}>
                  {line.isKnown ? tryFormat(line.costTry) : 'Eksik'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </SectionCard>
  );
}
