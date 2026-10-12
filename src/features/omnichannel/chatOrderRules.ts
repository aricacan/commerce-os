import { PAYMENT_METHOD } from '../../lib/api/omnichannel';
import { ORDER_DESTINATION_KIND } from '../../lib/api/omnichannel-order-destinations';
import {
  CHAT_ORDER_ACTOR,
  CHAT_ORDER_EVENT_KIND,
  CHAT_ORDER_STATUS,
  type ChatOrderActor,
  type ChatOrderDto,
  type ChatOrderEventDto,
  type ChatOrderEventKind,
  type ChatOrderStatus,
} from '../../lib/api/omnichannel-chat-orders';

// Sohbet siparişi kartının saf kuralları: durum etiketi/rengi, hangi durumda hangi işlem
// yapılabilir, geçmiş satırı ve para biçimi. Asıl yetki ve kilit kontrolü sunucuda.

export const CHAT_ORDER_STATUS_LABELS: Record<ChatOrderStatus, string> = {
  [CHAT_ORDER_STATUS.Collecting]: 'Bilgi toplanıyor',
  [CHAT_ORDER_STATUS.AwaitingConfirmation]: 'Onay bekliyor',
  [CHAT_ORDER_STATUS.Confirmed]: 'Onaylandı',
  [CHAT_ORDER_STATUS.AwaitingPayment]: 'Ödeme bekliyor',
  [CHAT_ORDER_STATUS.Paid]: 'Ödendi',
  [CHAT_ORDER_STATUS.SentToShopify]: "Shopify'a gönderildi",
  [CHAT_ORDER_STATUS.Shipped]: 'Kargoda',
  [CHAT_ORDER_STATUS.Cancelled]: 'İptal',
  [CHAT_ORDER_STATUS.Failed]: 'Hata',
};

// İki temada da okunan yarı saydam zemin + aynı tonda yazı (CustomerPanelParts etiketleriyle aynı yaklaşım).
const NEUTRAL = 'bg-[var(--bg-subtle)] text-[var(--fg-muted)]';
const AMBER = 'bg-amber-500/15 text-amber-600 dark:text-amber-400';
const BLUE = 'bg-blue-500/15 text-blue-600 dark:text-blue-400';
const GREEN = 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400';
const VIOLET = 'bg-violet-500/15 text-violet-600 dark:text-violet-400';
const ROSE = 'bg-rose-500/15 text-rose-600 dark:text-rose-400';

export const CHAT_ORDER_STATUS_CLASSES: Record<ChatOrderStatus, string> = {
  [CHAT_ORDER_STATUS.Collecting]: NEUTRAL,
  [CHAT_ORDER_STATUS.AwaitingConfirmation]: AMBER,
  [CHAT_ORDER_STATUS.Confirmed]: BLUE,
  [CHAT_ORDER_STATUS.AwaitingPayment]: AMBER,
  [CHAT_ORDER_STATUS.Paid]: GREEN,
  [CHAT_ORDER_STATUS.SentToShopify]: VIOLET,
  [CHAT_ORDER_STATUS.Shipped]: GREEN,
  [CHAT_ORDER_STATUS.Cancelled]: NEUTRAL,
  [CHAT_ORDER_STATUS.Failed]: ROSE,
};

export const CHAT_ORDER_ACTOR_LABELS: Record<ChatOrderActor, string> = {
  [CHAT_ORDER_ACTOR.Bot]: 'Bot',
  [CHAT_ORDER_ACTOR.Agent]: 'Temsilci',
  [CHAT_ORDER_ACTOR.Webhook]: 'Webhook',
  [CHAT_ORDER_ACTOR.System]: 'Sistem',
};

// Açık sipariş = henüz onaylanmamış (0/1). Müşterinin eski siparişi 2/3/4'teyken yenisi açılabilir.
const OPEN_STATUSES: readonly ChatOrderStatus[] = [
  CHAT_ORDER_STATUS.Collecting,
  CHAT_ORDER_STATUS.AwaitingConfirmation,
];

export const isOpenChatOrder = (status: ChatOrderStatus) => OPEN_STATUSES.includes(status);

export interface ChatOrderActionFlags {
  // Düzenleme: sunucunun kilidi yoksa (kargolandı / iptal değil). Shopify'daki sipariş de düzenlenir.
  edit: boolean;
  // Müşteri adına onay ve müşteriye teyit gönderme: yalnız açık siparişte.
  confirm: boolean;
  sendConfirmation: boolean;
  // Havale siparişi onaylandı → ödeme beklemeye alınır.
  awaitPayment: boolean;
  markPaid: boolean;
  // Kapıda ödeme onaylandı ya da havale ödendi (ya da otomatik gönderim hata verdi) → Shopify'a elle girildi.
  markProcessed: boolean;
  // Kargolanana kadar iptal (Shopify'a gittiyse orada da iptal edilir).
  cancel: boolean;
  // Yalnız onaylanmamış, Shopify'a gitmemiş taslak silinir.
  remove: boolean;
}

export type ChatOrderActionSubject = Pick<ChatOrderDto, 'status' | 'paymentMethod'>
  & Partial<Pick<ChatOrderDto, 'editLock' | 'cancelLock' | 'deleteLock'>>;

