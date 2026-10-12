import { describeError, httpStatusOf } from '../../lib/errors';
import type { BadgeTone } from '../shared/design';
import {
  SHOPIFY_GATEWAY_MATCH,
  type ShopifyConfiguredGatewayDto,
  type ShopifyGatewayMatch,
  type ShopifyMoneyDto,
  type ShopifyOrderFilters,
  type ShopifyProductFilters,
  type ShopifyRefundBody,
  type ShopifyWriteResultDto,
} from '../../lib/api/shopify-explorer';

// Shopify Hub gezgin ekranlarının saf kuralları: hata metni, etiketler, para/tarih biçimi, süzgeç varsayılanları.

const HTTP_NOT_FOUND = 404;
const SERVER_NOT_UPDATED = 'Bu ekran sunucuda henüz yok (backend güncel değil).';
// Backend'in kendi 404 ProblemDetails'i (mağaza/sipariş yok) mesaj taşır; mesajsız 404 = uç hiç yok.
const GENERIC_NOT_FOUND = 'Kayıt bulunamadı.';

export function explorerErrorText(error: unknown): string {
  const text = describeError(error);
  return httpStatusOf(error) === HTTP_NOT_FOUND && text === GENERIC_NOT_FOUND ? SERVER_NOT_UPDATED : text;
}

export const EMPTY_ORDER_FILTERS: ShopifyOrderFilters = {
  search: '', status: '', financialStatus: '', fulfillmentStatus: '', from: '', to: '',
};

export const EMPTY_PRODUCT_FILTERS: ShopifyProductFilters = { search: '', status: '', stock: '' };

export function hasActiveFilters(filters: Record<string, string>): boolean {
  return Object.values(filters).some((value) => value.trim() !== '');
}

export interface FilterOption {
  value: string;
  label: string;
}

export const ORDER_STATUS_OPTIONS: FilterOption[] = [
  { value: 'open', label: 'Açık' },
  { value: 'closed', label: 'Kapalı' },
  { value: 'cancelled', label: 'İptal' },
];

export const FINANCIAL_OPTIONS: FilterOption[] = [
  { value: 'pending', label: 'Ödeme bekliyor' },
  { value: 'paid', label: 'Ödendi' },
  { value: 'partially_paid', label: 'Kısmen ödendi' },
  { value: 'authorized', label: 'Yetkilendirildi' },
  { value: 'refunded', label: 'İade edildi' },
  { value: 'partially_refunded', label: 'Kısmen iade' },
  { value: 'voided', label: 'İptal edildi' },
];

export const FULFILLMENT_OPTIONS: FilterOption[] = [
  { value: 'unfulfilled', label: 'Hazırlanmadı' },
  { value: 'partial', label: 'Kısmen gönderildi' },
  { value: 'fulfilled', label: 'Gönderildi' },
  { value: 'on_hold', label: 'Beklemede' },
  { value: 'scheduled', label: 'Planlandı' },
];

export const PRODUCT_STATUS_OPTIONS: FilterOption[] = [
  { value: 'active', label: 'Aktif' },
  { value: 'draft', label: 'Taslak' },
  { value: 'archived', label: 'Arşiv' },
];

export const STOCK_OPTIONS: FilterOption[] = [
  { value: 'in', label: 'Stokta var' },
  { value: 'out', label: 'Stokta yok' },
];

interface StatusMeta {
  label: string;
  tone: BadgeTone;
}

const UNKNOWN_TONE: BadgeTone = 'neutral';

// Shopify enum değerleri (displayFinancialStatus / displayFulfillmentStatus / ürün durumu).
const FINANCIAL_META: Record<string, StatusMeta> = {
  PAID: { label: 'Ödendi', tone: 'success' },
  PENDING: { label: 'Ödeme bekliyor', tone: 'warning' },
  AUTHORIZED: { label: 'Yetkilendirildi', tone: 'info' },
  PARTIALLY_PAID: { label: 'Kısmen ödendi', tone: 'warning' },
  PARTIALLY_REFUNDED: { label: 'Kısmen iade', tone: 'warning' },
  REFUNDED: { label: 'İade edildi', tone: 'danger' },
  VOIDED: { label: 'İptal edildi', tone: 'danger' },
  EXPIRED: { label: 'Süresi doldu', tone: 'danger' },
};

const FULFILLMENT_META: Record<string, StatusMeta> = {
  UNFULFILLED: { label: 'Hazırlanmadı', tone: 'warning' },
  PARTIALLY_FULFILLED: { label: 'Kısmen gönderildi', tone: 'info' },
  FULFILLED: { label: 'Gönderildi', tone: 'success' },
  IN_PROGRESS: { label: 'Hazırlanıyor', tone: 'info' },
  ON_HOLD: { label: 'Beklemede', tone: 'warning' },
  SCHEDULED: { label: 'Planlandı', tone: 'info' },
  RESTOCKED: { label: 'Stoğa döndü', tone: 'neutral' },
};

const PRODUCT_META: Record<string, StatusMeta> = {
  ACTIVE: { label: 'Aktif', tone: 'success' },
  DRAFT: { label: 'Taslak', tone: 'warning' },
  ARCHIVED: { label: 'Arşiv', tone: 'neutral' },
};

