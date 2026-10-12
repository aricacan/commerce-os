import {
  PAYMENT_METHOD,
  type PaymentMethod,
  type PaymentOptionDto,
  type PaymentOptionSaveDto,
} from '../../lib/api/omnichannel';
import {
  ANY_COUNTRY, PAYMENT_SCOPE, PAYMENT_SCOPE_FIELDS, scopeOf, type PaymentScopeKind,
} from './paymentScope';

// Ödeme yöntemi formunun düzenlenen hâli. Seçim kutuları metin tutar (boş = seçilmedi);
// kaydederken sayıya/null'a çevrilir. Asıl doğrulama sunucuda (mod-97, adres güvenliği dahil) —
// burası yalnız bariz hatayı kaydetmeden gösterir.
export interface PaymentOptionDraft {
  scope: PaymentScopeKind;
  brandId: string;
  country: string;
  channelId: string;
  catalogProfileId: string;
  method: PaymentMethod;
  isActive: boolean;
  sortOrder: number;
  bankName: string;
  accountHolder: string;
  iban: string;
  websiteUrl: string;
  messageTemplate: string;
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  [PAYMENT_METHOD.BankTransfer]: 'Havale/EFT',
  [PAYMENT_METHOD.CashOnDelivery]: 'Kapıda ödeme',
  [PAYMENT_METHOD.RedirectToWebsite]: 'Siteye yönlendir',
};

const DEFAULT_SORT_ORDER = 10;
const IBAN_MIN_LENGTH = 15;
const IBAN_MAX_LENGTH = 34;
const IBAN_GROUP_SIZE = 4;
const IBAN_CHECKSUM_MODULUS = 97;
const LETTER_CODE_OFFSET = 10;
const DECIMAL_BASE = 10;
const IBAN_SHAPE = /^[A-Z]{2}\d{2}[A-Z0-9]+$/;
const IBAN_MASK_GROUP = '••••';

export const EMPTY_PAYMENT_OPTION_DRAFT: PaymentOptionDraft = {
  scope: PAYMENT_SCOPE.Country, brandId: '', country: '', channelId: '', catalogProfileId: '',
  method: PAYMENT_METHOD.BankTransfer, isActive: true, sortOrder: DEFAULT_SORT_ORDER,
  bankName: '', accountHolder: '', iban: '', websiteUrl: '', messageTemplate: '',
};

export function paymentOptionDraftFrom(option: PaymentOptionDto | null): PaymentOptionDraft {
  if (!option) return EMPTY_PAYMENT_OPTION_DRAFT;
  return {
    scope: scopeOf(option),
    brandId: option.brandId == null ? '' : String(option.brandId),
    country: option.country === ANY_COUNTRY ? '' : option.country,
    channelId: option.channelId == null ? '' : String(option.channelId),
    catalogProfileId: option.catalogProfileId == null ? '' : String(option.catalogProfileId),
    method: option.method,
    isActive: option.isActive,
    sortOrder: option.sortOrder,
    bankName: option.bankName ?? '',
    accountHolder: option.accountHolder ?? '',
    iban: option.iban ? formatIban(option.iban) : '',
    websiteUrl: option.websiteUrl ?? '',
    messageTemplate: option.messageTemplate ?? '',
  };
}

const isBankTransfer = (method: PaymentMethod) => method === PAYMENT_METHOD.BankTransfer;
const isRedirect = (method: PaymentMethod) => method === PAYMENT_METHOD.RedirectToWebsite;
const orNull = (text: string) => text.trim() || null;
const idOrNull = (value: string) => (value === '' ? null : Number(value));

// Kapsamın kullanmadığı alanlar (ör. ülke kapsamında marka) gönderilmez: formda eskiden seçilmiş
// bir değer sunucuya sızıp kapsamı bozmasın.
export function toPaymentOptionSaveDto(draft: PaymentOptionDraft): PaymentOptionSaveDto {
  const bank = isBankTransfer(draft.method);
  const redirect = isRedirect(draft.method);
  const iban = normalizeIban(draft.iban);
  const fields = PAYMENT_SCOPE_FIELDS[draft.scope];
  return {
    brandId: fields.brand ? idOrNull(draft.brandId) : null,
    country: fields.country ? draft.country.trim().toUpperCase() : ANY_COUNTRY,
    channelId: fields.channel ? idOrNull(draft.channelId) : null,
    catalogProfileId: fields.profile ? idOrNull(draft.catalogProfileId) : null,
    websiteUrl: redirect ? orNull(draft.websiteUrl) : null,
    messageTemplate: redirect ? orNull(draft.messageTemplate) : null,
    method: draft.method,
    isActive: draft.isActive,
    sortOrder: Number.isFinite(draft.sortOrder) ? draft.sortOrder : DEFAULT_SORT_ORDER,
    // Havale dışı yöntemde banka alanları gönderilmez (sunucu da boşaltır).
    bankName: bank ? orNull(draft.bankName) : null,
    accountHolder: bank ? orNull(draft.accountHolder) : null,
    iban: bank && iban ? iban : null,
  };
}

