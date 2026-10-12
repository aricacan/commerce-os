'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BookLock, CheckCircle2, AlertTriangle, Download } from 'lucide-react';
import { eLedgerApi } from '../../../../lib/api/e-belge';
import { useBillingEntitySelector } from '../../../../features/accounting/useBillingEntitySelector';
import { PeriodSelector } from '../../../../features/accounting/PeriodSelector';
import { AccountingSubTabBar } from '../../../../components/layout/AccountingSubTabBar';
import { FilterSelect } from '../../../../components/ui/FilterSelect';
import { toast } from '../../../../lib/toast';
import { useI18n } from '../../../../lib/i18n';

function fmt(n: number) {
  return n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ELedgerPage() {
  const { lang } = useI18n();
  const tr = lang === 'tr';

  const { entities, billingEntityId, setBillingEntityId } = useBillingEntitySelector();
  const now = new Date();
  const [period, setPeriod] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 });
  const [downloading, setDownloading] = useState(false);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['e-ledger-summary', billingEntityId, period.year, period.month],
    queryFn: () => eLedgerApi.summary(billingEntityId!, period.year, period.month),
    enabled: billingEntityId !== null,
    staleTime: 10_000,
  });

  const handleDownload = async (ledgerType: 'YEVMIYE' | 'KEBIR') => {
    if (!billingEntityId) return;
    setDownloading(true);
    try {
      const { fileName, blob } = await eLedgerApi.downloadSummaryXml(
        billingEntityId, period.year, period.month, ledgerType,
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(tr ? 'Dönem özeti indirildi.' : 'Period summary downloaded.');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-transparent">
      <AccountingSubTabBar />

      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div data-tour="e-ledger-header">
            <h1 className="text-base font-bold text-[var(--fg)] tracking-tight">
              {tr ? 'e-Defter Dönem Özeti' : 'e-Ledger Period Summary'}
            </h1>
            <p className="text-xs text-[var(--fg-muted)] mt-0.5">
              {tr
                ? 'Aylık kapanış öncesi yevmiye denge kontrolü ve dönem içerik özeti.'
                : 'Pre-closing balance check and period content digest.'}
            </p>
          </div>

          <div data-tour="e-ledger-actions" className="flex items-center gap-2 flex-wrap">
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
          </div>
        </div>

        {isError && (
          <div className="flex items-start gap-2 rounded-[4px] border border-red-500/30 bg-red-500/10 px-3 py-2.5">
            <AlertTriangle size={14} className="text-red-400 mt-0.5 shrink-0" />
            <p className="text-xs text-red-300">{(error as Error)?.message ?? (tr ? 'Özet alınamadı.' : 'Failed to load.')}</p>
          </div>
        )}

        {isLoading && <p className="text-xs text-[var(--fg-muted)]">{tr ? 'Yükleniyor…' : 'Loading…'}</p>}

        {data && (
          <>
            <div data-tour="e-ledger-kpi" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              {[
                { label: tr ? 'Fiş Sayısı' : 'Entries', value: String(data.totalJournalEntries) },
                { label: tr ? 'Satır Sayısı' : 'Lines', value: String(data.totalJournalLines) },
                { label: tr ? 'Aktif Hesap' : 'Accounts', value: String(data.activeAccountsCount) },
                { label: tr ? 'Toplam Borç' : 'Total Debit', value: `${fmt(data.totalDebit)} ₺` },
                { label: tr ? 'Toplam Alacak' : 'Total Credit', value: `${fmt(data.totalCredit)} ₺` },
              ].map((kpi) => (
                <div key={kpi.label} className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3 shadow-xs">
                  <div className="text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase tracking-wide">{kpi.label}</div>
                  <div className="text-base font-bold text-[var(--fg)] mt-0.5">{kpi.value}</div>
                </div>
              ))}

              <div className={`rounded-[4px] border p-3 shadow-xs ${data.isBalanced ? 'border-[var(--border-soft)] bg-[var(--card)]' : 'border-red-500/40 bg-red-500/10'}`}>
                <div className="text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase tracking-wide">
                  {tr ? 'Denge' : 'Balance'}
                </div>
                <div className="mt-0.5 flex items-center gap-1">
                  {data.isBalanced ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400">
                      <CheckCircle2 size={13} /> {tr ? 'Dengede' : 'Balanced'}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-red-400">
                      <AlertTriangle size={13} /> {fmt(data.difference)} ₺
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div data-tour="e-ledger-details" className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-4 space-y-3 shadow-xs">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-xs">
                <div>
                  <div className="text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase tracking-wide">
                    {tr ? 'Mükellef' : 'Taxpayer'}
                  </div>
                  <div className="text-[var(--fg)] font-semibold mt-0.5">{data.legalName}</div>
                  <div className="text-[var(--fg-muted)] tabular-nums">{data.taxNumber}</div>
                </div>
                <div>
                  <div className="text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase tracking-wide">
                    {tr ? 'Dönem' : 'Period'}
                  </div>
                  <div className="text-[var(--fg)] font-semibold mt-0.5 tabular-nums">
                    {data.startDate} → {data.endDate}
                  </div>
                </div>
                <div>
                  <div className="text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase tracking-wide">
                    {tr ? 'Yevmiye Aralığı' : 'Entry Range'}
                  </div>
                  <div className="text-[var(--fg)] font-semibold mt-0.5 tabular-nums">
                    {data.firstEntryNumber ?? '—'} → {data.lastEntryNumber ?? '—'}
                  </div>
                </div>
                <div>
                  <div className="text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase tracking-wide">
                    {tr ? 'İçerik Özeti (SHA-256)' : 'Content Digest'}
                  </div>
                  <div className="text-[var(--fg-muted)] font-mono text-[10px] mt-0.5 break-all">{data.sha256Hash}</div>
                </div>
              </div>

              <p className="text-xs text-[var(--fg-muted)] leading-relaxed border-t border-[var(--border-soft)] pt-3">
                {data.statusSummary}
              </p>

              <div className="flex items-center gap-2 flex-wrap">
                {(['YEVMIYE', 'KEBIR'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    disabled={!data.isBalanced || data.totalJournalEntries === 0 || downloading}
                    onClick={() => void handleDownload(type)}
                    className="inline-flex h-8 items-center gap-1.5 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-semibold text-[var(--fg)] shadow-xs hover:bg-[var(--bg-subtle)] transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Download size={13} />
                    <span>{type === 'YEVMIYE' ? (tr ? 'Yevmiye Özeti' : 'Journal') : (tr ? 'Kebir Özeti' : 'Ledger')}</span>
                  </button>
                ))}
                {!data.isBalanced && (
                  <span className="text-[11px] text-red-300">
                    {tr ? 'Defter dengede olmadan özet üretilemez.' : 'Cannot export while unbalanced.'}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-[4px] border border-[var(--border-soft)] px-3 py-2.5">
              <BookLock size={14} className="text-[var(--fg-muted)] mt-0.5 shrink-0" />
              <p className="text-[11px] text-[var(--fg-muted)] leading-relaxed">
                {tr
                  ? 'İçerik özeti dönemdeki her fişin ve her satırın (hesap, borç, alacak, açıklama) kanonik sıralamasından üretilir; toplamları değiştirmeyen bir düzeltme bile özeti değiştirir.'
                  : 'The digest covers every entry and line, not just totals.'}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
