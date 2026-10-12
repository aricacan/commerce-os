import type { ShopifyImageAltItem, ShopifyImageAltProposalDto } from '../../lib/api/shopify-products';

// Görsel alt metni kuralları — saf, test edilir. Sınırlar backend ile aynı (asıl doğrulama sunucuda).

// Shopify'ın kabul ettiği azami uzunluk (yazma reddi sınırı).
export const ALT_MAX_LENGTH = 512;
// AI önerisinin hedef uzunluğu; ekran okuyucu/arama motoru için önerilen sınır.
export const ALT_SUGGESTED_LENGTH = 125;

export const isAltOverLimit = (alt: string): boolean => alt.trim().length > ALT_MAX_LENGTH;

// Öneri satırlarının düzenlenebilir taslağı: görsel kimliği → alt metin (AI önermediyse boş).
export function draftsFromProposals(proposals: ShopifyImageAltProposalDto[]): Record<number, string> {
  return Object.fromEntries(proposals.map((p) => [p.mediaId, p.suggestedAlt ?? '']));
}

// Varsayılan seçim: AI'ın öneri ürettiği görseller.
export const defaultAltSelection = (proposals: ShopifyImageAltProposalDto[]): Set<number> =>
  new Set(proposals.filter((p) => p.suggestedAlt).map((p) => p.mediaId));

// Yazılacak liste: yalnız seçili ve dolu alt metinler (kırpılmış). Hiçbiri yoksa boş liste (yazma düğmesi kapalı kalır).
export function buildAltItems(drafts: Record<number, string>, selected: ReadonlySet<number>): ShopifyImageAltItem[] {
  return [...selected]
    .map((mediaId) => ({ mediaId, alt: (drafts[mediaId] ?? '').trim() }))
    .filter((item) => item.alt.length > 0);
}
