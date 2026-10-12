'use client';

import { Fragment, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw, ChevronRight } from 'lucide-react';
import { financeApi } from '../../lib/api';
import { ExportMenu, type ExportRow } from '../ui/ExportMenu';
import { formatCellText, type ExportColumn } from '../../lib/export';
import { useI18n } from '../../lib/i18n';
import { useBaseCurrency } from '../../hooks/useBaseCurrency';
import { useMobile } from '../../hooks/useMobile';
import { FormSelect, type FormSelectOption } from '../ui/FormSelect';
import { SegmentedControl } from '../ui/SegmentedControl';
import type { PnlCoverage, PnlMonth } from '../../types/api';
import type { TranslationKey } from '../../lib/translations/tr';

type TFunc = (key: TranslationKey) => string;

const MONTH_LABELS_TR = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const MONTH_LABELS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const YEARS = [2024, 2025, 2026, 2027];

function fmt(n: number): string {
  const rounded = Math.round(n);
  if (rounded === 0) return '—';
  const abs = Math.abs(rounded).toLocaleString('tr-TR');
  return rounded < 0 ? `(${abs})` : abs;
}

function fmtGbpInline(n: number): string {
  const rounded = Math.round(n);
  if (rounded === 0) return '0';
  return (rounded < 0 ? '-' : '') + Math.abs(rounded).toLocaleString('tr-TR');
}

function fmtPercent(n: number): string {
  if (!isFinite(n)) return '—';
  return `%${n.toFixed(1)}`;
}

type RowTone = 'default' | 'subtotal' | 'gross' | 'net';

function toneRowBg(tone: RowTone, total: number): string {
  if (tone === 'gross') return 'bg-emerald-500/5';
  if (tone === 'net') return total >= 0 ? 'bg-emerald-500/5' : 'bg-rose-500/5';
  if (tone === 'subtotal') return 'bg-[var(--bg-subtle)]/60';
  return '';
}

function toneTextClass(tone: RowTone, total: number): string {
  if (tone === 'gross') return 'text-emerald-600/90 dark:text-emerald-400 font-bold';
  if (tone === 'net') return total >= 0 ? 'text-emerald-600/90 dark:text-emerald-400 font-bold' : 'text-rose-500/90 dark:text-rose-400 font-bold';
  return '';
}

function toneBorderClass(tone: RowTone, total: number): string {
  if (tone === 'gross') return 'border-emerald-500/20';
  if (tone === 'net') return total >= 0 ? 'border-emerald-500/20' : 'border-rose-500/20';
  return '';
}

// ── Veri Kapsamı Rozeti ───────────────────────────────────────────────────────

// "x/y": maliyet satırının kaç kalemde GERÇEK veriye dayandığı. Eksik veri sessizce 0 maliyet
// yazıp kârı şişirdiği için körlüğü görünür kılar — tam kapsamda nötr, eksikte uyarı rengi.
function CoverageBadge({ coverage, hint }: { coverage: PnlCoverage; hint: string }) {
  if (coverage.total === 0) return null;

  const isComplete = coverage.covered >= coverage.total;
  const tone = isComplete
    ? 'text-[var(--fg-muted)] bg-[var(--bg-subtle)]'
    : 'text-amber-600 dark:text-amber-400 bg-amber-500/10';

  return (
    <span
      title={`${coverage.covered}/${coverage.total} ${hint}`}
      className={`ml-1.5 rounded-[3px] px-1 py-px font-mono text-[9.5px] font-semibold ${tone}`}
    >
      {coverage.covered}/{coverage.total}
    </span>
  );
}

// Kargosu HIC hesaplanamayan kalem uyarisi. Kapsam rozetinden farki: orasi "veri var mi",
// burasi "hesap yapilabildi mi" — bu kalemlerin kargosu toplama HIC girmedi, dolayisiyla
// satirdaki rakam gercek maliyetin ALTINDA.
function UnknownShippingBadge({ lines }: { lines: number }) {
  if (lines <= 0) return null;

  return (
    <span
      title={`${lines} kalemde kargo maliyeti bilinmiyor — bu kalemler toplama dahil değil`}
      className="ml-1.5 rounded-[3px] bg-rose-500/10 px-1 py-px text-[9.5px] font-semibold text-rose-600 dark:text-rose-400"
    >
      kargo bilinmiyor: {lines}
    </span>
  );
}

// ── PnL Satırı ────────────────────────────────────────────────────────────────

function PnlRow({
  label,
  values,
  total,
  tone = 'default',
  indent = false,
  negative = false,
  monthFilterIndex = null,
  revenueValue = 0,
  annualTotal = 0,
  coverage = null,
  coverageHint = '',
  unknownShippingLines = 0,
}: {
  label: string;
  values: number[];
  total: number;
  tone?: RowTone;
  indent?: boolean;
  negative?: boolean;
  monthFilterIndex?: number | null;
  revenueValue?: number;
  annualTotal?: number;
  coverage?: PnlCoverage | null;
  coverageHint?: string;
  // Kargo satirina ozel: hesaplanamayan kalem sayisi (bkz. UnknownShippingBadge).
  unknownShippingLines?: number;
}) {
  const { isBaseOnly, toGbp } = useBaseCurrency();
  const isHighlight = tone === 'gross' || tone === 'net';
  const rowBg = toneRowBg(tone, total);
  const highlightText = toneTextClass(tone, total);
  const labelColor = isHighlight ? highlightText : tone === 'subtotal' ? 'text-[var(--fg)] font-semibold' : 'text-[var(--fg-muted)]';
  const stickyBg = rowBg || 'bg-[var(--card)]';
  const rowBorder = isHighlight ? `border-y ${toneBorderClass(tone, total)}` : 'border-b border-[var(--border-soft)]';

  const cellColor = (v: number) =>
    (negative && v > 0) || v < 0 ? 'text-rose-500/90 dark:text-rose-400' : isHighlight ? highlightText : 'text-[var(--fg)]';

  const labelCell = (
    <td
      className={`sticky left-0 z-10 whitespace-nowrap py-2.5 ${
        indent ? 'pl-6 pr-3' : 'px-3.5'
      } min-w-[200px] border-r border-[var(--border-soft)] ${stickyBg} ${
        isHighlight ? 'text-xs uppercase tracking-wider' : 'text-xs'
      } ${labelColor}`}
    >
      {label}
      {coverage && <CoverageBadge coverage={coverage} hint={coverageHint} />}
      <UnknownShippingBadge lines={unknownShippingLines} />
    </td>
  );

  if (monthFilterIndex !== null) {
    const v = values[monthFilterIndex] ?? 0;
    const ratioToRevenue = revenueValue > 0 ? (v / revenueValue) * 100 : 0;
    const shareInAnnual = annualTotal !== 0 ? (v / annualTotal) * 100 : 0;

    return (
      <tr className={`${rowBg} ${rowBorder} hover:bg-[var(--bg-subtle)]/30 transition`}>
        {labelCell}
        <td className={`px-3 py-2.5 text-right font-mono text-xs ${cellColor(v)}`}>
          {negative && v !== 0 ? `(${Math.abs(Math.round(v)).toLocaleString('tr-TR')})` : fmt(v)}
        </td>
        <td className={`px-3 py-2.5 text-right font-mono text-xs ${isHighlight ? highlightText : 'text-[var(--fg-muted)]'}`}>
          {ratioToRevenue !== 0 ? fmtPercent(ratioToRevenue) : '—'}
        </td>
        <td className={`bg-[var(--bg-subtle)]/40 px-3.5 py-2.5 text-right font-mono text-xs font-bold ${isHighlight ? highlightText : 'text-[var(--fg-muted)]'}`}>
          {shareInAnnual !== 0 ? fmtPercent(shareInAnnual) : '—'}
        </td>
      </tr>
    );
  }

  return (
    <tr className={`${rowBg} ${rowBorder} hover:bg-[var(--bg-subtle)]/30 transition`}>
      {labelCell}
      {values.map((v, i) => (
        <td key={i} className={`px-2.5 py-2 text-right font-mono text-xs ${cellColor(v)}`}>
          {negative && v !== 0 ? `(${Math.abs(Math.round(v)).toLocaleString('tr-TR')})` : fmt(v)}
        </td>
      ))}
      <td
        className={`bg-[var(--bg-subtle)]/40 px-3.5 py-2 text-right font-mono text-xs font-bold ${
          negative && total > 0 ? 'text-red-500' : isHighlight ? highlightText : 'text-[var(--fg)]'
        }`}
      >
        {negative && total !== 0 ? `(${Math.abs(Math.round(total)).toLocaleString('tr-TR')})` : fmt(total)}
        {isBaseOnly && total !== 0 && toGbp(total) != null && (
          <span className="ml-1 font-normal opacity-75">(£{fmtGbpInline(toGbp(total)!)})</span>
        )}
      </td>
    </tr>
  );
}

