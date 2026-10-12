'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Loader2, X } from 'lucide-react';
import { erpSourcesApi, financeApi } from '../../lib/api';
import { AD_PLATFORMS, EXPENSE_NAME_PRESETS, FINANCE_MONTHS, FINANCE_YEARS } from '../../lib/constants/finance';
import { useI18n } from '../../lib/i18n';
import { toast } from '../../lib/toast';
import { FormSelect, type FormSelectOption } from '../ui/FormSelect';
import { SegmentedControl } from '../ui/SegmentedControl';
import { previewSharedParts } from './sharedExpense';
import type { ExpenseCategory, FinanceExpense, FinanceExpenseTemplate } from '../../types/api';

// Gider eklemenin/düzenlemenin TEK yeri.
//
// Önceden iki ayrı modal vardı: "Gider Ekle" ve "Şablon Ekle". Kullanıcı hangi butona
// basacağını, "şablon" kelimesinin ne anlama geldiğini ve tekrarlayan bir gideri nereden
// gireceğini bilmek zorundaydı. Artık tek buton var; tekrar/ortaklık/yıllık kararları
// panelin İÇİNDE, sırayla soruluyor.

const LABEL = 'mb-1.5 block text-[10.5px] font-bold uppercase tracking-wide text-[var(--fg-muted)]';
const INPUT =
  'h-9 w-full rounded-[6px] border border-[var(--border)] bg-[var(--card)] px-3 text-xs text-[var(--fg)] outline-none transition placeholder:text-[var(--fg-muted)]/60 hover:border-[var(--fg-muted)] focus:border-[var(--fg)]';

// Giderin ne sıklıkta tekrarlandığı.
type Repeat = 'once' | 'recurring';
// Ödeme dönemi: aylık mı, yıllık mı.
type Period = 'monthly' | 'annual';

// ORTAK gider düzenlenirken kullanıcının niyeti. İki niyetin sonucu farklı ve BİRLİKTE
// gönderilirse belirsiz olurdu (sunucuda toplam kazanır, payın tutarı sessizce ezilirdi) —
// bu yüzden burada TEK seçim yapılır ve seçilmeyen alan devre dışı bırakılır.
type SharedEditScope = 'part' | 'total';

export type ExpenseFormTarget =
  | { mode: 'create' }
  | { mode: 'expense'; expense: FinanceExpense }
  | { mode: 'template'; template: FinanceExpenseTemplate };

type Draft = {
  repeat: Repeat;
  period: Period;
  category: ExpenseCategory;
  name: string;
  amount: string;
  vatRate: string;
  amountIncludesVat: boolean;
  year: number;
  month: number;
  endYear: number;
  endMonth: number;
  isShared: boolean;
  allocations: { code: string; percentage: string }[];
  note: string;
};

function emptyDraft(year: number, month: number): Draft {
  return {
    repeat: 'once',
    period: 'monthly',
    category: 0,
    name: '',
    amount: '',
    vatRate: '20',
    amountIncludesVat: true,
    year,
    month,
    endYear: year,
    endMonth: 12,
    isShared: false,
    allocations: [],
    note: '',
  };
}

