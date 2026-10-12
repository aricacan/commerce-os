'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AlertTriangle } from 'lucide-react';
import {
  orderProfitabilityApi,
  FIGURE_SOURCE,
  type OrderProfitabilityRow,
  type ProfitFigureSource,
} from '../../lib/api/order-profitability';
import {
  marketplaceFinanceApi,
  type PaymentScheduleDay,
  type PayoutReportRow,
} from '../../lib/api/marketplace-finance';
import { useI18n } from '../../lib/i18n';
import { useStoreSelector } from '../../stores/store-selector';
import { localDateStr, resolveDatePreset, type DatePreset } from '../../utils/date';
import { FilterSelect, type FilterSelectOption } from '../ui/FilterSelect';
import { ExportMenu } from '../ui/ExportMenu';
import type { ExportColumn } from '../../lib/export';
import { formatOrderNumber } from '../../utils/orderNumber';

// Ortak tarih mantığı (utils/date.ts) — bu ekranın sunduğu alt küme.
type PresetKey = Extract<DatePreset, 'week' | 'month' | 'lastMonth' | '30days' | 'custom'>;

// Bu ekran YALNIZCA Trendyol içindir. Filtre gönderilmediğinde backend tüm pazaryerlerini
// topluyordu; canlıda son 30 günde ₺2,7M cironun yalnızca ₺0,8M'i Trendyol'du — eBay dahil
// her kanal "Trendyol Raporlama" başlığı altında görünüyordu.
const TRENDYOL = 'Trendyol';

const PAGE_SIZE = 50;

// Dışa aktarma tüm satırları tek seferde ister; backend'in üst sınırı bunu karşılıyor
// (bkz. OrderProfitabilityReportService.MaxPageSize — 190 günlük pencere için yeterli).
const EXPORT_PAGE_SIZE = 10_000;

const FIGURE_SOURCE_EXPORT_LABEL: Record<ProfitFigureSource, string> = {
  [FIGURE_SOURCE.MarketplaceReported]: 'Gerçek',
  [FIGURE_SOURCE.Estimated]: 'Sistem',
  [FIGURE_SOURCE.Missing]: 'Eksik',
};

const EXPORT_COLUMNS: ExportColumn[] = [
  { key: 'platformOrderNumber', header: 'Sipariş No' },
  { key: 'orderDate', header: 'Tarih', type: 'date' },
  { key: 'storeName', header: 'Mağaza' },
  { key: 'productName', header: 'Ürün' },
  { key: 'sku', header: 'SKU' },
  { key: 'quantity', header: 'Adet', type: 'int' },
  { key: 'salePrice', header: 'Satış', type: 'money' },
  { key: 'vat', header: 'KDV', type: 'money' },
  { key: 'commission', header: 'Komisyon', type: 'money' },
  { key: 'commissionSourceLabel', header: 'Komisyon Kaynağı' },
  { key: 'shipping', header: 'Kargo', type: 'money' },
  { key: 'shippingSourceLabel', header: 'Kargo Kaynağı' },
  { key: 'productCost', header: 'Alış', type: 'money' },
  { key: 'netProfit', header: 'Net Kâr', type: 'money' },
];


function money(n: number): string {
  return `₺${n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function compactMoney(n: number): string {
  return `₺${Math.round(n).toLocaleString('tr-TR')}`;
}

// Backend DateOnly'yi "2026-08-14" olarak döner. Eksen üzerinde 30 tane tam tarih
// okunmaz; gün+ay yeterli çünkü aralık zaten filtre çubuğunda yazıyor.
function shortDate(isoDate: string): string {
  const parsed = new Date(`${isoDate}T00:00:00`);
  return Number.isNaN(parsed.getTime())
    ? isoDate
    : parsed.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
}

function fullDate(isoDate: string): string {
  const parsed = new Date(`${isoDate}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? isoDate : parsed.toLocaleDateString('tr-TR');
}

// Rakamın nereden geldiğini gösteren rozet. Kullanıcı hangi sayıya ne kadar güvenebileceğini
// bir bakışta görmeli — "Trendyol'un fiilen kestiği tutar" ile "bizim tahminimiz" aynı
// sütunda yan yana duruyor.
function SourceBadge({ source, isTr }: { source: ProfitFigureSource; isTr: boolean }) {
  // "Tahmini" rozeti KALDIRILDI (kullanıcı kararı): her satırın yanında duran bu etiket
  // tabloyu okunmaz hale getiriyordu ve zaten varsayılan durum oydu. Artık yalnızca
  // varsayılandan SAPAN iki durum işaretlenir — pazaryerinin bildirdiği gerçek rakam ve
  // hiç hesaplanamamış (eksik) rakam.
  if (source === FIGURE_SOURCE.Estimated) return null;

  const tone =
    source === FIGURE_SOURCE.MarketplaceReported
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
      : 'border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400';

  const label =
    source === FIGURE_SOURCE.MarketplaceReported
      ? isTr ? 'Gerçek' : 'Actual'
      : isTr ? 'Eksik' : 'Missing';

  return (
    <span className={`ml-1.5 inline-flex items-center rounded-[3px] border px-1 py-0.5 text-[9px] font-bold ${tone}`}>
      {label}
    </span>
  );
}

