import type { OrderDetail } from '../../types/api';
import { summarizeOrder } from './orderFinance';

interface OrderProfitCellProps {
  order: OrderDetail;
  format: (amount: number) => string;
}

// Listede siparişin net kârı ve marjı. Maliyeti ya da kargosu eksik siparişte kâr yine
// gösterilir ama soluk ve "eksik" işaretli — eksik maliyetle hesaplanan kâr gerçekten yüksektir.
export function OrderProfitCell({ order, format }: OrderProfitCellProps) {
  const summary = summarizeOrder(order);
  if (order.items.length === 0) return <span className="text-xs text-[var(--fg-subtle)]">—</span>;

  const tone = !summary.isComplete
    ? 'text-[var(--fg-subtle)]'
    : summary.netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500';

  return (
    <div className="flex min-w-0 flex-col items-end gap-0.5" title={summary.isComplete ? undefined : 'Alış fiyatı ya da kargo eksik — kâr eksik maliyetle hesaplandı'}>
      <span className={`whitespace-nowrap text-[13px] font-bold tabular-nums ${tone}`}>{format(summary.netProfit)}</span>
      <span className="whitespace-nowrap text-[10.5px] text-[var(--fg-muted)] tabular-nums">
        {summary.margin === null ? '—' : `%${(summary.margin * 100).toLocaleString('tr-TR', { maximumFractionDigits: 1 })}`}
        {!summary.isComplete && ' · eksik'}
      </span>
    </div>
  );
}
