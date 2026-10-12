import type { OrderDetail, OrderFeeLine } from '../../types/api';
import type { ShippingCostOrigin } from '../../lib/api/shipping-policies';
import { COST_ORIGIN_LABELS, currencySymbol } from '../../lib/shipping-labels';
import { summarizeOrder, type FigureQuality } from './orderFinance';

interface OrderFeeBreakdownProps {
  order: OrderDetail;
  format: (amount: number) => string;
}

const QUALITY_LABELS: Record<FigureQuality, string> = {
  actual: 'Gerçek',
  mixed: 'Kısmen gerçek',
  estimated: 'Tahmini',
};

const money = (amount: number, currency: string) =>
  `${currencySymbol(currency)}${amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function Badge({ tone, children }: { tone: 'actual' | 'estimated'; children: React.ReactNode }) {
  return (
    <span className={`rounded-[4px] px-1.5 py-px text-[10px] font-semibold ${
      tone === 'actual'
        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
        : 'bg-[var(--bg-subtle)] text-[var(--fg-muted)]'
    }`}
    >
      {children}
    </span>
  );
}

// Siparişin para akışı: ciro → maliyetler → net kâr, ve kanalın kestiği kalemler. Kesinti
// kalemleri sabit kolon değil, kanalın bildirdiği adlarla listelenir (eBay ile Shopify'ın
// kalemleri farklı); bildirmeyen kanalda oran tahmini olarak gösterilir.
export function OrderFeeBreakdown({ order, format }: OrderFeeBreakdownProps) {
  const summary = summarizeOrder(order);
  const feeLines = order.feeLines ?? [];
  const shippingOrigin = order.shippingCostOrigin as ShippingCostOrigin | undefined;

  const rows: { label: string; amount: number; note?: string; negative?: boolean }[] = [
    { label: 'Ciro', amount: summary.revenue },
    { label: 'Ürün maliyeti', amount: summary.productCost, negative: true },
    { label: 'Kutu', amount: summary.boxCost, negative: true },
    { label: 'Kargo', amount: summary.shipping, negative: true, note: shippingOrigin ? COST_ORIGIN_LABELS[shippingOrigin] : undefined },
    { label: 'Kesintiler', amount: summary.commission + summary.serviceFee, negative: true, note: QUALITY_LABELS[summary.commissionQuality] },
    { label: 'Net KDV', amount: summary.vat, negative: true },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      <section className="flex flex-col rounded-[6px] border border-[var(--border)] bg-[var(--card)]">
        <header className="border-b border-[var(--border-soft)] px-3 py-2 text-[11px] font-semibold text-[var(--fg-muted)]">Kârlılık</header>
        <dl className="m-0 flex flex-col px-3 py-1.5 text-xs">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-3 py-1">
              <dt className="flex items-center gap-1.5 text-[var(--fg-muted)]">
                {row.label}
                {row.note && <Badge tone={row.note === 'Gerçek' || row.note === 'Gerçek bedel' ? 'actual' : 'estimated'}>{row.note}</Badge>}
              </dt>
              <dd className="m-0 tabular-nums text-[var(--fg)]">{row.negative && row.amount > 0 ? '−' : ''}{format(row.amount)}</dd>
            </div>
          ))}
          <div className="mt-1 flex items-center justify-between gap-3 border-t border-[var(--border-soft)] pb-1 pt-2">
            <dt className="font-semibold text-[var(--fg)]">Net kâr</dt>
            <dd className={`m-0 font-bold tabular-nums ${summary.netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
              {format(summary.netProfit)}
              {summary.margin !== null && (
                <span className="ml-1.5 text-[11px] font-semibold text-[var(--fg-muted)]">
                  %{(summary.margin * 100).toLocaleString('tr-TR', { maximumFractionDigits: 1 })}
                </span>
              )}
            </dd>
          </div>
          {!summary.isComplete && (
            <p className="m-0 pb-1.5 text-[10.5px] text-amber-600 dark:text-amber-400">
              {summary.feeRateMissing
                ? `${order.platformName} komisyon oranı girilmemiş — kesinti kâra yansımadı, kâr olduğundan yüksek görünür.`
                : 'Alış fiyatı ya da kargosu eksik kalem var — kâr olduğundan yüksek görünebilir.'}
            </p>
          )}
        </dl>
      </section>

      <section className="flex flex-col rounded-[6px] border border-[var(--border)] bg-[var(--card)]">
        <header className="border-b border-[var(--border-soft)] px-3 py-2 text-[11px] font-semibold text-[var(--fg-muted)]">
          {order.platformName} kesintileri
        </header>
        {feeLines.length === 0 ? (
          <p className="m-0 px-3 py-3 text-[11px] text-[var(--fg-muted)]">Bu siparişten kesinti yok.</p>
        ) : (
          <ul className="m-0 flex list-none flex-col px-3 py-1.5 text-xs">
            {feeLines.map((line, index) => <FeeLineRow key={`${line.name}-${index}`} line={line} format={format} />)}
          </ul>
        )}
        {feeLines.some((l) => !l.isActual) && (
          <p className="m-0 border-t border-[var(--border-soft)] px-3 py-2 text-[10.5px] text-[var(--fg-muted)]">
            Tahmini satırlar kanalın oranından hesaplanır.{' '}
            <a href="/finance/platforms" className="font-semibold text-[var(--fg)] underline-offset-2 hover:underline">Platform ayarları</a>
            {' '}ekranından oranı girebilirsiniz; kanal kesintiyi bildirdiğinde gerçek tutar kullanılır.
          </p>
        )}
      </section>
    </div>
  );
}

function FeeLineRow({ line, format }: { line: OrderFeeLine; format: (amount: number) => string }) {
  return (
    <li className="flex items-center justify-between gap-3 py-1">
      <span className="flex min-w-0 items-center gap-1.5">
        <span className="truncate text-[var(--fg)]">{line.name}</span>
        {line.rateMissing ? (
          <span className="rounded-[4px] bg-amber-500/15 px-1.5 py-px text-[10px] font-semibold text-amber-700 dark:text-amber-400">Oran girilmemiş</span>
        ) : (
          <Badge tone={line.isActual ? 'actual' : 'estimated'}>
            {line.isActual ? 'Gerçek' : line.rate !== null ? `Tahmini %${(line.rate * 100).toLocaleString('tr-TR', { maximumFractionDigits: 2 })}` : 'Tahmini'}
          </Badge>
        )}
      </span>
      <span className="shrink-0 tabular-nums text-[var(--fg)]">
        {line.rateMissing ? '—' : line.amount !== null && line.currency ? money(line.amount, line.currency) : format(line.amountTry)}
      </span>
    </li>
  );
}
