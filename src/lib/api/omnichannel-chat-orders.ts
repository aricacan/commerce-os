import { request } from './core';
import type { PaymentMethod } from './omnichannel';
import type { OrderDestinationKind } from './omnichannel-order-destinations';

// ─── Omnichannel › Sohbetten sipariş (P21) ─────────────────────────────────────
//
// Botun konuşmada topladığı sipariş (ChatOrder) ve müşterinin kayıtlı adresleri.
// Backend enum'ları SAYI olarak gönderir/bekler.

export const CHAT_ORDER_STATUS = {
  Collecting: 0,
  AwaitingConfirmation: 1,
  Confirmed: 2,
  AwaitingPayment: 3,
  Paid: 4,
  SentToShopify: 5,
  Shipped: 6,
  Cancelled: 7,
  Failed: 8,
} as const;
export type ChatOrderStatus = (typeof CHAT_ORDER_STATUS)[keyof typeof CHAT_ORDER_STATUS];

export const CHAT_ORDER_ACTOR = { Bot: 0, Agent: 1, Webhook: 2, System: 3 } as const;
export type ChatOrderActor = (typeof CHAT_ORDER_ACTOR)[keyof typeof CHAT_ORDER_ACTOR];

// Geçmiş olayının türü: aşama geçişi ya da aşama değiştirmeyen iş (oluşturma, düzenleme, teyit, silme).
export const CHAT_ORDER_EVENT_KIND = {
  StatusChanged: 0, Created: 1, Edited: 2, ConfirmationSent: 3, Deleted: 4,
} as const;
export type ChatOrderEventKind = (typeof CHAT_ORDER_EVENT_KIND)[keyof typeof CHAT_ORDER_EVENT_KIND];

// Siparişler ekranının Shopify durumu filtresi.
export const CHAT_ORDER_SHOPIFY_FILTER = { NotSent: 0, Sent: 1, Error: 2 } as const;
export type ChatOrderShopifyFilter = (typeof CHAT_ORDER_SHOPIFY_FILTER)[keyof typeof CHAT_ORDER_SHOPIFY_FILTER];

export interface ChatOrderLineDto {
  productId: number | null;
  sku: string | null;
  title: string;
  quantity: number;
  unitPrice: number;
  // Ürün sayfası. Eski backend / eski sipariş göndermez → link gösterilmez.
  productUrl?: string | null;
  // Satır kimliği (düzenlemede mevcut satırı işaret eder).
  id?: number;
}

export interface ChatOrderEventDto {
  from: ChatOrderStatus;
  to: ChatOrderStatus;
  actor: ChatOrderActor;
  note: string | null;
  at: string;
  // Eski backend göndermez → aşama geçişi sayılır.
  kind?: ChatOrderEventKind;
  actorUserId?: number | null;
  // Temsilcinin görünen adı (yalnız Siparişler ayrıntısında).
  actorName?: string | null;
}

export interface ChatOrderDto {
  id: number;
  publicNo: string | null;
  conversationId: number;
  customerProfileId: number | null;
  brandId: number | null;
  country: string;
  currency: string;
  status: ChatOrderStatus;
  paymentMethod: PaymentMethod | null;
  fullName: string | null;
  phone: string | null;
  // Opsiyonel: eski backend göndermez; e-posta toplanmadan açılmış siparişlerde boş.
  email?: string | null;
  city: string | null;
  district: string | null;
  addressLine: string | null;
  postalCode: string | null;
  note: string | null;
  subtotal: number;
  shippingAmount: number | null;
  total: number;
  shopifyOrderName: string | null;
  // Shopify admin'deki sipariş sayfası ve otomatik gönderim hatası. Eski backend göndermez → okunmaz.
  shopifyOrderUrl?: string | null;
  shopifyError?: string | null;
  // Son gönderim denemesinde çözülen hedef türü; boş = henüz denenmedi. Eski backend göndermez.
  destinationKind?: OrderDestinationKind | null;
  // ERP hedefi: ERP'nin verdiği sipariş no, hata sebebi, kuyrukta mı (gönderim bekliyor). Eski backend göndermez.
  erpOrderNo?: string | null;
  erpError?: string | null;
  erpQueued?: boolean;
  trackingNumber: string | null;
  trackingUrl?: string | null;
  cancelReason: string | null;
  createdAt: string;
  confirmedAt: string | null;
  paidAt: string | null;
  // Müşterinin "Evet" dediği onay özeti (aynen). Eski backend / eski sipariş göndermez.
  confirmationText?: string | null;
  // İyimser kilit: yazma isteklerinde aynen geri gönderilir (arada değiştiyse 409).
  version: number;
  createdByAgent?: boolean;
  // Kilit sebepleri (null = izinli); asıl denetim sunucuda.
  editLock?: string | null;
  cancelLock?: string | null;
  deleteLock?: string | null;
  lines: ChatOrderLineDto[];
  events: ChatOrderEventDto[];
}

