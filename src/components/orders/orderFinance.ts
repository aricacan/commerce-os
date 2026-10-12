import type { OrderDetail } from '../../types/api';

// Siparişin kalem bazlı kâr kırılımından sipariş geneli özet (TL). Kalemler backend'de
// tek merkezi formülle hesaplandı; burada yalnızca toplanır, formül tekrar yazılmaz.

export type FigureQuality = 'actual' | 'mixed' | 'estimated';

export interface OrderFinanceSummary {
  revenue: number;
  productCost: number;
  boxCost: number;
  shipping: number;
  commission: number;
  serviceFee: number;
  vat: number;
  netProfit: number;
  // Ciro 0 ise null — yüzde anlamsız.
  margin: number | null;
  // Alış fiyatı, kargosu ya da kanal oranı bilinmeyen kalem varsa kâr eksik maliyetle hesaplanmıştır.
  isComplete: boolean;
  // Kanalın komisyon oranı girilmemiş — komisyon 0 sayıldı ama gerçekte bilinmiyor.
  feeRateMissing: boolean;
  commissionQuality: FigureQuality;
}

export function summarizeOrder(order: OrderDetail): OrderFinanceSummary {
  const items = order.items;
  const sum = (pick: (i: OrderDetail['items'][number]) => number) => items.reduce((acc, i) => acc + pick(i), 0);

  const revenue = items.length > 0 ? sum((i) => i.unitPrice * i.quantity) : order.totalAmount;
  const netProfit = sum((i) => i.netProfit);
  const actualCount = items.filter((i) => i.commissionIsActual).length;
  const feeRateMissing = (order.feeLines ?? []).some((line) => line.rateMissing);

  return {
    revenue,
    productCost: sum((i) => (i.buyingPrice ?? 0) * i.quantity),
    boxCost: sum((i) => (i.boxCost ?? 0) * i.quantity),
    shipping: sum((i) => i.shippingCost),
    commission: sum((i) => i.commissionAmount),
    serviceFee: sum((i) => i.serviceFeeAmount),
    vat: sum((i) => i.vatAmount),
    netProfit,
    margin: revenue > 0 ? netProfit / revenue : null,
    isComplete: !feeRateMissing && items.length > 0 && items.every((i) => i.hasCostData && i.shippingCostKnown !== false),
    feeRateMissing,
    commissionQuality: actualCount === 0 ? 'estimated' : actualCount === items.length ? 'actual' : 'mixed',
  };
}
