import type { CreateShopifyDraftOrderBody } from '../../lib/api/shopify-payment-shipping';
import { trimmedOrUndefined } from './explorerRules';

// Ödeme linki formunun saf kuralları (backend ShopifyDraftOrderInputBuilder ile aynı sınırlar).

export const MAX_DRAFT_QUANTITY = 99;
export const MAX_DRAFT_NOTE_LENGTH = 500;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface DraftLineForm {
  sku: string;
  quantity: number;
}

export interface DraftFormState {
  lines: DraftLineForm[];
  email: string;
  note: string;
}

export const EMPTY_DRAFT_LINE: DraftLineForm = { sku: '', quantity: 1 };

export const EMPTY_DRAFT_FORM: DraftFormState = { lines: [EMPTY_DRAFT_LINE], email: '', note: '' };

// Adet 1 ile en fazla arasında tutulur (geçersiz yazımda sınıra çekilir).
export function clampDraftQuantity(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(Math.max(Math.trunc(value), 1), MAX_DRAFT_QUANTITY);
}

export function draftEmailError(email: string): string | null {
  const trimmed = email.trim();
  return trimmed === '' || EMAIL_PATTERN.test(trimmed) ? null : 'E-posta adresi geçersiz.';
}

// Form → istek gövdesi. SKU'su boş satırlar atılır; hiç kalem kalmadıysa ya da e-posta bozuksa null.
export function buildDraftBody(form: DraftFormState): CreateShopifyDraftOrderBody | null {
  const lines = form.lines
    .map((line) => ({ sku: line.sku.trim(), quantity: clampDraftQuantity(line.quantity) }))
    .filter((line) => line.sku !== '');
  if (lines.length === 0 || draftEmailError(form.email) !== null) return null;
  return { lines, email: trimmedOrUndefined(form.email), note: trimmedOrUndefined(form.note) };
}
