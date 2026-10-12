import {
  SHOPIFY_DISCOUNT_VALUE_TYPE,
  type CreateShopifyDiscountBody,
  type CreateShopifyGiftCardBody,
  type ShopifyDiscountDto,
  type ShopifyDiscountValueType,
} from '../../lib/api/shopify-promotions';
import type { BadgeTone } from '../shared/design';
import { ALL_PRODUCTS_SCOPE, buildScope, scopeFromDto, type ScopeFormState } from './discountScope';
import { trimmedOrUndefined, type FilterOption } from './explorerRules';

// İndirim / hediye kartı / pazar ekranlarının saf kuralları: etiketler, form → istek gövdesi, özetler.

interface StatusMeta {
  label: string;
  tone: BadgeTone;
}

export const DISCOUNT_STATUS_OPTIONS: FilterOption[] = [
  { value: 'active', label: 'Aktif' },
  { value: 'scheduled', label: 'Planlandı' },
  { value: 'expired', label: 'Süresi doldu / kapalı' },
];

export const GIFT_CARD_STATUS_OPTIONS: FilterOption[] = [
  { value: 'enabled', label: 'Aktif' },
  { value: 'disabled', label: 'Devre dışı' },
];

const DISCOUNT_STATUS_META: Record<string, StatusMeta> = {
  ACTIVE: { label: 'Aktif', tone: 'success' },
  SCHEDULED: { label: 'Planlandı', tone: 'info' },
  EXPIRED: { label: 'Süresi doldu / kapalı', tone: 'neutral' },
};

const MARKET_STATUS_META: Record<string, StatusMeta> = {
  ACTIVE: { label: 'Aktif', tone: 'success' },
  DRAFT: { label: 'Taslak', tone: 'warning' },
};

const DISCOUNT_KIND_LABELS: Record<string, string> = {
  basic: 'Yüzde / tutar indirimi',
  bxgy: 'X al Y öde',
  freeShipping: 'Ücretsiz kargo',
  app: 'Uygulama indirimi',
};

const UNKNOWN_TONE: BadgeTone = 'neutral';
const MAX_PERCENTAGE = 100;

function metaOf(table: Record<string, StatusMeta>, value: string): StatusMeta {
  return table[value] ?? { label: value || '—', tone: UNKNOWN_TONE };
}

export const discountStatusMeta = (value: string) => metaOf(DISCOUNT_STATUS_META, value);
export const marketStatusMeta = (value: string) => metaOf(MARKET_STATUS_META, value);
export const discountKindLabel = (kind: string) => DISCOUNT_KIND_LABELS[kind] ?? 'Diğer indirim';

// "%10" ya da "5,00 €"; değeri olmayan türlerde (X al Y öde…) tür adı.
export function describeDiscountValue(discount: ShopifyDiscountDto): string {
  if (discount.value === null || discount.valueType === null) return discountKindLabel(discount.kind);
  if (discount.valueType === SHOPIFY_DISCOUNT_VALUE_TYPE.Percentage) return `%${discount.value}`;
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: discount.currency || 'EUR' }).format(discount.value);
}

// "4 / 10 kullanıldı" ya da sınır yoksa "4 kullanıldı".
export function describeUsage(discount: Pick<ShopifyDiscountDto, 'usageCount' | 'usageLimit'>): string {
  return discount.usageLimit === null
    ? `${discount.usageCount} kullanıldı`
    : `${discount.usageCount} / ${discount.usageLimit} kullanıldı`;
}

// Türkçe ondalık virgülü de kabul edilir ("12,5"); sayı değilse null.
export function parseDecimal(text: string): number | null {
  const normalized = text.trim().replace(',', '.');
  if (normalized === '') return null;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

// <input type="datetime-local"> değeri (yerel saat) → ISO; boş ya da geçersizse undefined.
export function localDateTimeToIso(value: string): string | undefined {
  if (value === '') return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

const LOCAL_INPUT_LENGTH = 'YYYY-MM-DDTHH:mm'.length;
const MS_PER_MINUTE = 60_000;

// ISO → <input type="datetime-local"> değeri (yerel saat); boşsa ''. Düzenleme formu mevcut tarihi böyle doldurur.
export function isoToLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * MS_PER_MINUTE);
  return local.toISOString().slice(0, LOCAL_INPUT_LENGTH);
}