function metaOf(table: Record<string, StatusMeta>, value: string): StatusMeta {
  return table[value] ?? { label: value || '—', tone: UNKNOWN_TONE };
}

export const financialMeta = (value: string) => metaOf(FINANCIAL_META, value);
export const fulfillmentMeta = (value: string) => metaOf(FULFILLMENT_META, value);
export const productStatusMeta = (value: string) => metaOf(PRODUCT_META, value);

export function formatMoney(money: ShopifyMoneyDto | null): string {
  if (!money) return '—';
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: money.currency || 'EUR' }).format(money.amount);
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' });
}

// Sohbet siparişine panel içi bağlantı: Omnichannel › Siparişler sekmesi.
export const CHAT_ORDERS_PATH = '/omnichannel/orders';

export interface GatewayWarning {
  tone: BadgeTone;
  text: string;
}

const ROLE_LABELS: Record<ShopifyConfiguredGatewayDto['role'], string> = {
  cod: 'Kapıda ödeme',
  bankTransfer: 'Havale',
};

export const gatewayRoleLabel = (role: ShopifyConfiguredGatewayDto['role']) => ROLE_LABELS[role];

const MATCH_TONES: Record<ShopifyGatewayMatch, BadgeTone> = {
  [SHOPIFY_GATEWAY_MATCH.Matched]: 'success',
  [SHOPIFY_GATEWAY_MATCH.SpellingDiffers]: 'warning',
  [SHOPIFY_GATEWAY_MATCH.NotSeen]: 'warning',
  [SHOPIFY_GATEWAY_MATCH.NotConfigured]: 'neutral',
};

// Panelde tanımlı ödeme adı ile Shopify'da görülen adlar arasındaki durumun kullanıcı cümlesi.
export function gatewayWarning(item: ShopifyConfiguredGatewayDto): GatewayWarning {
  const tone = MATCH_TONES[item.match];
  const name = item.configuredName ?? '';
  switch (item.match) {
    case SHOPIFY_GATEWAY_MATCH.Matched:
      return { tone, text: `"${name}" mağazada kullanılıyor.` };
    case SHOPIFY_GATEWAY_MATCH.SpellingDiffers:
      return { tone, text: `"${name}" görülmedi; "${item.seenAs}" var — yazım farkı olabilir (Mağazalar sekmesinde düzeltin).` };
    case SHOPIFY_GATEWAY_MATCH.NotSeen:
      return { tone, text: `"${name}" Shopify'da görülmedi (son siparişlerde hiç kullanılmamış ya da adı farklı).` };
    default:
      return { tone, text: 'Panelde ad tanımlı değil; sipariş ödeme kaydı olmadan açılır.' };
  }
}

// Virgülle yazılan etiket metni → temiz liste (boşlar atılır, büyük/küçük harf farkıyla tekrar tek sayılır).
export function parseTags(text: string): string[] {
  const seen = new Set<string>();
  return text.split(',').map((t) => t.trim()).filter((tag) => {
    const key = tag.toLowerCase();
    if (!tag || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Boş alanlar gövdeden çıkarılır: Shopify'da "gönderilmeyen alan değişmez" kuralı.
export function trimmedOrUndefined(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

// Yazma sonucunun kullanıcıya gösterilecek hatası; başarılıysa null.
export function writeFailure(result: ShopifyWriteResultDto): string | null {
  if (result.applied) return null;
  return result.errors.length > 0 ? result.errors.join('; ') : 'Shopify işlemi reddetti.';
}

// "Ödendi işaretle" yalnız ödemesi tamamlanmamış, iptal edilmemiş siparişte anlamlıdır.
const MARKABLE_FINANCIAL_STATUSES = new Set(['PENDING', 'AUTHORIZED', 'PARTIALLY_PAID']);

export function canMarkOrderPaid(order: { cancelledAt: string | null; financialStatus: string }): boolean {
  return order.cancelledAt === null && MARKABLE_FINANCIAL_STATUSES.has(order.financialStatus);
}

export interface RefundFormState {
  // lineItemId → iade adedi (0 = seçilmedi).
  quantities: Record<number, number>;
  restockItems: boolean;
  refundShipping: boolean;
  notifyCustomer: boolean;
  note: string;
}

// Form durumu → istek gövdesi. Hiçbir kalem/kargo seçilmediyse null (önizleme/iade yapılamaz).
export function buildRefundBody(form: RefundFormState, expectedAmount?: number): ShopifyRefundBody | null {
  const lines = Object.entries(form.quantities)
    .map(([id, quantity]) => ({ lineItemId: Number(id), quantity }))
    .filter((line) => line.quantity > 0);
  if (lines.length === 0 && !form.refundShipping) return null;
  return {
    lines,
    restockItems: form.restockItems,
    refundShipping: form.refundShipping,
    notifyCustomer: form.notifyCustomer,
    note: trimmedOrUndefined(form.note),
    expectedAmount,
  };
}

// İade adedi 0 ile iade edilebilir adet arasında tutulur (geçersiz yazımda sınıra çekilir).
export function clampRefundQuantity(value: number, refundable: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(Math.trunc(value), 0), refundable);
}
