import type { BrandDto, BrandSaveDto } from '../../lib/api/omnichannel';

// Marka formunun düzenlenen hâli: tüm alanlar metin/değer olarak tutulur, kaydederken
// boşluklar kırpılıp boş alanlar null'a çevrilir (slug boş → sunucu addan üretir).
export interface BrandDraft {
  name: string;
  slug: string;
  defaultCountry: string;
  isActive: boolean;
  sortOrder: number;
}

const DEFAULT_SORT_ORDER = 10;

export const EMPTY_BRAND_DRAFT: BrandDraft = {
  name: '', slug: '', defaultCountry: '', isActive: true, sortOrder: DEFAULT_SORT_ORDER,
};

export function brandDraftFrom(brand: BrandDto | null): BrandDraft {
  if (!brand) return EMPTY_BRAND_DRAFT;
  return {
    name: brand.name,
    slug: brand.slug,
    defaultCountry: brand.defaultCountry ?? '',
    isActive: brand.isActive,
    sortOrder: brand.sortOrder,
  };
}

export function toBrandSaveDto(draft: BrandDraft): BrandSaveDto {
  const slug = draft.slug.trim().toLowerCase();
  const country = draft.defaultCountry.trim().toUpperCase();
  return {
    name: draft.name.trim(),
    slug: slug || null,
    defaultCountry: country || null,
    isActive: draft.isActive,
    sortOrder: Number.isFinite(draft.sortOrder) ? draft.sortOrder : DEFAULT_SORT_ORDER,
  };
}