export interface DiscountFormState {
  code: string;
  title: string;
  valueType: ShopifyDiscountValueType;
  value: string;
  startsAt: string;
  endsAt: string;
  usageLimit: string;
  appliesOncePerCustomer: boolean;
  minimumSubtotal: string;
  scope: ScopeFormState;
}

export const EMPTY_DISCOUNT_FORM: DiscountFormState = {
  code: '',
  title: '',
  valueType: SHOPIFY_DISCOUNT_VALUE_TYPE.Percentage,
  value: '',
  startsAt: '',
  endsAt: '',
  usageLimit: '',
  appliesOncePerCustomer: false,
  minimumSubtotal: '',
  scope: ALL_PRODUCTS_SCOPE,
};

// Sunucudan okunan indirim → düzenleme formu (boş alanlar '' olur).
export function discountFormFromBody(body: CreateShopifyDiscountBody): DiscountFormState {
  return {
    code: body.code,
    title: body.title && body.title !== body.code ? body.title : '',
    valueType: body.valueType,
    value: String(body.value),
    startsAt: isoToLocalInput(body.startsAt),
    endsAt: isoToLocalInput(body.endsAt),
    usageLimit: body.usageLimit ? String(body.usageLimit) : '',
    appliesOncePerCustomer: body.appliesOncePerCustomer,
    minimumSubtotal: body.minimumSubtotal ? String(body.minimumSubtotal) : '',
    scope: scopeFromDto(body.scope),
  };
}

// Boş metin = alan yok (undefined); doluysa sayı. Sayı değilse null (hata).
export function optionalNumber(text: string): number | null | undefined {
  return text.trim() === '' ? undefined : parseDecimal(text);
}

// Form → istek gövdesi. Ön doğrulama başarısızsa hata metni döner (kod biçimi vb. sunucuda da doğrulanır).
export function buildDiscountBody(form: DiscountFormState): CreateShopifyDiscountBody | string {
  const value = parseDecimal(form.value);
  if (value === null || value <= 0) return 'İndirim değeri 0\'dan büyük bir sayı olmalı.';
  if (form.valueType === SHOPIFY_DISCOUNT_VALUE_TYPE.Percentage && value > MAX_PERCENTAGE) return 'Yüzde en fazla 100 olabilir.';

  const usageLimit = optionalNumber(form.usageLimit);
  if (usageLimit === null || (usageLimit !== undefined && (!Number.isInteger(usageLimit) || usageLimit < 1))) {
    return 'Kullanım limiti en az 1 olan tam sayı olmalı.';
  }
  const minimum = optionalNumber(form.minimumSubtotal);
  if (minimum === null || (minimum !== undefined && minimum <= 0)) return 'Minimum sepet tutarı 0\'dan büyük olmalı.';
  const scope = buildScope(form.scope, 'İndirim kapsamı', true);
  if (typeof scope === 'string') return scope;

  return {
    code: form.code.trim(),
    title: trimmedOrUndefined(form.title),
    valueType: form.valueType,
    value,
    startsAt: localDateTimeToIso(form.startsAt),
    endsAt: localDateTimeToIso(form.endsAt),
    usageLimit,
    appliesOncePerCustomer: form.appliesOncePerCustomer,
    minimumSubtotal: minimum,
    scope,
  };
}

export interface GiftCardFormState {
  amount: string;
  note: string;
  customerEmail: string;
  expiresOn: string;
}

export const EMPTY_GIFT_CARD_FORM: GiftCardFormState = { amount: '', note: '', customerEmail: '', expiresOn: '' };

export function buildGiftCardBody(form: GiftCardFormState): CreateShopifyGiftCardBody | string {
  const amount = parseDecimal(form.amount);
  if (amount === null || amount <= 0) return 'Tutar 0\'dan büyük bir sayı olmalı.';
  return {
    amount,
    note: trimmedOrUndefined(form.note),
    customerEmail: trimmedOrUndefined(form.customerEmail),
    expiresOn: trimmedOrUndefined(form.expiresOn),
  };
}
