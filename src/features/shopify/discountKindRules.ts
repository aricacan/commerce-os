import {
  SHOPIFY_DISCOUNT_FAMILY,
  type CreateShopifyBxgyDiscountBody,
  type CreateShopifyFreeShippingDiscountBody,
  type ShopifyDiscountFamily,
} from '../../lib/api/shopify-promotions';
import type { BadgeTone } from '../shared/design';
import { EMPTY_PRODUCT_SCOPE, buildScope, scopeFromDto, type ScopeFormState } from './discountScope';
import { trimmedOrUndefined } from './explorerRules';
import { isoToLocalInput, localDateTimeToIso, optionalNumber, parseDecimal } from './promotionRules';

// X al Y öde / ücretsiz kargo formlarının ve liste rozetlerinin saf kuralları.

export const DISCOUNT_KIND = { Basic: 'basic', Bxgy: 'bxgy', FreeShipping: 'freeShipping', Automatic: 'automatic', App: 'app' } as const;

interface KindBadge {
  label: string;
  tone: BadgeTone;
}

const KIND_BADGES: Record<string, KindBadge> = {
  [DISCOUNT_KIND.Basic]: { label: 'Temel', tone: 'info' },
  [DISCOUNT_KIND.Bxgy]: { label: 'BXGY', tone: 'warning' },
  [DISCOUNT_KIND.FreeShipping]: { label: 'Kargo', tone: 'success' },
  [DISCOUNT_KIND.Automatic]: { label: 'Otomatik', tone: 'neutral' },
  [DISCOUNT_KIND.App]: { label: 'Uygulama', tone: 'neutral' },
};

const OTHER_BADGE: KindBadge = { label: 'Diğer', tone: 'neutral' };

export const discountKindBadge = (kind: string): KindBadge => KIND_BADGES[kind] ?? OTHER_BADGE;

// Panelden düzenlenebilen türler; otomatik/uygulama indirimleri yalnız açılıp kapatılır, silinir.
const EDITABLE_KINDS: ReadonlySet<string> = new Set([DISCOUNT_KIND.Basic, DISCOUNT_KIND.Bxgy, DISCOUNT_KIND.FreeShipping]);

export const isEditableKind = (kind: string): boolean => EDITABLE_KINDS.has(kind);

// Otomatik indirimlerin Shopify kimliği ve mutation'ı kod indirimlerinden farklıdır.
export const discountFamily = (kind: string): ShopifyDiscountFamily =>
  kind === DISCOUNT_KIND.Automatic ? SHOPIFY_DISCOUNT_FAMILY.Automatic : SHOPIFY_DISCOUNT_FAMILY.Code;

export type NewDiscountKind = typeof DISCOUNT_KIND.Basic | typeof DISCOUNT_KIND.Bxgy | typeof DISCOUNT_KIND.FreeShipping;

export const NEW_DISCOUNT_KIND_OPTIONS: { value: NewDiscountKind; label: string }[] = [
  { value: DISCOUNT_KIND.Basic, label: 'Yüzde / tutar indirimi' },
  { value: DISCOUNT_KIND.Bxgy, label: 'X al Y öde' },
  { value: DISCOUNT_KIND.FreeShipping, label: 'Ücretsiz kargo' },
];

// Kullanılmış kodun adını değiştirmek, müşterilerin elindeki eski kodu geçersiz kılar → onay istenir.
export function codeChangeWarning(originalCode: string | null | undefined, nextCode: string, usageCount: number): string | null {
  if (usageCount <= 0 || !originalCode || originalCode === nextCode.trim()) return null;
  return `"${originalCode}" kodu ${usageCount} kez kullanıldı. Kodu "${nextCode.trim()}" yaparsanız eski kod artık çalışmaz; müşterilerinize duyurduğunuz kod geçersiz olur.`;
}

// ── Ortak alanlar (kod, başlık, tarihler, limit, müşteri başına bir kez) ─────────

export interface DiscountCommonState {
  code: string;
  title: string;
  startsAt: string;
  endsAt: string;
  usageLimit: string;
  appliesOncePerCustomer: boolean;
}

export const EMPTY_COMMON: DiscountCommonState = {
  code: '', title: '', startsAt: '', endsAt: '', usageLimit: '', appliesOncePerCustomer: false,
};

interface CommonBody {
  title?: string | null;
  code: string;
  startsAt?: string | null;
  endsAt?: string | null;
  usageLimit?: number | null;
  appliesOncePerCustomer: boolean;
}

export function commonFromBody(body: CommonBody): DiscountCommonState {
  return {
    code: body.code,
    title: body.title && body.title !== body.code ? body.title : '',
    startsAt: isoToLocalInput(body.startsAt),
    endsAt: isoToLocalInput(body.endsAt),
    usageLimit: body.usageLimit ? String(body.usageLimit) : '',
    appliesOncePerCustomer: body.appliesOncePerCustomer,
  };
}

