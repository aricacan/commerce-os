import { request } from './core';

// Backend: CategoryTaxonomyController (FAZ 5.5). Kanonik kategori + TR/SQ/EN adları (tüm kiracılara ortak, yalnız
// SuperAdmin düzenler) ve kiracının ERP/site kategorilerinin kanonik kategoriye eşlemesi. Uç henüz yoksa (frontend
// backend'den önce yayına çıkar) get null döner.

const BASE = '/category-taxonomy';

export type TaxonomyLanguage = 'tr' | 'sq' | 'en';
export type CategorySourceType = 'InternalCategory' | 'SiteCategory';

export interface CategoryTermDto {
  id: number;
  language: TaxonomyLanguage;
  term: string;
  isPrimary: boolean;
  source: 'Seed' | 'Manual';
}

export interface CategoryLinkDto {
  id: number;
  sourceType: CategorySourceType;
  sourceLabel: string;
  siteName: string | null;
}

export interface CanonicalCategoryDto {
  id: number;
  code: string;
  isActive: boolean;
  terms: CategoryTermDto[];
  links: CategoryLinkDto[];
}

export interface UnmappedCategoryDto {
  sourceType: CategorySourceType;
  sourceKey: string;
  label: string;
  internalCategoryId: number | null;
  siteSourceId: number | null;
  siteName: string | null;
  productCount: number;
  suggestedCanonicalCategoryId: number | null;
}

export interface CategoryTaxonomyDto {
  categories: CanonicalCategoryDto[];
  unmapped: UnmappedCategoryDto[];
}

export interface CategoryLinkBody {
  canonicalCategoryId: number;
  sourceType: CategorySourceType;
  internalCategoryId: number | null;
  siteSourceId: number | null;
  siteCategoryName: string | null;
}

export interface NewCategoryBody {
  code: string;
  tr: string;
  sq: string;
  en: string;
}

export const categoryTaxonomyApi = {
  // null = sunucu taksonomiyi henüz tanımıyor (backend deploy edilmedi).
  get: async (): Promise<CategoryTaxonomyDto | null> => {
    try {
      return await request<CategoryTaxonomyDto>(BASE);
    } catch (e) {
      if (e instanceof Error && e.message.startsWith('404')) return null;
      throw e;
    }
  },
  link: (body: CategoryLinkBody) =>
    request<void>(`${BASE}/links`, { method: 'POST', body: JSON.stringify(body) }),
  unlink: (id: number) => request<void>(`${BASE}/links/${id}`, { method: 'DELETE' }),
  createCategory: (body: NewCategoryBody) =>
    request<void>(`${BASE}/categories`, { method: 'POST', body: JSON.stringify(body) }),
  addTerm: (categoryId: number, language: TaxonomyLanguage, term: string) =>
    request<void>(`${BASE}/categories/${categoryId}/terms`, { method: 'POST', body: JSON.stringify({ language, term }) }),
  deleteTerm: (id: number) => request<void>(`${BASE}/terms/${id}`, { method: 'DELETE' }),
};
