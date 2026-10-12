import type { PaymentMethod } from '../../lib/api/omnichannel';
import type {
  ChatOrderCreateDto,
  ChatOrderDraftDefaultsDto,
  ChatOrderDto,
  ChatOrderLineInputDto,
  ChatOrderProductOptionDto,
  ChatOrderUpdateDto,
} from '../../lib/api/omnichannel-chat-orders';

// Sipariş formunun (oluştur / düzenle) saf kuralları: taslak ↔ DTO dönüşümü, satır ekleme, toplam ve
// istemci doğrulaması. Fiyat ve alanların asıl doğrulaması sunucuda; burası yalnız hızlı geri bildirim.

export const MAX_LINE_QUANTITY = 99;

export interface OrderFormLine {
  // React anahtarı (mevcut satırda "line-<id>", yenide "product-<id>").
  key: string;
  lineId: number | null;
  productId: number | null;
  title: string;
  sku: string | null;
  quantity: number;
  // Metin: temsilci yazarken ara değerler ("12,") bozulmasın; gönderirken sayıya çevrilir.
  unitPrice: string;
  // Satır eklendiğindeki/var olan fiyat — farklıysa "fiyat değiştirildi" sayılır.
  originalPrice: number | null;
  // Araç uyumu (katalogdan; yalnız yeni satırda).
  fitment: string | null;
}

export interface OrderFormDraft {
  lines: OrderFormLine[];
  fullName: string;
  phone: string;
  email: string;
  city: string;
  district: string;
  addressLine: string;
  postalCode: string;
  note: string;
  paymentMethod: PaymentMethod | null;
  shippingAmount: string;
  sendConfirmation: boolean;
}

const TEXT_FIELDS = ['fullName', 'phone', 'email', 'city', 'district', 'addressLine', 'postalCode', 'note'] as const;
type TextField = (typeof TEXT_FIELDS)[number];

const priceText = (value: number | null) => (value === null ? '' : String(value));

