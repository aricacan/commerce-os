'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, Info, Link2 } from 'lucide-react';
import {
  marketplaceReconciliationApi,
  type ReconciliationStatus,
} from '../../../../lib/api/e-belge';
import { PeriodSelector } from '../../../../features/accounting/PeriodSelector';
import { AccountingSubTabBar } from '../../../../components/layout/AccountingSubTabBar';
import { toast } from '../../../../lib/toast';
import { describeError } from '../../../../lib/errors';
import { useI18n } from '../../../../lib/i18n';

function fmt(n: number) {
  return n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const STATUS_STYLE: Record<ReconciliationStatus, { cls: string; tr: string; en: string }> = {
  NoSettlementData: { cls: 'border-amber-500/40 bg-amber-500/10 text-amber-300', tr: 'Finans Verisi Yok', en: 'No Settlement Data' },
  PendingInvoice: { cls: 'border-sky-500/40 bg-sky-500/10 text-sky-300', tr: 'Fatura Bekleniyor', en: 'Pending Invoice' },
  FullyReconciled: { cls: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300', tr: 'Tam Mutabık', en: 'Reconciled' },
  DiscrepancyDetected: { cls: 'border-red-500/40 bg-red-500/10 text-red-300', tr: 'Uyuşmazlık', en: 'Discrepancy' },
};

export default function MarketplaceReconciliationPage() {
  const qc = useQueryClient();
  const { lang } = useI18n();
  const tr = lang === 'tr';

  const now = new Date();
  const [period, setPeriod] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 });
  const [invoiceId, setInvoiceId] = useState('');

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['marketplace-reconciliation', period.year, period.month],
    queryFn: () => marketplaceReconciliationApi.summary(period.year, period.month),
    staleTime: 10_000,
  });

  const matchInvoice = useMutation({
    mutationFn: () =>
      marketplaceReconciliationApi.matchInvoice({
        invoiceId: Number(invoiceId),
        storeId: null,
        year: period.year,
        month: period.month,
      }),
    onSuccess: (result) => {
      if (result.isMatched) toast.success(result.message);
      else toast.error(result.message);
      setInvoiceId('');
      void qc.invalidateQueries({ queryKey: ['marketplace-reconciliation'] });
    },
    onError: (e) => toast.error(describeError(e)),
  });

  const status = data ? STATUS_STYLE[data.status] : null;
  const canMatch = data?.status !== 'NoSettlementData';

  return (
    <div className="flex h-full flex-col overflow-hidden bg-transparent">
      <AccountingSubTabBar />

      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div data-tour="recon-header">
            <h1 className="text-base font-bold text-[var(--fg)] tracking-tight">
              {tr ? 'Pazaryeri Mutabakatı' : 'Marketplace Reconciliation'}
            </h1>
            <p className="text-xs text-[var(--fg-muted)] mt-0.5">
              {tr
                ? 'Pazaryeri hakediş dökümündeki komisyon kesintileri ile gelen komisyon faturasının karşılaştırması.'
                : 'Compares commission deductions from settlement data with the incoming commission invoice.'}
            </p>
          </div>

          <div data-tour="recon-period">
            <PeriodSelector
              year={period.year}
              month={period.month}
              onChange={(year, month) => setPeriod({ year, month })}
              tr={tr}
            />
          </div>
        </div>

        {isError && (
          <div className="flex items-start gap-2 rounded-[4px] border border-red-500/30 bg-red-500/10 px-3 py-2.5">
            <AlertTriangle size={14} className="text-red-400 mt-0.5 shrink-0" />
            <p className="text-xs text-red-300">{describeError(error)}</p>
          </div>
        )}

        {isLoading && <p className="text-xs text-[var(--fg-muted)]">{tr ? 'Yükleniyor…' : 'Loading…'}</p>}

        {data && status && (
          <>
            <div className={`inline-flex items-center gap-2 rounded-[4px] border px-3 py-1.5 ${status.cls}`}>
              {data.status === 'FullyReconciled'
                ? <CheckCircle2 size={13} className="shrink-0" />
                : <AlertTriangle size={13} className="shrink-0" />}
              <span className="text-xs font-semibold">{tr ? status.tr : status.en}</span>
            </div>

            <div data-tour="recon-kpi" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              {[
                { label: tr ? 'Sipariş' : 'Orders', value: String(data.totalOrders) },
                { label: tr ? 'Brüt Satış' : 'Gross Sales', value: `${fmt(data.grossSales)} ₺` },
                { label: tr ? 'Komisyon' : 'Commission', value: `${fmt(data.totalCommission)} ₺` },
                { label: tr ? 'Diğer Kesinti' : 'Deductions', value: `${fmt(data.totalOtherDeductions)} ₺` },
                { label: tr ? 'Net Hakediş' : 'Net Payout', value: `${fmt(data.netPayout)} ₺` },
                { label: tr ? 'Fark' : 'Discrepancy', value: `${fmt(data.discrepancyAmount)} ₺` },
              ].map((kpi) => (
                <div key={kpi.label} className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3 shadow-xs">
                  <div className="text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase tracking-wide">{kpi.label}</div>
                  <div className="text-base font-bold text-[var(--fg)] mt-0.5">{kpi.value}</div>
                </div>
              ))}
            </div>

            {/* Komisyon faturası eşleştirme */}
            <div data-tour="recon-match" className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-4 space-y-3 shadow-xs">
              <div className="flex items-center gap-2">
                <Link2 size={14} className="text-[var(--fg-muted)]" />
                <h2 className="text-xs font-bold text-[var(--fg)]">
                  {tr ? 'Komisyon Faturası Eşleştir' : 'Match Commission Invoice'}
                </h2>
              </div>

              <p className="text-[11px] text-[var(--fg-muted)] leading-relaxed">
                {tr
                  ? `Dönemde sisteme işlenmiş pazaryeri faturası: ${data.matchedInvoicesCount} adet, toplam ${fmt(data.matchedInvoicesTotal)} ₺.`
                  : `Matched invoices: ${data.matchedInvoicesCount}, total ${fmt(data.matchedInvoicesTotal)} ₺.`}
              </p>

              <form
                className="flex items-end gap-2 flex-wrap"
                onSubmit={(e) => { e.preventDefault(); matchInvoice.mutate(); }}
              >
                <label className="flex flex-col gap-1">
                  <span className="text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase tracking-wide">
                    {tr ? 'Fatura No (sistem ID)' : 'Invoice ID'}
                  </span>
                  <input
                    value={invoiceId}
                    onChange={(e) => setInvoiceId(e.target.value.replace(/\D/g, ''))}
                    inputMode="numeric"
                    required
                    className="h-8 w-40 rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2 text-xs tabular-nums text-[var(--fg)] focus:outline-none focus:border-[var(--fg-muted)]"
                  />
                </label>
                <button
                  type="submit"
                  disabled={!canMatch || !invoiceId || matchInvoice.isPending}
                  className="inline-flex h-8 items-center rounded-[4px] bg-[var(--fg)] px-3 text-xs font-bold text-[var(--bg)] transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {tr ? 'Mutabakat Yap' : 'Reconcile'}
                </button>
                {!canMatch && (
                  <span className="text-[11px] text-amber-300 self-center">
                    {tr ? 'Finans verisi çekilmeden mutabakat yapılamaz.' : 'Cannot reconcile without settlement data.'}
                  </span>
                )}
              </form>
            </div>

            {/* Sipariş bazlı hakediş satırları */}
            <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] overflow-hidden shadow-xs">
              <div className="border-b border-[var(--border-soft)] px-3 py-2">
                <h2 className="text-xs font-bold text-[var(--fg)]">
                  {tr ? 'Son Sipariş Hakedişleri' : 'Recent Settlements'}
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[var(--border-soft)] text-[var(--fg-muted)]">
                      <th className="px-3 py-2 text-left font-semibold">{tr ? 'Sipariş No' : 'Order'}</th>
                      <th className="px-3 py-2 text-right font-semibold">{tr ? 'Brüt' : 'Gross'}</th>
                      <th className="px-3 py-2 text-right font-semibold">{tr ? 'Komisyon' : 'Commission'}</th>
                      <th className="px-3 py-2 text-right font-semibold">{tr ? 'Oran' : 'Rate'}</th>
                      <th className="px-3 py-2 text-right font-semibold">{tr ? 'Kesinti' : 'Deductions'}</th>
                      <th className="px-3 py-2 text-right font-semibold">{tr ? 'Net' : 'Net'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentLines.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-3 py-8 text-center text-[var(--fg-muted)]">
                          {tr ? 'Bu dönemde hakediş satırı yok.' : 'No settlement lines in this period.'}
                        </td>
                      </tr>
                    ) : (
                      data.recentLines.map((line) => (
                        <tr key={line.orderNumber} className="border-b border-[var(--border-soft)] last:border-0">
                          <td className="px-3 py-2 font-mono text-[var(--fg)]">{line.orderNumber}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-[var(--fg)]">{fmt(line.grossAmount)}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-[var(--fg)]">{fmt(line.commissionAmount)}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-[var(--fg-muted)]">
                            %{(line.commissionRate * 100).toFixed(2)}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-[var(--fg-muted)]">{fmt(line.otherDeductions)}</td>
                          <td className="px-3 py-2 text-right tabular-nums font-semibold text-[var(--fg)]">{fmt(line.netPayout)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] px-3 py-2.5">
              <Info size={14} className="text-[var(--fg-muted)] mt-0.5 shrink-0" />
              <p className="text-[11px] text-[var(--fg-muted)] leading-relaxed">
                {tr
                  ? 'Komisyon, sipariş satırlarındaki ölçülmüş kesinti tutarından toplanır; ortalama oranla TAHMİN ÜRETİLMEZ. Kargo bedeli pazaryeri finans beslemesinde yer almaz, taşıyıcı faturalarından takip edilir.'
                  : 'Commission is summed from measured deductions — never estimated. Cargo cost is not part of marketplace settlement data.'}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
