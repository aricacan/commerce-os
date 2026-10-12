import type { FilterSelectOption } from '../../components/ui/FilterSelect';
import { ORDER_PAYMENT_METHODS, type PaymentMethod } from '../../lib/api/omnichannel';
import {
  CHAT_ORDER_SHOPIFY_FILTER,
  CHAT_ORDER_STATUS,
  type ChatOrderItemDto,
  type ChatOrderListQuery,
  type ChatOrderShopifyFilter,
  type ChatOrderStatus,
} from '../../lib/api/omnichannel-chat-orders';
import { resolveDatePreset, type DatePreset } from '../../utils/date';
import { CHAT_ORDER_STATUS_LABELS } from './chatOrderRules';
import { PAYMENT_METHOD_LABELS } from './paymentOptionDraft';

// Siparişler ekranının saf kuralları: filtre seçenekleri, filtre → sorgu dönüşümü, ürün özeti.

export const ORDER_LIST_PAGE_SIZE = 25;
export const ORDER_SEARCH_DEBOUNCE_MS = 300;

// Taslaklar dahil edilince listelenen (müşterinin henüz onaylamadığı) durumlar.
export const DRAFT_ORDER_STATUSES: readonly ChatOrderStatus[] = [
  CHAT_ORDER_STATUS.Collecting,
  CHAT_ORDER_STATUS.AwaitingConfirmation,
];

// Varsayılan listede görünebilen durumlar: yalnız müşteri "Evet" dedikten sonrası.
export const LISTED_ORDER_STATUSES: readonly ChatOrderStatus[] = [
  CHAT_ORDER_STATUS.Confirmed,
  CHAT_ORDER_STATUS.AwaitingPayment,
  CHAT_ORDER_STATUS.Paid,
  CHAT_ORDER_STATUS.SentToShopify,
  CHAT_ORDER_STATUS.Shipped,
  CHAT_ORDER_STATUS.Failed,
  CHAT_ORDER_STATUS.Cancelled,
];

const statusOption = (status: ChatOrderStatus): FilterSelectOption => ({
  value: String(status),
  label: CHAT_ORDER_STATUS_LABELS[status],
});

export const orderStatusOptions = (includeDrafts: boolean): FilterSelectOption[] =>
  (includeDrafts ? [...DRAFT_ORDER_STATUSES, ...LISTED_ORDER_STATUSES] : LISTED_ORDER_STATUSES).map(statusOption);

const SHOPIFY_FILTER_LABELS: Record<ChatOrderShopifyFilter, string> = {
  [CHAT_ORDER_SHOPIFY_FILTER.Sent]: "Shopify'da",
  [CHAT_ORDER_SHOPIFY_FILTER.NotSent]: "Shopify'a gitmedi",
  [CHAT_ORDER_SHOPIFY_FILTER.Error]: 'Shopify hatası',
};

export const ORDER_SHOPIFY_OPTIONS: FilterSelectOption[] = (Object.values(CHAT_ORDER_SHOPIFY_FILTER) as ChatOrderShopifyFilter[])
  .map((value) => ({ value: String(value), label: SHOPIFY_FILTER_LABELS[value] }));

// "Siteden sipariş ver" sohbette sipariş açmaz: filtrede yalnız havale ve kapıda ödeme.
export const ORDER_PAYMENT_OPTIONS: FilterSelectOption[] = ORDER_PAYMENT_METHODS.map((method) => ({
  value: String(method),
  label: PAYMENT_METHOD_LABELS[method],
}));

export interface OrderListFilters {
  // '' = hepsi (FilterSelect'in "Tüm …" satırı).
  status: string;
  country: string;
  channelId: string;
  paymentMethod: string;
  shopify: string;
  // Müşterinin henüz onaylamadığı (taslak / onay bekleyen) siparişler de listelensin.
  includeDrafts: boolean;
  datePreset: DatePreset;
  customFrom: string;
  customTo: string;
  search: string;
}

export const EMPTY_ORDER_FILTERS: OrderListFilters = {
  status: '',
  country: '',
  channelId: '',
  paymentMethod: '',
  shopify: '',
  includeDrafts: false,
  datePreset: 'all',
  customFrom: '',
  customTo: '',
  search: '',
};

export function hasActiveOrderFilters(filters: OrderListFilters): boolean {
  return filters.status !== '' || filters.country !== '' || filters.channelId !== '' || filters.paymentMethod !== ''
    || filters.shopify !== '' || filters.includeDrafts || filters.datePreset !== 'all' || filters.search.trim() !== '';
}

const parseStatus = (value: string, includeDrafts: boolean): ChatOrderStatus | undefined =>
  (includeDrafts ? [...DRAFT_ORDER_STATUSES, ...LISTED_ORDER_STATUSES] : LISTED_ORDER_STATUSES)
    .find((status) => String(status) === value);

const parseShopify = (value: string): ChatOrderShopifyFilter | undefined =>
  (Object.values(CHAT_ORDER_SHOPIFY_FILTER) as ChatOrderShopifyFilter[]).find((f) => String(f) === value);

const parsePayment = (value: string): PaymentMethod | undefined =>
  ORDER_PAYMENT_METHODS.find((method) => String(method) === value);

const parseId = (value: string): number | undefined => {
  const id = Number(value);
  return value !== '' && Number.isInteger(id) && id > 0 ? id : undefined;
};

// Yerel takvim günleri ("2026-10-01".."2026-10-03") → sunucunun beklediği anlar: başlangıç gününün
// yerel gece yarısı, bitiş gününün ERTESİ gece yarısı (hariç). Boş aralık → null (tarih filtresi yok).
export function localDayRange(from: string, to: string): { from: string; to: string } | null {
  if (!from || !to) return null;
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  end.setDate(end.getDate() + 1);
  return { from: start.toISOString(), to: end.toISOString() };
}

export function toOrderListQuery(filters: OrderListFilters, search: string, page: number): ChatOrderListQuery {
  const days = resolveDatePreset(filters.datePreset, filters.customFrom, filters.customTo);
  const range = localDayRange(days.from, days.to);
  const term = search.trim();
  return {
    status: parseStatus(filters.status, filters.includeDrafts),
    country: filters.country || undefined,
    channelId: parseId(filters.channelId),
    paymentMethod: parsePayment(filters.paymentMethod),
    from: range?.from,
    to: range?.to,
    shopify: parseShopify(filters.shopify),
    includeUnconfirmed: filters.includeDrafts || undefined,
    search: term || undefined,
    page,
    pageSize: ORDER_LIST_PAGE_SIZE,
  };
}

// "Kofano 4mm ×2 · +1 ürün" — listedeki tek satırlık ürün özeti.
export function orderItemSummary(items: readonly ChatOrderItemDto[]): string {
  if (items.length === 0) return '—';
  const [first, ...rest] = items;
  const head = `${first.title} ×${first.quantity}`;
  return rest.length === 0 ? head : `${head} · +${rest.length} ürün`;
}

export const totalPages = (total: number, pageSize: number): number => Math.max(1, Math.ceil(total / pageSize));
