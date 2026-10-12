import type { CustomerShopifyOrderDto, CustomerShopifyOrdersDto } from '../../lib/api/customers';

// Müşteri panelindeki Shopify siparişlerinin saf kuralları (durum etiketi, sonuç bildirimi).

const FULFILLMENT_LABELS: Record<string, string> = {
  FULFILLED: 'Kargolandı',
  PARTIALLY_FULFILLED: 'Kısmen kargolandı',
  UNFULFILLED: 'Hazırlanıyor',
  ON_HOLD: 'Beklemede',
  SCHEDULED: 'Planlandı',
};

const FINANCIAL_LABELS: Record<string, string> = {
  PAID: 'Ödendi',
  PENDING: 'Ödeme bekleniyor',
  AUTHORIZED: 'Ödeme onaylı',
  PARTIALLY_PAID: 'Kısmen ödendi',
  PARTIALLY_REFUNDED: 'Kısmen iade',
  REFUNDED: 'İade edildi',
  VOIDED: 'Ödeme iptal',
};

// Bilinmeyen değer çıplak gösterilir — uydurma çeviri yok.
function label(table: Record<string, string>, value: string): string {
  return table[value] ?? (value || '—');
}

export function fulfillmentLabel(order: CustomerShopifyOrderDto): string {
  return order.isCancelled ? 'İptal edildi' : label(FULFILLMENT_LABELS, order.fulfillmentStatus);
}

export function financialLabel(order: CustomerShopifyOrderDto): string {
  return label(FINANCIAL_LABELS, order.financialStatus);
}

export interface ShopifyOrdersNotice {
  tone: 'error' | 'info';
  text: string;
}

// "Sipariş yok" ile "bakılamadı" karıştırılmasın: başarısız/kapalı durum ve kısmi hata açıkça gösterilir.
export function shopifyOrdersNotice(result: CustomerShopifyOrdersDto): ShopifyOrdersNotice | null {
  if (result.outcome === 'failed') {
    return { tone: 'error', text: `Shopify siparişleri okunamadı. ${result.message ?? ''}`.trim() };
  }
  if (result.outcome === 'not_available') {
    return { tone: 'info', text: `Shopify siparişlerine bakılamadı: ${result.message ?? 'bağlantı yok.'}` };
  }
  return result.message ? { tone: 'error', text: `Bazı mağazalar okunamadı. ${result.message}` } : null;
}

// Takip bağlantısı üçüncü taraftan gelir: yalnız http(s) bağlantı olarak gösterilir (javascript: vb. düşer).
export function safeTrackingUrl(url: string | null): string | null {
  return url !== null && /^https?:\/\//i.test(url.trim()) ? url.trim() : null;
}

export function matchedByLabel(matchedBy: string): string {
  return matchedBy === 'phone' ? 'telefon' : 'e-posta';
}
