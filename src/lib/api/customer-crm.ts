import { request } from './core';
import type { ChannelType } from './omnichannel';
import type { ChatOrderStatus } from './omnichannel-chat-orders';
import type { CustomerProfileDto, CustomerProfileWireDto, DataSource } from './customers';
import {
  normalizeCustomerProfile, normalizeMergeSuggestionList, normalizeMergeSuggestions, normalizeTimelinePage,
} from './customer-normalize';

// Customer 360 (backend: OmnichannelCustomer360Controller, crm şeması) — müşteri detayının bilgi, ilgi,
// sipariş özeti, sayfalı zaman çizelgesi ve "Aynı kişi mi?" önerisi parçaları.
// Frontend backend'den önce yayına çıkar: her okuma customer-normalize.ts'ten geçer.

export const INTEREST_STATUS = {
  Asked: 0, Quoted: 1, OutOfStock: 2, NotInCatalog: 3, Ordered: 4, Lost: 5,
} as const;
export type InterestStatus = (typeof INTEREST_STATUS)[keyof typeof INTEREST_STATUS];

export const TIMELINE_EVENT_TYPE = {
  ConversationStarted: 0,
  ProductAsked: 1,
  PriceQuoted: 2,
  OutOfStock: 3,
  NotInCatalog: 4,
  OrderPlaced: 5,
  HandoffOpened: 6,
  HandoffResolved: 7,
  NoteAdded: 8,
  ProfilesMerged: 9,
  IdentityAdded: 10,
  VehicleAdded: 11,
  FactChanged: 12,
  InterestUpdated: 13,
} as const;
export type TimelineEventType = (typeof TIMELINE_EVENT_TYPE)[keyof typeof TIMELINE_EVENT_TYPE];

export const MERGE_SUGGESTION_STATUS = { Pending: 0, Accepted: 1, Rejected: 2 } as const;
export type MergeSuggestionStatus = (typeof MERGE_SUGGESTION_STATUS)[keyof typeof MERGE_SUGGESTION_STATUS];

// Backend CustomerFactKeys ile aynı liste; başka anahtar kabul edilmez.
export const FACT_KEYS = [
  'full_name', 'email', 'phone', 'city', 'preferred_language', 'payment_preference', 'business_type', 'note',
] as const;
export type FactKey = (typeof FACT_KEYS)[number];

export const FACT_VALUE_MAX_LENGTH = 512;

export interface CustomerAddressDto {
  id: number;
  fullName: string | null;
  phone: string | null;
  country: string | null;
  city: string | null;
  district: string | null;
  addressLine: string | null;
  postalCode: string | null;
  isDefault: boolean;
  lastUsedAt: string | null;
}

export interface CustomerFactDto {
  key: string;
  label: string;
  value: string;
  // 0..1 — botun çıkarımı < 1, temsilcinin yazdığı 1.
  confidence: number;
  source: DataSource;
  conversationId: number | null;
  sourceMessageId: number | null;
  updatedAt: string;
}

export interface CustomerInterestDto {
  id: number;
  productName: string;
  sku: string | null;
  categoryName: string | null;
  vehicleText: string | null;
  status: InterestStatus;
  lastQuotedPrice: number | null;
  currency: string | null;
  askCount: number;
  firstAskedAt: string;
  lastAskedAt: string;
  conversationId: number | null;
}

export interface CustomerChatOrderSummaryDto {
  id: number;
  publicNo: string | null;
  conversationId: number;
  status: ChatOrderStatus;
  total: number;
  currency: string;
  itemCount: number;
  createdAt: string;
  confirmedAt: string | null;
}

export interface CustomerTimelineEventDto {
  id: number;
  type: TimelineEventType;
  summary: string;
  // conversation, chat_order, handoff, note, profile, vehicle, identity, interest, fact.
  refType: string | null;
  refId: string | null;
  channelId: number | null;
  actorUserId: number | null;
  actorName: string | null;
  occurredAt: string;
}

export interface CustomerTimelinePageDto {
  items: CustomerTimelineEventDto[];
  // Daha eski olay varsa sonraki sayfanın imleci.
  nextBeforeId: number | null;
}

export interface CustomerMergeCandidateDto {
  profileId: number;
  displayName: string | null;
  countryCode: string | null;
  primaryPhone: string | null;
  channelTypes: ChannelType[];
  lastSeenAt: string | null;
}

export interface CustomerMergeSuggestionDto {
  id: number;
  // 0..1 benzerlik.
  score: number;
  // " · " ile ayrılmış gerekçeler ("Aynı ad · Aynı araç").
  reasons: string;
  status: MergeSuggestionStatus;
  createdAt: string;
  // ProfileA eski profildir; onayda varsayılan olarak o kalır.
  profileA: CustomerMergeCandidateDto;
  profileB: CustomerMergeCandidateDto;
}

export interface CustomerMergeSuggestionListDto {
  items: CustomerMergeSuggestionDto[];
  total: number;
}

export const TIMELINE_PAGE_SIZE = 50;

const json = (body: unknown): RequestInit['body'] => JSON.stringify(body);

export const customerCrmApi = {
  timeline: async (profileId: number, beforeId?: number | null): Promise<CustomerTimelinePageDto> => {
    const q = new URLSearchParams({ take: String(TIMELINE_PAGE_SIZE) });
    if (beforeId) q.set('beforeId', String(beforeId));
    return normalizeTimelinePage(await request<unknown>(`/omnichannel/customers/${profileId}/timeline?${q}`));
  },

  setFact: (profileId: number, key: FactKey, value: string) =>
    request<CustomerFactDto>(`/omnichannel/customers/${profileId}/facts/${encodeURIComponent(key)}`, {
      method: 'PUT', body: json({ value }),
    }),
  removeFact: (profileId: number, key: string) =>
    request<void>(`/omnichannel/customers/${profileId}/facts/${encodeURIComponent(key)}`, { method: 'DELETE' }),

  updateInterest: (profileId: number, interestId: number, status: InterestStatus) =>
    request<CustomerInterestDto>(`/omnichannel/customers/${profileId}/interests/${interestId}`, {
      method: 'PATCH', body: json({ status }),
    }),

  mergeSuggestions: async (query: { skip?: number; take?: number } = {}): Promise<CustomerMergeSuggestionListDto> => {
    const q = new URLSearchParams({ status: String(MERGE_SUGGESTION_STATUS.Pending) });
    if (query.skip) q.set('skip', String(query.skip));
    if (query.take) q.set('take', String(query.take));
    return normalizeMergeSuggestionList(await request<unknown>(`/omnichannel/customers/merge-suggestions?${q}`));
  },
  profileMergeSuggestions: async (profileId: number): Promise<CustomerMergeSuggestionDto[]> =>
    normalizeMergeSuggestions(await request<unknown>(`/omnichannel/customers/${profileId}/merge-suggestions`)),
  // Yanıt kalan profilin 360 detayıdır; targetProfileId boşsa eski profil (A) kalır.
  acceptMergeSuggestion: async (suggestionId: number, targetProfileId?: number): Promise<CustomerProfileDto> =>
    normalizeCustomerProfile(await request<CustomerProfileWireDto>(
      `/omnichannel/customers/merge-suggestions/${suggestionId}/accept`,
      { method: 'POST', body: json({ targetProfileId: targetProfileId ?? null }) },
    )),
  rejectMergeSuggestion: (suggestionId: number) =>
    request<void>(`/omnichannel/customers/merge-suggestions/${suggestionId}/reject`, { method: 'POST' }),
};
