import { request } from './core';
import type { ChannelType, TeamCandidateDto } from './omnichannel';
import type {
  CustomerAddressDto, CustomerChatOrderSummaryDto, CustomerFactDto, CustomerInterestDto,
} from './customer-crm';
import { normalizeCustomerProfile } from './customer-normalize';

// Backend: OmnichannelCustomersController + OmnichannelCrmController (Faz 4 CRM).
// Customer 360 parçaları (bilgi, ilgi, zaman çizelgesi, öneriler): customer-crm.ts.
// Kanallar üstü müşteri profili: aynı kişinin WhatsApp/Instagram/Facebook kayıtları tek profilde.

export const LIFECYCLE_STAGE = { Lead: 0, Customer: 1, Vip: 2, Churned: 3 } as const;
export type LifecycleStage = (typeof LIFECYCLE_STAGE)[keyof typeof LIFECYCLE_STAGE];

export const IDENTITY_TYPE = { Phone: 0, Email: 1 } as const;
export type IdentityType = (typeof IDENTITY_TYPE)[keyof typeof IDENTITY_TYPE];

export const DATA_SOURCE = { Bot: 0, Agent: 1, Order: 2, Channel: 3 } as const;
export type DataSource = (typeof DATA_SOURCE)[keyof typeof DATA_SOURCE];

export const TASK_STATUS = { Open: 0, Done: 1, Cancelled: 2 } as const;
export type TaskStatus = (typeof TASK_STATUS)[keyof typeof TASK_STATUS];

export const TASK_SCOPE = { Mine: 0, All: 1 } as const;
export type TaskScope = (typeof TASK_SCOPE)[keyof typeof TASK_SCOPE];

// Backend'deki izinli etiket renkleri (CustomerCrmService.TagColors) ile aynı liste.
export const TAG_COLORS = ['neutral', 'blue', 'green', 'amber', 'rose', 'violet'] as const;
export type TagColor = (typeof TAG_COLORS)[number];

export interface CustomerTagDto {
  id: number;
  name: string;
  color: string;
  // Sistem etiketi (P23): kurallar ekler/kaldırır, elle eklenmez/kaldırılmaz/silinmez.
  // Eski backend göndermez → undefined = elle yönetilen etiket.
  isSystem?: boolean;
}

export interface CustomerIdentityDto {
  id: number;
  type: IdentityType;
  value: string;
  verified: boolean;
}

export interface CustomerChannelDto {
  contactId: number;
  channelId: number;
  channelName: string;
  channelType: ChannelType;
  externalId: string;
  displayName: string | null;
  latestConversationId: number | null;
}

export interface CustomerVehicleDto {
  id: number;
  make: string;
  model: string | null;
  year: number | null;
  // Nesil kodu ("B7", "Mk7") ve gövde tipi (estate/sedan/hatchback). Eski backend göndermez.
  generation?: string | null;
  bodyType?: string | null;
  lastConfirmedAt?: string | null;
  isPrimary: boolean;
  source: DataSource;
  updatedAt: string;
}

export interface CustomerNoteDto {
  id: number;
  authorUserId: number | null;
  authorName: string | null;
  body: string;
  isPinned: boolean;
  createdAt: string;
}

export interface CustomerProfileDto {
  id: number;
  displayName: string | null;
  countryCode: string | null;
  lifecycleStage: LifecycleStage;
  ownerUserId: number | null;
  marketingOptIn: boolean;
  marketingOptInAt: string | null;
  anonymizedAt: string | null;
  createdAt: string;
  lastSeenAt: string | null;
  // "tr" / "en" / "sq".
  preferredLanguage: string | null;
  firstSeenAt: string;
  // Bu profili içeren bekleyen "Aynı kişi mi?" önerisi sayısı.
  pendingMergeSuggestions: number;
  identities: CustomerIdentityDto[];
  channels: CustomerChannelDto[];
  vehicles: CustomerVehicleDto[];
  addresses: CustomerAddressDto[];
  facts: CustomerFactDto[];
  interests: CustomerInterestDto[];
  chatOrders: CustomerChatOrderSummaryDto[];
  tags: CustomerTagDto[];
  notes: CustomerNoteDto[];
}

// Customer 360 ile gelen alanlar: eski backend göndermez → customer-normalize.ts boş değerle doldurur.
type Customer360Keys =
  | 'preferredLanguage' | 'firstSeenAt' | 'pendingMergeSuggestions'
  | 'addresses' | 'facts' | 'interests' | 'chatOrders';
export type CustomerProfileWireDto =
  Omit<CustomerProfileDto, Customer360Keys> & Partial<Pick<CustomerProfileDto, Customer360Keys>>;

