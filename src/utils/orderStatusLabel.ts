/**
 * Sipariş durumunun kullanıcıya gösterilen etiketi.
 *
 * DB değerleri (UniversalStatus) DEĞİŞMEZ — KPI'lar ve filtreler onlara bağlı. Tek yaşam
 * döngüsü gereği ekranlarda: "Teslim Edildi" → "Tamamlandı", "Kargoya Verildi" → "Kargolandı".
 * Backend karşılığı: OrderStatusConstants (DeliveredLabel, ShippedStatuses).
 */
export const ORDER_STATUS_DELIVERED = 'Teslim Edildi';
export const ORDER_STATUS_SHIPPED = 'Kargolandı';
export const ORDER_STATUS_SHIPPED_LEGACY = 'Kargoya Verildi';

const ORDER_STATUS_LABELS: Readonly<Record<string, string>> = {
  [ORDER_STATUS_DELIVERED]: 'Tamamlandı',
  [ORDER_STATUS_SHIPPED_LEGACY]: ORDER_STATUS_SHIPPED,
};

export function orderStatusLabel(status: string | null | undefined): string {
  const value = status ?? '';
  return ORDER_STATUS_LABELS[value] ?? value;
}
