import { SHOPIFY_PAYMENT_KIND, type CreateShopifyOrderBody, type ShopifyPaymentKind } from '../../lib/api/shopify-order-crud';
import { trimmedOrUndefined } from './explorerRules';
import { emptyAddress, toAddressInput, validateAddress, type OrderAddressDraft } from './orderAddressRules';

// Elle sipariş taslağı: ekranda doldurulan, gönderilmemiş sipariş. Hesap ve doğrulama kuralları burada (saf, test edilir).
export interface OrderDraftLine {
  sku: string;
  title: string;
  quantity: number;
  unitPrice: number;
}

export interface OrderDraft {
  // Mevcut Shopify müşterisi seçildiyse kimliği; yeni müşteri için null (e-postayla oluşturulur).
  customerId: number | null;
  email: string;
  fullName: string;
  address: OrderAddressDraft;
  lines: OrderDraftLine[];
  payment: ShopifyPaymentKind;
  // Metin olarak tutulur (yazarken ara değerler geçerli sayı olmayabilir); boş = kargo ücreti yok.
  shipping: string;
  note: string;
}

export const MAX_ORDER_LINES = 100;
export const MAX_LINE_QUANTITY = 1000;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function emptyOrderDraft(countryCode: string): OrderDraft {
  return {
    customerId: null,
    email: '',
    fullName: '',
    address: emptyAddress(countryCode),
    lines: [],
    payment: SHOPIFY_PAYMENT_KIND.CashOnDelivery,
    shipping: '',
    note: '',
  };
}

const UNDEFINED_GATEWAY = 'ağ geçidi tanımsız';

// Ödeme yöntemleri mağazanın Ayarlar'daki ağ geçidi adlarıyla gösterilir (siparişe bu adla yazılır).
export function paymentOptions(codGatewayName: string | null, bankGatewayName: string | null) {
  return [
    { value: SHOPIFY_PAYMENT_KIND.CashOnDelivery, label: `Kapıda ödeme (${codGatewayName?.trim() || UNDEFINED_GATEWAY})` },
    { value: SHOPIFY_PAYMENT_KIND.BankTransferPaid, label: `Havale alındı (${bankGatewayName?.trim() || UNDEFINED_GATEWAY})` },
  ];
}

const sameSku = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

// Aynı SKU ikinci kez eklenirse yeni satır açılmaz, adet artar.
export function addDraftLine(lines: OrderDraftLine[], picked: Omit<OrderDraftLine, 'quantity'>): OrderDraftLine[] {
  if (lines.some((line) => sameSku(line.sku, picked.sku))) {
    return lines.map((line) => (sameSku(line.sku, picked.sku) ? { ...line, quantity: Math.min(line.quantity + 1, MAX_LINE_QUANTITY) } : line));
  }
  return [...lines, { ...picked, quantity: 1 }];
}

export function setDraftLineQuantity(lines: OrderDraftLine[], sku: string, quantity: number): OrderDraftLine[] {
  const clamped = Math.min(Math.max(Math.trunc(quantity) || 1, 1), MAX_LINE_QUANTITY);
  return lines.map((line) => (sameSku(line.sku, sku) ? { ...line, quantity: clamped } : line));
}

export function removeDraftLine(lines: OrderDraftLine[], sku: string): OrderDraftLine[] {
  return lines.filter((line) => !sameSku(line.sku, sku));
}

// Kargo metni → sayı; boş = 0, geçersiz/negatif = null.
export function parseShipping(text: string): number | null {
  const trimmed = text.trim().replace(',', '.');
  if (trimmed === '') return 0;
  const value = Number(trimmed);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

export function draftSubtotal(lines: OrderDraftLine[]): number {
  return lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
}

export function draftTotal(draft: OrderDraft): number {
  return draftSubtotal(draft.lines) + (parseShipping(draft.shipping) ?? 0);
}

// İlk hata mesajı; sipariş gönderilebilir durumdaysa null.
export function validateOrderDraft(draft: OrderDraft): string | null {
  if (!EMAIL_PATTERN.test(draft.email.trim())) return 'Müşteri e-postası zorunlu ve geçerli olmalı.';
  if (draft.fullName.trim() === '') return 'Müşteri adı zorunlu.';
  const addressProblem = validateAddress(draft.address);
  if (addressProblem) return addressProblem;
  if (draft.lines.length === 0) return 'En az bir ürün ekleyin.';
  if (draft.lines.length > MAX_ORDER_LINES) return `Bir siparişte en çok ${MAX_ORDER_LINES} kalem olabilir.`;
  if (parseShipping(draft.shipping) === null) return 'Kargo ücreti geçerli bir sayı olmalı.';
  return null;
}

// Gönderim gövdesi; requestKey ekranın bu sipariş için ürettiği tekil anahtardır (çift gönderimi ayırt eder).
export function buildCreateBody(draft: OrderDraft, requestKey: string): CreateShopifyOrderBody {
  const shipping = parseShipping(draft.shipping) ?? 0;
  return {
    customerId: draft.customerId ?? undefined,
    email: draft.email.trim(),
    fullName: draft.fullName.trim(),
    address: toAddressInput(draft.address),
    lines: draft.lines.map((line) => ({ sku: line.sku, title: line.title, quantity: line.quantity, unitPrice: line.unitPrice })),
    payment: draft.payment,
    shippingAmount: shipping > 0 ? shipping : undefined,
    note: trimmedOrUndefined(draft.note),
    requestKey,
  };
}