// ── Yüzde Satırı ──────────────────────────────────────────────────────────────

function PnlPercentRow({
  label,
  values,
  total,
  monthFilterIndex = null,
}: {
  label: string;
  values: number[];
  total: number;
  monthFilterIndex?: number | null;
}) {
  const labelCell = (
    <td className="sticky left-0 z-10 min-w-[200px] whitespace-nowrap border-r border-[var(--border-soft)] bg-[var(--card)] py-1.5 pl-6 pr-3 font-mono text-[11px] text-[var(--fg-muted)]">
      {label}
    </td>
  );

  if (monthFilterIndex !== null) {
    const v = values[monthFilterIndex] ?? 0;
    return (
      <tr className="border-b border-[var(--border-soft)]">
        {labelCell}
        <td className={`px-3 py-1.5 text-right font-mono text-[11px] ${v >= 0 ? 'text-[var(--fg-muted)]' : 'text-red-500'}`}>
          {fmtPercent(v)}
        </td>
        <td className="px-3 py-1.5 text-right font-mono text-[11px] text-[var(--fg-muted)]">—</td>
        <td className={`bg-[var(--bg-subtle)]/40 px-3.5 py-1.5 text-right font-mono text-[11px] font-bold ${total >= 0 ? 'text-[var(--fg-muted)]' : 'text-red-500'}`}>
          {fmtPercent(total)}
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-[var(--border-soft)]">
      {labelCell}
      {values.map((v, i) => (
        <td key={i} className={`px-2.5 py-1.5 text-right font-mono text-[11px] ${v >= 0 ? 'text-[var(--fg-muted)]' : 'text-red-500'}`}>
          {fmtPercent(v)}
        </td>
      ))}
      <td className={`bg-[var(--bg-subtle)]/40 px-3.5 py-1.5 text-right font-mono text-[11px] font-bold ${total >= 0 ? 'text-[var(--fg-muted)]' : 'text-red-500'}`}>
        {fmtPercent(total)}
      </td>
    </tr>
  );
}

// ── KDV Alt Satırı ────────────────────────────────────────────────────────────

// Bir maliyet satırının İÇİNDEKİ KDV. Ayrı bir satır DEĞİL, üstteki satırın açıklaması —
// bu yüzden girintili, küçük ve soluk. Net KDV rakamı tek başına duruyordu ve içinden neyin
// indirildiği hiçbir ekrandan görülemiyordu; komisyon KDV'sinin indirilmediği bu yüzden
// yıllarca fark edilmemişti.
function PnlVatRow({
  label,
  values,
  total,
  monthFilterIndex = null,
}: {
  label: string;
  values: number[];
  total: number;
  monthFilterIndex?: number | null;
}) {
  const cell = (v: number) => (v === 0 ? '—' : Math.round(v).toLocaleString('tr-TR'));

  const labelCell = (
    <td className="sticky left-0 z-10 min-w-[200px] whitespace-nowrap border-r border-[var(--border-soft)] bg-[var(--card)] py-1 pl-10 pr-3 text-[10.5px] italic text-[var(--fg-muted)]">
      {label}
    </td>
  );

  if (monthFilterIndex !== null) {
    return (
      <tr className="border-b border-[var(--border-soft)]">
        {labelCell}
        <td className="px-3 py-1 text-right font-mono text-[10.5px] text-[var(--fg-muted)]">
          {cell(values[monthFilterIndex] ?? 0)}
        </td>
        <td className="px-3 py-1 text-right font-mono text-[10.5px] text-[var(--fg-muted)]">—</td>
        <td className="bg-[var(--bg-subtle)]/40 px-3.5 py-1 text-right font-mono text-[10.5px] text-[var(--fg-muted)]">
          {cell(total)}
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-[var(--border-soft)]">
      {labelCell}
      {values.map((v, i) => (
        <td key={i} className="px-2.5 py-1 text-right font-mono text-[10.5px] text-[var(--fg-muted)]">
          {cell(v)}
        </td>
      ))}
      <td className="bg-[var(--bg-subtle)]/40 px-3.5 py-1 text-right font-mono text-[10.5px] font-semibold text-[var(--fg-muted)]">
        {cell(total)}
      </td>
    </tr>
  );
}

// ── Adet Satırı ───────────────────────────────────────────────────────────────

// Sipariş adedi para DEĞİL: ne ₺ ne parantezli negatif gösterimi uygulanır, ve "Gelir Oranı"
// sütunu anlamsız olduğu için boş bırakılır (adedi ciroya bölmek bir oran üretmez).
function PnlCountRow({
  label,
  values,
  total,
  monthFilterIndex = null,
}: {
  label: string;
  values: number[];
  total: number;
  monthFilterIndex?: number | null;
}) {
  const labelCell = (
    <td className="sticky left-0 z-10 min-w-[200px] whitespace-nowrap border-r border-[var(--border-soft)] bg-[var(--card)] py-2.5 pl-6 pr-3 text-xs text-[var(--fg-muted)]">
      {label}
    </td>
  );

  const cell = (v: number) => (v === 0 ? '—' : v.toLocaleString('tr-TR'));

  if (monthFilterIndex !== null) {
    const v = values[monthFilterIndex] ?? 0;
    const shareInAnnual = total !== 0 ? (v / total) * 100 : 0;
    return (
      <tr className="border-b border-[var(--border-soft)] hover:bg-[var(--bg-subtle)]/30 transition">
        {labelCell}
        <td className="px-3 py-2.5 text-right font-mono text-xs text-[var(--fg)]">{cell(v)}</td>
        <td className="px-3 py-2.5 text-right font-mono text-xs text-[var(--fg-muted)]">—</td>
        <td className="bg-[var(--bg-subtle)]/40 px-3.5 py-2.5 text-right font-mono text-xs font-bold text-[var(--fg-muted)]">
          {shareInAnnual !== 0 ? fmtPercent(shareInAnnual) : '—'}
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-[var(--border-soft)] hover:bg-[var(--bg-subtle)]/30 transition">
      {labelCell}
      {values.map((v, i) => (
        <td key={i} className="px-2.5 py-2 text-right font-mono text-xs text-[var(--fg)]">
          {cell(v)}
        </td>
      ))}
      <td className="bg-[var(--bg-subtle)]/40 px-3.5 py-2 text-right font-mono text-xs font-bold text-[var(--fg)]">
        {cell(total)}
      </td>
    </tr>
  );
}

// ── Kategori Başlığı ──────────────────────────────────────────────────────────

function SectionHeader({ label, colSpan = 14 }: { label: string; colSpan?: number }) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="sticky left-0 bg-[var(--bg-subtle)]/70 px-3.5 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-[var(--fg-muted)] border-b border-[var(--border-soft)]"
      >
        {label}
      </td>
    </tr>
  );
}

// ── Pazaryeri Alt Başlığı ─────────────────────────────────────────────────────

function PlatformSubHeader({ label, colSpan }: { label: string; colSpan: number }) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="sticky left-0 border-b border-[var(--border-soft)] bg-[var(--bg-subtle)]/30 py-1 pl-6 pr-3 text-[10px] font-bold uppercase tracking-wider text-[var(--fg-muted)]"
      >
        {label}
      </td>
    </tr>
  );
}