// ─── Siparişler ekranı: yalnız müşterinin onayladığı siparişler ───────────────

export interface ChatOrderListQuery {
  status?: ChatOrderStatus;
  country?: string;
  channelId?: number;
  paymentMethod?: PaymentMethod;
  // ISO anları; `to` hariç.
  from?: string;
  to?: string;
  shopify?: ChatOrderShopifyFilter;
  // true: müşterinin henüz onaylamadığı (taslak / onay bekleyen) siparişler de gelir.
  includeUnconfirmed?: boolean;
  search?: string;
  page: number;
  pageSize: number;
}

export interface ChatOrderItemDto {
  title: string;
  quantity: number;
}

export interface ChatOrderListItemDto {
  id: number;
  publicNo: string | null;
  conversationId: number;
  channelId: number;
  channelName: string | null;
  channelType: number | null;
  country: string;
  currency: string;
  status: ChatOrderStatus;
  paymentMethod: PaymentMethod | null;
  fullName: string | null;
  total: number;
  createdAt: string;
  // Onaylanmamış siparişte (includeUnconfirmed) boş.
  confirmedAt: string | null;
  // Eski backend göndermez → rozet çizilmez.
  shopifyOrderName?: string | null;
  hasShopifyError?: boolean;
  destinationKind?: OrderDestinationKind | null;
  trackingNumber?: string | null;
  createdByAgent?: boolean;
  items: ChatOrderItemDto[];
}