export interface CustomerListItemDto {
  id: number;
  displayName: string | null;
  countryCode: string | null;
  lifecycleStage: LifecycleStage;
  primaryPhone: string | null;
  channelTypes: ChannelType[];
  tags: CustomerTagDto[];
  lastSeenAt: string | null;
  isAnonymized: boolean;
}

export interface CustomerListResultDto {
  items: CustomerListItemDto[];
  total: number;
}

// Eklenen telefon/e-posta başka profilde kayıtlıysa iki profil OTOMATİK birleşir; merged ise ekran
// profileId'ye geçer (açık olan profil silinmiş olabilir).
export interface CustomerIdentityAddResultDto {
  identity: CustomerIdentityDto;
  profileId: number;
  merged: boolean;
}

export interface CustomerVehicleInput {
  make: string;
  model: string | null;
  year: number | null;
  generation: string | null;
  bodyType: string | null;
  isPrimary: boolean;
}

export interface CustomerOrderDto {
  orderNumber: string;
  platform: string;
  status: string;
  orderDate: string;
  total: number;
  currency: string | null;
  itemCount: number;
  matchedBy: string;
}

export interface CustomerShopifyTrackingDto {
  company: string | null;
  number: string | null;
  url: string | null;
}

// Yalnız özet alanlar; durumlar Shopify'ın ham değerleri (panel çevirir).
export interface CustomerShopifyOrderDto {
  storeId: number;
  orderId: number;
  name: string;
  createdAt: string;
  isCancelled: boolean;
  financialStatus: string;
  fulfillmentStatus: string;
  total: number | null;
  currency: string | null;
  matchedBy: 'phone' | 'email';
  tracking: CustomerShopifyTrackingDto[];
}

// failed / not_available "sipariş yok" DEĞİLDİR; message ok iken de dolu olabilir (kısmi hata).
export interface CustomerShopifyOrdersDto {
  outcome: 'ok' | 'not_available' | 'failed';
  message: string | null;
  orders: CustomerShopifyOrderDto[];
}

export interface CrmTaskDto {
  id: number;
  customerProfileId: number | null;
  customerName: string | null;
  conversationId: number | null;
  title: string;
  notes: string | null;
  assigneeUserId: number;
  assigneeName: string | null;
  createdByUserId: number;
  dueAt: string | null;
  status: TaskStatus;
  completedAt: string | null;
  createdAt: string;
}

export interface CrmTaskCreateInput {
  title: string;
  notes?: string | null;
  customerProfileId?: number | null;
  conversationId?: number | null;
  assigneeUserId?: number | null;
  dueAt?: string | null;
}

export interface CrmTaskUpdateInput {
  title?: string;
  notes?: string;
  assigneeUserId?: number;
  dueAt?: string;
  clearDueAt?: boolean;
  status?: TaskStatus;
}

// Backend CustomerSegment enum'unun adları (sorgu dizesinde büyük/küçük harf duyarsız).
// Tanımlar tek yerde: backend CustomerSegmentRules.
export const CUSTOMER_SEGMENTS = [
  'all', 'hasVehicle', 'hasAddress', 'hasPhone', 'complete', 'incomplete', 'hasOrder',
] as const;
export type CustomerSegment = (typeof CUSTOMER_SEGMENTS)[number];

export interface CustomerListQuery {
  search?: string;
  countryCode?: string;
  tagId?: number;
  channelType?: ChannelType;
  segment?: CustomerSegment;
  skip?: number;
  take?: number;
}

export interface CustomerChannelCountDto {
  channelType: ChannelType;
  count: number;
}

export interface CustomerCountryCountDto {
  countryCode: string | null;
  count: number;
}

// KPI şeridi (GET /omnichannel/customers/summary). Uç yeni: eski backend 404 döner, şerit gizlenir.
export interface CustomerSummaryDto {
  total: number;
  complete: number;
  incomplete: number;
  withVehicle: number;
  withAddress: number;
  withPhone: number;
  withOrder: number;
  byChannel?: CustomerChannelCountDto[];
  byCountry?: CustomerCountryCountDto[];
}

export interface CustomerProfileUpdateInput {
  displayName?: string;
  countryCode?: string;
  lifecycleStage?: LifecycleStage;
  marketingOptIn?: boolean;
  // Boş metin dili temizler.
  preferredLanguage?: string;
}

const json = (body: unknown): RequestInit['body'] => JSON.stringify(body);

