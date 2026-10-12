import {
  SHOPIFY_CONTENT_PROBLEM,
  type SaveShopifyContentBody,
  type ShopifyContentFieldsDto,
  type ShopifyContentProblem,
} from '../../lib/api/shopify-content';
import type { BadgeTone } from '../shared/design';

// Backend ShopifyContentRules ile aynı sınırlar (sayaç rengi için; asıl doğrulama sunucudadır).
export const SEO_TITLE_MAX_LENGTH = 60;
export const SEO_DESCRIPTION_MAX_LENGTH = 155;

interface ProblemMeta {
  label: string;
  tone: BadgeTone;
}

const P = SHOPIFY_CONTENT_PROBLEM;

export const PROBLEM_META: Record<ShopifyContentProblem, ProblemMeta> = {
  [P.SeoTitleMissing]: { label: 'SEO başlığı yok', tone: 'danger' },
  [P.SeoTitleTooShort]: { label: 'SEO başlığı kısa', tone: 'warning' },
  [P.SeoTitleTooLong]: { label: 'SEO başlığı uzun', tone: 'warning' },
  [P.SeoDescriptionMissing]: { label: 'SEO açıklaması yok', tone: 'danger' },
  [P.SeoDescriptionTooShort]: { label: 'SEO açıklaması kısa', tone: 'warning' },
  [P.SeoDescriptionTooLong]: { label: 'SEO açıklaması uzun', tone: 'warning' },
  [P.DescriptionMissing]: { label: 'Açıklama yok', tone: 'danger' },
  [P.DescriptionTooShort]: { label: 'Açıklama kısa', tone: 'warning' },
  [P.NoImage]: { label: 'Görsel yok', tone: 'danger' },
  [P.ImageAltMissing]: { label: 'Görsel alt metni yok', tone: 'warning' },
};

export type ContentFieldKey = keyof ShopifyContentFieldsDto;

export interface ContentFieldMeta {
  key: ContentFieldKey;
  label: string;
  // Sayaç sınırı; null = sınırsız.
  limit: number | null;
  multiline: boolean;
  // Başlık ve açıklama ürünün asıl içeriğidir (Base de yazıyor olabilir): varsayılan KAPALI, SEO alanları açık.
  defaultSelected: boolean;
}

export const CONTENT_FIELDS: readonly ContentFieldMeta[] = [
  { key: 'seoTitle', label: 'SEO başlığı', limit: SEO_TITLE_MAX_LENGTH, multiline: false, defaultSelected: true },
  { key: 'seoDescription', label: 'SEO açıklaması', limit: SEO_DESCRIPTION_MAX_LENGTH, multiline: true, defaultSelected: true },
  { key: 'title', label: 'Ürün başlığı', limit: null, multiline: false, defaultSelected: false },
  { key: 'descriptionHtml', label: 'Ürün açıklaması (HTML)', limit: null, multiline: true, defaultSelected: false },
];

export type ContentDraft = Record<ContentFieldKey, string>;

// Düzenlenebilir taslak: AI'ın önerdiği değer, önermediği alanda boş metin.
export function draftFromSuggestion(suggested: ShopifyContentFieldsDto): ContentDraft {
  return {
    title: suggested.title ?? '',
    descriptionHtml: suggested.descriptionHtml ?? '',
    seoTitle: suggested.seoTitle ?? '',
    seoDescription: suggested.seoDescription ?? '',
  };
}

export function defaultSelection(): Set<ContentFieldKey> {
  return new Set(CONTENT_FIELDS.filter((f) => f.defaultSelected).map((f) => f.key));
}

// Yazılacak gövde: yalnız seçili, dolu ve mevcut değerden FARKLI alanlar. Hiçbiri yoksa null (yazma düğmesi kapalı kalır).
export function buildContentBody(
  draft: ContentDraft, current: ShopifyContentFieldsDto, selected: ReadonlySet<ContentFieldKey>,
): SaveShopifyContentBody | null {
  const body: SaveShopifyContentBody = {};
  for (const { key } of CONTENT_FIELDS) {
    const value = draft[key].trim();
    if (selected.has(key) && value.length > 0 && value !== (current[key] ?? '').trim()) body[key] = value;
  }
  return Object.keys(body).length > 0 ? body : null;
}

// Sayaç sınırı aşıldı mı (kırmızı gösterilir; yazma yine sunucuda reddedilir).
export function isOverLimit(value: string, limit: number | null): boolean {
  return limit !== null && value.trim().length > limit;
}

export function problemSummaryText(productsScanned: number, productsWithIssues: number): string {
  return `${productsScanned} üründen ${productsWithIssues} tanesinde sorun var.`;
}
