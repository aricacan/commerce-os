import type { CrossSellRuleDto, CrossSellRuleSaveDto } from '../../lib/api/omnichannel';

// Çapraz satış kural formunun düzenlenen hâli. Seçim kutuları metin tutar ('' = seçilmedi / tüm markalar);
// kaydederken sayıya çevrilir. Asıl doğrulama sunucuda — burası yalnız bariz hatayı kaydetmeden gösterir.
export interface CrossSellRuleDraft {
  brandId: string;
  fromCategoryId: string;
  toCategoryId: string;
  isActive: boolean;
  sortOrder: number;
}

const DEFAULT_SORT_ORDER = 10;

export const EMPTY_CROSS_SELL_DRAFT: CrossSellRuleDraft = {
  brandId: '', fromCategoryId: '', toCategoryId: '', isActive: true, sortOrder: DEFAULT_SORT_ORDER,
};

/** `rule` yoksa yeni kural taslağı; Kanal Merkezi'nde marka kanalın markasıyla ön dolu gelir. */
export function crossSellDraftFrom(rule: CrossSellRuleDto | null, defaultBrandId: number | null = null): CrossSellRuleDraft {
  if (!rule) return defaultBrandId === null ? EMPTY_CROSS_SELL_DRAFT : { ...EMPTY_CROSS_SELL_DRAFT, brandId: String(defaultBrandId) };
  return {
    brandId: rule.brandId === null ? '' : String(rule.brandId),
    fromCategoryId: String(rule.fromCategoryId),
    toCategoryId: String(rule.toCategoryId),
    isActive: rule.isActive,
    sortOrder: rule.sortOrder,
  };
}

export function toCrossSellSaveDto(draft: CrossSellRuleDraft): CrossSellRuleSaveDto {
  return {
    brandId: draft.brandId === '' ? null : Number(draft.brandId),
    fromCategoryId: Number(draft.fromCategoryId),
    toCategoryId: Number(draft.toCategoryId),
    isActive: draft.isActive,
    sortOrder: Number.isFinite(draft.sortOrder) ? draft.sortOrder : DEFAULT_SORT_ORDER,
  };
}

/** Kaydı engelleyen ilk sorunu döner; sorun yoksa null. */
export function crossSellDraftError(draft: CrossSellRuleDraft): string | null {
  if (!draft.fromCategoryId) return 'Sepetteki kategoriyi seçin.';
  if (!draft.toCategoryId) return 'Önerilecek kategoriyi seçin.';
  if (draft.fromCategoryId === draft.toCategoryId) return 'Kategori kendi tamamlayıcısı olamaz.';
  return null;
}