export const customersApi = {
  list: (query: CustomerListQuery) => {
    const q = new URLSearchParams();
    if (query.search) q.set('search', query.search);
    if (query.countryCode) q.set('countryCode', query.countryCode);
    if (query.tagId) q.set('tagId', String(query.tagId));
    if (query.channelType) q.set('channelType', String(query.channelType));
    if (query.segment && query.segment !== 'all') q.set('segment', query.segment);
    if (query.skip) q.set('skip', String(query.skip));
    if (query.take) q.set('take', String(query.take));
    return request<CustomerListResultDto>(`/omnichannel/customers?${q}`);
  },
  summary: () => request<CustomerSummaryDto>('/omnichannel/customers/summary'),
  get: async (id: number) =>
    normalizeCustomerProfile(await request<CustomerProfileWireDto>(`/omnichannel/customers/${id}`)),
  forContact: async (contactId: number) =>
    normalizeCustomerProfile(await request<CustomerProfileWireDto>(`/omnichannel/contacts/${contactId}/customer`)),
  update: async (id: number, body: CustomerProfileUpdateInput) =>
    normalizeCustomerProfile(await request<CustomerProfileWireDto>(
      `/omnichannel/customers/${id}`, { method: 'PATCH', body: json(body) })),

  addIdentity: (id: number, type: IdentityType, value: string) =>
    request<CustomerIdentityAddResultDto>(`/omnichannel/customers/${id}/identities`, {
      method: 'POST', body: json({ type, value }),
    }),
  removeIdentity: (id: number, identityId: number) =>
    request<void>(`/omnichannel/customers/${id}/identities/${identityId}`, { method: 'DELETE' }),
  split: (contactId: number) =>
    request<{ profileId: number }>(`/omnichannel/contacts/${contactId}/split`, { method: 'POST' }),

  addVehicle: (id: number, vehicle: CustomerVehicleInput) =>
    request<CustomerVehicleDto>(`/omnichannel/customers/${id}/vehicles`, { method: 'POST', body: json(vehicle) }),
  updateVehicle: (id: number, vehicleId: number, vehicle: CustomerVehicleInput) =>
    request<CustomerVehicleDto>(`/omnichannel/customers/${id}/vehicles/${vehicleId}`, { method: 'PUT', body: json(vehicle) }),
  removeVehicle: (id: number, vehicleId: number) =>
    request<void>(`/omnichannel/customers/${id}/vehicles/${vehicleId}`, { method: 'DELETE' }),

  addNote: (id: number, body: string, isPinned = false) =>
    request<CustomerNoteDto>(`/omnichannel/customers/${id}/notes`, { method: 'POST', body: json({ body, isPinned }) }),
  pinNote: (id: number, noteId: number, isPinned: boolean) =>
    request<void>(`/omnichannel/customers/${id}/notes/${noteId}`, { method: 'PATCH', body: json({ isPinned }) }),
  deleteNote: (id: number, noteId: number) =>
    request<void>(`/omnichannel/customers/${id}/notes/${noteId}`, { method: 'DELETE' }),

  attachTag: (id: number, tagId: number) =>
    request<void>(`/omnichannel/customers/${id}/tags/${tagId}`, { method: 'PUT' }),
  detachTag: (id: number, tagId: number) =>
    request<void>(`/omnichannel/customers/${id}/tags/${tagId}`, { method: 'DELETE' }),

  orders: (id: number) => request<CustomerOrderDto[]>(`/omnichannel/customers/${id}/orders`),
  shopifyOrders: (id: number) => request<CustomerShopifyOrdersDto>(`/omnichannel/customers/${id}/shopify-orders`),

  exportData: (id: number) => request<unknown>(`/omnichannel/customers/${id}/export`),
  anonymize: (id: number) => request<void>(`/omnichannel/customers/${id}/anonymize`, { method: 'POST' }),
};

export const crmApi = {
  tags: () => request<CustomerTagDto[]>('/omnichannel/customer-tags'),
  createTag: (name: string, color: TagColor) =>
    request<CustomerTagDto>('/omnichannel/customer-tags', { method: 'POST', body: json({ name, color }) }),
  deleteTag: (tagId: number) => request<void>(`/omnichannel/customer-tags/${tagId}`, { method: 'DELETE' }),

  // Backend varsayılanı yalnız açık görevler.
  tasks: (query: { scope?: TaskScope; status?: TaskStatus; customerProfileId?: number }) => {
    const q = new URLSearchParams();
    if (query.scope !== undefined) q.set('scope', String(query.scope));
    if (query.status !== undefined) q.set('status', String(query.status));
    if (query.customerProfileId) q.set('customerProfileId', String(query.customerProfileId));
    return request<CrmTaskDto[]>(`/omnichannel/crm-tasks?${q}`);
  },
  createTask: (input: CrmTaskCreateInput) =>
    request<CrmTaskDto>('/omnichannel/crm-tasks', { method: 'POST', body: json(input) }),
  updateTask: (taskId: number, input: CrmTaskUpdateInput) =>
    request<CrmTaskDto>(`/omnichannel/crm-tasks/${taskId}`, { method: 'PATCH', body: json(input) }),
  assignees: () => request<TeamCandidateDto[]>('/omnichannel/crm-assignees'),
};
