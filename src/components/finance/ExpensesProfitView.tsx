'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Edit2, Loader2 } from 'lucide-react';
import { toast } from '../../lib/toast';
import { financeApi } from '../../lib/api';
import { FINANCE_YEARS, FINANCE_MONTHS } from '../../lib/constants/finance';
import { localDateStr } from '../../utils/date';
import { formatDate } from '../../lib/format';
import { useStoreSelector } from '../../stores/store-selector';
import { useI18n } from '../../lib/i18n';
import { useMobile } from '../../hooks/useMobile';
import { FormSelect, type FormSelectOption } from '../ui/FormSelect';
import { ExportMenu, type ExportRow } from '../ui/ExportMenu';
import { ExpenseTemplatesPanel } from './ExpenseTemplatesPanel';
import { ExpenseFormModal, type ExpenseFormTarget } from './ExpenseFormModal';
import {
  ExpenseFilterBar, EMPTY_EXPENSE_FILTERS, filterExpenses, hasActiveFilters, type ExpenseFilters,
} from './ExpenseFilterBar';
import type { ExportColumn } from '../../lib/export';

const EXPENSE_EXPORT_COLUMNS: ExportColumn[] = [
  { key: 'name', header: 'Gider Adı' },
  { key: 'category', header: 'Kategori' },
  { key: 'store', header: 'Mağaza' },
  { key: 'amount', header: 'Tutar', type: 'money' },
  { key: 'date', header: 'Ay', type: 'date' },
  { key: 'note', header: 'Not' },
];

const MONTH_NAMES_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function monthLastDay(year: number, month: number): string {
  return localDateStr(new Date(year, month, 0));
}

