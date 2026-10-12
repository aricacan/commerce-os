import { request } from './core';
import type { PaginatedResult } from '../../types/api';

// Base Katalog — marka/model/yıl gezgini ve kategori kapsam matrisi.
// Base Ürün Takibi gibi mağaza/ERP seçicisinden BAĞIMSIZ: backend her zaman aktif
// Base kaynaklarının tamamına bakar, bu yüzden store başlığı gönderilmez.

export interface BaseCatalogYear {
  label: string;
  /** true ise gerçek bir yıl değil, "Yıl belirtilmemiş" kovası. */
  isBucket: boolean;
  productCount: number;
}

export interface BaseCatalogModel {
  model: string;
  isBucket: boolean;
  productCount: number;
  years: BaseCatalogYear[];
}

export interface BaseCatalogMake {
  make: string;
  isBucket: boolean;
  productCount: number;
  modelCount: number;
  models: BaseCatalogModel[];
}

export interface BaseCatalogProduct {
  sku: string;
  name: string;
  imageUrl: string | null;
  brand: string | null;
  model: string | null;
  modelYear: string | null;
  categoryId: number | null;
  categoryName: string | null;
  price: number;
  currency: string | null;
  stock: number;
  isActive: boolean;
  stores: string[];
}

export interface BaseCoverageCategory {
  id: number;
  name: string;
  nameEn: string | null;
}

export interface BaseCoverageRow {
  make: string;
  model: string;
  productCount: number;
  /** SEYREK: yalnızca dolu kategoriler var. Eksik anahtar = boş hücre. */
  counts: Record<string, number>;
}

export interface BaseCoverage {
  categories: BaseCoverageCategory[];
  rows: BaseCoverageRow[];
}

export interface BaseCatalogProductParams {
  make?: string;
  model?: string;
  year?: string;
  categoryId?: number;
  search?: string;
  page?: number;
  pageSize?: number;
}

export const baseCatalogApi = {
  tree: () => request<BaseCatalogMake[]>('/base-catalog/tree'),

  products: (params: BaseCatalogProductParams = {}) => {
    const q = new URLSearchParams();
    if (params.make) q.set('make', params.make);
    if (params.model) q.set('model', params.model);
    if (params.year) q.set('year', params.year);
    if (params.categoryId != null) q.set('categoryId', String(params.categoryId));
    if (params.search) q.set('search', params.search);
    if (params.page) q.set('page', String(params.page));
    if (params.pageSize) q.set('pageSize', String(params.pageSize));
    return request<PaginatedResult<BaseCatalogProduct>>(`/base-catalog/products?${q}`);
  },

  /**
   * Filtreye uyan TÜM ürünler — dışa aktarma için. Backend pageSize'ı 200 ile sınırlar
   * (BaseCatalogService.MaxPageSize), bu yüzden tek istekle 2474 satır alınamaz; sayfalar
   * TotalCount'a ulaşana kadar sırayla çekilir. Sonsuz döngüye karşı: boş sayfa gelirse durur.
   */
  productsAll: async (params: BaseCatalogProductParams = {}): Promise<BaseCatalogProduct[]> => {
    const pageSize = 200;
    const all: BaseCatalogProduct[] = [];

    for (let page = 1; ; page += 1) {
      const result = await baseCatalogApi.products({ ...params, page, pageSize });
      all.push(...result.items);
      if (result.items.length === 0 || all.length >= result.totalCount) break;
    }

    return all;
  },

  coverage: (make?: string) => {
    const q = new URLSearchParams();
    if (make) q.set('make', make);
    return request<BaseCoverage>(`/base-catalog/coverage?${q}`);
  },
};
