import { request } from './core';
import { AI_REQUEST_TIMEOUT_MS, type AiChatTurn, type AiDataCard } from './ai';

// ─── Shipping (kargo taşıyıcıları + gönderi takibi) ───────────────────────────

// Backend enum'larıyla birebir sayısal karşılık.
export const CARRIER_TYPE = {
  Aras: 1, Yurtici: 2, Mng: 3, Surat: 4, Ups: 5, Dhl: 6,
} as const;
export type CarrierType = (typeof CARRIER_TYPE)[keyof typeof CARRIER_TYPE];

export const CARRIER_STATUS = {
  Unknown: 0, Connected: 1, AuthFailed: 2, Unreachable: 3,
} as const;
export type CarrierStatus = (typeof CARRIER_STATUS)[keyof typeof CARRIER_STATUS];

// Hangi alanın zorunlu olduğu taşıyıcı tipine bağlı; nihai doğrulama sunucuda
// (CarrierCredentialsValidator).
export interface CarrierCredentialsInput {
  username?: string;
  password?: string;
  customerCode?: string;
  apiKey?: string;
  apiSecret?: string;
  clientId?: string;
  clientSecret?: string;
  accountNumber?: string;
}

// Sunucu kimlik bilgilerini ASLA geri döndürmez — yalnızca girilmiş olup olmadığını.
export interface CarrierDto {
  id: number;
  type: CarrierType;
  displayName: string;
  accountCode: string;
  storeCode: string | null;
  isTestMode: boolean;
  isDefault: boolean;
  isActive: boolean;
  status: CarrierStatus;
  lastError: string | null;
  lastCheckedAt: string | null;
  hasCredentials: boolean;
  // Adaptörü yazıldı mı? Yazılmadıysa panel "yakında" gösterir.
  isSupported: boolean;
  shipmentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CarrierCreateBody {
  type: CarrierType;
  displayName: string;
  accountCode: string;
  storeCode?: string | null;
  isTestMode: boolean;
  isDefault: boolean;
  credentials: CarrierCredentialsInput;
}

export interface CarrierUpdateBody {
  displayName: string;
  accountCode: string;
  storeCode?: string | null;
  isTestMode: boolean;
  isDefault: boolean;
  isActive: boolean;
  // Atlanırsa mevcut kimlik bilgileri korunur.
  credentials?: CarrierCredentialsInput | null;
}

export interface CarrierHealthDto {
  status: CarrierStatus;
  error: string | null;
}

export const SHIPMENT_STATUS = {
  Draft: 0, Created: 1, PickedUp: 2, InTransit: 3, OutForDelivery: 4,
  Delivered: 5, DeliveryFailed: 6, Returned: 7, Cancelled: 8,
} as const;
export type ShipmentStatus = (typeof SHIPMENT_STATUS)[keyof typeof SHIPMENT_STATUS];

export interface ShipmentListItemDto {
  id: number;
  carrierId: number;
  carrierName: string;
  carrierType: CarrierType;
  trackingNumber: string | null;
  orderNumber: string | null;
  status: ShipmentStatus;
  recipientName: string;
  recipientCity: string | null;
  price: number | null;
  currency: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  lastTrackedAt: string | null;
  lastError: string | null;
  createdAt: string;
}

export interface ShipmentEventDto {
  id: number;
  status: ShipmentStatus;
  rawStatus: string | null;
  description: string | null;
  location: string | null;
  occurredAt: string;
}

// "Kargo No ile Sorgula" sonucu — kayda bağlı değil, anlık takip sorgusu.
export interface TrackingLookupResult {
  success: boolean;
  status: ShipmentStatus | null;
  deliveredAt: string | null;
  events: ShipmentEventDto[];
  error: string | null;
}

// Telefon/adres yalnızca detayda döner — liste yüzlerce kaydın kişisel verisini taşımaz.
export interface ShipmentDetailDto {
  summary: ShipmentListItemDto;
  recipientPhone: string | null;
  recipientTown: string | null;
  recipientAddress: string | null;
  weightKg: number | null;
  desi: number | null;
  labelUrl: string | null;
  erpOrderId: number | null;
  events: ShipmentEventDto[];
}

export interface ShipmentPageDto {
  items: ShipmentListItemDto[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface ShipmentQuery {
  carrierId?: number;
  status?: ShipmentStatus;
  search?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export interface ShipmentCreateBody {
  carrierId: number;
  recipientName: string;
  recipientPhone?: string | null;
  recipientCity?: string | null;
  recipientTown?: string | null;
  recipientAddress?: string | null;
  orderNumber?: string | null;
  erpOrderId?: number | null;
  weightKg?: number | null;
  desi?: number | null;
}

function toQueryString(query: ShipmentQuery): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

// ERP kaynağı → taşıyıcı eşlemesi. CarrierId null ise o kaynak HENÜZ EŞLENMEMİŞ
// demektir — gönderisi açılamaz. Panel bunları ayrıca vurgular.
export interface CarrierMappingRowDto {
  sourceId: number;
  sourceCode: string;
  sourceDisplayName: string;
  erp: string;
  country: string;
  carrierId: number | null;
  carrierName: string | null;
  isActive: boolean;
}

export const shippingApi = {
  // kg.ai — Aivar'ın kargo türevi; history: widget'taki önceki turlar (sunucu durumsuz).
  chat: (message: string, history: AiChatTurn[] = []) =>
    request<{ reply: string; cards?: AiDataCard[] }>(
      '/shipping/chat',
      { method: 'POST', body: JSON.stringify({ message, history }) },
      true,
      AI_REQUEST_TIMEOUT_MS,
    ),

  getCarriers: () => request<CarrierDto[]>('/shipping/carriers'),

  getCarrierMappings: () =>
    request<CarrierMappingRowDto[]>('/shipping/carrier-mappings'),
  setCarrierMapping: (sourceId: number, carrierId: number, isActive = true) =>
    request<void>(`/shipping/carrier-mappings/${sourceId}`, {
      method: 'PUT', body: JSON.stringify({ carrierId, isActive }),
    }),
  // country boşsa TÜM kaynaklar etkilenir — Aras UK gönderisi taşımadığı için
  // panel bunu ülke seçmeden çağırmaz.
  assignAllCarriers: (carrierId: number, country?: string) =>
    request<{ assigned: number }>('/shipping/carrier-mappings/assign-all', {
      method: 'POST', body: JSON.stringify({ carrierId, country }),
    }),
  deleteCarrierMapping: (sourceId: number) =>
    request<void>(`/shipping/carrier-mappings/${sourceId}`, { method: 'DELETE' }),
  getCarrier: (id: number) => request<CarrierDto>(`/shipping/carriers/${id}`),
  createCarrier: (body: CarrierCreateBody) =>
    request<CarrierDto>('/shipping/carriers', { method: 'POST', body: JSON.stringify(body) }),
  updateCarrier: (id: number, body: CarrierUpdateBody) =>
    request<CarrierDto>(`/shipping/carriers/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteCarrier: (id: number) =>
    request<void>(`/shipping/carriers/${id}`, { method: 'DELETE' }),
  checkHealth: (id: number) =>
    request<CarrierHealthDto>(`/shipping/carriers/${id}/check`, { method: 'POST' }),

  getShipments: (query: ShipmentQuery = {}) =>
    request<ShipmentPageDto>(`/shipping/shipments${toQueryString(query)}`),
  getShipment: (id: number) =>
    request<ShipmentDetailDto>(`/shipping/shipments/${id}`),
  createShipment: (body: ShipmentCreateBody) =>
    request<ShipmentDetailDto>('/shipping/shipments', { method: 'POST', body: JSON.stringify(body) }),
  trackShipment: (id: number) =>
    request<ShipmentDetailDto>(`/shipping/shipments/${id}/track`, { method: 'POST' }),
  lookupTracking: (carrierId: number, trackingNumber: string) =>
    request<TrackingLookupResult>(
      `/shipping/shipments/lookup?carrierId=${carrierId}&trackingNumber=${encodeURIComponent(trackingNumber)}`,
    ),
  cancelShipment: (id: number) =>
    request<ShipmentDetailDto>(`/shipping/shipments/${id}/cancel`, { method: 'POST' }),
};