export function ExpensesProfitView() {
  const { t, lang } = useI18n();
  const isTr = lang === 'tr';
  const isMobile = useMobile();
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [periodMode, setPeriodMode] = useState<'month' | 'custom'>('month');
  const [customFrom, setCustomFrom] = useState<string>(localDateStr(new Date(now.getFullYear(), now.getMonth(), 1)));
  const [customTo, setCustomTo] = useState<string>(monthLastDay(now.getFullYear(), now.getMonth() + 1));
  const selectedStores = useStoreSelector((s) => s.selectedStores);
  const queryClient = useQueryClient();

  // Ekleme ve düzenleme TEK panelden yürür (bkz. ExpenseFormModal); hedef null ise kapalı.
  const [formTarget, setFormTarget] = useState<ExpenseFormTarget | null>(null);

  const [pendingDeleteIds, setPendingDeleteIds] = useState<number[]>([]);
  const [filters, setFilters] = useState<ExpenseFilters>(EMPTY_EXPENSE_FILTERS);
  const deleteTimeouts = useRef<Record<number, NodeJS.Timeout>>({});

  useEffect(() => {
    const timeouts = deleteTimeouts.current;
    return () => {
      Object.keys(timeouts).forEach((key) => {
        const id = Number(key);
        clearTimeout(timeouts[id]);
        financeApi.expenses.remove(id).catch(() => {});
      });
    };
  }, []);

  const period =
    periodMode === 'month'
      ? { year: selectedYear, month: selectedMonth }
      : { from: customFrom, to: customTo };

  const isPeriodValid = periodMode === 'month' || Boolean(customFrom && customTo && customFrom <= customTo);
  const financeKey = ['finance-data', selectedStores, periodMode, selectedYear, selectedMonth, customFrom, customTo] as const;

  const { data: expenses = [], isLoading: loadingExpenses } = useQuery({
    queryKey: [...financeKey, 'expenses'],
    queryFn: () => financeApi.expenses.list(period),
    enabled: isPeriodValid,
  });

  const { data: netProfit, isLoading: loadingNetProfit } = useQuery({
    queryKey: [...financeKey, 'net-profit'],
    queryFn: () => financeApi.netProfit(period),
    enabled: isPeriodValid,
  });

  const loadingFinance = loadingExpenses || loadingNetProfit;

  const visibleExpenses = useMemo(() => {
    return expenses.filter((exp) => !pendingDeleteIds.includes(exp.id));
  }, [expenses, pendingDeleteIds]);

  const filteredExpenses = useMemo(() => filterExpenses(visibleExpenses, filters), [visibleExpenses, filters]);
  const filtering = hasActiveFilters(filters);
  const filteredTotal = useMemo(() => filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0), [filteredExpenses]);

  const adjustedTotalExpenses = useMemo(() => {
    const baseTotal = netProfit?.totalExpenses ?? 0;
    const pendingAmount = expenses
      .filter((exp) => pendingDeleteIds.includes(exp.id))
      .reduce((sum, exp) => sum + exp.amount, 0);
    return Math.max(0, baseTotal - pendingAmount);
  }, [netProfit?.totalExpenses, expenses, pendingDeleteIds]);

  const adjustedNetProfit = useMemo(() => {
    const baseNet = netProfit?.netProfit ?? 0;
    const pendingAmount = expenses
      .filter((exp) => pendingDeleteIds.includes(exp.id))
      .reduce((sum, exp) => sum + exp.amount, 0);
    return baseNet + pendingAmount;
  }, [netProfit?.netProfit, expenses, pendingDeleteIds]);


  const invalidateFinance = () => queryClient.invalidateQueries({ queryKey: financeKey });


  const handleExpenseDelete = (id: number) => {
    setPendingDeleteIds((prev) => [...prev, id]);

    toast.undo(isTr ? 'Gider silindi.' : 'Expense deleted.', () => {
      if (deleteTimeouts.current[id]) {
        clearTimeout(deleteTimeouts.current[id]);
        delete deleteTimeouts.current[id];
      }
      setPendingDeleteIds((prev) => prev.filter((x) => x !== id));
      toast.success(isTr ? 'Silme işlemi geri alındı.' : 'Delete undone.');
    });

    const timeout = setTimeout(async () => {
      delete deleteTimeouts.current[id];
      try {
        await financeApi.expenses.remove(id);
        setPendingDeleteIds((prev) => prev.filter((x) => x !== id));
        invalidateFinance();
      } catch {
        setPendingDeleteIds((prev) => prev.filter((x) => x !== id));
        toast.error(isTr ? 'Gider silinirken bir hata oluştu.' : 'Failed to delete expense.');
      }
    }, 5000);

    deleteTimeouts.current[id] = timeout;
  };

  // FormSelect kullanılır: FilterSelect listenin başına her zaman bir "temizle" satırı
  // ekliyor ve zorunlu bir dönem seçiminde bu satır hem gereksiz hem de tekrar görünüyordu.
  const PERIOD_OPTIONS: FormSelectOption<string>[] = [
    { value: 'month', label: isTr ? 'Aylık Görünüm' : 'Monthly' },
    { value: 'custom', label: isTr ? 'Özel Tarih Aralığı' : 'Custom Range' },
  ];

  const MONTH_OPTIONS: FormSelectOption<number>[] = FINANCE_MONTHS.map((m) => ({
    value: m.val,
    label: isTr ? m.label : MONTH_NAMES_EN[m.val - 1],
  }));

  const YEAR_OPTIONS: FormSelectOption<number>[] = FINANCE_YEARS.map((y) => ({
    value: y,
    label: String(y),
  }));

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto bg-transparent p-4 md:p-5">
      
      {/* ── TEK BİRLEŞİK MASTER KART ── */}
      {/* shrink-0: kart esnek (flex-1 min-h-0) iken altındaki şablon paneli tüm yüksekliği
          alıyor, gider tablosu 0 px'e çöküyordu. Sayfa tek parça kayar; tablo kendi içinde
          sınırlı yükseklikte kayar ki başlık sabit kalsın ve şablonlar aşağıda görünsün. */}
      <div className="flex shrink-0 flex-col overflow-hidden rounded-[6px] border border-[var(--border-soft)] bg-[var(--card)]">
        
        {/* ── Üst Çubuk: Dönem Filtreleri, Gider Ekle, Dışa Aktar ── */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[var(--border-soft)] p-3">
          <div data-tour="expenses-period" className="flex flex-wrap items-center gap-2">
            <FormSelect<string>
              value={periodMode}
              options={PERIOD_OPTIONS}
              onChange={(val) => setPeriodMode(val as 'month' | 'custom')}
              className="w-[160px]"
            />

            {periodMode === 'month' ? (
              <>
                <FormSelect<number>
                  value={selectedMonth}
                  options={MONTH_OPTIONS}
                  onChange={setSelectedMonth}
                  className="w-[130px]"
                />
                <FormSelect<number>
                  value={selectedYear}
                  options={YEAR_OPTIONS}
                  onChange={setSelectedYear}
                  className="w-[100px]"
                />
              </>
            ) : (
              <div className="flex items-center gap-1">
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="h-8 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-2 font-mono text-xs font-semibold text-[var(--fg)] outline-none focus:border-[var(--fg)]"
                />
                <span className="text-xs text-[var(--fg-muted)]">—</span>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="h-8 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-2 font-mono text-xs font-semibold text-[var(--fg)] outline-none focus:border-[var(--fg)]"
                />
              </div>
            )}
          </div>

          <div data-tour="expenses-actions" className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFormTarget({ mode: 'create' })}
              className="inline-flex h-8 items-center gap-1 rounded-[4px] border border-[var(--border)] bg-[var(--bg-subtle)] px-3 text-xs font-bold text-[var(--fg)] transition hover:bg-[var(--card)]"
            >
              <Plus size={13} />
              <span>{isTr ? 'Yeni Gider Ekle' : 'New Expense'}</span>
            </button>

            <ExportMenu
              filename="giderler"
              columns={EXPENSE_EXPORT_COLUMNS}
              getData={() =>
                filteredExpenses.map((exp): ExportRow => ({
                  name: exp.name,
                  category: exp.category === 1 ? (exp.adPlatform ?? 'Reklam') : 'İşletme Gideri',
                  store: exp.storeName,
                  amount: exp.amount,
                  date: exp.expenseDate,
                  note: exp.note ?? '',
                }))
              }
            />
          </div>
        </div>

        {/* ── Kâr / Zarar & Gider Özet Şeridi (Muted / Soft Renkler) ── */}
        <div data-tour="expenses-summary" className="grid shrink-0 grid-cols-1 divide-y border-b border-[var(--border-soft)] bg-[var(--bg-subtle)]/30 sm:grid-cols-3 sm:divide-x sm:divide-y-0 divide-[var(--border-soft)]">
          {/* Brüt Kâr */}
          <div className="flex items-baseline justify-between p-3 px-4">
            <span className="text-xs font-semibold text-[var(--fg-muted)]">{t('expenses_gross_profit_label')}</span>
            <span className="font-mono text-sm font-bold text-[var(--fg)]">
              ₺{netProfit?.grossProfit.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) ?? '0,00'}
            </span>
          </div>

          {/* Toplam Gider */}
          <div className="flex items-baseline justify-between p-3 px-4">
            <span className="text-xs font-semibold text-[var(--fg-muted)]">{t('expenses_total_month_expenses')}</span>
            <span className="font-mono text-sm font-bold text-[var(--fg)]">
              (₺{adjustedTotalExpenses.toLocaleString('tr-TR', { minimumFractionDigits: 2 })})
            </span>
          </div>

          {/* Net Kâr / Zarar */}
          <div className="flex items-baseline justify-between p-3 px-4">
            <span className="text-xs font-semibold text-[var(--fg-muted)]">{t('expenses_net_profit_label')}</span>
            <div className="flex items-center gap-1.5">
              <span
                className={`font-mono text-sm font-bold ${
                  adjustedNetProfit >= 0 ? 'text-emerald-600/90 dark:text-emerald-400' : 'text-rose-500/90 dark:text-rose-400'
                }`}
              >
                ₺{adjustedNetProfit.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
              </span>
              <span
                className={`rounded-[3px] px-1.5 py-0.2 font-mono text-[10px] font-bold ${
                  adjustedNetProfit >= 0
                    ? 'border border-emerald-500/20 bg-emerald-500/5 text-emerald-600/85 dark:text-emerald-400/85'
                    : 'border border-rose-500/20 bg-rose-500/5 text-rose-500/85 dark:text-rose-400/85'
                }`}
              >
                {adjustedNetProfit >= 0 ? t('expenses_profit_status') : t('expenses_loss_status')}
              </span>
            </div>
          </div>
        </div>

        <div data-tour="expenses-filters">
          <ExpenseFilterBar expenses={visibleExpenses} filters={filters} onChange={setFilters} isTr={isTr} />
        </div>

        {!isPeriodValid && (
          <div className="m-3 rounded-[4px] border border-rose-500/20 bg-rose-500/5 p-2 text-xs font-semibold text-rose-500/90">
            {isTr
              ? 'Tarih aralığı geçersiz: bitiş tarihi başlangıçtan önce olamaz.'
              : 'Invalid date range: end date cannot be before start date.'}
          </div>
        )}

        {/* ── Gider Kayıtları Tablosu (Tam Dikey Esnek) ── */}
        <div data-tour="expenses-table" className="max-h-[65vh] overflow-auto">
          {loadingFinance ? (
            <div className="flex items-center justify-center p-16 text-xs text-[var(--fg-muted)]">
              <Loader2 className="animate-spin text-[var(--fg)]" size={20} />
            </div>
          ) : visibleExpenses.length === 0 ? (
            <div className="p-16 text-center text-xs text-[var(--fg-muted)]">
              <p className="m-0 font-bold text-[var(--fg)] text-sm">{t('expenses_empty_title')}</p>
              <p className="m-0 mt-1">{t('expenses_empty_hint')}</p>
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="p-12 text-center text-xs text-[var(--fg-muted)]">
              {isTr ? 'Filtreye uyan gider yok.' : 'No expenses match the filter.'}
            </div>
          ) : isMobile ? (
            /* ── Mobil Kartlar ── */
            <div className="flex flex-col gap-2 p-3">
              {filteredExpenses.map((exp) => (
                <div key={exp.id} className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-bold text-[var(--fg)]">{exp.name}</span>
                    <span className="font-mono text-xs font-bold text-red-500/90">
                      (₺{exp.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })})
                    </span>
                    <span className="font-mono text-[10px] text-[var(--fg-muted)]">
                      {exp.amountIncludesVat && exp.vatRate > 0
                        ? `KDV ₺${(exp.amount - exp.amount / (1 + exp.vatRate)).toLocaleString('tr-TR', {
                            maximumFractionDigits: 0,
                          })}`
                        : isTr
                        ? 'KDV Hariç'
                        : 'excl. VAT'}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between font-mono text-[10.5px] text-[var(--fg-muted)]">
                    <span>{formatDate(exp.expenseDate)}</span>
                    {exp.note && <span className="truncate max-w-[160px]">{exp.note}</span>}
                  </div>
                  <div className="mt-2.5 flex items-center gap-1.5 border-t border-[var(--border-soft)] pt-2">
                    <button
                      type="button"
                      onClick={() => setFormTarget({ mode: 'expense', expense: exp })}
                      disabled={exp.templateId !== null}
                      className="inline-flex h-7 flex-1 items-center justify-center gap-1 rounded-[3px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] text-[11px] font-semibold text-[var(--fg)] disabled:opacity-40"
                    >
                      <Edit2 size={11} />
                      <span>{t('expenses_update_button')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExpenseDelete(exp.id)}
                      disabled={exp.templateId !== null}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-[3px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] text-[var(--fg-muted)] hover:text-red-500 disabled:opacity-40"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* ── Masaüstü Tablo ── */
            <table className="w-full border-collapse text-left text-xs">
              <thead className="sticky top-0 z-10 border-b border-[var(--border-soft)] bg-[var(--bg-subtle)] text-[10.5px] font-bold uppercase tracking-wider text-[var(--fg-muted)]">
                <tr>
                  <th className="px-4 py-2.5">{t('expenses_col_name')}</th>
                  <th className="px-4 py-2.5">{isTr ? 'Magaza' : 'Store'}</th>
                  <th className="px-4 py-2.5">{t('expenses_col_amount')}</th>
                  <th className="px-4 py-2.5">{t('expenses_col_date')}</th>
                  <th className="px-4 py-2.5">{t('expenses_col_note')}</th>
                  <th className="px-4 py-2.5 text-right">{t('expenses_col_actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-soft)]">
                {filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="transition hover:bg-[var(--bg-subtle)]/40">
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-semibold text-[var(--fg)]">{exp.name}</span>
                        {exp.category === 1 && (
                          <span className="rounded-[3px] bg-amber-500/10 px-1.5 py-px text-[9.5px] font-bold text-amber-600 dark:text-amber-400">
                            {exp.adPlatform || (isTr ? 'Reklam' : 'Ads')}
                          </span>
                        )}
                        {exp.isAnnualPayment && (
                          <span
                            title={isTr ? 'Yıllık ödeme, tamamı bu aya yazıldı' : 'Annual payment, fully recorded in this month'}
                            className="rounded-[3px] bg-sky-500/10 px-1.5 py-px text-[9.5px] font-bold text-sky-600 dark:text-sky-400"
                          >
                            {isTr ? 'Yıllık' : 'Annual'}
                          </span>
                        )}
                        {exp.templateId !== null && (
                          <span
                            title={isTr ? 'Tekrarlayan sablondan uretildi' : 'Generated from a recurring template'}
                            className="rounded-[3px] bg-[var(--bg-subtle)] px-1.5 py-px text-[9.5px] font-bold text-[var(--fg-muted)]"
                          >
                            {isTr ? 'Sablon' : 'Template'}
                          </span>
                        )}
                        {exp.sharedPercentage !== null && (
                          <span
                            title={isTr ? 'Ortak giderin bu magazaya dusen payi' : 'Store share of a shared expense'}
                            className="rounded-[3px] bg-[var(--bg-subtle)] px-1.5 py-px font-mono text-[9.5px] font-bold text-[var(--fg-muted)]"
                          >
                            %{exp.sharedPercentage}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[11.5px] text-[var(--fg-muted)]">{exp.storeName || '—'}</td>
                    <td className="px-4 py-3 font-mono font-bold text-red-500/90">
                      (₺{exp.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })})
                      {/* KDV DAHIL girilmisse icindeki KDV tutari gosterilir; HARIC girilmisse
                          gosterilecek bir KDV yoktur, sadece durumu belirten etiket konur. */}
                      {exp.amountIncludesVat && exp.vatRate > 0 ? (
                        <span
                          title={
                            isTr
                              ? 'Tutarın içindeki KDV. Net kâr hesabını şu an DEĞİŞTİRMEZ.'
                              : 'VAT inside the amount. Does NOT affect net profit yet.'
                          }
                          className="ml-1.5 font-normal text-[10px] text-[var(--fg-muted)]"
                        >
                          KDV ₺
                          {(exp.amount - exp.amount / (1 + exp.vatRate)).toLocaleString('tr-TR', {
                            maximumFractionDigits: 0,
                          })}
                        </span>
                      ) : (
                        <span className="ml-1.5 font-normal text-[10px] text-[var(--fg-muted)]">
                          {isTr ? 'KDV Hariç' : 'excl. VAT'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-[var(--fg-muted)]">{formatDate(exp.expenseDate)}</td>
                    <td className="max-w-[280px] truncate px-4 py-3 text-[11.5px] text-[var(--fg-muted)]">{exp.note || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setFormTarget({ mode: 'expense', expense: exp })}
                          className="flex h-6 w-6 items-center justify-center rounded-[3px] border border-[var(--border-soft)] bg-[var(--card)] text-[var(--fg-muted)] transition hover:text-[var(--fg)] disabled:cursor-not-allowed disabled:opacity-40"
                          disabled={exp.templateId !== null}
                          title={
                            exp.templateId !== null
                              ? isTr
                                ? 'Sablondan uretildi - sablonu uzerinden duzenleyin'
                                : 'Generated from a template - edit the template instead'
                              : isTr
                              ? 'Düzenle'
                              : 'Edit'
                          }
                        >
                          <Edit2 size={11} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleExpenseDelete(exp.id)}
                          className="flex h-6 w-6 items-center justify-center rounded-[3px] border border-[var(--border-soft)] bg-[var(--card)] text-[var(--fg-muted)] transition hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40"
                          disabled={exp.templateId !== null}
                          title={
                            exp.templateId !== null
                              ? isTr
                                ? 'Sablondan uretildi - silmek icin sablonu silin'
                                : 'Generated from a template - delete the template instead'
                              : isTr
                              ? 'Sil'
                              : 'Delete'
                          }
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Alt Bar ── */}
        <div className="flex h-9 shrink-0 items-center justify-between border-t border-[var(--border-soft)] px-4 text-[11px] text-[var(--fg-muted)]">
          <span>
            {isTr ? 'Kayıt Sayısı:' : 'Total Records:'}{' '}
            <b className="text-[var(--fg)]">
              {filtering ? `${filteredExpenses.length} / ${visibleExpenses.length}` : visibleExpenses.length}
            </b>
          </span>
          <span>
            {filtering ? (isTr ? 'Filtrelenen Toplam:' : 'Filtered Total:') : (isTr ? 'Toplam Gider:' : 'Total Expense:')}{' '}
            <b className="font-mono text-red-500/90">
              (₺{(filtering ? filteredTotal : adjustedTotalExpenses).toLocaleString('tr-TR', { minimumFractionDigits: 2 })})
            </b>
          </span>
        </div>
      </div>

      {/* ── Tekrarlayan / Ortak Gider Şablonları ── */}
      <ExpenseTemplatesPanel onEdit={(template) => setFormTarget({ mode: 'template', template })} />

      {formTarget && (
        <ExpenseFormModal
          target={formTarget}
          defaultYear={periodMode === 'month' ? selectedYear : now.getFullYear()}
          defaultMonth={periodMode === 'month' ? selectedMonth : now.getMonth() + 1}
          onClose={() => setFormTarget(null)}
        />
      )}
    </div>
  );
}
