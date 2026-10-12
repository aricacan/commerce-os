import type { ShopifyFitmentSkuIssueDto } from '../../lib/api/shopify-fitment';

// Backend'deki tek istek üst sınırıyla aynı (ShopifyFitmentSync.MaxSkusPerRequest).
export const MAX_FITMENT_SKUS = 200;

const SKU_SEPARATORS = /[\s,;]+/;

// Kutuya yapıştırılan metin (satır / virgül / noktalı virgül ayraçlı) → temiz, tekilleştirilmiş SKU listesi.
export function parseSkuList(text: string): string[] {
  const seen = new Set<string>();
  return text.split(SKU_SEPARATORS).map((sku) => sku.trim()).filter((sku) => {
    const key = sku.toUpperCase();
    if (!sku || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function skuLimitError(skus: string[]): string | null {
  return skus.length > MAX_FITMENT_SKUS ? `Tek seferde en fazla ${MAX_FITMENT_SKUS} SKU eşitlenebilir (${skus.length} girildi).` : null;
}

// Eşitlenemeyen SKU'ların indirilebilir listesi (Excel'de açılsın diye ; ayraçlı, UTF-8 BOM'lu).
export function unmatchedCsv(issues: ShopifyFitmentSkuIssueDto[]): string {
  const quote = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const rows = issues.map((issue) => `${quote(issue.sku)};${quote(issue.reason)}`);
  return `﻿SKU;Neden\n${rows.join('\n')}`;
}