/** Kaydı engelleyen ilk sorunu döner; sorun yoksa null. */
export function paymentOptionDraftError(draft: PaymentOptionDraft): string | null {
  const missingScope = missingScopeField(draft);
  if (missingScope) return missingScope;
  if (isRedirect(draft.method)) return redirectError(draft);
  if (!isBankTransfer(draft.method)) return null;
  const iban = normalizeIban(draft.iban);
  if (iban && !isValidIban(iban)) return 'IBAN geçersiz (ülke kodu veya kontrol hanesi tutmuyor).';
  if (draft.isActive && !iban) return 'Havale aktifken IBAN zorunlu.';
  return null;
}

function missingScopeField(draft: PaymentOptionDraft): string | null {
  const fields = PAYMENT_SCOPE_FIELDS[draft.scope];
  if (fields.country && !draft.country.trim()) return 'Ülke seçin.';
  if (fields.brand && !draft.brandId) return 'Marka seçin.';
  if (fields.profile && !draft.catalogProfileId) return 'Katalog profili seçin.';
  if (fields.channel && !draft.channelId) return 'Kanal seçin.';
  return null;
}

// Yönlendirme adresi yalnız http/https olabilir; aktifken zorunlu. İç ağ adresini sunucu reddeder.
function redirectError(draft: PaymentOptionDraft): string | null {
  const url = draft.websiteUrl.trim();
  if (!url) return draft.isActive ? 'Siteye yönlendirme aktifken site adresi zorunlu.' : null;
  return isHttpUrl(url) ? null : 'Site adresi http:// ya da https:// ile başlayan geçerli bir adres olmalı.';
}

export function isHttpUrl(text: string): boolean {
  try {
    const url = new URL(text);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function normalizeIban(iban: string): string {
  return iban.replace(/\s+/g, '').toUpperCase();
}

// ISO 13616 mod-97: ilk 4 karakter sona alınır, harfler 10..35 olur, kalan 1 olmalı.
export function isValidIban(iban: string): boolean {
  const value = normalizeIban(iban);
  if (value.length < IBAN_MIN_LENGTH || value.length > IBAN_MAX_LENGTH) return false;
  if (!IBAN_SHAPE.test(value)) return false;
  const rearranged = value.slice(IBAN_GROUP_SIZE) + value.slice(0, IBAN_GROUP_SIZE);
  const digits = [...rearranged]
    .map((c) => (/\d/.test(c) ? c : String(c.charCodeAt(0) - 'A'.charCodeAt(0) + LETTER_CODE_OFFSET)))
    .join('');
  const remainder = [...digits].reduce((acc, d) => (acc * DECIMAL_BASE + Number(d)) % IBAN_CHECKSUM_MODULUS, 0);
  return remainder === 1;
}

function ibanGroups(iban: string): string[] {
  return normalizeIban(iban).match(new RegExp(`.{1,${IBAN_GROUP_SIZE}}`, 'g')) ?? [];
}

/** 4'lü gruplar: "XK05 1212 0123 4567 8906". */
export function formatIban(iban: string): string {
  return ibanGroups(iban).join(' ');
}

/** Listede gösterim: ilk ve son grup açık, aradakiler gizli (ekran paylaşımında sızmasın). */
export function maskIban(iban: string): string {
  const groups = ibanGroups(iban);
  if (groups.length <= 2) return groups.join(' ');
  return [groups[0], ...groups.slice(1, -1).map(() => IBAN_MASK_GROUP), groups[groups.length - 1]].join(' ');
}

export interface PaymentOptionGroup {
  // GROUP_CHANNEL / GROUP_PROFILE, ANY_COUNTRY (genel) ya da ülke kodu.
  key: string;
  options: PaymentOptionDto[];
}

export const GROUP_CHANNEL = 'channel';
export const GROUP_PROFILE = 'profile';

function groupKeyOf(option: PaymentOptionDto): string {
  const scope = scopeOf(option);
  if (scope === PAYMENT_SCOPE.Channel) return GROUP_CHANNEL;
  return scope === PAYMENT_SCOPE.Profile ? GROUP_PROFILE : option.country;
}

// Kanal, profil, ülkeler (alfabetik), en sonda genel.
function groupRank(key: string): number {
  if (key === GROUP_CHANNEL) return 0;
  if (key === GROUP_PROFILE) return 1;
  return key === ANY_COUNTRY ? 3 : 2;
}

/** Kanal ve profil grupları önce, sonra ülkeler, en sonda genel; grup içinde marka, sıra, yöntem. */
export function groupPaymentOptions(options: PaymentOptionDto[]): PaymentOptionGroup[] {
  const byKey = new Map<string, PaymentOptionDto[]>();
  for (const option of options) {
    const key = groupKeyOf(option);
    byKey.set(key, [...(byKey.get(key) ?? []), option]);
  }
  return [...byKey.entries()]
    .map(([key, rows]) => ({ key, options: [...rows].sort(compareOptions) }))
    .sort((a, b) => groupRank(a.key) - groupRank(b.key) || a.key.localeCompare(b.key));
}

function compareOptions(a: PaymentOptionDto, b: PaymentOptionDto): number {
  return (a.brandId ?? 0) - (b.brandId ?? 0) || a.sortOrder - b.sortOrder || a.method - b.method;
}
