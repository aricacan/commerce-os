import type { FilterSelectOption } from '../../components/ui/FilterSelect';
import type {
  CanonicalCategoryDto, CategoryLinkBody, NewCategoryBody, CategorySourceType, CategoryTermDto, TaxonomyLanguage, UnmappedCategoryDto,
} from '../../lib/api/category-taxonomy';

// Kategori taksonomisi panelinin saf kuralları (DOM'suz, testten geçer).

export const TAXONOMY_LANGUAGES: readonly TaxonomyLanguage[] = ['tr', 'sq', 'en'];

export const LANGUAGE_LABELS: Readonly<Record<TaxonomyLanguage, string>> = {
  tr: 'Türkçe',
  sq: 'Arnavutça',
  en: 'İngilizce',
};

export const SOURCE_TYPE_LABELS: Readonly<Record<CategorySourceType, string>> = {
  InternalCategory: 'ERP kategorisi',
  SiteCategory: 'Site kategorisi',
};

/** Dil bazında terimler: birincil ad önce gelir (sunucu sırasını korur). */
export function termsByLanguage(category: CanonicalCategoryDto): Record<TaxonomyLanguage, CategoryTermDto[]> {
  const grouped: Record<TaxonomyLanguage, CategoryTermDto[]> = { tr: [], sq: [], en: [] };
  for (const term of category.terms) grouped[term.language]?.push(term);
  return grouped;
}

/** Listelerde gösterilen ad: Türkçe birincil ad, yoksa kod. */
export function displayName(category: CanonicalCategoryDto): string {
  return category.terms.find((t) => t.language === 'tr' && t.isPrimary)?.term ?? category.code;
}

export function canonicalOptions(categories: CanonicalCategoryDto[]): FilterSelectOption[] {
  return categories
    .filter((c) => c.isActive)
    .map((c) => ({ value: String(c.id), label: displayName(c), sublabel: c.code }));
}

export function linkBody(source: UnmappedCategoryDto, canonicalCategoryId: number): CategoryLinkBody {
  return {
    canonicalCategoryId,
    sourceType: source.sourceType,
    internalCategoryId: source.internalCategoryId,
    siteSourceId: source.siteSourceId,
    siteCategoryName: source.sourceType === 'SiteCategory' ? source.label : null,
  };
}

// Sunucudaki kod kuralı: küçük harf/rakam, tireyle ayrılmış, en çok 64 karakter.
export const CATEGORY_CODE_MAX_LENGTH = 64;
export const CATEGORY_NAME_MAX_LENGTH = 128;
const CATEGORY_CODE_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const TURKISH_ASCII: Readonly<Record<string, string>> = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', ë: 'e' };

/** İngilizce addan kalıcı kod önerisi: "Floor Mats" → "floor-mats". */
export function suggestCategoryCode(englishName: string): string {
  const folded = englishName.trim().toLowerCase().replace(/[çğıöşüë]/g, (c) => TURKISH_ASCII[c] ?? c);
  const slug = folded.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return slug.slice(0, CATEGORY_CODE_MAX_LENGTH).replace(/-+$/, '');
}

/** Yeni kategori formunun hatası; geçerliyse null. */
export function newCategoryError(body: NewCategoryBody, existing: CanonicalCategoryDto[]): string | null {
  if (!CATEGORY_CODE_PATTERN.test(body.code) || body.code.length > CATEGORY_CODE_MAX_LENGTH) {
    return 'Kod yalnız küçük harf, rakam ve tire içerebilir (örn. floor-mats).';
  }
  if ([body.tr, body.sq, body.en].some((name) => name.trim() === '')) return 'Üç dilde de ad yazılmalı.';
  if (existing.some((c) => c.code === body.code)) return 'Bu kodla bir kategori zaten var.';
  return null;
}