// ── Pazaryeri Serileri ────────────────────────────────────────────────────────

type PlatformSeries = {
  platformId: number;
  platformName: string;
  orderCount: number[];
  commission: number[];
  serviceFee: number[];
  vat: number[];
  totals: { orderCount: number; commission: number; serviceFee: number; vat: number };
};

// Detaylı görünümün kaynağı: her pazaryerinin 12 aylık kesinti serisi. Sıra `total.platforms`
// listesinden gelir (backend ciroya göre sıralar) — böylece Toplam sütunu ile satır sırası
// her zaman aynıdır ve bir ayda hiç satışı olmayan pazaryeri de tabloda 0 ile görünür.
function buildPlatformSeries(months: PnlMonth[], total: PnlMonth, withVat: boolean): PlatformSeries[] {
  // KDVsiz modda pazaryeri kesintileri de KDV hariç gösterilir — üstteki toplam satırıyla
  // aynı kural, aksi halde kırılımın toplamı ana satırı tutmazdı.
  const net = (amount: number, vat: number) => (withVat ? amount : amount - vat);

  return total.platforms.map((p) => {
    const monthly = months.map((m) => m.platforms.find((row) => row.platformId === p.platformId));
    return {
      platformId: p.platformId,
      platformName: p.platformName,
      orderCount: monthly.map((row) => row?.orderCount ?? 0),
      commission: monthly.map((row) => net(row?.commission ?? 0, row?.commissionVat ?? 0)),
      serviceFee: monthly.map((row) => net(row?.serviceFee ?? 0, row?.serviceFeeVat ?? 0)),
      vat: monthly.map((row) => row?.vat ?? 0),
      totals: {
        orderCount: p.orderCount,
        commission: net(p.commission, p.commissionVat),
        serviceFee: net(p.serviceFee, p.serviceFeeVat),
        vat: p.vat,
      },
    };
  });
}

// ── Mobil Görünüm Kartı ───────────────────────────────────────────────────────

type PnlDetailItem = {
  label: string;
  val: number;
  isMain?: boolean;
  isNeg?: boolean;
  isSub?: boolean;
  isHighlight?: boolean;
  isPercent?: boolean;
  isCount?: boolean;
  tone?: 'success' | 'danger';
};

// Mobil kart da masaüstü tabloyla AYNI KDV modunu izler; ikisinin farklı sayı göstermesi
// "telefonda başka, bilgisayarda başka" gibi görünürdü.
function buildPnlDetailItems(
  m: PnlMonth,
  t: TFunc,
  withVat: boolean,
  expenseAmounts?: { name: string; val: number }[]
): PnlDetailItem[] {
  const net = (amount: number, vat: number) => (withVat ? amount : amount - vat);

  const revenue = net(m.revenue, m.outputVat);
  const buyingCost = net(m.buyingCost, m.buyingVat);
  const boxCost = net(m.boxCost, m.boxVat);
  const shippingCost = net(m.shippingCost, m.shippingVat);
  const commission = net(m.commission, m.commissionVat);
  const serviceFee = net(m.serviceFee, m.serviceFeeVat);

  const totalCost = buyingCost + boxCost + shippingCost;
  const totalDeduction = commission + serviceFee + (withVat ? m.vat : 0);
  const grossMargin = revenue > 0 ? (m.grossProfit / revenue) * 100 : 0;
  const netMargin = revenue > 0 ? (m.netProfit / revenue) * 100 : 0;

  const items: PnlDetailItem[] = [
    {
      label: withVat ? t('pnl_row_revenue_incl_vat') : t('pnl_row_revenue_excl_vat'),
      val: revenue,
      isMain: true,
    },
    { label: t('pnl_row_order_count'), val: m.orderCount, isCount: true },
    { label: t('pnl_row_buying_cost'), val: buyingCost, isNeg: true },
    { label: t('pnl_row_box_cost'), val: boxCost, isNeg: true },
    {
      // Hesaplanamayan kalemler toplama girmedigi icin rakam gercegin ALTINDA — mobil
      // gorunumde rozet yok, uyari etikete yazilir.
      label: m.unknownShippingLines
        ? `${t('pnl_row_shipping_cost')} (${m.unknownShippingLines} kalemde bilinmiyor)`
        : t('pnl_row_shipping_cost'),
      val: shippingCost,
      isNeg: true,
    },
    { label: t('pnl_row_total_cost'), val: totalCost, isSub: true, isNeg: true },
    { label: t('pnl_row_commission'), val: commission, isNeg: true },
    { label: t('pnl_row_service_fee'), val: serviceFee, isNeg: true },
    ...(withVat ? [{ label: t('pnl_row_vat'), val: m.vat, isNeg: true }] : []),
    { label: t('pnl_row_total_deduction'), val: totalDeduction, isSub: true, isNeg: true },
    { label: t('pnl_row_gross_profit'), val: m.grossProfit, isHighlight: true, tone: 'success' },
    { label: t('pnl_row_gross_margin'), val: grossMargin, isPercent: true, isHighlight: true, tone: 'success' },
  ];

  (expenseAmounts ?? []).forEach((line) => {
    items.push({ label: line.name, val: line.val, isNeg: true });
  });

  items.push({ label: t('pnl_row_total_expenses'), val: m.totalExpenses, isSub: true, isNeg: true });
  items.push({ label: t('pnl_row_net_profit'), val: m.netProfit, isHighlight: true, tone: m.netProfit >= 0 ? 'success' : 'danger' });
  items.push({ label: t('pnl_row_net_margin'), val: netMargin, isPercent: true, isHighlight: true, tone: m.netProfit >= 0 ? 'success' : 'danger' });

  return items;
}

