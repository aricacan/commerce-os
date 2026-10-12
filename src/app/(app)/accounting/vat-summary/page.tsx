'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { Download, Percent, AlertTriangle, Info, Mail, X } from 'lucide-react';
import { vatSummaryApi, type VatRateBreakdown, type WithholdingBreakdown } from '../../../../lib/api/e-belge';
import { useBillingEntitySelector } from '../../../../features/accounting/useBillingEntitySelector';
import { PeriodSelector } from '../../../../features/accounting/PeriodSelector';
import { AccountingSubTabBar } from '../../../../components/layout/AccountingSubTabBar';
import { FilterSelect } from '../../../../components/ui/FilterSelect';
import { downloadExcel, type ExportColumn } from '../../../../lib/export';
import { toast } from '../../../../lib/toast';
import { useI18n } from '../../../../lib/i18n';

function fmt(n: number) {
  return n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function BreakdownTable({ title, rows, tr }: { title: string; rows: VatRateBreakdown[]; tr: boolean }) {
  const totalTaxable = rows.reduce((s, r) => s + r.taxableAmount, 0);
  const totalVat = rows.reduce((s, r) => s + r.vatAmount, 0);

  return (
    <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] overflow-hidden shadow-xs">
      <div className="border-b border-[var(--border-soft)] px-3 py-2">
        <h2 className="text-xs font-bold text-[var(--fg)]">{title}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[var(--border-soft)] text-[var(--fg-muted)]">
              <th className="px-3 py-2 text-left font-semibold">{tr ? 'KDV Oranı' : 'VAT Rate'}</th>
              <th className="px-3 py-2 text-right font-semibold">{tr ? 'Matrah' : 'Taxable'}</th>
              <th className="px-3 py-2 text-right font-semibold">{tr ? 'KDV Tutarı' : 'VAT'}</th>
              <th className="px-3 py-2 text-right font-semibold">{tr ? 'Fatura' : 'Invoices'}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-[var(--fg-muted)]">
                  {tr ? 'Bu dönemde kayıt yok.' : 'No records in this period.'}
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.vatRate} className="border-b border-[var(--border-soft)] last:border-0">
                  <td className="px-3 py-2 font-semibold text-[var(--fg)]">%{r.vatRate}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-[var(--fg)]">{fmt(r.taxableAmount)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-[var(--fg)]">{fmt(r.vatAmount)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-[var(--fg-muted)]">{r.invoiceCount}</td>
                </tr>
              ))
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="bg-[var(--bg-subtle)] font-bold text-[var(--fg)]">
                <td className="px-3 py-2">{tr ? 'Toplam' : 'Total'}</td>
                <td className="px-3 py-2 text-right tabular-nums">{fmt(totalTaxable)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{fmt(totalVat)}</td>
                <td className="px-3 py-2" />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

function WithholdingTable({ rows, tr }: { rows: WithholdingBreakdown[]; tr: boolean }) {
  const totalTaxable = rows.reduce((s, r) => s + r.taxableAmount, 0);
  const totalWithholding = rows.reduce((s, r) => s + r.withholdingAmount, 0);

  return (
    <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] overflow-hidden shadow-xs">
      <div className="border-b border-[var(--border-soft)] px-3 py-2">
        <h2 className="text-xs font-bold text-[var(--fg)]">{tr ? 'Tevkifat Özeti' : 'Withholding Summary'}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[var(--border-soft)] text-[var(--fg-muted)]">
              <th className="px-3 py-2 text-left font-semibold">{tr ? 'Tevkifat Kodu' : 'Withholding Code'}</th>
              <th className="px-3 py-2 text-right font-semibold">{tr ? 'Matrah' : 'Taxable'}</th>
              <th className="px-3 py-2 text-right font-semibold">{tr ? 'Tevkifat Tutarı' : 'Withholding Amount'}</th>
              <th className="px-3 py-2 text-right font-semibold">{tr ? 'Satır Sayısı' : 'Lines'}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.withholdingCode ?? '—'} className="border-b border-[var(--border-soft)] last:border-0">
                <td className="px-3 py-2 font-semibold text-[var(--fg)]">{r.withholdingCode ?? '—'}</td>
                <td className="px-3 py-2 text-right tabular-nums text-[var(--fg)]">{fmt(r.taxableAmount)}</td>
                <td className="px-3 py-2 text-right tabular-nums text-[var(--fg)]">{fmt(r.withholdingAmount)}</td>
                <td className="px-3 py-2 text-right tabular-nums text-[var(--fg-muted)]">{r.lineCount}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-[var(--bg-subtle)] font-bold text-[var(--fg)]">
              <td className="px-3 py-2">{tr ? 'Toplam' : 'Total'}</td>
              <td className="px-3 py-2 text-right tabular-nums">{fmt(totalTaxable)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{fmt(totalWithholding)}</td>
              <td className="px-3 py-2" />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function EmailSummaryDialog({
  billingEntityId,
  year,
  month,
  tr,
  onClose,
}: {
  billingEntityId: number;
  year: number;
  month: number;
  tr: boolean;
  onClose: () => void;
}) {
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    setError(null);
    setSending(true);
    try {
      await vatSummaryApi.emailMonthlySummary({
        billingEntityId,
        year,
        month,
        recipientEmail,
        recipientName: recipientName || null,
      });
      toast.success(tr ? 'KDV özeti e-postayla gönderildi.' : 'VAT summary emailed.');
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : (tr ? 'Gönderilemedi.' : 'Failed to send.'));
    } finally {
      setSending(false);
    }
  }

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-[4px] border border-[var(--border)] bg-[var(--card)] shadow-2xl flex flex-col overflow-hidden text-[var(--fg)]"
      >
        <div className="flex items-center justify-between border-b border-[var(--border-soft)] bg-[var(--bg-subtle)]/40 px-4 py-3">
          <div className="flex items-center gap-2">
            <Mail size={15} className="text-[var(--fg-muted)]" />
            <h2 className="text-sm font-bold text-[var(--fg)]">
              {tr ? 'KDV Özetini E-postayla Gönder' : 'Email VAT Summary'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--fg-muted)] hover:text-[var(--fg)] transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div>
            <label className="block text-[11px] font-semibold text-[var(--fg-muted)] mb-1">
              {tr ? 'Alıcı E-posta' : 'Recipient Email'}
            </label>
            <input
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="muhasebeci@ornek.com"
              className="h-8 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] outline-none focus:border-[var(--fg)]"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[var(--fg-muted)] mb-1">
              {tr ? 'Alıcı Adı (opsiyonel)' : 'Recipient Name (optional)'}
            </label>
            <input
              type="text"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              className="h-8 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] outline-none focus:border-[var(--fg)]"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-[4px] border border-red-500/30 bg-red-500/10 px-3 py-2.5">
              <AlertTriangle size={14} className="text-red-400 mt-0.5 shrink-0" />
              <p className="text-xs text-red-300">{error}</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[var(--border-soft)] bg-[var(--bg-subtle)]/40 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 items-center rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-semibold text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer"
          >
            {tr ? 'Vazgeç' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={sending || !recipientEmail}
            className="inline-flex h-8 items-center gap-1.5 rounded-[4px] bg-[var(--fg)] px-3 text-xs font-semibold text-[var(--bg)] hover:opacity-90 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Mail size={13} />
            <span>{sending ? (tr ? 'Gönderiliyor…' : 'Sending…') : (tr ? 'Gönder' : 'Send')}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function VatSummaryPage() {
  const { lang } = useI18n();
  const tr = lang === 'tr';

  const { entities, billingEntityId, setBillingEntityId } = useBillingEntitySelector();
  const now = new Date();
  const [period, setPeriod] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 });
  const [showEmailDialog, setShowEmailDialog] = useState(false);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['vat-summary', billingEntityId, period.year, period.month],
    queryFn: () => vatSummaryApi.get(billingEntityId!, period.year, period.month),
    enabled: billingEntityId !== null,
    staleTime: 10_000,
  });

  const handleExport = () => {
    if (!data) {
      toast.error(tr ? 'Dışa aktarılacak veri yok.' : 'No data to export.');
      return;
    }
    const cols: ExportColumn[] = [
      { header: tr ? 'Yön' : 'Direction', key: 'direction', type: 'text' },
      { header: tr ? 'KDV Oranı' : 'VAT Rate', key: 'vatRate', type: 'text' },
      { header: tr ? 'Matrah' : 'Taxable', key: 'taxableAmount', type: 'money' },
      { header: tr ? 'KDV Tutarı' : 'VAT Amount', key: 'vatAmount', type: 'money' },
      { header: tr ? 'Fatura Adedi' : 'Invoice Count', key: 'invoiceCount', type: 'text' },
    ];
    const toRow = (direction: string) => (r: VatRateBreakdown) => ({
      direction,
      vatRate: `%${r.vatRate}`,
      taxableAmount: r.taxableAmount,
      vatAmount: r.vatAmount,
      invoiceCount: r.invoiceCount,
    });
    const rows = [
      ...data.salesVatBreakdown.map(toRow(tr ? 'Satış' : 'Sales')),
      ...data.purchaseVatBreakdown.map(toRow(tr ? 'Alış' : 'Purchases')),
    ];
    void downloadExcel(`KDV_Ozeti_${data.year}_${String(data.month).padStart(2, '0')}`, rows, cols);
    toast.success(tr ? 'KDV özeti indirildi.' : 'VAT summary exported.');
  };

  const hasPayable = (data?.payableVat ?? 0) > 0;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-transparent">
      <AccountingSubTabBar />

      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div data-tour="vat-header">
            <h1 className="text-base font-bold text-[var(--fg)] tracking-tight">
              {tr ? 'KDV Özeti (KDV-1 Beyanname Tabanı)' : 'VAT Summary'}
            </h1>
            <p className="text-xs text-[var(--fg-muted)] mt-0.5">
              {tr
                ? 'Dönem içindeki kesinleşmiş satış ve alış faturalarından hesaplanan KDV dengesi.'
                : 'VAT balance calculated from finalised sales and purchase invoices in the period.'}
            </p>
          </div>

          <div data-tour="vat-actions" className="flex items-center gap-2 flex-wrap">
            <FilterSelect
              value={billingEntityId ? String(billingEntityId) : ''}
              placeholder={tr ? 'Şirket Seçin' : 'Select Entity'}
              onChange={(v) => setBillingEntityId(v ? Number(v) : 0)}
              options={entities.map((be) => ({ value: String(be.id), label: be.legalName }))}
              minWidth={200}
            />
            <PeriodSelector
              year={period.year}
              month={period.month}
              onChange={(year, month) => setPeriod({ year, month })}
              tr={tr}
            />
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex h-8 items-center gap-1.5 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-semibold text-[var(--fg)] shadow-xs hover:bg-[var(--bg-subtle)] transition cursor-pointer"
            >
              <Download size={13} />
              <span>Excel</span>
            </button>
            <button
              type="button"
              onClick={() => setShowEmailDialog(true)}
              disabled={!data}
              className="inline-flex h-8 items-center gap-1.5 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-semibold text-[var(--fg)] shadow-xs hover:bg-[var(--bg-subtle)] transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Mail size={13} />
              <span>{tr ? 'E-posta Gönder' : 'Send Email'}</span>
            </button>
          </div>
        </div>

        {isError && (
          <div className="flex items-start gap-2 rounded-[4px] border border-red-500/30 bg-red-500/10 px-3 py-2.5">
            <AlertTriangle size={14} className="text-red-400 mt-0.5 shrink-0" />
            <p className="text-xs text-red-300">{(error as Error)?.message ?? (tr ? 'KDV özeti alınamadı.' : 'Failed to load.')}</p>
          </div>
        )}

        {isLoading && (
          <p className="text-xs text-[var(--fg-muted)]">{tr ? 'Yükleniyor…' : 'Loading…'}</p>
        )}

        {data && (
          <>
            <div data-tour="vat-kpi" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              {[
                { label: tr ? 'Satış Hasılatı' : 'Sales Revenue', value: data.totalSalesRevenue },
                { label: tr ? 'Alış / Gider' : 'Purchases', value: data.totalPurchaseExpenses },
                { label: tr ? 'Hesaplanan KDV (391)' : 'Calculated VAT', value: data.totalCalculatedVat },
                { label: tr ? 'İndirilecek KDV (191)' : 'Deductible VAT', value: data.totalDeductibleVat },
              ].map((kpi) => (
                <div key={kpi.label} className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3 shadow-xs">
                  <div className="text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase tracking-wide">{kpi.label}</div>
                  <div className="text-base font-bold text-[var(--fg)] mt-0.5">{fmt(kpi.value)} ₺</div>
                </div>
              ))}

              <div className={`rounded-[4px] border p-3 shadow-xs ${hasPayable ? 'border-amber-500/40 bg-amber-500/10' : 'border-[var(--border-soft)] bg-[var(--card)]'}`}>
                <div className="text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase tracking-wide">
                  {tr ? 'Ödenecek KDV (360)' : 'Payable VAT'}
                </div>
                <div className={`text-base font-bold mt-0.5 ${hasPayable ? 'text-amber-300' : 'text-[var(--fg)]'}`}>
                  {fmt(data.payableVat)} ₺
                </div>
              </div>

              <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3 shadow-xs">
                <div className="text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase tracking-wide">
                  {tr ? 'Devreden KDV (190)' : 'Carry Forward'}
                </div>
                <div className="text-base font-bold text-[var(--fg)] mt-0.5">{fmt(data.carryForwardVat)} ₺</div>
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] px-3 py-2.5">
              <Info size={14} className="text-[var(--fg-muted)] mt-0.5 shrink-0" />
              <p className="text-xs text-[var(--fg-muted)] leading-relaxed">{data.statusSummary}</p>
            </div>

            {data.unconvertedCurrencyInvoiceCount > 0 && (
              <div className="flex items-start gap-2 rounded-[4px] border border-amber-500/30 bg-amber-500/10 px-3 py-2.5">
                <AlertTriangle size={14} className="text-amber-500 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-700 leading-relaxed">
                  {tr
                    ? `${data.unconvertedCurrencyInvoiceCount} dövizli faturanın TL karşılığı hesaplanamadı (kur eksik) — bu faturalar toplamlara dahil edilmedi.`
                    : `${data.unconvertedCurrencyInvoiceCount} foreign-currency invoice(s) could not be converted to TRY (missing exchange rate) — these are excluded from the totals.`}
                </p>
              </div>
            )}

            <div data-tour="vat-breakdown" className="grid gap-3 lg:grid-cols-2">
              <BreakdownTable
                title={tr ? 'Satışlar — Oran Bazında' : 'Sales by Rate'}
                rows={data.salesVatBreakdown}
                tr={tr}
              />
              <BreakdownTable
                title={tr ? 'Alışlar — Oran Bazında' : 'Purchases by Rate'}
                rows={data.purchaseVatBreakdown}
                tr={tr}
              />
            </div>

            {data.withholdingBreakdown && data.withholdingBreakdown.length > 0 && (
              <div className="space-y-2.5">
                <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3 shadow-xs w-fit">
                  <div className="text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase tracking-wide">
                    {tr ? 'Toplam Tevkifat Tutarı' : 'Total Withholding Amount'}
                  </div>
                  <div className="text-base font-bold text-[var(--fg)] mt-0.5">{fmt(data.totalWithholdingAmount)} ₺</div>
                </div>
                <WithholdingTable rows={data.withholdingBreakdown} tr={tr} />
              </div>
            )}

            <div className="flex items-start gap-2 rounded-[4px] border border-[var(--border-soft)] px-3 py-2.5">
              <Percent size={14} className="text-[var(--fg-muted)] mt-0.5 shrink-0" />
              <p className="text-[11px] text-[var(--fg-muted)] leading-relaxed">
                {tr
                  ? 'Bu özet yalnızca Onaylandı ve Kesildi durumundaki, tüzel kişiliği atanmış faturaları kapsar. Taslak faturalar ve tüzel kişiliği olmayan belgeler beyannameye giremez.'
                  : 'Only approved/issued invoices with an assigned legal entity are included.'}
              </p>
            </div>
          </>
        )}
      </div>

      {showEmailDialog && data && (
        <EmailSummaryDialog
          billingEntityId={data.billingEntityId}
          year={data.year}
          month={data.month}
          tr={tr}
          onClose={() => setShowEmailDialog(false)}
        />
      )}
    </div>
  );
}