export function parseMoney(text: string): number | null {
  const normalized = text.trim().replace(',', '.');
  if (normalized === '') return null;
  const value = Number(normalized);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

export function draftFromOrder(order: ChatOrderDto): OrderFormDraft {
  return {
    lines: order.lines.map((line) => ({
      key: `line-${line.id ?? line.productId}`,
      lineId: line.id ?? null,
      productId: line.productId,
      title: line.title,
      sku: line.sku,
      quantity: line.quantity,
      unitPrice: String(line.unitPrice),
      originalPrice: line.unitPrice,
      fitment: null,
    })),
    fullName: order.fullName ?? '',
    phone: order.phone ?? '',
    email: order.email ?? '',
    city: order.city ?? '',
    district: order.district ?? '',
    addressLine: order.addressLine ?? '',
    postalCode: order.postalCode ?? '',
    note: order.note ?? '',
    paymentMethod: order.paymentMethod,
    shippingAmount: priceText(order.shippingAmount),
    sendConfirmation: false,
  };
}

export function draftFromDefaults(defaults: ChatOrderDraftDefaultsDto): OrderFormDraft {
  return {
    lines: [],
    fullName: defaults.fullName ?? '',
    phone: defaults.phone ?? '',
    email: '',
    city: defaults.city ?? '',
    district: defaults.district ?? '',
    addressLine: defaults.addressLine ?? '',
    postalCode: defaults.postalCode ?? '',
    note: '',
    // Tek yöntem varsa seçili gelir (sunucu da aynısını yapar).
    paymentMethod: defaults.paymentMethods.length === 1 ? defaults.paymentMethods[0] : null,
    shippingAmount: '',
    sendConfirmation: defaults.canMessageCustomer,
  };
}

// "Fiat Doblo · 2010-2015" — katalogdaki araç uyumu.
export function fitmentOf(option: Pick<ChatOrderProductOptionDto, 'vehicleBrand' | 'vehicleModel' | 'modelYear'>): string | null {
  const vehicle = [option.vehicleBrand, option.vehicleModel].filter(Boolean).join(' ');
  const text = [vehicle, option.modelYear].filter(Boolean).join(' · ');
  return text || null;
}

// Aynı ürün zaten varsa adedi artar (sunucu aynı ürünü iki satır kabul etmez).
export function addProduct(draft: OrderFormDraft, option: ChatOrderProductOptionDto): OrderFormDraft {
  const existing = draft.lines.find((line) => line.productId === option.productId);
  if (existing) {
    return updateLine(draft, existing.key, { quantity: Math.min(existing.quantity + 1, MAX_LINE_QUANTITY) });
  }
  const line: OrderFormLine = {
    key: `product-${option.productId}`,
    lineId: null,
    productId: option.productId,
    title: option.title,
    sku: option.sku,
    quantity: 1,
    unitPrice: priceText(option.price),
    originalPrice: option.price,
    fitment: fitmentOf(option),
  };
  return { ...draft, lines: [...draft.lines, line] };
}

export function updateLine(draft: OrderFormDraft, key: string, patch: Partial<Pick<OrderFormLine, 'quantity' | 'unitPrice'>>): OrderFormDraft {
  return { ...draft, lines: draft.lines.map((line) => (line.key === key ? { ...line, ...patch } : line)) };
}

export function removeLine(draft: OrderFormDraft, key: string): OrderFormDraft {
  return { ...draft, lines: draft.lines.filter((line) => line.key !== key) };
}

export function formTotal(draft: OrderFormDraft): number {
  const lines = draft.lines.reduce((sum, line) => sum + (parseMoney(line.unitPrice) ?? 0) * line.quantity, 0);
  return lines + (parseMoney(draft.shippingAmount) ?? 0);
}

// Basit biçim denetimi (asıl doğrulama sunucuda): tek adres, @ ve alan adı uzantısı.
const EMAIL_FORMAT = /^[^s@,;]+@[^s@,;]+.[^s@,;]{2,}$/;

// Gönderimden önce kullanıcıya gösterilecek ilk sorun; null = gönderilebilir.
export function validateDraft(draft: OrderFormDraft): string | null {
  if (draft.lines.length === 0) return 'En az bir ürün ekleyin.';
  if (draft.lines.some((line) => !Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > MAX_LINE_QUANTITY)) {
    return `Adet 1 ile ${MAX_LINE_QUANTITY} arasında olmalı.`;
  }
  if (draft.lines.some((line) => parseMoney(line.unitPrice) === null)) return 'Her ürünün fiyatı geçerli olmalı.';
  if (draft.shippingAmount.trim() !== '' && parseMoney(draft.shippingAmount) === null) return 'Kargo ücreti geçerli olmalı.';
  // Boş e-posta engellenmez (e-postasız eski sipariş düzenlenebilsin); onay için sunucu ister.
  if (draft.email.trim() !== '' && !EMAIL_FORMAT.test(draft.email.trim())) return 'E-posta adresi geçerli olmalı.';
  return null;
}

const priceChanged = (line: OrderFormLine) => parseMoney(line.unitPrice) !== line.originalPrice;

function toLineInput(line: OrderFormLine): ChatOrderLineInputDto {
  const input: ChatOrderLineInputDto = { quantity: line.quantity };
  if (line.lineId !== null) input.lineId = line.lineId;
  else if (line.productId !== null) input.productId = line.productId;
  // Fiyat yalnız değiştiyse gönderilir: sunucu katalog/mevcut fiyatı kendisi okur.
  if (priceChanged(line)) input.unitPrice = parseMoney(line.unitPrice) ?? undefined;
  return input;
}

export function toCreateDto(conversationId: number, country: string | null, draft: OrderFormDraft): ChatOrderCreateDto {
  const dto: ChatOrderCreateDto = {
    conversationId,
    lines: draft.lines.map(toLineInput),
    sendConfirmation: draft.sendConfirmation,
  };
  if (country) dto.country = country;
  for (const field of TEXT_FIELDS) {
    const value = draft[field].trim();
    if (value) dto[field] = value;
  }
  if (draft.paymentMethod !== null) dto.paymentMethod = draft.paymentMethod;
  const shipping = parseMoney(draft.shippingAmount);
  if (shipping !== null) dto.shippingAmount = shipping;
  return dto;
}

function linesChanged(order: ChatOrderDto, draft: OrderFormDraft): boolean {
  if (draft.lines.length !== order.lines.length) return true;
  return draft.lines.some((line) => {
    const original = order.lines.find((l) => l.id === line.lineId);
    return !original || original.quantity !== line.quantity || priceChanged(line);
  });
}

// Yalnız değişen alanlar gönderilir (bot aynı anda başka alanı yazdıysa ezilmez). Boş metin isteğe bağlı
// alanı temizler; zorunlu alan (ad, telefon, e-posta, şehir, adres) boşaltılamaz — sunucu yok sayar.
export function toUpdateDto(order: ChatOrderDto, draft: OrderFormDraft): ChatOrderUpdateDto {
  const original = draftFromOrder(order);
  const dto: ChatOrderUpdateDto = { version: order.version };
  if (linesChanged(order, draft)) dto.lines = draft.lines.map(toLineInput);
  for (const field of TEXT_FIELDS) {
    const value = draft[field].trim();
    if (value !== original[field as TextField].trim()) dto[field] = value;
  }
  if (draft.paymentMethod !== null && draft.paymentMethod !== order.paymentMethod) dto.paymentMethod = draft.paymentMethod;
  const shipping = parseMoney(draft.shippingAmount);
  if (shipping !== null && shipping !== order.shippingAmount) dto.shippingAmount = shipping;
  return dto;
}

export const hasUpdateChanges = (dto: ChatOrderUpdateDto) => Object.keys(dto).some((key) => key !== 'version');
