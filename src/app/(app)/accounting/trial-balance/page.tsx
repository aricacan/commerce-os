'use client';

import { localDateStr } from '../../../../utils/date';
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Calendar, Download, CheckCircle2, AlertTriangle } from 'lucide-react';
import { ledgerReportApi, LEDGER_ACCOUNT_TYPE_LABEL, type TrialBalanceRow } from '../../../../lib/api/ledger';
import { useBillingEntitySelector } from '../../../../features/accounting/useBillingEntitySelector';
import { AccountingSubTabBar } from '../../../../components/layout/AccountingSubTabBar';
import { FilterSelect } from '../../../../components/ui/FilterSelect';
import { downloadExcel, type ExportColumn } from '../../../../lib/export';
import { toast } from '../../../../lib/toast';
import { useI18n } from '../../../../lib/i18n';

function fmt(n: number) {
  return n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function TrialBalancePage() {
  const { lang } = useI18n();
  const tr = lang === 'tr';

  const { entities, billingEntityId, setBillingEntityId } = useBillingEntitySelector();
  const [asOfDate, setAsOfDate] = useState(() => localDateStr());
  const [search, setSearch] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['trial-balance', billingEntityId, asOfDate],
    queryFn: () => ledgerReportApi.trialBalance(billingEntityId!, asOfDate),
    enabled: billingEntityId !== null,
    staleTime: 10_000,
  });

  const rows = useMemo(() => data?.rows ?? [], [data]);
  const balanced = data ? Math.abs(data.totalDebit - data.totalCredit) < 0.001 : true;

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const lower = search.toLowerCase();
    return rows.filter((r) => r.code.toLowerCase().includes(lower) || r.name.toLowerCase().includes(lower));
  }, [rows, search]);

  const totalBalanceDebit = useMemo(() => rows.reduce((s, r) => s + r.balanceDebit, 0), [rows]);
  const totalBalanceCredit = useMemo(() => rows.reduce((s, r) => s + r.balanceCredit, 0), [rows]);

  const handleExportExcel = () => {
    if (filteredRows.length === 0) {
      toast.error(tr ? 'Dışa aktarılacak mizan verisi yok.' : 'No data to export.');
      return;
    }
    const cols: ExportColumn[] = [
      { header: tr ? 'Hesap Kodu' : 'Code', key: 'code', type: 'text' },
      { header: tr ? 'Hesap Adı' : 'Name', key: 'name', type: 'text' },
      { header: tr ? 'Hesap Tipi' : 'Type', key: 'type', type: 'text' },
      { header: tr ? 'Borç Toplamı' : 'Total Debit', key: 'totalDebit', type: 'money' },
      { header: tr ? 'Alacak Toplamı' : 'Total Credit', key: 'totalCredit', type: 'money' },
      { header: tr ? 'Borç Bakiye' : 'Debit Balance', key: 'balanceDebit', type: 'money' },
      { header: tr ? 'Alacak Bakiye' : 'Credit Balance', key: 'balanceCredit', type: 'money' },
    ];
    const exportRows = filteredRows.map((r) => ({
      code: r.code,
      name: r.name,
      type: LEDGER_ACCOUNT_TYPE_LABEL[r.type] ?? r.type,
      totalDebit: r.totalDebit,
      totalCredit: r.totalCredit,
      balanceDebit: r.balanceDebit,
      balanceCredit: r.balanceCredit,
    }));
    void downloadExcel(`Mizan_${asOfDate}`, exportRows, cols);
    toast.success(tr ? 'Mizan Excel dosyası indirildi.' : 'Trial balance exported.');
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-transparent">
      {/* Üst Sekme Barı */}
      <AccountingSubTabBar />

      {/* Ana İçerik Alanı */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
        {/* Başlık ve Aksiyon Barı */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div data-tour="trial-header">
            <h1 className="text-base font-bold text-[var(--fg)] tracking-tight">
              {tr ? 'Mizan (Geçici / Kesin Mizan)' : 'Trial Balance'}
            </h1>
            <p className="text-xs text-[var(--fg-muted)] mt-0.5">
              {tr
                ? 'Dönem başından seçili tarihe kadar kesinleşmiş yevmiye fişlerinin kümülatif bakiye özeti.'
                : 'Cumulative debit and credit balances of posted entries up to the selected date.'}
            </p>
          </div>

          <div data-tour="trial-actions" className="flex items-center gap-2 flex-wrap">
            {/* Şirket Seçici FilterSelect */}
            <FilterSelect
              value={billingEntityId ? String(billingEntityId) : ''}
              placeholder={tr ? 'Şirket Seçin' : 'Select Entity'}
              onChange={(v) => setBillingEntityId(v ? Number(v) : 0)}
              options={entities.map((be) => ({ value: String(be.id), label: be.legalName }))}
              minWidth={200}
            />

            {/* Tarih Seçici */}
            <div className="flex items-center gap-1.5 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-2 py-1 shadow-xs">
              <Calendar size={13} className="text-[var(--fg-muted)] shrink-0" />
              <input
                type="date"
                value={asOfDate}
                onChange={(e) => setAsOfDate(e.target.value)}
                className="bg-transparent text-xs font-semibold text-[var(--fg)] focus:outline-none cursor-pointer"
              />
            </div>

            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex h-8 items-center gap-1.5 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-semibold text-[var(--fg)] shadow-xs hover:bg-[var(--bg-subtle)] transition cursor-pointer"
            >
              <Download size={13} />
              <span>Excel</span>
            </button>
          </div>
        </div>

        {/* KPI Metrik Kartları */}
        <div data-tour="trial-kpi" className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3 shadow-xs">
            <div className="text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase tracking-wide">
              {tr ? 'Toplam Borç' : 'Total Debit'}
            </div>
            <div className="text-base font-bold text-[var(--fg)] mt-0.5">
              {data ? fmt(data.totalDebit) : '0,00'} ₺
            </div>
          </div>

          <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3 shadow-xs">
            <div className="text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase tracking-wide">
              {tr ? 'Toplam Alacak' : 'Total Credit'}
            </div>
            <div className="text-base font-bold text-[var(--fg)] mt-0.5">
              {data ? fmt(data.totalCredit) : '0,00'} ₺
            </div>
          </div>

          <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3 shadow-xs">
            <div className="text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase tracking-wide">
              {tr ? 'Borç Bakiyesi' : 'Debit Balance'}
            </div>
            <div className="text-base font-bold text-[var(--fg)] mt-0.5">
              {fmt(totalBalanceDebit)} ₺
            </div>
          </div>

          <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3 shadow-xs">
            <div className="text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase tracking-wide">
              {tr ? 'Alacak Bakiyesi' : 'Credit Balance'}
            </div>
            <div className="text-base font-bold text-[var(--fg)] mt-0.5">
              {fmt(totalBalanceCredit)} ₺
            </div>
          </div>

          <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3 shadow-xs">
            <div className="text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase tracking-wide">
              {tr ? 'Mizan Dengesi' : 'Balance Status'}
            </div>
            <div className="mt-0.5 flex items-center gap-1">
              {balanced ? (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400">
                  <CheckCircle2 size={13} /> {tr ? 'Dengede ✓' : 'Balanced'}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-400">
                  <AlertTriangle size={13} /> {tr ? 'Dengesiz ⚠' : 'Unbalanced'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Arama Çubuğu */}
        <div data-tour="trial-search" className="flex items-center justify-between gap-2.5 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-2.5 shadow-xs">
          <div className="relative flex-1 max-w-sm">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={tr ? 'Hesap kodu veya adı ara...' : 'Search code or name...'}
              className="h-8 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] pl-8 pr-3 text-xs text-[var(--fg)] placeholder:text-[var(--fg-subtle)] focus:border-[var(--fg-muted)] focus:outline-none"
            />
          </div>
          <div className="text-xs text-[var(--fg-muted)]">
            {tr ? 'Toplam' : 'Total'}: <strong className="text-[var(--fg)]">{filteredRows.length}</strong> {tr ? 'hesap' : 'accounts'}
          </div>
        </div>

        {/* Mizan Tablosu */}
        <div data-tour="trial-table" className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--bg-subtle)]/30 text-[10.5px] font-bold uppercase tracking-wider text-[var(--fg-muted)]">
                  <th className="px-4 py-2.5 w-28">{tr ? 'HESAP KODU' : 'CODE'}</th>
                  <th className="px-4 py-2.5">{tr ? 'HESAP ADI' : 'NAME'}</th>
                  <th className="px-4 py-2.5 w-28">{tr ? 'TİP' : 'TYPE'}</th>
                  <th className="px-4 py-2.5 text-right w-32">{tr ? 'BORÇ TOPLAMI' : 'TOTAL DEBIT'}</th>
                  <th className="px-4 py-2.5 text-right w-32">{tr ? 'ALACAK TOPLAMI' : 'TOTAL CREDIT'}</th>
                  <th className="px-4 py-2.5 text-right w-32">{tr ? 'BORÇ BAKİYE' : 'DEBIT BAL'}</th>
                  <th className="px-4 py-2.5 text-right w-32">{tr ? 'ALACAK BAKİYE' : 'CREDIT BAL'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-soft)]">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-xs text-[var(--fg-muted)]">
                      {tr ? 'Mizan verileri hesaplanıyor...' : 'Calculating trial balance...'}
                    </td>
                  </tr>
                ) : isError ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-xs text-rose-400">
                      {tr ? 'Mizan hesaplanırken hata oluştu.' : 'Failed to calculate trial balance.'}
                    </td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-xs text-[var(--fg-muted)]">
                      {tr ? 'Bu tarihe kadar kesinleşmiş herhangi bir hareket bulunamadı.' : 'No posted movements found.'}
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((r: TrialBalanceRow) => (
                    <tr key={r.ledgerAccountId} className="hover:bg-[var(--bg-subtle)]/40 transition">
                      <td className="px-4 py-2.5 font-mono font-bold text-[var(--fg)]">{r.code}</td>
                      <td className="px-4 py-2.5 font-semibold text-[var(--fg)]">{r.name}</td>
                      <td className="px-4 py-2.5 text-[var(--fg-muted)]">
                        {LEDGER_ACCOUNT_TYPE_LABEL[r.type] ?? r.type}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-right text-[var(--fg)]">
                        {fmt(r.totalDebit)} ₺
                      </td>
                      <td className="px-4 py-2.5 font-mono text-right text-[var(--fg)]">
                        {fmt(r.totalCredit)} ₺
                      </td>
                      <td className="px-4 py-2.5 font-mono text-right font-bold text-[var(--fg)]">
                        {r.balanceDebit > 0 ? `${fmt(r.balanceDebit)} ₺` : '—'}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-right font-bold text-[var(--fg)]">
                        {r.balanceCredit > 0 ? `${fmt(r.balanceCredit)} ₺` : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {data && rows.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-[var(--border)] bg-[var(--bg-subtle)]/40 font-bold text-xs">
                    <td colSpan={3} className="px-4 py-3 uppercase tracking-wider text-[var(--fg)]">
                      {tr ? 'GENEL TOPLAM' : 'GRAND TOTAL'}
                    </td>
                    <td className="px-4 py-3 font-mono text-right text-[var(--fg)]">
                      {fmt(data.totalDebit)} ₺
                    </td>
                    <td className="px-4 py-3 font-mono text-right text-[var(--fg)]">
                      {fmt(data.totalCredit)} ₺
                    </td>
                    <td className="px-4 py-3 font-mono text-right text-[var(--fg)]">
                      {fmt(totalBalanceDebit)} ₺
                    </td>
                    <td className="px-4 py-3 font-mono text-right text-[var(--fg)]">
                      {fmt(totalBalanceCredit)} ₺
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