function PnlDetailCard({ items }: { items: PnlDetailItem[] }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)]/40 p-3 text-xs">
      {items.map((it, idx) => {
        if (it.val === 0 && !it.isHighlight && !it.isSub) return null;
        const displayVal = it.isPercent
          ? `%${it.val.toFixed(1)}`
          : it.isCount
          ? it.val.toLocaleString('tr-TR')
          : it.isNeg
          ? `(₺${Math.abs(Math.round(it.val)).toLocaleString('tr-TR')})`
          : `₺${Math.round(it.val).toLocaleString('tr-TR')}`;

        const valColor =
          it.tone === 'success'
            ? 'text-emerald-500 font-bold'
            : it.tone === 'danger'
            ? 'text-red-500 font-bold'
            : it.isNeg && it.val > 0
            ? 'text-red-500/90'
            : 'text-[var(--fg)]';

        return (
          <div
            key={idx}
            className={`flex justify-between items-baseline ${
              it.isHighlight
                ? 'mt-1 border-b border-[var(--border-soft)] pb-1 font-bold text-[var(--fg)]'
                : it.isSub
                ? 'font-semibold text-[var(--fg)]'
                : 'text-[var(--fg-muted)]'
            }`}
          >
            <span className={!it.isMain && !it.isSub && !it.isHighlight ? 'pl-2.5' : ''}>
              {it.label}
            </span>
            <span className={`font-mono ${valColor}`}>{displayVal}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Ana Tablo ─────────────────────────────────────────────────────────────────

export function PnlTable() {
  const { t, lang } = useI18n();
  const isTr = lang === 'tr';
  const isMobile = useMobile();
  const [year, setYear] = useState(new Date().getFullYear());
  const [monthFilter, setMonthFilter] = useState<number | 'all'>('all');
  const [expandedMobileMonth, setExpandedMobileMonth] = useState<number | null>(null);
  // Detaysız = bugüne kadarki görünüm. Detaylı = kapsam rozetleri + pazaryeri bazlı kesintiler.
  const [detailed, setDetailed] = useState(false);
  // KDVsiz (varsayılan) = HİÇBİR satıra KDV katılmaz: her tutar KDV hariç gösterilir ve
  // "KDV (Net)" satırı hiç çizilmez. KDV'li = bugüne kadarki görünüm (KDV dahil tutarlar +
  // KDV satırı + her satırın altında içindeki KDV kırılımı).
  //
  // Brüt kâr İKİ MODDA DA AYNIDIR — matematiksel olarak: her satır (1+oran)'a bölündüğünde
  // fark da (1+oran)'a bölünür ve net KDV satırı tam olarak o farkı kapatır. Yani KDVsiz
  // görünüm bir "tahmin" değil, aynı tablonun KDV'den arındırılmış tam karşılığıdır.
  const [withVat, setWithVat] = useState(false);
  const MONTH_LABELS = isTr ? MONTH_LABELS_TR : MONTH_LABELS_EN;

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['finance-pnl', year],
    queryFn: () => financeApi.pnl(year),
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const months: PnlMonth[] = data?.months ?? [];
  const total = data?.total;
  const monthCol = (key: keyof PnlMonth) => months.map((m) => Number(m[key]));

  // Sunucu KDV'yi tamamen kapattıysa (FinanceVatMode = Ignored) tüm KDV alanları zaten 0
  // döner; seçiciyi göstermek, açınca hiçbir şeyin değişmediği ölü bir düğme olurdu.
  const vatDisabledBySystem = data?.vatMode === 'Ignored';
  const effectiveWithVat = withVat && !vatDisabledBySystem;

  // KDVsiz modda her tutardan KENDİ KDV'si düşülür. Backend satır bazında KDV parçalarını
  // zaten veriyor; UI'da yeniden (1+oran)'a bölmek YAPILMAZ — platforma göre değişen KDV
  // oranlarında (PlatformStoreSettings.VatRate) tek bir oran varsayıp sapardı.
  const netCol = (amountKey: keyof PnlMonth, vatKey: keyof PnlMonth) =>
    months.map((m) => (effectiveWithVat ? Number(m[amountKey]) : Number(m[amountKey]) - Number(m[vatKey])));
  const netTotal = (amountKey: keyof PnlMonth, vatKey: keyof PnlMonth) =>
    !total ? 0 : effectiveWithVat ? Number(total[amountKey]) : Number(total[amountKey]) - Number(total[vatKey]);

  const revenueVals = netCol('revenue', 'outputVat');
  const revenueTot = netTotal('revenue', 'outputVat');
  const buyingVals = netCol('buyingCost', 'buyingVat');
  const buyingTot = netTotal('buyingCost', 'buyingVat');
  const boxVals = netCol('boxCost', 'boxVat');
  const boxTot = netTotal('boxCost', 'boxVat');
  const shippingVals = netCol('shippingCost', 'shippingVat');
  const shippingTot = netTotal('shippingCost', 'shippingVat');
  const commissionVals = netCol('commission', 'commissionVat');
  const commissionTot = netTotal('commission', 'commissionVat');
  const serviceFeeVals = netCol('serviceFee', 'serviceFeeVat');
  const serviceFeeTot = netTotal('serviceFee', 'serviceFeeVat');

  // Alt toplamlar aktif moda göre kurulur. KDVsiz modda "KDV (Net)" diye bir satır YOKTUR,
  // dolayısıyla Toplam Kesinti de onu içermez; aksi halde alt toplam, hemen üstündeki
  // satırların toplamını tutmazdı.
  const totalMaliyet = months.map((_, i) => buyingVals[i] + boxVals[i] + shippingVals[i]);
  const totalMaliyetSum = buyingTot + boxTot + shippingTot;
  const totalKesinti = months.map((m, i) => commissionVals[i] + serviceFeeVals[i] + (effectiveWithVat ? m.vat : 0));
  const totalKesintiSum = commissionTot + serviceFeeTot + (effectiveWithVat && total ? total.vat : 0);

  // Marj, EKRANDA GÖRÜNEN ciroya bölünür: KDVsiz modda KDV dahil ciroya bölmek, tabloda
  // olmayan bir sayıyla hesaplanmış bir yüzde göstermek olurdu.
  const grossMarginByMonth = months.map((m, i) => (revenueVals[i] > 0 ? (m.grossProfit / revenueVals[i]) * 100 : 0));
  const netMarginByMonth = months.map((m, i) => (revenueVals[i] > 0 ? (m.netProfit / revenueVals[i]) * 100 : 0));
  const grossMarginTotal = total && revenueTot > 0 ? (total.grossProfit / revenueTot) * 100 : 0;
  const netMarginTotal = total && revenueTot > 0 ? (total.netProfit / revenueTot) * 100 : 0;

  const monthFilterIndex = monthFilter === 'all' ? null : monthFilter;
  const currentMonthRevenue = monthFilterIndex !== null ? revenueVals[monthFilterIndex] ?? 0 : 0;
  const colSpanCount = monthFilterIndex !== null ? 4 : 14;

  // Rozet, ekranda GÖRÜNEN dönemin kapsamını gösterir: tek ay seçiliyse o ayınkini, aksi
  // halde yıl toplamınınkini. Aksi halde "Ağustos" seçiliyken yıllık oran gösterilirdi.
  const coverageSource = monthFilterIndex !== null ? months[monthFilterIndex] : total;

  // İndirilecek KDV toplamı UI'da TÜRETİLİR — backend zaten parçaları veriyor, ayrıca bir
  // alan taşımak iki kaynağın ayrışma riskini getirirdi.
  const inputVatByMonth = months.map(
    (m) => m.buyingVat + m.boxVat + m.shippingVat + m.commissionVat + m.serviceFeeVat
  );
  const inputVatTotal = total
    ? total.buyingVat + total.boxVat + total.shippingVat + total.commissionVat + total.serviceFeeVat
    : 0;

  const vatLabel = (rowLabel: string) => `${rowLabel} ${t('pnl_vat_row_prefix')}`;
  // Ciro etiketi seçili moda göre değişir; "KDV Dahil" yazan bir satırın altında KDV hariç
  // bir rakam göstermek tablonun en yanıltıcı hâli olurdu.
  const revenueLabel = effectiveWithVat ? t('pnl_row_revenue_incl_vat') : t('pnl_row_revenue_excl_vat');
  const platformSeries = total ? buildPlatformSeries(months, total, effectiveWithVat) : [];

  const money = (v: number) => formatCellText(v, { key: '', header: '', type: 'money', currency: 'TRY' });
  const pct = (v: number) => formatCellText(v, { key: '', header: '', type: 'percent' });

  type PnlRowSpec = { label: string; vals: number[]; tot: number; isPercent?: boolean; isCount?: boolean };
  const pnlRowSpecs: PnlRowSpec[] = total
    ? [
        { label: revenueLabel, vals: revenueVals, tot: revenueTot },
        { label: t('pnl_row_order_count'), vals: monthCol('orderCount'), tot: total.orderCount, isCount: true },
        { label: t('pnl_row_buying_cost'), vals: buyingVals, tot: buyingTot },
        ...(effectiveWithVat ? [{ label: vatLabel(t('pnl_row_buying_cost')), vals: monthCol('buyingVat'), tot: total.buyingVat }] : []),
        { label: t('pnl_row_box_cost'), vals: boxVals, tot: boxTot },
        ...(effectiveWithVat ? [{ label: vatLabel(t('pnl_row_box_cost')), vals: monthCol('boxVat'), tot: total.boxVat }] : []),
        { label: t('pnl_row_shipping_cost'), vals: shippingVals, tot: shippingTot },
        ...(effectiveWithVat ? [{ label: vatLabel(t('pnl_row_shipping_cost')), vals: monthCol('shippingVat'), tot: total.shippingVat }] : []),
        { label: t('pnl_row_total_cost'), vals: totalMaliyet, tot: totalMaliyetSum },
        // Detaylı modda pazaryeri kırılımı dışa aktarıma da girer — ekranda görüneni
        // aktarmak, kullanıcının Excel'de "eksik satır" yaşamamasının tek yolu.
        ...(detailed
          ? platformSeries.flatMap((p) => [
              { label: `${p.platformName} — ${t('pnl_row_commission')}`, vals: p.commission, tot: p.totals.commission },
              { label: `${p.platformName} — ${t('pnl_row_service_fee')}`, vals: p.serviceFee, tot: p.totals.serviceFee },
              ...(effectiveWithVat ? [{ label: `${p.platformName} — ${t('pnl_row_vat')}`, vals: p.vat, tot: p.totals.vat }] : []),
            ])
          : []),
        { label: t('pnl_row_commission'), vals: commissionVals, tot: commissionTot },
        ...(effectiveWithVat ? [{ label: vatLabel(t('pnl_row_commission')), vals: monthCol('commissionVat'), tot: total.commissionVat }] : []),
        { label: t('pnl_row_service_fee'), vals: serviceFeeVals, tot: serviceFeeTot },
        ...(effectiveWithVat ? [{ label: vatLabel(t('pnl_row_service_fee')), vals: monthCol('serviceFeeVat'), tot: total.serviceFeeVat }] : []),
        ...(effectiveWithVat ? [{ label: t('pnl_row_vat'), vals: monthCol('vat'), tot: total.vat }] : []),
        ...(effectiveWithVat
          ? [
              { label: t('pnl_row_output_vat'), vals: monthCol('outputVat'), tot: total.outputVat },
              { label: t('pnl_row_input_vat'), vals: inputVatByMonth, tot: inputVatTotal },
            ]
          : []),
        { label: t('pnl_row_total_deduction'), vals: totalKesinti, tot: totalKesintiSum },
        { label: t('pnl_row_gross_profit'), vals: monthCol('grossProfit'), tot: total.grossProfit },
        { label: t('pnl_row_gross_margin'), vals: grossMarginByMonth, tot: grossMarginTotal, isPercent: true },
        ...(data?.expenseLines ?? []).map((line) => ({ label: line.name, vals: line.monthlyAmounts, tot: line.total })),
        // Reklam satirlari da disa aktarima girer; kanal adi tek basina "Google" gorunup
        // isletme gideriyle karisabilecegi icin etiketlenir.
        ...(data?.adExpenseLines ?? []).map((line) => ({
          label: `${t('pnl_section_ad_expenses')} — ${line.name}`,
          vals: line.monthlyAmounts,
          tot: line.total,
        })),
        { label: t('pnl_row_total_expenses'), vals: monthCol('totalExpenses'), tot: total.totalExpenses },
        ...(effectiveWithVat ? [{ label: t('pnl_row_expense_vat'), vals: monthCol('expenseVat'), tot: total.expenseVat }] : []),
        { label: t('pnl_row_net_profit'), vals: monthCol('netProfit'), tot: total.netProfit },
        { label: t('pnl_row_net_margin'), vals: netMarginByMonth, tot: netMarginTotal, isPercent: true },
      ]
    : [];

  const pnlExportColumns: ExportColumn[] =
    monthFilterIndex === null
      ? [
          { key: 'kalem', header: t('pnl_col_item'), type: 'text' },
          ...MONTH_LABELS.map((m, i) => ({ key: `m${i}`, header: m, type: 'text' as const })),
          { key: 'toplam', header: t('pnl_col_total'), type: 'text' },
        ]
      : [
          { key: 'kalem', header: t('pnl_col_item'), type: 'text' },
          { key: 'val', header: MONTH_LABELS[monthFilterIndex], type: 'text' },
          { key: 'ratio', header: t('pnl_col_revenue_ratio'), type: 'text' },
          { key: 'share', header: t('pnl_col_annual_share'), type: 'text' },
        ];

  const pnlExportRows = (): ExportRow[] =>
    pnlRowSpecs.map((spec) => {
      // Adet satırı para birimi ALMAZ; ₺ ile aktarmak Excel'de "1.234 ₺ sipariş" gibi
      // anlamsız bir hücre üretirdi.
      const cell = (v: number) => (spec.isPercent ? pct(v) : spec.isCount ? v.toLocaleString('tr-TR') : money(v));

      if (monthFilterIndex === null) {
        const row: ExportRow = { kalem: spec.label };
        MONTH_LABELS.forEach((_, i) => {
          row[`m${i}`] = cell(spec.vals[i] ?? 0);
        });
        row.toplam = cell(spec.tot);
        return row;
      }
      const v = spec.vals[monthFilterIndex] ?? 0;
      const ratioToRevenue = currentMonthRevenue > 0 ? (v / currentMonthRevenue) * 100 : 0;
      const shareInAnnual = spec.tot !== 0 ? (v / spec.tot) * 100 : 0;
      return {
        kalem: spec.label,
        val: cell(v),
        ratio: spec.isPercent || spec.isCount ? '—' : pct(ratioToRevenue),
        share: spec.isPercent ? '—' : pct(shareInAnnual),
      };
    });

  const pnlExportFilename = `${isTr ? 'pnl_raporu' : 'pnl_report'}_${year}_${
    monthFilterIndex !== null ? MONTH_LABELS[monthFilterIndex] : isTr ? 'yillik' : 'annual'
  }`;

  // FilterSelect DEĞİL FormSelect: FilterSelect bir filtre kontrolü olduğu için listenin
  // başına her zaman bir "temizle" satırı ekler ve burada seçeneklerin ilki zaten
  // "Tüm Yıl" olduğundan aynı satır İKİ KEZ görünüyordu.
  const MONTH_OPTIONS: FormSelectOption<string>[] = [
    { value: 'all', label: t('pnl_all_year') },
    ...MONTH_LABELS.map((m, idx) => ({ value: String(idx), label: m })),
  ];

  const YEAR_OPTIONS: FormSelectOption<string>[] = YEARS.map((y) => ({
    value: String(y),
    label: String(y),
  }));

  return (
    <div className="flex min-h-0 flex-1 flex-col rounded-[6px] border border-[var(--border-soft)] bg-[var(--card)] overflow-hidden">
      
      {/* ── Üst Çubuk (Başlık, Filtreler & Dışa Aktar) ── */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[var(--border-soft)] p-3">
        <div data-tour="pnl-header" className="flex items-center gap-2">
          <div className="inline-flex h-8 items-center gap-1.5 rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] px-3 text-xs font-bold text-[var(--fg)]">
            <span>{t('pnl_title')}</span>
            <span className="font-mono text-[10.5px] text-[var(--fg-muted)]">({year})</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Detaylı / Detaysız + KDVsiz / KDV'li — aynı görsel dil, yan yana */}
          <div data-tour="pnl-modes" className="flex items-center gap-2">
            <SegmentedControl<boolean>
              value={detailed}
              onChange={setDetailed}
              size="sm"
              options={[
                { value: false, label: t('pnl_view_simple') },
                { value: true, label: t('pnl_view_detailed') },
              ]}
            />

            {vatDisabledBySystem ? (
              <span
                title={
                  isTr
                    ? 'KDV sistem genelinde kapalı (Finans > Platform Ayarları). Hiçbir hesaba KDV katılmıyor.'
                    : 'VAT is disabled system-wide. No VAT is included in any calculation.'
                }
                className="inline-flex h-8 items-center gap-1 rounded-[6px] border border-amber-500/30 bg-amber-500/10 px-2.5 text-xs font-bold text-amber-600 dark:text-amber-400"
              >
                {isTr ? 'KDV kapalı' : 'VAT off'}
              </span>
            ) : (
              <SegmentedControl<boolean>
                value={withVat}
                onChange={setWithVat}
                size="sm"
                options={[
                  { value: false, label: t('pnl_view_without_vat') },
                  { value: true, label: t('pnl_view_with_vat') },
                ]}
              />
            )}
          </div>

          {/* Ay Filtresi Dropdown */}
          <div data-tour="pnl-filters" className="flex items-center gap-2">
            <FormSelect<string>
              value={String(monthFilter)}
              options={MONTH_OPTIONS}
              onChange={(val) => setMonthFilter(val === 'all' ? 'all' : Number(val))}
              className="w-[130px]"
            />

            {/* Yıl Filtresi Dropdown */}
            <FormSelect<string>
              value={String(year)}
              options={YEAR_OPTIONS}
              onChange={(val) => setYear(Number(val))}
              className="w-[100px]"
            />
          </div>

          {/* Aksiyonlar & Rehber */}
          <div data-tour="pnl-actions" className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              title={t('pnl_refresh_data')}
              className="inline-flex h-8 items-center gap-1 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-2.5 text-xs font-semibold text-[var(--fg)] transition hover:bg-[var(--bg-subtle)] disabled:opacity-50"
            >
              <RefreshCw size={12} className={isFetching ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">{isTr ? 'Yenile' : 'Refresh'}</span>
            </button>

            {/* Dışa Aktarma */}
            <ExportMenu
              filename={pnlExportFilename}
              columns={pnlExportColumns}
              getData={pnlExportRows}
              label={t('pnl_export_button')}
            />
          </div>
        </div>
      </div>

      {/* ── Gövde (Tablo & Kartlar) ── */}
      <div data-tour="pnl-table" className="min-h-0 flex-1 overflow-auto">
        {isLoading ? (
          <div className="p-16 text-center text-xs text-[var(--fg-muted)]">
            {isTr ? 'Finansal veriler yükleniyor…' : 'Loading finance data…'}
          </div>
        ) : !total ? (
          <div className="p-16 text-center text-xs text-[var(--fg-muted)]">{t('pnl_no_data')}</div>
        ) : isMobile ? (
          /* ── Mobil Görünüm ── */
          <div className="flex flex-col gap-3 p-3">
            {monthFilterIndex !== null ? (
              <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3">
                <h3 className="m-0 mb-2 font-mono text-xs font-bold text-[var(--fg)]">
                  {MONTH_LABELS[monthFilterIndex]} ({year})
                </h3>
                <PnlDetailCard
                  items={buildPnlDetailItems(
                    months[monthFilterIndex],
                    t,
                    effectiveWithVat,
                    data?.expenseLines?.map((line) => ({
                      name: line.name,
                      val: line.monthlyAmounts[monthFilterIndex] ?? 0,
                    }))
                  )}
                />
              </div>
            ) : (
              <>
                <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3">
                  <h3 className="m-0 mb-2 text-xs font-bold text-[var(--fg)]">
                    {t('pnl_col_total')} ({year})
                  </h3>
                  <PnlDetailCard
                    items={buildPnlDetailItems(
                      total,
                      t,
                      effectiveWithVat,
                      data?.expenseLines?.map((line) => ({ name: line.name, val: line.total }))
                    )}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  {months.map((m, idx) => {
                    const isExpanded = expandedMobileMonth === idx;
                    return (
                      <div
                        key={idx}
                        className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] overflow-hidden"
                      >
                        <div
                          className="flex cursor-pointer items-center justify-between p-3"
                          onClick={() => setExpandedMobileMonth(isExpanded ? null : idx)}
                        >
                          <div className="flex min-w-0 flex-col gap-0.5">
                            <span className="font-mono text-xs font-bold text-[var(--fg)]">{MONTH_LABELS[idx]}</span>
                            <span className="font-mono text-[10.5px] text-[var(--fg-muted)]">
                              {t('pnl_row_revenue')}: ₺
                              {Math.round(effectiveWithVat ? m.revenue : m.revenue - m.outputVat).toLocaleString('tr-TR')}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`rounded-[3px] px-1.5 py-0.5 font-mono text-xs font-bold ${
                                m.netProfit >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                              }`}
                            >
                              ₺{Math.round(m.netProfit).toLocaleString('tr-TR')}
                            </span>
                            <ChevronRight
                              size={13}
                              className={`text-[var(--fg-muted)] transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                            />
                          </div>
                        </div>
                        {isExpanded && (
                          <div className="border-t border-[var(--border-soft)] p-3">
                            <PnlDetailCard
                              items={buildPnlDetailItems(
                                m,
                                t,
                                effectiveWithVat,
                                data?.expenseLines?.map((line) => ({
                                  name: line.name,
                                  val: line.monthlyAmounts[idx] ?? 0,
                                }))
                              )}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        ) : (
          /* ── Masaüstü P&L Tablosu (Tam Genişleme) ── */
          <table
            className="w-full border-collapse text-left text-xs"
            style={{ minWidth: monthFilterIndex !== null ? 600 : 1100 }}
          >
            <thead className="sticky top-0 z-20 border-b border-[var(--border-soft)] bg-[var(--bg-subtle)] text-[10.5px] font-bold uppercase tracking-wider text-[var(--fg-muted)]">
              <tr>
                <th className="sticky left-0 z-30 min-w-[200px] border-r border-[var(--border-soft)] bg-[var(--bg-subtle)] px-3.5 py-2.5">
                  {t('pnl_col_item')}
                </th>
                {monthFilterIndex === null ? (
                  <>
                    {MONTH_LABELS.map((m) => (
                      <th key={m} className="min-w-[72px] px-2.5 py-2.5 text-right font-mono font-bold">
                        {m}
                      </th>
                    ))}
                    <th className="bg-[var(--bg-subtle)] px-3.5 py-2.5 text-right font-mono font-extrabold text-[var(--fg)] border-l border-[var(--border-soft)]">
                      {t('pnl_col_total')}
                    </th>
                  </>
                ) : (
                  <>
                    <th className="min-w-[100px] px-3 py-2.5 text-right font-mono font-bold">
                      {MONTH_LABELS[monthFilterIndex]}
                    </th>
                    <th className="min-w-[110px] px-3 py-2.5 text-right font-mono font-bold">
                      {t('pnl_col_revenue_ratio')}
                    </th>
                    <th className="bg-[var(--bg-subtle)] px-3.5 py-2.5 text-right font-mono font-extrabold text-[var(--fg)] border-l border-[var(--border-soft)]">
                      {t('pnl_col_annual_share')}
                    </th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-soft)]">
              {/* Gelirler */}
              <SectionHeader label={t('pnl_section_revenue')} colSpan={colSpanCount} />
              <PnlRow
                label={revenueLabel}
                values={revenueVals}
                total={revenueTot}
                indent
                monthFilterIndex={monthFilterIndex}
                revenueValue={currentMonthRevenue}
                annualTotal={revenueTot}
              />
              <PnlCountRow
                label={t('pnl_row_order_count')}
                values={monthCol('orderCount')}
                total={total.orderCount}
                monthFilterIndex={monthFilterIndex}
              />

              {/* Ürün ve Lojistik Maliyetleri */}
              <SectionHeader label={t('pnl_section_product_logistics_costs')} colSpan={colSpanCount} />
              <PnlRow
                label={t('pnl_row_buying_cost')}
                values={buyingVals}
                total={buyingTot}
                indent
                negative
                monthFilterIndex={monthFilterIndex}
                revenueValue={currentMonthRevenue}
                annualTotal={buyingTot}
                coverage={detailed ? coverageSource?.buyingCostCoverage ?? null : null}
                coverageHint={t('pnl_coverage_cost')}
              />
              {effectiveWithVat && (
                <PnlVatRow
                  label={vatLabel(t('pnl_row_buying_cost'))}
                  values={monthCol('buyingVat')}
                  total={total.buyingVat}
                  monthFilterIndex={monthFilterIndex}
                />
              )}
              <PnlRow
                label={t('pnl_row_box_cost')}
                values={boxVals}
                total={boxTot}
                indent
                negative
                monthFilterIndex={monthFilterIndex}
                revenueValue={currentMonthRevenue}
                annualTotal={boxTot}
                coverage={detailed ? coverageSource?.boxCostCoverage ?? null : null}
                coverageHint={t('pnl_coverage_box')}
              />
              {effectiveWithVat && (
                <PnlVatRow
                  label={vatLabel(t('pnl_row_box_cost'))}
                  values={monthCol('boxVat')}
                  total={total.boxVat}
                  monthFilterIndex={monthFilterIndex}
                />
              )}
              <PnlRow
                label={t('pnl_row_shipping_cost')}
                values={shippingVals}
                total={shippingTot}
                indent
                negative
                monthFilterIndex={monthFilterIndex}
                revenueValue={currentMonthRevenue}
                annualTotal={shippingTot}
                coverage={detailed ? coverageSource?.shippingCostCoverage ?? null : null}
                coverageHint={t('pnl_coverage_desi')}
                // Eski backend bu alani gondermez -> 0, rozet gizli kalir.
                unknownShippingLines={coverageSource?.unknownShippingLines ?? 0}
              />
              {effectiveWithVat && (
                <PnlVatRow
                  label={vatLabel(t('pnl_row_shipping_cost'))}
                  values={monthCol('shippingVat')}
                  total={total.shippingVat}
                  monthFilterIndex={monthFilterIndex}
                />
              )}
              <PnlRow
                label={t('pnl_row_total_cost')}
                values={totalMaliyet}
                total={totalMaliyetSum}
                tone="subtotal"
                negative
                monthFilterIndex={monthFilterIndex}
                revenueValue={currentMonthRevenue}
                annualTotal={totalMaliyetSum}
              />

              {/* Platform Kesintileri */}
              <SectionHeader label={t('pnl_section_platform_deductions')} colSpan={colSpanCount} />

              {/* Detaylı modda önce pazaryeri pazaryeri kırılım, sonra toplamlar */}
              {detailed &&
                platformSeries.map((p) => (
                  <Fragment key={p.platformId}>
                    <PlatformSubHeader label={p.platformName} colSpan={colSpanCount} />
                    <PnlCountRow
                      label={t('pnl_row_order_count')}
                      values={p.orderCount}
                      total={p.totals.orderCount}
                      monthFilterIndex={monthFilterIndex}
                    />
                    <PnlRow
                      label={t('pnl_row_commission')}
                      values={p.commission}
                      total={p.totals.commission}
                      indent
                      negative
                      monthFilterIndex={monthFilterIndex}
                      revenueValue={currentMonthRevenue}
                      annualTotal={p.totals.commission}
                    />
                    <PnlRow
                      label={t('pnl_row_service_fee')}
                      values={p.serviceFee}
                      total={p.totals.serviceFee}
                      indent
                      negative
                      monthFilterIndex={monthFilterIndex}
                      revenueValue={currentMonthRevenue}
                      annualTotal={p.totals.serviceFee}
                    />
                    {effectiveWithVat && (
                      <PnlRow
                        label={t('pnl_row_vat')}
                        values={p.vat}
                        total={p.totals.vat}
                        indent
                        negative
                        monthFilterIndex={monthFilterIndex}
                        revenueValue={currentMonthRevenue}
                        annualTotal={p.totals.vat}
                      />
                    )}
                  </Fragment>
                ))}

              <PnlRow
                label={t('pnl_row_commission')}
                values={commissionVals}
                total={commissionTot}
                indent
                negative
                monthFilterIndex={monthFilterIndex}
                revenueValue={currentMonthRevenue}
                annualTotal={commissionTot}
              />
              {effectiveWithVat && (
                <PnlVatRow
                  label={vatLabel(t('pnl_row_commission'))}
                  values={monthCol('commissionVat')}
                  total={total.commissionVat}
                  monthFilterIndex={monthFilterIndex}
                />
              )}
              <PnlRow
                label={t('pnl_row_service_fee')}
                values={serviceFeeVals}
                total={serviceFeeTot}
                indent
                negative
                monthFilterIndex={monthFilterIndex}
                revenueValue={currentMonthRevenue}
                annualTotal={serviceFeeTot}
              />
              {effectiveWithVat && (
                <PnlVatRow
                  label={vatLabel(t('pnl_row_service_fee'))}
                  values={monthCol('serviceFeeVat')}
                  total={total.serviceFeeVat}
                  monthFilterIndex={monthFilterIndex}
                />
              )}
              {/* KDVsiz modda KDV diye bir satır YOKTUR: tüm tutarlar zaten KDV hariç
                  gösterilir ve net KDV kalemi anlamsız olurdu. */}
              {effectiveWithVat && (
                <>
                  <PnlRow
                    label={t('pnl_row_vat')}
                    values={monthCol('vat')}
                    total={total.vat}
                    indent
                    negative
                    monthFilterIndex={monthFilterIndex}
                    revenueValue={currentMonthRevenue}
                    annualTotal={total.vat}
                  />
                  <PnlVatRow
                    label={t('pnl_row_output_vat')}
                    values={monthCol('outputVat')}
                    total={total.outputVat}
                    monthFilterIndex={monthFilterIndex}
                  />
                  <PnlVatRow
                    label={t('pnl_row_input_vat')}
                    values={inputVatByMonth}
                    total={inputVatTotal}
                    monthFilterIndex={monthFilterIndex}
                  />
                </>
              )}
              <PnlRow
                label={t('pnl_row_total_deduction')}
                values={totalKesinti}
                total={totalKesintiSum}
                tone="subtotal"
                negative
                monthFilterIndex={monthFilterIndex}
                revenueValue={currentMonthRevenue}
                annualTotal={totalKesintiSum}
              />

              {/* Brüt Kâr & Marj */}
              <PnlRow
                label={t('pnl_row_gross_profit')}
                values={monthCol('grossProfit')}
                total={total.grossProfit}
                tone="gross"
                monthFilterIndex={monthFilterIndex}
                revenueValue={currentMonthRevenue}
                annualTotal={total.grossProfit}
              />
              <PnlPercentRow
                label={t('pnl_row_gross_margin')}
                values={grossMarginByMonth}
                total={grossMarginTotal}
                monthFilterIndex={monthFilterIndex}
              />

              {/* Faaliyet Giderleri */}
              {(data?.expenseLines?.length ?? 0) > 0 && (
                <>
                  <SectionHeader label={t('pnl_section_operating_expenses')} colSpan={colSpanCount} />
                  {data!.expenseLines.map((line) => (
                    <PnlRow
                      key={line.name}
                      label={line.name}
                      values={line.monthlyAmounts}
                      total={line.total}
                      indent
                      negative
                      monthFilterIndex={monthFilterIndex}
                      revenueValue={currentMonthRevenue}
                      annualTotal={line.total}
                    />
                  ))}
                </>
              )}

              {/* Reklam Giderleri — kanala göre kırılmış AYRI blok. İşletme gideriyle aynı
                  listede toplanınca ne pazarlama verimi ne de sabit gider yükü okunuyordu. */}
              {(data?.adExpenseLines?.length ?? 0) > 0 && (
                <>
                  <SectionHeader label={t('pnl_section_ad_expenses')} colSpan={colSpanCount} />
                  {data!.adExpenseLines.map((line) => (
                    <PnlRow
                      key={`ad-${line.name}`}
                      label={line.name}
                      values={line.monthlyAmounts}
                      total={line.total}
                      indent
                      negative
                      monthFilterIndex={monthFilterIndex}
                      revenueValue={currentMonthRevenue}
                      annualTotal={line.total}
                    />
                  ))}
                </>
              )}
              <PnlRow
                label={t('pnl_row_total_expenses')}
                values={monthCol('totalExpenses')}
                total={total.totalExpenses}
                tone="subtotal"
                negative
                monthFilterIndex={monthFilterIndex}
                revenueValue={currentMonthRevenue}
                annualTotal={total.totalExpenses}
              />
              {effectiveWithVat && (
                <PnlVatRow
                  label={t('pnl_row_expense_vat')}
                  values={monthCol('expenseVat')}
                  total={total.expenseVat}
                  monthFilterIndex={monthFilterIndex}
                />
              )}

              {/* Net Kâr & Marj */}
              <PnlRow
                label={t('pnl_row_net_profit')}
                values={monthCol('netProfit')}
                total={total.netProfit}
                tone="net"
                monthFilterIndex={monthFilterIndex}
                revenueValue={currentMonthRevenue}
                annualTotal={total.netProfit}
              />
              <PnlPercentRow
                label={t('pnl_row_net_margin')}
                values={netMarginByMonth}
                total={netMarginTotal}
                monthFilterIndex={monthFilterIndex}
              />
            </tbody>
          </table>
        )}
      </div>

      {/* ── Alt Bar (Özet Kâr Marjları) ── */}
      {!isLoading && total && (
        <div className="flex h-10 shrink-0 items-center justify-between border-t border-[var(--border-soft)] bg-[var(--bg-subtle)]/30 px-4 text-xs">
          <div className="flex items-center gap-4 font-mono">
            <div className="flex items-center gap-1.5">
              <span className="text-[var(--fg-muted)]">{year} {t('pnl_row_gross_margin')}:</span>
              <strong className="text-emerald-500 font-bold">
                %{total.revenue > 0 ? ((total.grossProfit / total.revenue) * 100).toFixed(1) : '0.0'}
              </strong>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[var(--fg-muted)]">{year} {t('pnl_row_net_margin')}:</span>
              <strong className={total.netProfit >= 0 ? 'text-emerald-500 font-bold' : 'text-red-500 font-bold'}>
                %{total.revenue > 0 ? ((total.netProfit / total.revenue) * 100).toFixed(1) : '0.0'}
              </strong>
            </div>
          </div>
          <div className="text-[11px] text-[var(--fg-muted)]">
            {isTr ? 'Tüm değerler ₺ (TRY) bazındadır.' : 'All values in ₺ (TRY).'}
          </div>
        </div>
      )}
    </div>
  );
}
