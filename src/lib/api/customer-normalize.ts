import type { CustomerProfileDto, CustomerProfileWireDto } from './customers';
import type {
  CustomerMergeSuggestionDto, CustomerMergeSuggestionListDto, CustomerTimelinePageDto,
} from './customer-crm';

// Frontend (Vercel) backend'den (VPS, elle ~15 dk) önce yayına çıkar. Bu aralıkta eski backend
// Customer 360 alanlarını göndermez ya da eski biçimde gönderir; ekran çökmesin diye her okuma
// buradan geçer ve eksik alan güvenli bir boş değere döner.

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export function normalizeCustomerProfile(wire: CustomerProfileWireDto): CustomerProfileDto {
  return {
    ...wire,
    preferredLanguage: wire.preferredLanguage ?? null,
    firstSeenAt: wire.firstSeenAt ?? wire.createdAt,
    pendingMergeSuggestions: wire.pendingMergeSuggestions ?? 0,
    addresses: wire.addresses ?? [],
    facts: wire.facts ?? [],
    interests: wire.interests ?? [],
    chatOrders: wire.chatOrders ?? [],
  };
}

const EMPTY_TIMELINE: CustomerTimelinePageDto = { items: [], nextBeforeId: null };

// Eski backend hesaplanmış bir dizi (kind/title/at) döndürüyordu — yeni olay biçimine
// uymadığı için gösterilmez, sakin boş durum çıkar.
export function normalizeTimelinePage(raw: unknown): CustomerTimelinePageDto {
  if (!isRecord(raw) || !Array.isArray(raw.items)) return EMPTY_TIMELINE;
  return {
    items: raw.items as CustomerTimelinePageDto['items'],
    nextBeforeId: typeof raw.nextBeforeId === 'number' ? raw.nextBeforeId : null,
  };
}

// Yeni öneri iki profil (A/B) taşır; eski biçim (profileId/reason) elenir.
const isSuggestion = (value: unknown): value is CustomerMergeSuggestionDto =>
  isRecord(value) && typeof value.id === 'number' && isRecord(value.profileA) && isRecord(value.profileB);

export function normalizeMergeSuggestions(raw: unknown): CustomerMergeSuggestionDto[] {
  return Array.isArray(raw) ? raw.filter(isSuggestion) : [];
}

export function normalizeMergeSuggestionList(raw: unknown): CustomerMergeSuggestionListDto {
  if (!isRecord(raw)) return { items: [], total: 0 };
  const items = normalizeMergeSuggestions(raw.items);
  return { items, total: typeof raw.total === 'number' ? raw.total : items.length };
}