export interface ChatOrderPageDto {
  items: ChatOrderListItemDto[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ChatOrderDetailDto {
  order: ChatOrderDto;
  channelId: number;
  channelName: string | null;
  channelType: number | null;
  canWrite: boolean;
  // Fiyat değiştirme yetkisi (rol) ve müşteriye şimdi mesaj (teyit) gönderilebilir mi.
  canOverridePrice?: boolean;
  canMessageCustomer?: boolean;
}

function listQueryString(query: ChatOrderListQuery): string {
  const q = new URLSearchParams({ page: String(query.page), pageSize: String(query.pageSize) });
  if (query.status !== undefined) q.set('status', String(query.status));
  if (query.country) q.set('country', query.country);
  if (query.channelId !== undefined) q.set('channelId', String(query.channelId));
  if (query.paymentMethod !== undefined) q.set('paymentMethod', String(query.paymentMethod));
  if (query.from) q.set('from', query.from);
  if (query.to) q.set('to', query.to);
  if (query.shopify !== undefined) q.set('shopify', String(query.shopify));
  if (query.includeUnconfirmed) q.set('includeUnconfirmed', 'true');
  if (query.search) q.set('search', query.search);
  return q.toString();
}

export interface ChatOrderStatusChangeDto {
  status: ChatOrderStatus;
  note?: string;
  version?: number;
}

// ─── Temsilci CRUD ────────────────────────────────────────────────────────────

export interface ChatOrderProductOptionDto {
  productId: number;
  sku: string;
  title: string;
  price: number | null;
  currency: string | null;
  stockQuantity: number;
  productUrl: string | null;
  imageUrl: string | null;
  // Araç uyumu (katalogdaki marka / model / model yılı) ve kategori.
  vehicleBrand: string | null;
  vehicleModel: string | null;
  modelYear: string | null;
  categoryName: string | null;
}

export interface ChatOrderDraftDefaultsDto {
  conversationId: number;
  country: string | null;
  currency: string | null;
  fullName: string | null;
  phone: string | null;
  city: string | null;
  district: string | null;
  addressLine: string | null;
  postalCode: string | null;
  // Konuşmada müşterinin henüz onaylamadığı sipariş — yenisi açılamaz, o düzenlenir.
  openOrderId: number | null;
  paymentMethods: PaymentMethod[];
  canMessageCustomer: boolean;
  // Fiyat değiştirme yetkisi (rol).
  canOverridePrice?: boolean;
}

// lineId = mevcut satır; yoksa productId ile katalogdan yeni satır. unitPrice boş → katalog / mevcut fiyat.
export interface ChatOrderLineInputDto {
  lineId?: number;
  productId?: number;
  quantity: number;
  unitPrice?: number;
}

export interface ChatOrderDeliveryFieldsDto {
  fullName?: string;
  phone?: string;
  email?: string;
  city?: string;
  district?: string;
  addressLine?: string;
  postalCode?: string;
  note?: string;
  paymentMethod?: PaymentMethod;
  shippingAmount?: number;
}

export interface ChatOrderCreateDto extends ChatOrderDeliveryFieldsDto {
  conversationId: number;
  country?: string;
  lines: ChatOrderLineInputDto[];
  sendConfirmation: boolean;
}

// Yalnız gönderilen alanlar değişir; lines verilirse siparişin istenen son satır listesidir.
// Boş metin ("") isteğe bağlı alanı (ilçe, posta kodu, not) temizler.
export interface ChatOrderUpdateDto extends ChatOrderDeliveryFieldsDto {
  version: number;
  lines?: ChatOrderLineInputDto[];
}

// warning: değişikliğin bir kısmı uygulandı ya da temsilcinin bilmesi gereken bir durum var.
export interface ChatOrderWriteResultDto {
  order: ChatOrderDto;
  warning: string | null;
}

export const chatOrdersApi = {
  list: (query: ChatOrderListQuery) => request<ChatOrderPageDto>(`/omnichannel/chat-orders?${listQueryString(query)}`),
  detail: (id: number) => request<ChatOrderDetailDto>(`/omnichannel/chat-orders/${id}`),
  forConversation: (conversationId: number) =>
    request<ChatOrderDto[]>(`/omnichannel/conversations/${conversationId}/chat-orders`),
  forCustomer: (profileId: number) =>
    request<ChatOrderDto[]>(`/omnichannel/customers/${profileId}/chat-orders`),
  draftDefaults: (conversationId: number) =>
    request<ChatOrderDraftDefaultsDto>(`/omnichannel/conversations/${conversationId}/chat-order-draft`),
  searchProducts: (conversationId: number, query: string, country?: string) => {
    const q = new URLSearchParams({ q: query });
    if (country) q.set('country', country);
    return request<ChatOrderProductOptionDto[]>(`/omnichannel/conversations/${conversationId}/chat-order-products?${q.toString()}`);
  },
  create: (body: ChatOrderCreateDto) =>
    request<ChatOrderWriteResultDto>('/omnichannel/chat-orders', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: number, body: ChatOrderUpdateDto) =>
    request<ChatOrderWriteResultDto>(`/omnichannel/chat-orders/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  // Shopify'a gittiyse orada da iptal edilir; kargolandıysa sunucu reddeder.
  cancel: (id: number, version: number, reason?: string) =>
    request<ChatOrderWriteResultDto>(`/omnichannel/chat-orders/${id}/cancel`, {
      method: 'POST', body: JSON.stringify({ version, reason }),
    }),
  // Yalnız onaylanmamış, Shopify'a gitmemiş taslak.
  remove: (id: number, version: number) =>
    request<{ id: number }>(`/omnichannel/chat-orders/${id}?version=${version}`, { method: 'DELETE' }),
  sendConfirmation: (id: number, version: number) =>
    request<ChatOrderWriteResultDto>(`/omnichannel/chat-orders/${id}/confirmation`, {
      method: 'POST', body: JSON.stringify({ version }),
    }),
  changeStatus: (id: number, body: ChatOrderStatusChangeDto) =>
    request<ChatOrderDto>(`/omnichannel/chat-orders/${id}/status`, { method: 'POST', body: JSON.stringify(body) }),
  // Ülkenin Shopify mağazasında aç / hatadan sonra yeniden dene (aynı sipariş iki kez açılmaz).
  sendToShopify: (id: number) =>
    request<ChatOrderDto>(`/omnichannel/chat-orders/${id}/shopify`, { method: 'POST' }),
  // Adresler müşteri detayında gelir (CustomerProfileDto.addresses); burada yalnız KVKK silme.
  deleteAddress: (profileId: number, addressId: number) =>
    request<void>(`/omnichannel/customers/${profileId}/addresses/${addressId}`, { method: 'DELETE' }),
};
