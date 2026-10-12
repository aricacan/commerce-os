'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Handshake, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import {
  purchaseMatchingApi,
  MATCH_STATUS_LABEL,
  type PurchaseMatchingResult,
} from '../../../../lib/api/e-belge';
import { InvoicingSubTabBar } from '../../../../components/layout/InvoicingSubTabBar';
import { toast } from '../../../../lib/toast';
import { describeError } from '../../../../lib/errors';
import { useI18n } from '../../../../lib/i18n';

function fmt(n: number) {
  return n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const STATUS_TONE: Record<string, string> = {
  Matched: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  PartialMatch: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  Disputed: 'border-red-500/40 bg-red-500/10 text-red-300',
  Unmatched: 'border-[var(--border-soft)] bg-[var(--bg-subtle)] text-[var(--fg-muted)]',
};

export default function PurchaseMatchingPage() {
  const { lang } = useI18n();
  const tr = lang === 'tr';

  const [invoiceId, setInvoiceId] = useState('');
  const [purchaseOrderId, setPurchaseOrderId] = useState('');
  const [result, setResult] = useState<PurchaseMatchingResult | null>(null);

  const runMatch = useMutation({
    mutationFn: () => purchaseMatchingApi.match(Number(invoiceId), purchaseOrderId ? Number(purchaseOrderId) : undefined),
    onSuccess: (r) => {
      setResult(r);
      if (r.isMatched) toast.success(tr ? 'Fatura ve sipariş tam eşleşti.' : 'Fully matched.');
      else toast.error(tr ? `${r.discrepancies.length} uyumsuzluk bulundu.` : `${r.discrepancies.length} discrepancies.`);
    },
    onError: (e) => toast.error(describeError(e)),
  });

  return (
    <div className="flex h-full flex-col overflow-hidden bg-transparent">
      <InvoicingSubTabBar />

      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h1 className="text-base font-bold text-[var(--fg)] tracking-tight">
              {tr ? '3-Yönlü Eşleştirme' : '3-Way Matching'}
            </h1>
            <p className="text-xs text-[var(--fg-muted)] mt-0.5">
              {tr
                ? 'Tedarikçi faturası ↔ satın alma siparişi ↔ mal kabul miktarı karşılaştırması.'
                : 'Supplier invoice ↔ purchase order ↔ received quantity comparison.'}
            </p>
          </div>

          <form
            className="flex items-end gap-2 flex-wrap"
            onSubmit={(e) => { e.preventDefault(); runMatch.mutate(); }}
          >
            <label className="flex flex-col gap-1">
              <span className="text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase tracking-wide">
                {tr ? 'Fatura ID' : 'Invoice ID'}
              </span>
              <input
                value={invoiceId}
                onChange={(e) => setInvoiceId(e.target.value.replace(/\D/g, ''))}
                inputMode="numeric"
                required
                className="h-8 w-28 rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2 text-xs tabular-nums text-[var(--fg)] focus:outline-none focus:border-[var(--fg-muted)]"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase tracking-wide">
                {tr ? 'Sipariş ID (ops.)' : 'PO ID (opt.)'}
              </span>
              <input
                value={purchaseOrderId}
                onChange={(e) => setPurchaseOrderId(e.target.value.replace(/\D/g, ''))}
                inputMode="numeric"
                className="h-8 w-28 rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2 text-xs tabular-nums text-[var(--fg)] focus:outline-none focus:border-[var(--fg-muted)]"
              />
            </label>
            <button
              type="submit"
              disabled={!invoiceId || runMatch.isPending}
              className="inline-flex h-8 items-center gap-1.5 rounded-[4px] bg-[var(--fg)] px-3 text-xs font-bold text-[var(--bg)] transition cursor-pointer disabled:opacity-40"
            >
              <Handshake size={13} />
              <span>{tr ? 'Eşleştir' : 'Match'}</span>
            </button>
          </form>
        </div>

        {!result && (
          <div className="flex items-start gap-2 rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] px-3 py-2.5">
            <Info size={14} className="text-[var(--fg-muted)] mt-0.5 shrink-0" />
            <p className="text-[11px] text-[var(--fg-muted)] leading-relaxed">
              {tr
                ? 'Sipariş ID boş bırakılırsa, faturanın tedarikçisine ait eşleşmemiş en güncel sipariş otomatik seçilir. Tedarikçisi atanmamış faturada otomatik seçim yapılmaz.'
                : 'Leave PO ID empty to auto-select the supplier’s most recent unmatched order.'}
            </p>
          </div>
        )}

        {result && (
          <>
            <div className={`flex items-start gap-2 rounded-[4px] border px-3 py-2.5 ${STATUS_TONE[result.matchStatus]}`}>
              {result.isMatched
                ? <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
                : <AlertTriangle size={14} className="mt-0.5 shrink-0" />}
              <div>
                <div className="text-xs font-bold">
                  {MATCH_STATUS_LABEL[result.matchStatus]} — {result.invoiceNumber} ↔ {result.orderNumber}
                </div>
                <p className="text-[11px] opacity-90 mt-0.5">
                  {tr
                    ? `Fatura ${fmt(result.invoiceTotal)} ₺ · Sipariş ${fmt(result.orderTotal)} ₺ · Fark ${fmt(result.totalDifference)} ₺`
                    : `Invoice ${fmt(result.invoiceTotal)} · Order ${fmt(result.orderTotal)} · Diff ${fmt(result.totalDifference)}`}
                </p>
              </div>
            </div>

            {result.discrepancies.length > 0 && (
              <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] overflow-hidden shadow-xs">
                <div className="border-b border-[var(--border-soft)] px-3 py-2">
                  <h2 className="text-xs font-bold text-[var(--fg)]">
                    {tr ? `Uyumsuzluklar (${result.discrepancies.length})` : `Discrepancies (${result.discrepancies.length})`}
                  </h2>
                </div>
                <ul className="divide-y divide-[var(--border-soft)]">
                  {result.discrepancies.map((d, i) => (
                    <li key={i} className="px-3 py-2 text-[11px] text-[var(--fg-muted)] leading-relaxed">{d}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] overflow-hidden shadow-xs">
              <div className="border-b border-[var(--border-soft)] px-3 py-2">
                <h2 className="text-xs font-bold text-[var(--fg)]">{tr ? 'Satır Karşılaştırması' : 'Line Comparison'}</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[var(--border-soft)] text-[var(--fg-muted)]">
                      <th className="px-3 py-2 text-left font-semibold">{tr ? 'Kalem' : 'Item'}</th>
                      <th className="px-3 py-2 text-right font-semibold">{tr ? 'Sipariş Mik.' : 'PO Qty'}</th>
                      <th className="px-3 py-2 text-right font-semibold">{tr ? 'Fatura Mik.' : 'Inv Qty'}</th>
                      <th className="px-3 py-2 text-right font-semibold">{tr ? 'Sipariş Fiyat' : 'PO Price'}</th>
                      <th className="px-3 py-2 text-right font-semibold">{tr ? 'Fatura Fiyat' : 'Inv Price'}</th>
                      <th className="px-3 py-2 text-right font-semibold">{tr ? 'Fark %' : 'Diff %'}</th>
                      <th className="px-3 py-2 text-left font-semibold">{tr ? 'Sonuç' : 'Result'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.lineMatches.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-3 py-6 text-center text-[var(--fg-muted)]">
                          {tr ? 'Satır detayı yok.' : 'No line detail.'}
                        </td>
                      </tr>
                    ) : (
                      result.lineMatches.map((l, i) => {
                        const hasIssue = l.hasPriceDifference || l.hasQuantityDifference;
                        return (
                          <tr key={i} className={`border-b border-[var(--border-soft)] last:border-0 ${hasIssue ? 'bg-red-500/5' : ''}`}>
                            <td className="px-3 py-2 text-[var(--fg)]">{l.description}</td>
                            <td className="px-3 py-2 text-right tabular-nums text-[var(--fg-muted)]">{l.poQuantity}</td>
                            <td className={`px-3 py-2 text-right tabular-nums ${l.hasQuantityDifference ? 'text-red-400 font-bold' : 'text-[var(--fg)]'}`}>
                              {l.invoiceQuantity}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums text-[var(--fg-muted)]">{fmt(l.poUnitPrice)}</td>
                            <td className={`px-3 py-2 text-right tabular-nums ${l.hasPriceDifference ? 'text-red-400 font-bold' : 'text-[var(--fg)]'}`}>
                              {fmt(l.invoiceUnitPrice)}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums text-[var(--fg-muted)]">
                              %{l.priceDifferencePercent.toFixed(1)}
                            </td>
                            <td className="px-3 py-2 text-[var(--fg-muted)]">{l.notes ?? '—'}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] px-3 py-2.5">
              <Info size={14} className="text-[var(--fg-muted)] mt-0.5 shrink-0" />
              <p className="text-[11px] text-[var(--fg-muted)] leading-relaxed">
                {tr
                  ? 'Miktar karşılaştırması mal kabul edilen miktarı esas alır (yoksa sipariş miktarı). Birim fiyatta ±%2 tolerans uygulanır. Satırlar ürün/hammadde adına göre eşleştirilir; eşleşmeyen satırlar ayrıca listelenir.'
                  : 'Quantities use received amounts; ±2% price tolerance applies.'}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
