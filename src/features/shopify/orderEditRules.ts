import type { ShopifyOrderLineDto } from '../../lib/api/shopify-explorer';
import type { EditShopifyOrderLineInput } from '../../lib/api/shopify-order-crud';
import { MAX_LINE_QUANTITY } from './orderDraftRules';

// Sipariş düzenleme: mevcut kalemlerin adedi değişir / kalem çıkarılır / yeni ürün eklenir. Fark önizlemesi ve gönderim
// gövdesi burada (saf, test edilir). Kalem kimliği: mağaza varyantı (VariantId) ya da yeni eklenenler için SKU.
export interface EditableLine {
  key: string;
  variantId: number | null;
  sku: string | null;
  title: string;
  originalQuantity: number;
  quantity: number;
  unitPrice: number;
  removed: boolean;
}

export interface PickedVariant {
  sku: string;
  title: string;
  unitPrice: number;
}

export function linesFromDetail(lines: ShopifyOrderLineDto[]): EditableLine[] {
  return lines.map((line) => ({
    key: `line-${line.id}`,
    variantId: line.variantId ?? null,
    sku: line.sku,
    title: line.variantTitle ? `${line.title} — ${line.variantTitle}` : line.title,
    originalQuantity: line.quantity,
    quantity: line.quantity,
    unitPrice: line.unitPrice?.amount ?? 0,
    removed: false,
  }));
}

// Ürün kodu (varyant ya da SKU) olmayan kalem düzenlenemez; böyle bir kalem varsa kalem düzenleme kapatılır.
export const isIdentifiable = (line: EditableLine) => line.variantId !== null || Boolean(line.sku?.trim());

export const canEditLines = (lines: EditableLine[]) => lines.every(isIdentifiable);

const sameSku = (a: string | null, b: string) => a !== null && a.trim().toLowerCase() === b.trim().toLowerCase();

// Aynı SKU'lu kalem varsa adedi artar (çıkarılmışsa geri alınır); yoksa yeni kalem eklenir.
export function addPickedLine(lines: EditableLine[], picked: PickedVariant): EditableLine[] {
  if (lines.some((line) => sameSku(line.sku, picked.sku))) {
    return lines.map((line) => (sameSku(line.sku, picked.sku)
      ? { ...line, removed: false, quantity: Math.min(line.removed ? 1 : line.quantity + 1, MAX_LINE_QUANTITY) }
      : line));
  }
  return [...lines, {
    key: `new-${picked.sku}`, variantId: null, sku: picked.sku, title: picked.title,
    originalQuantity: 0, quantity: 1, unitPrice: picked.unitPrice, removed: false,
  }];
}

export function setLineQuantity(lines: EditableLine[], key: string, quantity: number): EditableLine[] {
  const clamped = Math.min(Math.max(Math.trunc(quantity) || 1, 1), MAX_LINE_QUANTITY);
  return lines.map((line) => (line.key === key ? { ...line, quantity: clamped } : line));
}

export function toggleLineRemoved(lines: EditableLine[], key: string): EditableLine[] {
  return lines.flatMap((line) => {
    if (line.key !== key) return [line];
    // Henüz siparişte olmayan (yeni eklenen) kalem doğrudan listeden kalkar.
    return line.originalQuantity === 0 ? [] : [{ ...line, removed: !line.removed }];
  });
}

const isChanged = (line: EditableLine) => line.removed ? line.originalQuantity > 0 : line.quantity !== line.originalQuantity;

export const hasLineChanges = (lines: EditableLine[]) => lines.some(isChanged);

export const remainingLineCount = (lines: EditableLine[]) => lines.filter((line) => !line.removed).length;

// Fark önizlemesi: kullanıcıya gösterilen ve onay penceresinde tekrarlanan cümleler.
export function describeLineChanges(lines: EditableLine[]): string[] {
  return lines.filter(isChanged).map((line) => {
    if (line.removed) return `${line.title}: siparişten çıkarılacak (${line.originalQuantity} adet)`;
    if (line.originalQuantity === 0) return `${line.title}: eklenecek (${line.quantity} adet)`;
    return `${line.title}: ${line.originalQuantity} → ${line.quantity} adet`;
  });
}

// Gönderim: siparişin İSTENEN son kalem listesi (çıkarılanlar dahil edilmez).
export function buildEditLines(lines: EditableLine[]): EditShopifyOrderLineInput[] {
  return lines.filter((line) => !line.removed).map((line) => ({
    variantId: line.variantId ?? undefined,
    sku: line.sku?.trim() || undefined,
    title: line.title,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
  }));
}
