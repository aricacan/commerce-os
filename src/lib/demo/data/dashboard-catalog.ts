// Pano grafiklerinin kırılım ağırlıkları: kategori, platform, marka, durum, ürün.
// Hepsi toplam siparişin/cironun yüzdesel payıdır; toplamlar 1'e yakındır.
import type { Category, ProductProfit } from '../../../types/api';
import { DEMO_PLATFORMS, DEMO_PRODUCTS, type DemoProduct } from './core';

const PRODUCT_RANK_EXPONENT = 0.9;
const LEADERBOARD_SIZE = 10;

export interface Weighted {
  label: string;
  weight: number;
}

const CATEGORY_WEIGHTS: Record<string, number> = {
  Paspas: 0.27,
  Bagaj: 0.14,
  'İç Aksesuar': 0.17,
  Bakım: 0.15,
  Aydınlatma: 0.08,
  Elektronik: 0.1,
  'Dış Aksesuar': 0.09,
};

const PLATFORM_WEIGHTS: Record<string, number> = {
  Trendyol: 0.38,
  Hepsiburada: 0.22,
  Amazon: 0.15,
  'Web Sitesi': 0.15,
  eBay: 0.1,
};

export const ORDER_STATUS_WEIGHTS: Weighted[] = [
  { label: 'Teslim Edildi', weight: 0.52 },
  { label: 'Kargolandı', weight: 0.2 },
  { label: 'Hazırlanıyor', weight: 0.1 },
  { label: 'Beklemede', weight: 0.08 },
  { label: 'İptal', weight: 0.06 },
  { label: 'İade', weight: 0.04 },
];

export const CATEGORIES: Category[] = Object.keys(CATEGORY_WEIGHTS).map((name, index) => ({ id: index + 1, name }));

export const CATEGORY_SHARES: Weighted[] = CATEGORIES.map((category) => ({
  label: category.name,
  weight: CATEGORY_WEIGHTS[category.name],
}));

export const PLATFORM_SHARES: Weighted[] = DEMO_PLATFORMS.map((name) => ({ label: name, weight: PLATFORM_WEIGHTS[name] }));

/** Seçili kategori filtresinin toplam hacimdeki payı; filtre yoksa 1. */
export function categoryFactor(categoryId: number | undefined): number {
  const category = CATEGORIES.find((item) => item.id === categoryId);
  return category ? CATEGORY_WEIGHTS[category.name] : 1;
}

export interface RankedProduct {
  product: DemoProduct;
  weight: number;
}

export const RANKED_PRODUCTS: RankedProduct[] = (() => {
  const raw = DEMO_PRODUCTS.map((product, index) => ({ product, weight: 1 / (index + 1) ** PRODUCT_RANK_EXPONENT }));
  const total = raw.reduce((sum, item) => sum + item.weight, 0);
  return raw.map((item) => ({ ...item, weight: item.weight / total }));
})();

export const BRAND_SHARES: Weighted[] = (() => {
  const byBrand = new Map<string, number>();
  for (const { product, weight } of RANKED_PRODUCTS) {
    byBrand.set(product.brand, (byBrand.get(product.brand) ?? 0) + weight);
  }
  return [...byBrand.entries()].map(([label, weight]) => ({ label, weight })).sort((a, b) => b.weight - a.weight);
})();

export const TOP_PRODUCTS: RankedProduct[] = RANKED_PRODUCTS.slice(0, LEADERBOARD_SIZE);

/** Ürün istatistiği: cirodan ve ürün payından türer. */
export function toProductProfit({ product, weight }: RankedProduct, totalRevenue: number, totalItems: number): ProductProfit {
  const revenue = Math.round(totalRevenue * weight);
  const grossProfit = Math.round(revenue * (1 - product.cost / product.price) * 0.78);
  const quantitySold = Math.max(1, Math.round(totalItems * weight));
  return {
    productId: product.id,
    sku: product.sku,
    productName: product.name,
    brand: product.brand,
    imageUrl: null,
    orderCount: Math.max(1, Math.round(quantitySold * 0.8)),
    quantitySold,
    revenue,
    grossProfit,
    grossMarginPct: revenue > 0 ? Number(((grossProfit / revenue) * 100).toFixed(1)) : 0,
  };
}

/** Kategori bazında ürün istatistikleri (stok, ortalama fiyat) — AvgPrice/TotalStock grafikleri için. */
export function categoryStockAndPrice(categoryName: string): { stock: number; avgPrice: number } {
  const products = DEMO_PRODUCTS.filter((product) => product.category === categoryName);
  const stock = products.reduce((sum, product) => sum + product.stock, 0);
  const avgPrice = products.length > 0 ? products.reduce((sum, product) => sum + product.price, 0) / products.length : 0;
  return { stock, avgPrice: Math.round(avgPrice) };
}