export function ExpenseFormModal({
  target,
  defaultYear,
  defaultMonth,
  onClose,
}: {
  target: ExpenseFormTarget;
  defaultYear: number;
  defaultMonth: number;
  onClose: () => void;
}) {
  const { t, lang } = useI18n();
  const isTr = lang === 'tr';
  const queryClient = useQueryClient();

  const [draft, setDraft] = useState<Draft>(() => emptyDraft(defaultYear, defaultMonth));
  const [error, setError] = useState<string | null>(null);

  // Ortak gider düzenlemesine özel durum. Draft'tan AYRI tutulur: draft, target değişince
  // baştan kurulur; bu ikisi ise grup yanıtı geldikten sonra doldurulur.
  const [sharedScope, setSharedScope] = useState<SharedEditScope>('part');
  const [groupTotal, setGroupTotal] = useState('');

  // Düzenlenen gider ORTAK bir grubun payı mı? sharedGroupId OPSİYONELDİR: eski backend
  // (frontend önce yayına çıkar) bu alanı göndermez, o zaman uç hiç çağrılmaz ve form
  // bugünkü tek-pay davranışında kalır.
  const sharedExpenseId =
    target.mode === 'expense' && target.expense.sharedGroupId ? target.expense.id : null;

  const { data: sharedGroup } = useQuery({
    queryKey: ['finance-expense-shared-group', sharedExpenseId],
    queryFn: () => financeApi.expenses.sharedGroup(sharedExpenseId as number),
    enabled: sharedExpenseId !== null,
    // 404 = "grup yok" (ya da backend henüz bu ucu bilmiyor); tekrar denemenin anlamı yok.
    // Hata durumunda data undefined kalır ve form sessizce tek-pay moduna düşer.
    retry: false,
  });

  // Paylaştırma (MAĞAZA × ERP) kombinasyonları üzerinden yapılır: "Base - StoreA",
  // "Sentos - StoreB" gibi — topbar seçicisiyle AYNI liste, aynı kodlar. Kaynak ham Stores
  // tablosu DEĞİL /erp-sources: Stores tablosu kapatılmış "Base" mağazasını ve eski test
  // kayıtlarını da içeriyordu.
  //
  // Her pay kendi satırında saklandığı ve FinanceExpense artık ConnectorType taşıdığı için
  // "Tümü" görünümünde paylar bir kez toplanır; hiçbir yerde çift sayılmaz.
  const { data: erpSources = [] } = useQuery({
    queryKey: ['erp-sources'],
    queryFn: () => erpSourcesApi.list(),
    staleTime: 5 * 60_000,
  });

  const allocationTargets = useMemo(
    () =>
      erpSources.map((source) => ({
        code: source.selectorCode,
        label: `${source.erp} - ${source.storeName}`,
      })),
    [erpSources]
  );

  // Düzenleme modunda mevcut kaydı forma yükle. Mağaza listesi geldikten SONRA çalışır ki
  // ortak giderin payları isimleriyle eşleşebilsin.
  useEffect(() => {
    if (target.mode === 'expense') {
      const expenseMonth = new Date(target.expense.expenseDate);
      setDraft({
        ...emptyDraft(expenseMonth.getFullYear(), expenseMonth.getMonth() + 1),
        repeat: 'once',
        period: target.expense.isAnnualPayment ? 'annual' : 'monthly',
        category: target.expense.category,
        name: target.expense.name,
        amount: String(target.expense.amount),
        vatRate: String(Math.round(target.expense.vatRate * 100)),
        amountIncludesVat: target.expense.amountIncludesVat,
        note: target.expense.note ?? '',
      });
      return;
    }

    if (target.mode === 'template') {
      const template = target.template;
      setDraft({
        repeat: 'recurring',
        period: template.recurrence === 1 ? 'annual' : 'monthly',
        category: template.category,
        name: template.name,
        amount: String(template.amount),
        vatRate: String(Math.round(template.vatRate * 100)),
        amountIncludesVat: template.amountIncludesVat,
        year: template.startYear,
        month: template.startMonth,
        endYear: template.endYear,
        endMonth: template.endMonth,
        isShared: template.allocations.length > 1,
        allocations: template.allocations.map((a) => ({
          code: a.erpSourceCode,
          percentage: String(a.percentage),
        })),
        note: template.note ?? '',
      });
    }
  }, [target]);

  // Grup yanıtı gelince toplam alanı MEVCUT toplamla doldurulur: kullanıcı ne kadar
  // değiştirdiğini ancak başlangıç değerini görürse anlar.
  useEffect(() => {
    if (sharedGroup) setGroupTotal(String(sharedGroup.totalAmount));
  }, [sharedGroup]);

  const allocationTotal = useMemo(
    () => draft.allocations.reduce((sum, a) => sum + (parseFloat(a.percentage) || 0), 0),
    [draft.allocations]
  );

  const parsedGroupTotal = parseFloat(groupTotal);
  const isGroupTotalValid = Number.isFinite(parsedGroupTotal) && parsedGroupTotal > 0;
  const isTotalScope = sharedGroup !== undefined && sharedScope === 'total';

  // KAYDETMEDEN ÖNCE payların ne olacağı. Hesap sunucudaki dağıtımın birebir aynısıdır
  // (bkz. sharedExpense.ts) — kullanıcı önizlemede başka, kayıttan sonra başka rakam
  // görmemeli.
  const previewParts = useMemo(() => {
    if (!sharedGroup) return [];
    if (!isTotalScope || !isGroupTotalValid) return sharedGroup.parts;
    return previewSharedParts(sharedGroup.parts, parsedGroupTotal);
  }, [sharedGroup, isTotalScope, isGroupTotalValid, parsedGroupTotal]);

  // Toplam düzenlenirken bu payın tutarı ARTIK ELLE GİRİLMEZ: dağıtımdan gelir.
  const currentPreviewAmount = previewParts.find((part) => part.isCurrent)?.amount;

  const amountFieldValue =
    isTotalScope && currentPreviewAmount !== undefined ? String(currentPreviewAmount) : draft.amount;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['finance-data'] });
    queryClient.invalidateQueries({ queryKey: ['finance-expense-templates'] });
    queryClient.invalidateQueries({ queryKey: ['finance-pnl'] });
  };

  const save = useMutation({
    mutationFn: async () => {
      const amount = parseFloat(draft.amount);
      const vatRate = (parseFloat(draft.vatRate) || 0) / 100;
      const adPlatform = draft.category === 1 ? draft.name : null;
      const allocations = draft.isShared
        ? draft.allocations.map((a) => ({ erpSourceCode: a.code, percentage: parseFloat(a.percentage) || 0 }))
        : [];

      // Tekrarlayan VEYA ortak gider bir ŞABLONA yazılır (şablon her aya satır üretir);
      // tek seferlik tek mağazalık gider doğrudan gider satırı olur. Kullanıcı bu ayrımı
      // görmez — panel tek, arka planda doğru uç nokta seçilir.
      if (draft.repeat === 'recurring') {
        const body = {
          name: draft.name,
          amount,
          category: draft.category,
          adPlatform,
          amountIncludesVat: draft.amountIncludesVat,
          vatRate,
          recurrence: (draft.period === 'annual' ? 1 : 0) as 0 | 1,
          startYear: draft.year,
          startMonth: draft.month,
          endYear: draft.endYear,
          endMonth: draft.endMonth,
          note: draft.note || null,
          allocations,
        };
        return target.mode === 'template'
          ? financeApi.expenseTemplates.update(target.template.id, body)
          : financeApi.expenseTemplates.create(body);
      }

      const body = {
        name: draft.name,
        // Toplam düzenleniyorsa bu payın tutarı dağıtımdan gelir; sunucu zaten ezecek ama
        // doğrulamadan (tutar > 0) geçmesi için önizlenen değer gönderilir.
        amount: isTotalScope && currentPreviewAmount !== undefined ? currentPreviewAmount : amount,
        // Yalnızca "grup toplamı" niyetinde gönderilir. Aksi hâlde alan HİÇ gönderilmez ve
        // sunucudaki eski davranış (yalnız bu payı yeniden tanımla) aynen korunur.
        ...(isTotalScope && isGroupTotalValid ? { totalAmount: parsedGroupTotal } : {}),
        // Ayın 1'i gönderilir; backend de aya sabitler. İki taraf da aynı sözleşmeyi
        // konuşunca saat dilimi kaynaklı "bir gün önceki ay" kayması imkânsızlaşır.
        expenseDate: `${draft.year}-${String(draft.month).padStart(2, '0')}-01T00:00:00.000Z`,
        note: draft.note || null,
        category: draft.category,
        adPlatform,
        amountIncludesVat: draft.amountIncludesVat,
        vatRate,
        isAnnualPayment: draft.period === 'annual',
        allocations,
      };
      return target.mode === 'expense'
        ? financeApi.expenses.update(target.expense.id, body)
        : financeApi.expenses.create(body);
    },
    onSuccess: () => {
      invalidate();
      toast.success(isTr ? 'Gider kaydedildi.' : 'Expense saved.');
      onClose();
    },
    onError: (err: unknown) => setError(err instanceof Error ? err.message : t('expenses_save_error')),
  });

  const toggleShared = (isShared: boolean) => {
    setDraft((prev) => ({
      ...prev,
      isShared,
      // Açılırken tüm mağazalara eşit pay verilir; kullanıcı oradan düzenler.
      allocations: isShared
        ? allocationTargets.map((target) => ({
            code: target.code,
            percentage: (Math.round((100 / Math.max(allocationTargets.length, 1)) * 100) / 100).toString(),
          }))
        : [],
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const amount = parseFloat(draft.amount);
    if (!draft.name.trim() || !Number.isFinite(amount) || amount <= 0) {
      setError(t('expenses_fill_required_fields'));
      return;
    }

    // Toplam düzenleniyorsa doğrulanması gereken TUTAR budur; pay alanı zaten kilitli.
    if (isTotalScope && !isGroupTotalValid) {
      setError(isTr ? 'Grup toplamı sıfırdan büyük olmalıdır.' : 'Group total must be greater than zero.');
      return;
    }

    if (draft.isShared && Math.abs(allocationTotal - 100) > 0.01) {
      setError(
        isTr
          ? `Mağaza paylarının toplamı %100 olmalı (şu an %${allocationTotal.toFixed(2)}).`
          : `Store shares must total 100% (currently ${allocationTotal.toFixed(2)}%).`
      );
      return;
    }

    if (draft.repeat === 'recurring') {
      const start = draft.year * 12 + draft.month;
      const end = draft.endYear * 12 + draft.endMonth;
      if (end < start) {
        setError(isTr ? 'Bitiş ayı başlangıç ayından önce olamaz.' : 'End month cannot precede start month.');
        return;
      }
    }

    save.mutate();
  };

  const monthOptions: FormSelectOption<number>[] = FINANCE_MONTHS.map((m) => ({ value: m.val, label: m.label }));
  const yearOptions: FormSelectOption<number>[] = FINANCE_YEARS.map((y) => ({ value: y, label: String(y) }));
  const namePresets = draft.category === 1 ? [...AD_PLATFORMS] : EXPENSE_NAME_PRESETS;

  // Düzenlemede tip değiştirmek, kaydı bir uç noktadan diğerine taşımak demektir —
  // silinip yeniden eklenmesi gerekir. Bu yüzden tip seçicisi düzenlemede kilitlidir.
  const isEditing = target.mode !== 'create';

  const periodHintMonthly =
    draft.repeat === 'recurring'
      ? isTr
        ? 'Girilen tutar aralıktaki HER AYA aynen yazılır (kira, maaş).'
        : 'The amount is written to every month in the range.'
      : isTr
      ? 'Normal bir aylık gider — sadece seçilen aya yazılır.'
      : 'A normal monthly expense — written to the selected month only.';

  const periodHintAnnual =
    draft.repeat === 'recurring'
      ? isTr
        ? 'Girilen tutar YILLIK toplamdır ve aralıktaki aylara eşit bölünür.'
        : 'The amount is an annual total, split evenly across the range.'
      : isTr
      ? 'Yıllık bir ödeme, tamamı seçilen aya yazılır (bölünmez), "Yıllık" olarak işaretlenir.'
      : 'An annual payment recorded entirely in the selected month, flagged as annual.';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="flex max-h-[92vh] w-full max-w-[560px] flex-col overflow-hidden rounded-[10px] border border-[var(--border)] bg-[var(--card)] shadow-2xl">
        {/* Başlık */}
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--border-soft)] px-5 py-4">
          <div>
            <h2 className="m-0 text-sm font-bold text-[var(--fg)]">
              {isEditing ? (isTr ? 'Gideri Düzenle' : 'Edit Expense') : isTr ? 'Yeni Gider Ekle' : 'New Expense'}
            </h2>
            <p className="m-0 mt-0.5 text-[11px] text-[var(--fg-muted)]">
              {isTr
                ? 'Tek seferlik, tekrarlayan ve ortak giderlerin hepsi buradan yönetilir.'
                : 'One-off, recurring and shared expenses are all managed here.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[5px] text-[var(--fg-muted)] transition hover:bg-[var(--bg-subtle)] hover:text-[var(--fg)]"
          >
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-4">
            {/* 1. Tekrar tipi */}
            <div>
              <label className={LABEL}>{isTr ? '1 · Gider Tipi' : '1 · Expense Type'}</label>
              <SegmentedControl<Repeat>
                value={draft.repeat}
                onChange={(repeat) => setDraft({ ...draft, repeat })}
                className="w-full"
                options={[
                  { value: 'once', label: isTr ? 'Tek Seferlik' : 'One-off' },
                  { value: 'recurring', label: isTr ? 'Tekrarlayan' : 'Recurring' },
                ]}
              />
              <p className="m-0 mt-1.5 text-[10.5px] leading-relaxed text-[var(--fg-muted)]">
                {draft.repeat === 'once'
                  ? isTr
                    ? 'Sadece seçtiğin aya bir kez yazılır.'
                    : 'Written once, into the month you pick.'
                  : isTr
                  ? 'Kira gibi giderleri bir kez tanımlarsın; seçtiğin ay aralığındaki her aya otomatik yazılır. Düzenlersen tüm aylar güncellenir.'
                  : 'Define once; it is written into every month of the range you pick.'}
                {isEditing && draft.repeat === 'recurring' && (
                  <span className="ml-1 text-amber-600 dark:text-amber-400">
                    {isTr ? 'Tip düzenlemede değiştirilemez.' : 'Type cannot change while editing.'}
                  </span>
                )}
              </p>
            </div>

            <div className="h-px bg-[var(--border-soft)]" />

            {/* 2. Kimlik */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL}>{isTr ? '2 · Kategori' : '2 · Category'}</label>
                <FormSelect<number>
                  value={draft.category}
                  onChange={(category) => setDraft({ ...draft, category: category as ExpenseCategory, name: '' })}
                  options={[
                    { value: 0, label: isTr ? 'İşletme Gideri' : 'Operating' },
                    { value: 1, label: isTr ? 'Reklam' : 'Advertising' },
                  ]}
                />
              </div>
              <div>
                <label className={LABEL}>{isTr ? 'Gider Adı' : 'Expense Name'}</label>
                {/* Serbest metin + hazır öneriler: çok spesifik bir gider adı da yazılabilsin
                    diye datalist kullanılıyor, kapalı bir seçim listesi değil. */}
                <input
                  required
                  list="expense-name-presets"
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  placeholder={isTr ? 'Yaz veya listeden seç' : 'Type or pick'}
                  className={INPUT}
                />
                <datalist id="expense-name-presets">
                  {namePresets.map((preset) => (
                    <option key={preset} value={preset} />
                  ))}
                </datalist>
              </div>
            </div>

            {/* 3. Tutar + KDV */}
            <div className="grid grid-cols-[1fr_auto_auto] items-end gap-3">
              <div>
                <label className={LABEL}>
                  {sharedGroup
                    ? isTr
                      ? '3 · Bu payın tutarı (₺)'
                      : '3 · This share’s amount (₺)'
                    : isTr
                    ? '3 · Tutar (₺)'
                    : '3 · Amount (₺)'}
                  {draft.repeat === 'recurring' && (
                    <span className="ml-1 font-medium normal-case text-[var(--fg-muted)]">
                      {draft.period === 'annual'
                        ? isTr
                          ? '· dönem toplamı'
                          : '· period total'
                        : isTr
                        ? '· ay başına'
                        : '· per month'}
                    </span>
                  )}
                </label>
                <input
                  type="number"
                  required
                  step="0.01"
                  min="0.01"
                  placeholder="0,00"
                  // Toplam düzenlenirken bu alan KİLİTLİDİR: iki tutarı aynı anda göndermek
                  // belirsiz olurdu (sunucuda toplam kazanır). Değeri dağıtımdan gelir.
                  disabled={isTotalScope}
                  value={amountFieldValue}
                  onChange={(e) => setDraft({ ...draft, amount: e.target.value })}
                  className={`${INPUT} font-mono disabled:cursor-not-allowed disabled:opacity-60`}
                />
                {sharedGroup && (
                  <p className="m-0 mt-1.5 text-[10.5px] leading-relaxed text-[var(--fg-muted)]">
                    {isTotalScope
                      ? isTr
                        ? 'Grup toplamı düzenleniyor — bu tutar yüzdeye göre hesaplanır.'
                        : 'Editing the group total — this amount is computed from the percentage.'
                      : isTr
                      ? 'Yalnızca bu pay değişir; diğer paylar aynı kalır.'
                      : 'Only this share changes; the other shares stay as they are.'}
                  </p>
                )}
              </div>
              <div className="w-[130px]">
                <label className={LABEL}>{isTr ? 'KDV' : 'VAT'}</label>
                <FormSelect<string>
                  value={draft.amountIncludesVat ? 'incl' : 'excl'}
                  onChange={(v) => setDraft({ ...draft, amountIncludesVat: v === 'incl' })}
                  options={[
                    { value: 'incl', label: isTr ? 'KDV Dahil' : 'VAT incl.' },
                    { value: 'excl', label: isTr ? 'KDV Hariç' : 'VAT excl.' },
                  ]}
                />
              </div>
              {/* KDV oranı yalnızca "KDV Dahil"de anlamlıdır — hariçte sorulacak bir oran yok,
                  alan yerine sadece durumu belirten bir rozet gösterilir. */}
              {draft.amountIncludesVat ? (
                <div className="w-[90px]">
                  <label className={LABEL}>{isTr ? 'Oran (%)' : 'Rate (%)'}</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    max="100"
                    value={draft.vatRate}
                    onChange={(e) => setDraft({ ...draft, vatRate: e.target.value })}
                    className={`${INPUT} text-center font-mono`}
                  />
                </div>
              ) : (
                <div className="flex h-9 w-[90px] items-center justify-center rounded-[6px] border border-dashed border-[var(--border)] text-[10.5px] font-semibold text-[var(--fg-muted)]">
                  {isTr ? 'KDV Hariç' : 'Excl. VAT'}
                </div>
              )}
            </div>

            <div className="h-px bg-[var(--border-soft)]" />

            {/* 4. Ödeme dönemi */}
            <div>
              <label className={LABEL}>{isTr ? '4 · Ödeme Dönemi' : '4 · Payment Period'}</label>
              <SegmentedControl<Period>
                value={draft.period}
                onChange={(period) => setDraft({ ...draft, period })}
                className="w-full"
                options={[
                  { value: 'monthly', label: isTr ? 'Aylık' : 'Monthly' },
                  { value: 'annual', label: isTr ? 'Yıllık' : 'Annual' },
                ]}
              />
              <p className="m-0 mt-1.5 text-[10.5px] leading-relaxed text-[var(--fg-muted)]">
                {draft.period === 'monthly' ? periodHintMonthly : periodHintAnnual}
              </p>
            </div>

            {/* 5. Ay seçimi */}
            <div>
              <label className={LABEL}>
                {draft.repeat === 'recurring'
                  ? isTr
                    ? '5 · Başlangıç ve Bitiş Ayı'
                    : '5 · Start and End Month'
                  : isTr
                  ? '5 · Gider Ayı'
                  : '5 · Expense Month'}
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <FormSelect<number>
                  value={draft.month}
                  onChange={(month) => setDraft({ ...draft, month })}
                  options={monthOptions}
                  className="min-w-[130px] flex-1"
                />
                <FormSelect<number>
                  value={draft.year}
                  onChange={(year) => setDraft({ ...draft, year })}
                  options={yearOptions}
                  className="w-[100px]"
                />
                {draft.repeat === 'recurring' && (
                  <>
                    <span className="text-xs text-[var(--fg-muted)]">→</span>
                    <FormSelect<number>
                      value={draft.endMonth}
                      onChange={(endMonth) => setDraft({ ...draft, endMonth })}
                      options={monthOptions}
                      className="min-w-[130px] flex-1"
                    />
                    <FormSelect<number>
                      value={draft.endYear}
                      onChange={(endYear) => setDraft({ ...draft, endYear })}
                      options={yearOptions}
                      className="w-[100px]"
                    />
                  </>
                )}
              </div>
              <p className="m-0 mt-1.5 text-[10.5px] text-[var(--fg-muted)]">
                {isTr
                  ? 'Gider SEÇİLEN AYA yazılır — ödeme tarihine değil.'
                  : 'The expense is recorded in the SELECTED MONTH, not the payment date.'}
              </p>
            </div>

            <div className="h-px bg-[var(--border-soft)]" />

            {/* 6. Ortak gider — DÜZENLENEN gider zaten bir grubun payıysa paylaştırma
                seçeneği değil, GRUBUN KENDİSİ gösterilir: paylar sonradan yeniden
                tanımlanamaz (grup oluşturulurken kurulur), değiştirilebilen tek şey
                toplamdır. Oysa aynı yerde işaretsiz bir "ortak gider" kutusu duruyordu ve
                gider ortakken "ortak değil" gibi okunuyordu. */}
            {sharedGroup ? (
              <div className="rounded-[6px] border border-[var(--border-soft)] bg-[var(--bg-subtle)]/40 p-3">
                <div className="text-xs font-semibold text-[var(--fg)]">
                  {isTr
                    ? `6 · Ortak gider — ${sharedGroup.parts.length} pay`
                    : `6 · Shared expense — ${sharedGroup.parts.length} shares`}
                </div>
                <p className="m-0 mt-1 text-[10.5px] leading-relaxed text-[var(--fg-muted)]">
                  {isTr
                    ? 'Bu gider aşağıdaki paylara bölünmüş durumda. Ne düzenlemek istediğini seç:'
                    : 'This expense is split into the shares below. Pick what you want to edit:'}
                </p>

                <SegmentedControl<SharedEditScope>
                  value={sharedScope}
                  onChange={setSharedScope}
                  className="mt-2 w-full"
                  options={[
                    { value: 'part', label: isTr ? 'Bu payın tutarı' : 'This share' },
                    { value: 'total', label: isTr ? 'Grup toplamı' : 'Group total' },
                  ]}
                />

                <div className="mt-3">
                  <label className={LABEL}>
                    {isTr
                      ? 'Grup toplamı — paylara yüzdeye göre dağıtılır'
                      : 'Group total — distributed across shares by percentage'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    // "Bu payın tutarı" seçiliyken toplam KİLİTLİ: iki niyet aynı anda
                    // gönderilemesin diye alanın kendisi kapatılır.
                    disabled={sharedScope !== 'total'}
                    value={groupTotal}
                    onChange={(e) => setGroupTotal(e.target.value)}
                    className={`${INPUT} font-mono disabled:cursor-not-allowed disabled:opacity-60`}
                  />
                </div>

                <div className="mt-3 flex flex-col gap-1">
                  {previewParts.map((part) => {
                    const original = sharedGroup.parts.find((p) => p.expenseId === part.expenseId);
                    const changed = original !== undefined && original.amount !== part.amount;
                    return (
                      <div key={part.expenseId} className="flex items-center gap-2 text-[11px]">
                        <span className={`flex-1 truncate ${part.isCurrent ? 'font-bold text-[var(--fg)]' : 'text-[var(--fg-muted)]'}`}>
                          {part.label}
                          {part.isCurrent && (
                            <span className="ml-1 font-semibold text-[var(--fg-muted)]">
                              {isTr ? '· düzenlenen' : '· editing'}
                            </span>
                          )}
                        </span>
                        <span className="w-[52px] shrink-0 text-right font-mono text-[var(--fg-muted)]">
                          %{part.percentage.toLocaleString('tr-TR')}
                        </span>
                        <span
                          className={`w-[110px] shrink-0 text-right font-mono ${
                            changed ? 'font-bold text-emerald-500' : 'text-[var(--fg)]'
                          }`}
                        >
                          ₺{part.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    );
                  })}
                  <div className="mt-1 flex items-center gap-2 border-t border-[var(--border-soft)] pt-1.5 text-[11px] font-bold">
                    <span className="flex-1 text-[var(--fg-muted)]">{isTr ? 'Toplam' : 'Total'}</span>
                    <span className="w-[110px] shrink-0 text-right font-mono text-[var(--fg)]">
                      ₺
                      {previewParts
                        .reduce((sum, part) => sum + part.amount, 0)
                        .toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
            <div className="rounded-[6px] border border-[var(--border-soft)] bg-[var(--bg-subtle)]/40 p-3">
              <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-[var(--fg)]">
                <input type="checkbox" checked={draft.isShared} onChange={(e) => toggleShared(e.target.checked)} />
                <span>{isTr ? '6 · Ortak gider — mağazalara böl' : '6 · Shared expense — split across stores'}</span>
              </label>

              {draft.isShared ? (
                <div className="mt-3 flex flex-col gap-1.5">
                  {draft.allocations.map((allocation, index) => (
                    <div key={allocation.code} className="flex items-center gap-2">
                      <span className="flex-1 text-xs text-[var(--fg-muted)]">
                        {allocationTargets.find((target) => target.code === allocation.code)?.label ?? allocation.code}
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={allocation.percentage}
                        onChange={(e) => {
                          const next = [...draft.allocations];
                          next[index] = { ...allocation, percentage: e.target.value };
                          setDraft({ ...draft, allocations: next });
                        }}
                        className="h-8 w-[84px] rounded-[5px] border border-[var(--border)] bg-[var(--card)] px-2 text-right font-mono text-xs text-[var(--fg)] outline-none focus:border-[var(--fg)]"
                      />
                      <span className="w-3 text-xs text-[var(--fg-muted)]">%</span>
                    </div>
                  ))}
                  <div
                    className={`mt-1 text-right font-mono text-[11px] font-bold ${
                      Math.abs(allocationTotal - 100) < 0.01 ? 'text-emerald-500' : 'text-rose-500'
                    }`}
                  >
                    {isTr ? 'Toplam' : 'Total'}: %{allocationTotal.toFixed(2)}
                  </div>
                </div>
              ) : (
                <p className="m-0 mt-1.5 text-[10.5px] text-[var(--fg-muted)]">
                  {isTr
                    ? 'Kapalıyken gider yalnızca üstten seçili mağazaya yazılır.'
                    : 'When off, the expense is written only to the store selected at the top.'}
                </p>
              )}
            </div>
            )}

            {/* 7. Not */}
            <div>
              <label className={LABEL}>{isTr ? '7 · Açıklama (opsiyonel)' : '7 · Note (optional)'}</label>
              <textarea
                rows={2}
                value={draft.note}
                onChange={(e) => setDraft({ ...draft, note: e.target.value })}
                placeholder={t('expenses_field_note_placeholder')}
                className="w-full resize-none rounded-[6px] border border-[var(--border)] bg-[var(--card)] p-2.5 text-xs text-[var(--fg)] outline-none transition placeholder:text-[var(--fg-muted)]/60 hover:border-[var(--fg-muted)] focus:border-[var(--fg)]"
              />
            </div>

            {error && (
              <div className="flex items-start gap-1.5 rounded-[5px] border border-rose-500/20 bg-rose-500/5 p-2.5 text-[11px] font-semibold text-rose-500/90">
                <AlertCircle size={13} className="mt-px shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Aksiyonlar */}
          <div className="flex shrink-0 justify-end gap-2 border-t border-[var(--border-soft)] bg-[var(--bg-subtle)]/30 px-5 py-3">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 items-center rounded-[6px] border border-[var(--border)] bg-transparent px-3.5 text-xs font-semibold text-[var(--fg-muted)] transition hover:text-[var(--fg)]"
            >
              {t('expenses_cancel_button')}
            </button>
            <button
              type="submit"
              disabled={save.isPending}
              className="inline-flex h-9 items-center gap-1.5 rounded-[6px] border border-[var(--fg)] bg-[var(--fg)] px-4 text-xs font-bold text-[var(--card)] transition hover:opacity-90 disabled:opacity-50"
            >
              {save.isPending && <Loader2 className="animate-spin" size={12} />}
              <span>{t('save')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
