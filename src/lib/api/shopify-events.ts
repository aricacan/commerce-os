import { request } from './core';

// ─── Shopify Hub: webhook olay akışı (salt okuma) ───────────────────────────────
//
// İşlenen olayın gövdesi (kişisel veri) silinir; akışta konu, zaman, durum ve kalıcı kişisel verisiz özet görünür.
// Backend enum'ları SAYI olarak gelir.

export const SHOPIFY_EVENT_STATUS = { Pending: 0, Processed: 1, Failed: 2 } as const;
export type ShopifyEventStatus = (typeof SHOPIFY_EVENT_STATUS)[keyof typeof SHOPIFY_EVENT_STATUS];

export interface ShopifyEventDto {
  id: number;
  topic: string;
  status: ShopifyEventStatus;
  receivedAt: string;
  processedAt: string | null;
  // İşlenmiş olayda "neden bir şey yapılmadı", hatalıda hata metni.
  note: string | null;
  // Kalıcı kişisel verisiz özet ("#1042 · 39.80 EUR · 2 kalem"); null = özetlenemeyen ya da özet öncesi eski olay.
  summary: string | null;
  // İlgili sipariş varsa Shopify sipariş kimliği (sipariş detayına bağlanır).
  orderId: number | null;
}

export interface ShopifyEventPageDto {
  items: ShopifyEventDto[];
  page: number;
  hasNextPage: boolean;
}

export interface ShopifyEventFilters {
  topic: string;
  status: '' | `${ShopifyEventStatus}`;
}

export const shopifyEventsApi = {
  list: (storeId: number, filters: ShopifyEventFilters, page: number) => {
    const search = new URLSearchParams({ page: String(page) });
    if (filters.topic) search.set('topic', filters.topic);
    if (filters.status) search.set('status', filters.status);
    return request<ShopifyEventPageDto>(`/shopify/stores/${storeId}/events?${search.toString()}`);
  },
};