function buildCommon(state: DiscountCommonState): CommonBody | string {
  const usageLimit = optionalNumber(state.usageLimit);
  if (usageLimit === null || (usageLimit !== undefined && (!Number.isInteger(usageLimit) || usageLimit < 1))) {
    return 'Kullanım limiti en az 1 olan tam sayı olmalı.';
  }
  return {
    code: state.code.trim(),
    title: trimmedOrUndefined(state.title),
    startsAt: localDateTimeToIso(state.startsAt),
    endsAt: localDateTimeToIso(state.endsAt),
    usageLimit,
    appliesOncePerCustomer: state.appliesOncePerCustomer,
  };
}

// ── X al Y öde ──────────────────────────────────────────────────────────────

export interface BxgyFormState {
  common: DiscountCommonState;
  buyQuantity: string;
  buyScope: ScopeFormState;
  getQuantity: string;
  getPercentage: string;
  getScope: ScopeFormState;
}

// Varsayılan: "1 al 1 bedava" (al-bir-al-bir).
export const EMPTY_BXGY_FORM: BxgyFormState = {
  common: EMPTY_COMMON,
  buyQuantity: '1',
  buyScope: EMPTY_PRODUCT_SCOPE,
  getQuantity: '1',
  getPercentage: '100',
  getScope: EMPTY_PRODUCT_SCOPE,
};

export function bxgyFormFromBody(body: CreateShopifyBxgyDiscountBody): BxgyFormState {
  return {
    common: commonFromBody(body),
    buyQuantity: String(body.buyQuantity),
    buyScope: scopeFromDto(body.buyScope),
    getQuantity: String(body.getQuantity),
    getPercentage: String(body.getPercentage),
    getScope: scopeFromDto(body.getScope),
  };
}

const MAX_PERCENTAGE = 100;

function wholeNumber(text: string): number | null {
  const value = parseDecimal(text);
  return value !== null && Number.isInteger(value) && value >= 1 ? value : null;
}

export function buildBxgyBody(form: BxgyFormState): CreateShopifyBxgyDiscountBody | string {
  const common = buildCommon(form.common);
  if (typeof common === 'string') return common;
  const buyQuantity = wholeNumber(form.buyQuantity);
  const getQuantity = wholeNumber(form.getQuantity);
  if (buyQuantity === null) return 'Alınacak adet en az 1 olan tam sayı olmalı.';
  if (getQuantity === null) return 'Kazanılacak adet en az 1 olan tam sayı olmalı.';
  const percentage = parseDecimal(form.getPercentage);
  if (percentage === null || percentage <= 0 || percentage > MAX_PERCENTAGE) return 'İndirim yüzdesi 0\'dan büyük, en fazla 100 olmalı (100 = bedava).';

  const buyScope = buildScope(form.buyScope, 'Alınacak ürünler', false);
  if (typeof buyScope === 'string') return buyScope;
  const getScope = buildScope(form.getScope, 'Kazanılacak ürünler', false);
  if (typeof getScope === 'string') return getScope;

  return { ...common, buyQuantity, buyScope, getQuantity, getPercentage: percentage, getScope };
}

// ── Ücretsiz kargo ──────────────────────────────────────────────────────────

export interface FreeShippingFormState {
  common: DiscountCommonState;
  // Virgül/boşlukla ayrılmış ISO-2 kodlar ("XK, AL"); boş = tüm ülkeler.
  countries: string;
  minimumSubtotal: string;
  maximumShippingPrice: string;
}

export const EMPTY_FREE_SHIPPING_FORM: FreeShippingFormState = {
  common: EMPTY_COMMON, countries: '', minimumSubtotal: '', maximumShippingPrice: '',
};

const COUNTRY_SEPARATOR = /[\s,;]+/;
const COUNTRY_CODE_PATTERN = /^[A-Z]{2}$/;

export function parseCountryCodes(text: string): string[] {
  const codes = text.split(COUNTRY_SEPARATOR).map((code) => code.trim().toUpperCase()).filter((code) => code !== '');
  return [...new Set(codes)];
}

export function freeShippingFormFromBody(body: CreateShopifyFreeShippingDiscountBody): FreeShippingFormState {
  return {
    common: commonFromBody(body),
    countries: body.countryCodes.join(', '),
    minimumSubtotal: body.minimumSubtotal ? String(body.minimumSubtotal) : '',
    maximumShippingPrice: body.maximumShippingPrice ? String(body.maximumShippingPrice) : '',
  };
}

export function buildFreeShippingBody(form: FreeShippingFormState): CreateShopifyFreeShippingDiscountBody | string {
  const common = buildCommon(form.common);
  if (typeof common === 'string') return common;
  const countryCodes = parseCountryCodes(form.countries);
  if (countryCodes.some((code) => !COUNTRY_CODE_PATTERN.test(code))) return 'Ülke kodları 2 harfli (ISO) olmalı, örn. XK, AL, TR.';
  const minimum = optionalNumber(form.minimumSubtotal);
  if (minimum === null || (minimum !== undefined && minimum <= 0)) return 'Minimum sepet tutarı 0\'dan büyük olmalı.';
  const maximum = optionalNumber(form.maximumShippingPrice);
  if (maximum === null || (maximum !== undefined && maximum <= 0)) return 'Kargo ücreti üst sınırı 0\'dan büyük olmalı.';

  return { ...common, countryCodes, minimumSubtotal: minimum, maximumShippingPrice: maximum };
}