// Kilit alanları eski backend'de yok: o durumda kargolanmış/iptal edilmiş sipariş kilitli sayılır.
export function chatOrderActionFlags(order: ChatOrderActionSubject): ChatOrderActionFlags {
  const { status, paymentMethod } = order;
  const open = isOpenChatOrder(status);
  const confirmed = status === CHAT_ORDER_STATUS.Confirmed;
  const failed = status === CHAT_ORDER_STATUS.Failed;
  const closed = status === CHAT_ORDER_STATUS.Shipped || status === CHAT_ORDER_STATUS.Cancelled;
  return {
    edit: order.editLock === undefined ? !closed : order.editLock === null,
    confirm: open,
    sendConfirmation: open,
    awaitPayment: confirmed && paymentMethod === PAYMENT_METHOD.BankTransfer,
    markPaid: status === CHAT_ORDER_STATUS.AwaitingPayment,
    markProcessed: (confirmed && paymentMethod === PAYMENT_METHOD.CashOnDelivery) || status === CHAT_ORDER_STATUS.Paid || failed,
    cancel: order.cancelLock === undefined ? !closed : order.cancelLock === null,
    remove: order.deleteLock === undefined ? false : order.deleteLock === null,
  };
}

// Hedefe (yeniden) gönderilebilir mi — sunucudaki kuralla aynı: kapıda ödeme onaylandı, havale ödendi ya da önceki
// gönderim hata verdi; ve Shopify siparişi henüz yok. Hedefi 'yalnız panelde' olan siparişte düğme yok. ERP hedefinde
// otomatik yeniden deneme yok: düğme yalnız ERP HATA verdiyse ("Yeniden gönder"); ilk gönderimi bayrak açıkken sunucu yapar.
export function canSendToDestination(
  order: Pick<ChatOrderDto, 'status' | 'paymentMethod' | 'shopifyOrderName' | 'destinationKind' | 'erpError'>,
): boolean {
  if (order.shopifyOrderName) return false;
  if (order.destinationKind === ORDER_DESTINATION_KIND.None) return false;
  if (order.destinationKind === ORDER_DESTINATION_KIND.ErpSource) {
    return order.status === CHAT_ORDER_STATUS.Failed && Boolean(order.erpError);
  }
  return order.status === CHAT_ORDER_STATUS.Paid || order.status === CHAT_ORDER_STATUS.Failed
    || (order.status === CHAT_ORDER_STATUS.Confirmed && order.paymentMethod === PAYMENT_METHOD.CashOnDelivery);
}

export const orderDisplayNo = (order: Pick<ChatOrderDto, 'publicNo'>) => order.publicNo ?? 'Taslak';

export interface FeaturedChatOrder {
  order: ChatOrderDto;
  // Tüm siparişler iptal edildiyse kart kapalı başlar — dikkat çekecek bir iş yok.
  collapsed: boolean;
}

// Liste en yeniden eskiye gelir. Öne çıkan sırası: açık (0/1) sipariş → en yeni iptal
// edilmemiş → en yeni sipariş (hepsi iptalse, kapalı).
export function pickFeaturedChatOrder(orders: readonly ChatOrderDto[]): FeaturedChatOrder | null {
  if (orders.length === 0) return null;
  const featured = orders.find((o) => isOpenChatOrder(o.status))
    ?? orders.find((o) => o.status !== CHAT_ORDER_STATUS.Cancelled);
  return featured ? { order: featured, collapsed: false } : { order: orders[0], collapsed: true };
}

// ─── Geçmiş ───────────────────────────────────────────────────────────────────

const EVENT_KIND_LABELS: Record<ChatOrderEventKind, string> = {
  [CHAT_ORDER_EVENT_KIND.StatusChanged]: '',
  [CHAT_ORDER_EVENT_KIND.Created]: 'Oluşturuldu',
  [CHAT_ORDER_EVENT_KIND.Edited]: 'Düzenlendi',
  [CHAT_ORDER_EVENT_KIND.ConfirmationSent]: 'Teyit gönderildi',
  [CHAT_ORDER_EVENT_KIND.Deleted]: 'Silindi',
};

// "Temsilci (Ayşe)" — kim yaptı.
export function eventActorLabel(event: Pick<ChatOrderEventDto, 'actor' | 'actorName'>): string {
  const actor = CHAT_ORDER_ACTOR_LABELS[event.actor];
  return event.actorName ? `${actor} (${event.actorName})` : actor;
}

// Aşama geçişinde yeni aşama; diğer olaylarda olayın adı.
export function eventTitle(event: Pick<ChatOrderEventDto, 'kind' | 'to'>): string {
  const kind = event.kind ?? CHAT_ORDER_EVENT_KIND.StatusChanged;
  return kind === CHAT_ORDER_EVENT_KIND.StatusChanged ? CHAT_ORDER_STATUS_LABELS[event.to] : EVENT_KIND_LABELS[kind];
}

// ─── Biçim ────────────────────────────────────────────────────────────────────

export function formatOrderMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency }).format(amount);
  } catch {
    // Geçersiz/boş para birimi kodu Intl'i patlatır — tutar yine gösterilsin.
    return `${amount.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} ${currency}`.trim();
  }
}

export function formatOrderAddress(order: Pick<ChatOrderDto, 'addressLine' | 'district' | 'city' | 'postalCode'>): string {
  const place = [order.district, order.city].filter(Boolean).join(' / ');
  return [order.addressLine, place, order.postalCode].filter(Boolean).join(', ');
}
