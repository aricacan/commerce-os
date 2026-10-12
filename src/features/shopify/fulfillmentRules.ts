import type { ShopifyFulfillBody, ShopifyFulfillableLineDto } from '../../lib/api/shopify-payment-shipping';
import { trimmedOrUndefined } from './explorerRules';

// Kargolama formunun saf kuralları (backend ShopifyFulfillmentPlanner ile aynı sınırlar).

// Kargolanabilecek sipariş durumları; son söz yine Shopify'ın kargolanabilir kalem listesindedir.
const FULFILLABLE_STATUSES = new Set(['UNFULFILLED', 'PARTIALLY_FULFILLED', 'IN_PROGRESS']);

const TRACKING_PLACEHOLDER = '{tracking}';

export interface FulfillFormState {
  // Kalem kimliği → kargolanacak adet; 0 = bu sefer kargolanmaz (kısmi kargolama).
  quantities: Record<number, number>;
  company: string;
  trackingNumber: string;
  trackingUrl: string;
  notifyCustomer: boolean;
}

export function canFulfillOrder(order: { cancelledAt: string | null; fulfillmentStatus: string }): boolean {
  return order.cancelledAt === null && FULFILLABLE_STATUSES.has(order.fulfillmentStatus);
}

// Varsayılan: kalan her kalemin tamamı seçili.
export function defaultFulfillQuantities(lines: ShopifyFulfillableLineDto[]): Record<number, number> {
  return Object.fromEntries(lines.map((line) => [line.id, line.remainingQuantity]));
}

export function clampFulfillQuantity(value: number, remaining: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(Math.trunc(value), 0), remaining);
}

// Şablondaki {tracking} yerine takip numarası yazılır; numara ya da şablon yoksa link boş kalır (elle girilir).
export function buildTrackingUrl(template: string | null, trackingNumber: string): string | undefined {
  const number = trackingNumber.trim();
  if (!template || number === '' || !template.includes(TRACKING_PLACEHOLDER)) return undefined;
  return template.replaceAll(TRACKING_PLACEHOLDER, encodeURIComponent(number));
}

export function trackingUrlError(url: string): string | null {
  const trimmed = url.trim();
  if (trimmed === '') return null;
  return /^https?:\/\/\S+$/i.test(trimmed) ? null : 'Takip linki http:// ya da https:// ile başlamalı.';
}

// Form → istek gövdesi. Hiçbir kalem seçilmediyse ya da link bozuksa null.
export function buildFulfillBody(form: FulfillFormState): ShopifyFulfillBody | null {
  const lines = Object.entries(form.quantities)
    .map(([id, quantity]) => ({ fulfillableLineId: Number(id), quantity }))
    .filter((line) => line.quantity > 0);
  if (lines.length === 0 || trackingUrlError(form.trackingUrl) !== null) return null;
  return {
    lines,
    company: trimmedOrUndefined(form.company),
    trackingNumber: trimmedOrUndefined(form.trackingNumber),
    trackingUrl: trimmedOrUndefined(form.trackingUrl),
    notifyCustomer: form.notifyCustomer,
  };
}