function SummaryCell({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-baseline justify-between p-3 px-4">
      <span className="text-xs font-semibold text-[var(--fg-muted)]">{label}</span>
      <span className={`font-mono text-sm font-bold ${tone ?? 'text-[var(--fg)]'}`}>{value}</span>
    </div>
  );
}

function exportRow(row: OrderProfitabilityRow) {
  return {
    platformOrderNumber: formatOrderNumber(row.platformOrderNumber),
    orderDate: row.orderDate,
    storeName: row.storeName,
    productName: row.productName,
    sku: row.sku,
    quantity: row.quantity,
    salePrice: row.salePrice,
    vat: row.vat,
    commission: row.commission,
    commissionSourceLabel: FIGURE_SOURCE_EXPORT_LABEL[row.commissionSource],
    shipping: row.shipping,
    shippingSourceLabel: FIGURE_SOURCE_EXPORT_LABEL[row.shippingSource],
    productCost: row.productCost,
    netProfit: row.netProfit,
  };
}

// ── Ödeme takvimi: "Trendyol bize ne zaman ne kadar ödeyecek?" ──────────────────────────

interface PageWarning {
  title: string;
  detail: string;
}

/// Uyarılar sayfanın gövdesinde yer kaplamaz: üst çubukta tek bir ikonda toplanır, sayısı
/// rozette görünür ve tıklayınca açılır. Önceden her uyarı kendi bloğunu açtığı için asıl
/// veri (grafik/tablo) ekranın altına itiliyordu.
function WarningsMenu({ warnings, isTr }: { warnings: PageWarning[]; isTr: boolean }) {
  const [open, setOpen] = useState(false);
  if (warnings.length === 0) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-8 items-center gap-1.5 rounded-[4px] border border-amber-500/30 bg-amber-500/10 px-2.5 text-xs font-semibold text-amber-700 dark:text-amber-400"
        title={isTr ? 'Uyarılar' : 'Warnings'}
      >
        <AlertTriangle size={14} />
        {warnings.length}
      </button>

      {open && (
        <>
          {/* Dışarı tıklayınca kapanır — menü açıkken sayfanın geri kalanı okunabilir kalmalı. */}
          <button
            type="button"
            aria-label={isTr ? 'Kapat' : 'Close'}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-20 cursor-default"
          />
          <div className="absolute right-0 top-9 z-30 w-80 space-y-2 rounded-[6px] border border-[var(--border)] bg-[var(--card)] p-3 shadow-lg">
            {warnings.map((warning) => (
              <div key={warning.title} className="space-y-0.5">
                <div className="flex items-start gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400">
                  <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                  {warning.title}
                </div>
                <div className="pl-[19px] text-[11px] leading-relaxed text-[var(--fg-muted)]">
                  {warning.detail}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/// Mutabakat hiç gelmemişken elimizde yalnızca tahmin kalır. Tahmini bir "ödeme takvimi"
/// gibi grafikleştirmek onu kesinleşmiş gibi gösterirdi; bunun yerine sade bir liste.
function ForecastOnlyNotice({ days, isTr }: { days: PaymentScheduleDay[]; isTr: boolean }) {
  const forecastDays = days.filter((day) => day.isForecast && day.paymentDate);
  if (forecastDays.length === 0) return null;

  const total = forecastDays.reduce((sum, day) => sum + day.netAmount, 0);

  return (
    <div className="border-t border-[var(--border-soft)] p-3">
      <div className="mb-2 text-[11px] font-bold text-[var(--fg-muted)]">
        {isTr
          ? `Tahmini hakediş takvimi (mutabakat değil) · toplam ${money(total)}`
          : `Forecast accrual schedule (not settlement) · total ${money(total)}`}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {forecastDays.slice(0, 12).map((day) => (
          <span
            key={day.paymentDate}
            className="inline-flex items-center gap-1.5 rounded-[3px] border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10.5px] text-amber-700 dark:text-amber-400"
          >
            <span className="font-mono">{shortDate(day.paymentDate!)}</span>
            <span className="font-bold">{compactMoney(day.netAmount)}</span>
            <span className="text-[var(--fg-muted)]">
              {day.transactionCount} {isTr ? 'sipariş' : 'orders'}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

function PaymentScheduleSection({ from, to, isTr }: { from: string; to: string; isTr: boolean }) {
  const selectedStores = useStoreSelector((s) => s.selectedStores);

  const { data, isLoading } = useQuery({
    queryKey: ['marketplace-payment-schedule', selectedStores, from, to],
    queryFn: () => marketplaceFinanceApi.paymentSchedule({ from, to, platformName: TRENDYOL }),
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="border-b border-[var(--border-soft)] p-4 text-xs text-[var(--fg-muted)]">
        {isTr ? 'Ödeme takvimi yükleniyor…' : 'Loading payment schedule…'}
      </div>
    );
  }

  // SESSİZ SIFIR YASAK: mutabakat hiç alınmadığında hakediş/ödenen/bekleyen 0 çıkar ve bu
  // "bu dönem para gelmeyecek" gibi okunur. Uyarı, GERÇEK satır olup olmadığına bakar —
  // yalnızca dizi boşken bakmak yetmiyordu, çünkü tahmin satırları diziyi hiç boş bırakmıyor
  // ve uyarı bu yüzden hiç görünmüyordu.
  const hasActualSettlement = data?.days.some((day) => !day.isForecast) ?? false;

  // Mutabakat yoksa grafik çizmeyiz — tahmini bir "ödeme takvimi" gibi göstermek onu
  // kesinleşmiş sanmaya yol açar. Uyarının kendisi üst çubuktaki uyarı menüsünde durur.
  if (!data || data.days.length === 0 || !hasActualSettlement) {
    return data && data.days.length > 0
      ? <div className="border-b border-[var(--border-soft)]"><ForecastOnlyNotice days={data.days} isTr={isTr} /></div>
      : null;
  }

  // Gerçek (Trendyol'dan gelen) ve tahmini (bizim hesapladığımız, henüz mutabakatı
  // işlenmemiş) sütunlar grafikte AYRI renklerde — aynı bara karıştırılırsa kullanıcı
  // hangisinin kesin hangisinin tahmin olduğunu ayırt edemez.
  const chartDays = data.days.map((day: PaymentScheduleDay) => ({
    label: day.paymentDate ? shortDate(day.paymentDate) : (isTr ? 'Belirsiz' : 'Unknown'),
    actual: day.isForecast ? 0 : day.netAmount,
    forecast: day.isForecast ? day.netAmount : 0,
  }));

  return (
    <div data-tour="ty-reports-schedule-section" className="border-b border-[var(--border-soft)]">
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 pb-0">
        <div className="flex items-center gap-2 text-xs font-bold text-[var(--fg)]">
          {isTr ? 'Ödeme Takvimi' : 'Payment Schedule'}
        </div>

        {data.nextPaymentDate && data.nextPaymentAmount != null && (
          <div className={`inline-flex h-8 items-center gap-2 rounded-[4px] border px-3 text-xs ${
            data.nextPaymentIsForecast
              ? 'border-amber-500/30 bg-amber-500/10'
              : 'border-emerald-500/30 bg-emerald-500/10'
          }`}>
            <span className={data.nextPaymentIsForecast ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'}>
              {isTr ? 'Sıradaki ödeme: ' : 'Next payment: '}
              <strong>{fullDate(data.nextPaymentDate)}</strong>
              {' → '}
              <strong>{money(data.nextPaymentAmount)}</strong>
              {data.nextPaymentIsForecast && (isTr ? ' (tahmini)' : ' (forecast)')}
            </span>
          </div>
        )}
      </div>

      {/* ── Hakediş / Ödenen / Bekleyen — tüm zamanlar ── */}
      <div className="grid grid-cols-1 divide-y divide-[var(--border-soft)] border-t border-[var(--border-soft)] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <SummaryCell label={isTr ? 'Hakediş (tüm zamanlar)' : 'Accrued (all time)'} value={compactMoney(data.accruedTotal)} />
        <SummaryCell
          label={isTr ? 'Ödenen (tüm zamanlar)' : 'Paid (all time)'}
          value={compactMoney(data.paidTotal)}
          tone="text-emerald-600 dark:text-emerald-400"
        />
        <SummaryCell
          label={isTr ? 'Bekleyen Bakiye' : 'Pending Balance'}
          value={compactMoney(data.pendingBalance)}
          tone={data.pendingBalance >= 0 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-500/90 dark:text-rose-400'}
        />
      </div>

      <div className="h-48 p-3">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartDays} margin={{ top: 8, right: 10, bottom: 0, left: -10 }}>
            <CartesianGrid stroke="var(--border-soft)" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10.5, fill: 'var(--fg-muted)' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 10.5, fill: 'var(--fg-muted)' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: number) => compactMoney(value)}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--card)',
                borderColor: 'var(--border)',
                borderRadius: 4,
                fontSize: 12,
                color: 'var(--fg)',
              }}
              formatter={(value) => (typeof value === 'number' ? money(value) : String(value ?? ''))}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="actual" name={isTr ? 'Gerçek' : 'Actual'} fill="#10b981" radius={[3, 3, 0, 0]} stackId="pay" />
            <Bar dataKey="forecast" name={isTr ? 'Tahmini' : 'Forecast'} fill="#f59e0b" radius={[3, 3, 0, 0]} stackId="pay" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}


// -- Hazir odeme raporlari: "bu ay Trendyol'dan ne kadar alacagiz?" ---------------------
//
// Karlilik tablosu SIPARIS tarihine gore calisir; bu bolum PARANIN GELECEGI tarihe gore.
// Ikisi farkli takvimler oldugu icin ustteki tarih filtresine baglanmaz - kendi hazir
// araligi vardir, yoksa "bu ay odenecek" sorusu ustteki filtreye gore kayardi.

type PayoutPresetKey = 'this-month' | 'next-30' | 'last-month' | 'this-quarter';

const PAYOUT_PRESETS: { key: PayoutPresetKey; tr: string; en: string }[] = [
  { key: 'this-month',   tr: 'Bu Ay Ödenecek',    en: 'Due This Month' },
  { key: 'next-30',      tr: 'Önümüzdeki 30 Gün', en: 'Next 30 Days' },
  { key: 'last-month',   tr: 'Geçen Ay Ödenen',   en: 'Paid Last Month' },
  { key: 'this-quarter', tr: 'Bu Çeyrek',         en: 'This Quarter' },
];

function resolvePayoutPreset(key: PayoutPresetKey): { from: string; to: string } {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  if (key === 'this-month') {
    return {
      from: localDateStr(new Date(year, month, 1)),
      to: localDateStr(new Date(year, month + 1, 0)),
    };
  }

  if (key === 'last-month') {
    return {
      from: localDateStr(new Date(year, month - 1, 1)),
      to: localDateStr(new Date(year, month, 0)),
    };
  }

  if (key === 'this-quarter') {
    const quarterStartMonth = Math.floor(month / 3) * 3;
    return {
      from: localDateStr(new Date(year, quarterStartMonth, 1)),
      to: localDateStr(new Date(year, quarterStartMonth + 3, 0)),
    };
  }

  const in30 = new Date(today);
  in30.setDate(today.getDate() + 30);
  return { from: localDateStr(today), to: localDateStr(in30) };
}

const PAYOUT_EXPORT_COLUMNS: ExportColumn[] = [
  { key: 'platformName', header: 'Pazaryeri' },
  { key: 'salesCredit', header: 'Satış', type: 'money' },
  { key: 'returns', header: 'İade', type: 'money' },
  { key: 'commission', header: 'Komisyon', type: 'money' },
  { key: 'deduction', header: 'Kesinti', type: 'money' },
  { key: 'advertising', header: 'Reklam', type: 'money' },
  { key: 'other', header: 'Diğer', type: 'money' },
  { key: 'netPayout', header: 'Net Ödeme', type: 'money' },
  { key: 'transactionCount', header: 'Kayıt', type: 'int' },
  { key: 'nextPaymentDate', header: 'Sıradaki Ödeme', type: 'date' },
];

function PayoutAmount({ value }: { value: number }) {
  const tone = value > 0
    ? 'text-emerald-600 dark:text-emerald-400'
    : value < 0
      ? 'text-rose-500/90 dark:text-rose-400'
      : 'text-[var(--fg-muted)]';
  return <span className={`font-mono ${tone}`}>{money(value)}</span>;
}

function PayoutReportSection({ isTr }: { isTr: boolean }) {
  const [payoutPreset, setPayoutPreset] = useState<PayoutPresetKey>('this-month');
  const selectedStores = useStoreSelector((state) => state.selectedStores);
  const { from, to } = useMemo(() => resolvePayoutPreset(payoutPreset), [payoutPreset]);

  // Bu ekran Trendyol'a özgü — filtre gönderilmezse rapor tüm pazaryerlerini toplar
  // (bkz. TRENDYOL sabitinin yanındaki gerekçe).
  const { data, isLoading, isError } = useQuery({
    queryKey: ['marketplace-payout-report', selectedStores, from, to],
    queryFn: () => marketplaceFinanceApi.payoutReport({ from, to, platformName: TRENDYOL }),
    staleTime: 60_000,
  });

  return (
    <div data-tour="ty-reports-payout-section" className="border-b border-[var(--border-soft)]">
      <div className="flex flex-wrap items-center justify-between gap-3 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-[var(--fg)]">
            {isTr ? 'Ödeme Raporu' : 'Payout Report'}
          </span>
          <div className="flex flex-wrap items-center gap-1 rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] p-0.5">
            {PAYOUT_PRESETS.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setPayoutPreset(option.key)}
                className={`h-6.5 cursor-pointer rounded-[3px] px-2.5 text-[11px] font-semibold transition ${
                  payoutPreset === option.key
                    ? 'border border-[var(--border)] bg-[var(--card)] font-bold text-[var(--fg)] shadow-xs'
                    : 'border border-transparent text-[var(--fg-muted)] hover:text-[var(--fg)]'
                }`}
              >
                {isTr ? option.tr : option.en}
              </button>
            ))}
          </div>
          <span className="font-mono text-[10.5px] text-[var(--fg-muted)]">
            {fullDate(from)} — {fullDate(to)}
          </span>
        </div>

        {data && data.rows.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex h-8 items-center gap-2 rounded-[4px] border border-emerald-500/30 bg-emerald-500/10 px-3 text-xs">
              <span className="text-emerald-700 dark:text-emerald-400">
                {isTr ? 'Toplam net ödeme: ' : 'Total net payout: '}
                <strong>{money(data.totalNetPayout)}</strong>
              </span>
            </div>
            {data.undatedNet !== 0 && (
              <div
                title={isTr
                  ? 'Pazaryeri henüz ödeme tarihi belirlemedi — bu tutar yukarıdaki toplama DAHİL DEĞİL.'
                  : 'The marketplace has not set a payment date yet — this amount is NOT in the total above.'}
                className="inline-flex h-8 items-center gap-2 rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] px-3 text-xs"
              >
                <span className="text-[var(--fg-muted)]">
                  {isTr ? 'Tarihi belirsiz: ' : 'Undated: '}
                  <strong className="text-[var(--fg)]">{money(data.undatedNet)}</strong>
                </span>
              </div>
            )}
            <ExportMenu
              filename={`odeme-raporu-${from}-${to}`}
              columns={PAYOUT_EXPORT_COLUMNS}
              totalHint={data.rows.length}
              getDataAsync={async () => data.rows.map((row: PayoutReportRow) => ({
                ...row,
                nextPaymentDate: row.nextPaymentDate ?? '',
                nextPaymentAmount: row.nextPaymentAmount ?? 0,
              }))}
            />
          </div>
        )}
      </div>

      {isLoading && (
        <div className="p-4 pt-0 text-xs text-[var(--fg-muted)]">
          {isTr ? 'Ödeme raporu yükleniyor…' : 'Loading payout report…'}
        </div>
      )}

      {isError && (
        <div className="p-4 pt-0 text-xs text-rose-500">
          {isTr ? 'Ödeme raporu yüklenemedi.' : 'Failed to load payout report.'}
        </div>
      )}

      {data && !isLoading && data.rows.length === 0 && (
        <div className="p-4 pt-0 text-xs text-[var(--fg-muted)]">
          {isTr
            ? 'Bu aralıkta ödeme tarihi belirlenmiş mutabakat satırı yok.'
            : 'No settlement rows with a payment date in this range.'}
        </div>
      )}

      {data && data.rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead className="border-y border-[var(--border-soft)] bg-[var(--bg-subtle)] text-[10.5px] font-bold uppercase tracking-wider text-[var(--fg-muted)]">
              <tr>
                <th className="p-2.5 pl-3">{isTr ? 'Pazaryeri' : 'Marketplace'}</th>
                <th className="p-2.5 text-right">{isTr ? 'Satış' : 'Sales'}</th>
                <th className="p-2.5 text-right">{isTr ? 'İade' : 'Returns'}</th>
                <th className="p-2.5 text-right">{isTr ? 'Komisyon' : 'Commission'}</th>
                <th className="p-2.5 text-right">{isTr ? 'Kesinti' : 'Deductions'}</th>
                <th className="p-2.5 text-right">{isTr ? 'Reklam' : 'Ads'}</th>
                <th className="p-2.5 text-right">{isTr ? 'Net Ödeme' : 'Net Payout'}</th>
                <th className="p-2.5 pr-3 text-right">{isTr ? 'Sıradaki Ödeme' : 'Next Payment'}</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => (
                <tr key={row.platformId} className="border-b border-[var(--border-soft)] last:border-0">
                  <td className="p-2.5 pl-3 font-semibold text-[var(--fg)]">{row.platformName}</td>
                  <td className="p-2.5 text-right"><PayoutAmount value={row.salesCredit} /></td>
                  <td className="p-2.5 text-right"><PayoutAmount value={row.returns} /></td>
                  <td className="p-2.5 text-right"><PayoutAmount value={row.commission} /></td>
                  <td className="p-2.5 text-right"><PayoutAmount value={row.deduction} /></td>
                  <td className="p-2.5 text-right"><PayoutAmount value={row.advertising} /></td>
                  <td className="p-2.5 text-right font-bold"><PayoutAmount value={row.netPayout} /></td>
                  <td className="p-2.5 pr-3 text-right text-[var(--fg-muted)]">
                    {row.nextPaymentDate
                      ? <>{fullDate(row.nextPaymentDate)} · <span className="font-mono text-[var(--fg)]">{money(row.nextPaymentAmount ?? 0)}</span></>
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function MarketplaceProfitPageView() {
  const { lang } = useI18n();
  const isTr = lang === 'tr';

  const [preset, setPreset] = useState<PresetKey>('month');
  const [customFrom, setCustomFrom] = useState<string | null>(null);
  const [customTo, setCustomTo] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  // Özel aralıkta yalnızca bir uç girildiyse diğeri ön ayarın karşılığına düşer — ikisini de
  // beklemek, kullanıcı ilk tarihi yazdığında filtreyi sessizce eski aralıkta bırakırdı.
  const { from, to } = useMemo(() => {
    const fallback = resolveDatePreset(preset === 'custom' ? '30days' : preset);
    if (preset !== 'custom') return fallback;
    return { from: customFrom || fallback.from, to: customTo || fallback.to };
  }, [preset, customFrom, customTo]);

  // Mağaza kapsamı X-Store başlığıyla gidiyor ve sunucuda uygulanıyor; queryKey'e dahil
  // EDİLMEZSE mağaza değiştiğinde react-query eski mağazanın rakamlarını yeni mağaza
  // etiketiyle servis eder (bkz. ExpensesProfitView'daki aynı kural).
  const selectedStores = useStoreSelector((s) => s.selectedStores);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['marketplace-profit', selectedStores, from, to, page],
    queryFn: () => orderProfitabilityApi.get({ from, to, page, pageSize: PAGE_SIZE, platformName: TRENDYOL }),
    staleTime: 60_000,
  });

  const PRESET_OPTIONS: FilterSelectOption[] = [
    { value: 'week', label: isTr ? 'Bu Hafta' : 'This Week' },
    { value: 'month', label: isTr ? 'Bu Ay' : 'This Month' },
    { value: 'lastMonth', label: isTr ? 'Geçen Ay' : 'Last Month' },
    { value: '30days', label: isTr ? 'Son 30 Gün' : 'Last 30 Days' },
    { value: 'custom', label: isTr ? 'Özel Tarih Aralığı' : 'Custom Range' },
  ];

  const summary = data?.summary;
  const totalPages = data ? Math.max(1, Math.ceil(data.totalCount / PAGE_SIZE)) : 1;

  // Mutabakat işlenmemişse rapor tahmine dayanır — kullanıcı bunu bilmeli, yoksa tahmini
  // rakamları kesinleşmiş sanır.
  const reportedPercent = summary ? Math.round(summary.marketplaceReportedCommissionRatio * 100) : 0;

  // Ödeme takvimiyle AYNI sorgu anahtarı: react-query önbelleği paylaştığı için ek istek
  // atılmaz, ama uyarıyı üst çubukta gösterebilmek için burada da duruma bakmamız gerekiyor.
  const { data: paymentSchedule } = useQuery({
    queryKey: ['marketplace-payment-schedule', selectedStores, from, to],
    queryFn: () => marketplaceFinanceApi.paymentSchedule({ from, to, platformName: TRENDYOL }),
    staleTime: 60_000,
  });

  const hasActualSettlement = paymentSchedule?.days.some((day) => !day.isForecast) ?? false;

  const warnings: PageWarning[] = [
    !hasActualSettlement
      ? {
          title: isTr ? 'Ödeme verisi yok — mutabakat alınmıyor' : 'No payment data — settlement not ingested',
          detail: isTr
            ? 'Mutabakat, Trendyol\'un "şu siparişten şu kadar komisyon kestim, sana şu kadar ödeyeceğim" diye gönderdiği resmî hesap dökümüdür. Bu kayıtlar veritabanında yok; bu yüzden hakediş/ödenen/bekleyen 0 ve komisyonlar TAHMİNİ. Ayarlar → Entegrasyon Merkezi → Trendyol bağlantısı → finans/mutabakat kaynağını "Aktif" yapın.'
            : 'Settlement is Trendyol\'s official statement of the commission it deducted and the amount it will pay. Those records are not in the database, so accrued/paid/pending are 0 and commissions are ESTIMATES. Activate the finance resource on the Trendyol connection in Integration Hub.',
        }
      : null,
    summary && summary.missingShippingItemCount > 0
      ? {
          title: isTr
            ? `${summary.missingShippingItemCount} kalemin kargosu hesaplanamadı`
            : `${summary.missingShippingItemCount} items missing shipping cost`,
          detail: isTr
            ? 'Bu kalemlerde desi ya da kargo tarifesi eksik olduğu için kargo maliyeti 0 sayıldı — net kâr olduğundan YÜKSEK görünüyor.'
            : 'Desi or carrier rate is missing for these items, so shipping was counted as 0 — net profit is overstated.',
        }
      : null,
    summary && summary.itemCount > 0 && reportedPercent < 100
      ? {
          title: isTr
            ? `Komisyonun %${reportedPercent}'i gerçek veriden`
            : `${reportedPercent}% of commission from real data`,
          detail: isTr
            ? 'Kalan kısım mağaza komisyon oranıyla hesaplanan tahmindir; mutabakat geldikçe gerçek tutarla değişir.'
            : 'The rest is estimated from the store commission rate and will change as settlement data arrives.',
        }
      : null,
  ].filter((warning): warning is PageWarning => warning !== null);

  // Dışa aktarma FİLTRELENEN TÜM satırları ister, yalnızca görünen sayfayı değil — bu yüzden
  // aynı filtrelerle ayrı bir istek atar (büyük pageSize, backend'in üst sınırı buna izin
  // veriyor). Tabloda gördüğü ile indirdiği satır sayısı farklı olabilir, bu kasıtlı.
  const exportFilename = `trendyol-raporlama-${from}-${to}`;

  return (
    // TEK SCROLL KONTEYNERİ: sayfanın tamamı burada kayar. Önceden tablo kendi içinde AYRICA
    // overflow-auto taşıyordu (iç içe scroll) — kullanıcı fare tekerleğini tablo üzerinde
    // çevirdiğinde yalnızca o küçük kutu kayıyor, özet/grafik/ödeme takvimi görünmeden kalıyordu.
    <div className="h-full w-full overflow-y-auto bg-transparent p-4 md:p-5">
      <div className="rounded-[6px] border border-[var(--border-soft)] bg-[var(--card)]">

        {/* Sayfa başlığı YOK: sol menüde ve sekme çubuğunda zaten yazıyor, üçüncü kez
            tekrarlamak ekranın en değerli üst şeridini harcıyordu. */}
        {/* ── Üst çubuk: tarih filtresi + dışa aktar + uyarılar ── */}
        <div data-tour="ty-reports-toolbar" className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-soft)] p-3">
          <div className="flex flex-wrap items-center gap-2">
            <FilterSelect
              value={preset}
              options={PRESET_OPTIONS}
              placeholder={isTr ? 'Tarih Aralığı' : 'Date Range'}
              onChange={(val) => {
                const next = (val || 'month') as PresetKey;
                setPreset(next);
                setPage(1);
                if (next !== 'custom') {
                  setCustomFrom(null);
                  setCustomTo(null);
                }
              }}
              minWidth={140}
            />

            {preset === 'custom' && (
              <div className="flex items-center gap-1">
                <input
                  type="date"
                  value={customFrom || from}
                  onChange={(e) => { setCustomFrom(e.target.value); setPage(1); }}
                  className="h-8 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-2 font-mono text-xs font-semibold text-[var(--fg)] outline-none focus:border-[var(--fg)]"
                />
                <span className="text-xs text-[var(--fg-muted)]">—</span>
                <input
                  type="date"
                  value={customTo || to}
                  onChange={(e) => { setCustomTo(e.target.value); setPage(1); }}
                  className="h-8 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-2 font-mono text-xs font-semibold text-[var(--fg)] outline-none focus:border-[var(--fg)]"
                />
              </div>
            )}

            <ExportMenu
              filename={exportFilename}
              columns={EXPORT_COLUMNS}
              totalHint={data?.totalCount}
              getDataAsync={async () => {
                const full = await orderProfitabilityApi.get({
                  from, to, page: 1, pageSize: EXPORT_PAGE_SIZE, platformName: TRENDYOL,
                });
                return full.items.map(exportRow);
              }}
            />
          </div>

          <WarningsMenu warnings={warnings} isTr={isTr} />
        </div>

        {/* ── Hazır ödeme raporları: platform bazında "bu ay ne kadar alacağız".
            Kendi tarih aralığı var (üstteki filtre SİPARİŞ tarihine göre çalışır,
            bu bölüm PARANIN GELECEĞİ tarihe göre) — bkz. bölüm yorumu. ── */}
        <PayoutReportSection isTr={isTr} />

        {/* ── Ödeme takvimi BİRİNCİL bölüm: "ne zaman ne kadar ödeme gelecek" — sipariş
            verisi yüklenmeden/boşken bile bağımsız çalışır, kendi sorgusunu atar ── */}
        <PaymentScheduleSection from={from} to={to} isTr={isTr} />

        <div className="border-b border-[var(--border-soft)] p-3 text-xs font-bold text-[var(--fg)]">
          {isTr ? 'Sipariş Bazlı Kârlılık (detay)' : 'Order-Level Profitability (detail)'}
        </div>

        {isLoading && (
          <div className="p-8 text-center text-xs text-[var(--fg-muted)]">
            {isTr ? 'Yükleniyor…' : 'Loading…'}
          </div>
        )}

        {isError && (
          <div className="p-8 text-center text-xs text-rose-500">
            {isTr ? 'Rapor yüklenemedi.' : 'Failed to load report.'}
          </div>
        )}

        {data && summary && summary.itemCount === 0 && (
          <div className="p-8 text-center text-xs text-[var(--fg-muted)]">
            {isTr ? 'Seçilen tarih aralığında sipariş yok.' : 'No orders in the selected range.'}
          </div>
        )}

        {data && summary && summary.itemCount > 0 && (
          <>
            {/* ── Özet şeridi ── */}
            <div data-tour="ty-reports-summary" className="grid grid-cols-1 divide-y divide-[var(--border-soft)] border-b border-[var(--border-soft)] bg-[var(--bg-subtle)]/30 sm:grid-cols-3 sm:divide-x sm:divide-y-0 lg:grid-cols-5">
              <SummaryCell label={isTr ? 'Ciro' : 'Revenue'} value={compactMoney(summary.totalRevenue)} />
              <SummaryCell
                label={isTr ? 'Komisyon' : 'Commission'}
                value={compactMoney(summary.totalCommission)}
                tone="text-rose-500/90 dark:text-rose-400"
              />
              <SummaryCell
                label={isTr ? 'Kargo' : 'Shipping'}
                value={compactMoney(summary.totalShipping)}
                tone="text-amber-500/90 dark:text-amber-400"
              />
              <SummaryCell
                label={isTr ? 'KDV' : 'VAT'}
                value={compactMoney(summary.totalVat)}
                tone="text-[var(--fg-muted)]"
              />
              <SummaryCell
                label={isTr ? 'Net Kâr' : 'Net Profit'}
                value={compactMoney(summary.totalNetProfit)}
                tone={summary.totalNetProfit >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-500/90 dark:text-rose-400'}
              />
            </div>

            {/* ── Günlük trend grafiği ──
                Maliyetler (komisyon + kargo) TEK SÜTUNDA ÜST ÜSTE, cironun yanında durur:
                önceden üç bar yan yanaydı ve "ciro mu daha büyük, maliyet mi" sorusu
                gözle karşılaştırmayla cevaplanıyordu. maxBarSize, az günlü aralıklarda
                (ör. 2 gün) barların ekranı kaplayan devasa bloklara dönüşmesini engeller. */}
            <div data-tour="ty-reports-chart" className="h-72 border-b border-[var(--border-soft)] p-3">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data.daily} margin={{ top: 8, right: 10, bottom: 0, left: -10 }} barGap={4}>
                  <CartesianGrid stroke="var(--border-soft)" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10.5, fill: 'var(--fg-muted)' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={shortDate}
                  />
                  <YAxis
                    tick={{ fontSize: 10.5, fill: 'var(--fg-muted)' }}
                    tickLine={false}
                    axisLine={false}
                    width={64}
                    tickFormatter={(value: number) => compactMoney(value)}
                  />
                  <Tooltip
                    cursor={{ fill: 'var(--bg-subtle)', opacity: 0.5 }}
                    contentStyle={{
                      backgroundColor: 'var(--card)',
                      borderColor: 'var(--border)',
                      borderRadius: 4,
                      fontSize: 12,
                      color: 'var(--fg)',
                    }}
                    formatter={(value) => (typeof value === 'number' ? money(value) : String(value ?? ''))}
                    labelFormatter={(label) => shortDate(String(label))}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" iconSize={8} />
                  <Bar
                    dataKey="revenue"
                    name={isTr ? 'Ciro' : 'Revenue'}
                    fill="#38bdf8"
                    radius={[3, 3, 0, 0]}
                    maxBarSize={44}
                  />
                  <Bar
                    dataKey="commission"
                    stackId="cost"
                    name={isTr ? 'Komisyon' : 'Commission'}
                    fill="#f43f5e"
                    maxBarSize={44}
                  />
                  <Bar
                    dataKey="shipping"
                    stackId="cost"
                    name={isTr ? 'Kargo' : 'Shipping'}
                    fill="#f59e0b"
                    radius={[3, 3, 0, 0]}
                    maxBarSize={44}
                  />
                  <Line
                    type="monotone"
                    dataKey="netProfit"
                    name={isTr ? 'Net Kâr' : 'Net Profit'}
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={{ r: 2.5, fill: '#10b981', strokeWidth: 0 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* ── Sipariş kalemi tablosu ── */}
            <table data-tour="ty-reports-table" className="w-full border-collapse text-left text-xs">
              {/* STICKY BAŞLIK OPAK OLMALI: --bg-subtle yarı saydam olduğu için altından
                  kayan satırlar başlığın içinden görünüyor, başlık okunmaz hâle geliyordu.
                  Kart rengi + üstteki bölümlerden yüksek z-index bunu keser.
                  (Diğer dalda sticky tamamen kaldırılmıştı; uzun tabloda sütun başlığını
                  kaybetmemek için stickylik korunup asıl kusur — saydamlık — düzeltildi.) */}
              <thead className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--card)] text-[10.5px] font-bold uppercase tracking-wider text-[var(--fg-muted)] shadow-[0_1px_0_var(--border-soft)]">
                <tr>
                  <th className="px-3.5 py-2.5">{isTr ? 'Sipariş' : 'Order'}</th>
                  <th className="px-3.5 py-2.5">{isTr ? 'Ürün' : 'Product'}</th>
                  <th className="px-3.5 py-2.5 text-right">{isTr ? 'Adet' : 'Qty'}</th>
                  <th className="px-3.5 py-2.5 text-right">{isTr ? 'Satış' : 'Sale'}</th>
                  <th className="px-3.5 py-2.5 text-right">{isTr ? 'KDV' : 'VAT'}</th>
                  <th className="px-3.5 py-2.5 text-right">{isTr ? 'Komisyon' : 'Commission'}</th>
                  <th className="px-3.5 py-2.5 text-right">{isTr ? 'Kargo' : 'Shipping'}</th>
                  <th className="px-3.5 py-2.5 text-right">{isTr ? 'Alış' : 'Cost'}</th>
                  <th className="px-3.5 py-2.5 text-right">{isTr ? 'Net Kâr' : 'Net Profit'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-soft)]">
                {data.items.map((row, index) => (
                  <tr key={`${row.orderId}-${row.sku}-${index}`} className="hover:bg-[var(--bg-subtle)]/50">
                    <td className="px-3.5 py-2">
                      <div title={row.platformOrderNumber} className="max-w-[160px] truncate font-mono text-[11px] font-semibold text-[var(--fg)]">
                        {formatOrderNumber(row.platformOrderNumber)}
                      </div>
                      <div className="text-[10px] text-[var(--fg-muted)]">
                        {new Date(row.orderDate).toLocaleDateString('tr-TR')} · {row.storeName}
                      </div>
                    </td>
                    <td className="max-w-[260px] px-3.5 py-2">
                      <div className="truncate text-[var(--fg)]" title={row.productName}>
                        {row.productName}
                      </div>
                      <div className="font-mono text-[10px] text-[var(--fg-muted)]">{row.sku}</div>
                    </td>
                    <td className="px-3.5 py-2 text-right font-mono tabular-nums">{row.quantity}</td>
                    <td className="px-3.5 py-2 text-right font-mono tabular-nums">{money(row.salePrice)}</td>
                    <td className="px-3.5 py-2 text-right font-mono tabular-nums text-[var(--fg-muted)]">
                      {money(row.vat)}
                    </td>
                    <td className="whitespace-nowrap px-3.5 py-2 text-right font-mono tabular-nums">
                      {money(row.commission)}
                      <SourceBadge source={row.commissionSource} isTr={isTr} />
                    </td>
                    <td className="whitespace-nowrap px-3.5 py-2 text-right font-mono tabular-nums">
                      {money(row.shipping)}
                      <SourceBadge source={row.shippingSource} isTr={isTr} />
                    </td>
                    <td className="px-3.5 py-2 text-right font-mono tabular-nums text-[var(--fg-muted)]">
                      {money(row.productCost)}
                    </td>
                    <td
                      className={`px-3.5 py-2 text-right font-mono font-bold tabular-nums ${
                        row.netProfit >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-500/90 dark:text-rose-400'
                      }`}
                    >
                      {money(row.netProfit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* ── Sayfalama ── */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-[var(--border-soft)] p-3 text-xs">
                <span className="text-[var(--fg-muted)]">
                  {isTr
                    ? `${data.totalCount} kalem · Sayfa ${page}/${totalPages}`
                    : `${data.totalCount} items · Page ${page}/${totalPages}`}
                </span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="h-8 rounded-[4px] border border-[var(--border)] px-3 font-semibold text-[var(--fg)] disabled:opacity-40"
                  >
                    {isTr ? 'Önceki' : 'Previous'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="h-8 rounded-[4px] border border-[var(--border)] px-3 font-semibold text-[var(--fg)] disabled:opacity-40"
                  >
                    {isTr ? 'Sonraki' : 'Next'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
