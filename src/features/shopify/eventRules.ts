import { SHOPIFY_EVENT_STATUS, type ShopifyEventDto, type ShopifyEventStatus } from '../../lib/api/shopify-events';
import type { BadgeTone } from '../shared/design';

interface EventStatusMeta {
  label: string;
  tone: BadgeTone;
}

export function eventStatusMeta(status: ShopifyEventStatus): EventStatusMeta {
  switch (status) {
    case SHOPIFY_EVENT_STATUS.Processed:
      return { label: 'İşlendi', tone: 'success' };
    case SHOPIFY_EVENT_STATUS.Failed:
      return { label: 'Hata', tone: 'danger' };
    default:
      return { label: 'Bekliyor', tone: 'warning' };
  }
}

const NO_DETAIL_TEXT = 'Ayrıntı saklanmadı (özet öncesi kayıt ya da özetlenmeyen olay).';

// Satırda gösterilecek özet. Özetsiz ama işlenmiş olay için dürüst boş durum; bekleyen/hatalıda özet henüz yok, metin gösterilmez.
export function eventSummaryText(event: Pick<ShopifyEventDto, 'summary' | 'status'>): string | null {
  if (event.summary) return event.summary;
  return event.status === SHOPIFY_EVENT_STATUS.Processed ? NO_DETAIL_TEXT : null;
}

// Süzgeç seçenekleri: değer Shopify webhook konusunun kendisidir (X-Shopify-Topic).
export const EVENT_TOPIC_LABELS: Readonly<Record<string, string>> = {
  'orders/create': 'Sipariş oluştu',
  'orders/paid': 'Sipariş ödendi',
  'orders/cancelled': 'Sipariş iptal',
  'orders/fulfilled': 'Sipariş kargolandı',
  'fulfillments/create': 'Kargo oluştu',
  'fulfillments/update': 'Kargo güncellendi',
  'refunds/create': 'İade yapıldı',
  'customers/create': 'Yeni müşteri',
  'inventory_levels/update': 'Stok değişti',
  'app/uninstalled': 'Uygulama kaldırıldı',
};

// Bilinmeyen konu ham adıyla gösterilir (sessizce gizlenmez).
export function eventTopicLabel(topic: string): string {
  return EVENT_TOPIC_LABELS[topic] ?? topic;
}

export const EVENT_STATUS_OPTIONS = [
  { value: '', label: 'Tüm durumlar' },
  { value: String(SHOPIFY_EVENT_STATUS.Pending), label: 'Bekliyor' },
  { value: String(SHOPIFY_EVENT_STATUS.Processed), label: 'İşlendi' },
  { value: String(SHOPIFY_EVENT_STATUS.Failed), label: 'Hata' },
] as const;
