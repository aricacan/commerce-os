import type { ShopifyDiscountScope, ShopifyScopeItem } from '../../lib/api/shopify-promotions';

// İndirim kapsamı seçicisinin saf kuralları: form durumu ↔ istek gövdesi. Sunucu aynı kuralları yeniden doğrular.

export const SCOPE_MODE = { All: 'all', Products: 'products', Collections: 'collections' } as const;
export type ScopeMode = (typeof SCOPE_MODE)[keyof typeof SCOPE_MODE];

// Sunucudaki üst sınırla aynı (ShopifyDiscountScopeBuilder.MaxItems).
export const SCOPE_MAX_ITEMS = 100;

export interface ScopeFormState {
  mode: ScopeMode;
  products: ShopifyScopeItem[];
  collections: ShopifyScopeItem[];
}

export const ALL_PRODUCTS_SCOPE: ScopeFormState = { mode: SCOPE_MODE.All, products: [], collections: [] };

// X al Y öde "tüm ürünler"i desteklemez; başlangıç durumu ürün seçimidir.
export const EMPTY_PRODUCT_SCOPE: ScopeFormState = { mode: SCOPE_MODE.Products, products: [], collections: [] };

export function scopeFromDto(scope: ShopifyDiscountScope | null | undefined): ScopeFormState {
  if (!scope || scope.all) return ALL_PRODUCTS_SCOPE;
  if (scope.collections.length > 0) return { mode: SCOPE_MODE.Collections, products: [], collections: scope.collections };
  return { mode: SCOPE_MODE.Products, products: scope.products, collections: [] };
}

// Mod değişince önceki moddan kalan seçimler atılır (ürün ve koleksiyon birlikte gönderilemez).
export function changeScopeMode(mode: ScopeMode): ScopeFormState {
  return { mode, products: [], collections: [] };
}

export function selectedItems(scope: ScopeFormState): ShopifyScopeItem[] {
  if (scope.mode === SCOPE_MODE.Products) return scope.products;
  return scope.mode === SCOPE_MODE.Collections ? scope.collections : [];
}

function withItems(scope: ScopeFormState, items: ShopifyScopeItem[]): ScopeFormState {
  return scope.mode === SCOPE_MODE.Collections ? { ...scope, collections: items } : { ...scope, products: items };
}

export function addScopeItem(scope: ScopeFormState, item: ShopifyScopeItem): ScopeFormState {
  const items = selectedItems(scope);
  if (items.length >= SCOPE_MAX_ITEMS || items.some((existing) => existing.id === item.id)) return scope;
  return withItems(scope, [...items, item]);
}

export function removeScopeItem(scope: ScopeFormState, id: number): ScopeFormState {
  return withItems(scope, selectedItems(scope).filter((item) => item.id !== id));
}

// Form → istek kapsamı. allowAll=false (X al Y öde): "tüm ürünler" ya da boş seçim hatadır.
export function buildScope(scope: ScopeFormState, label: string, allowAll: boolean): ShopifyDiscountScope | string {
  if (scope.mode === SCOPE_MODE.All) {
    return allowAll
      ? { all: true, products: [], collections: [] }
      : `${label}: bu indirim türünde tüm ürünler seçilemez; ürün ya da koleksiyon seçin.`;
  }
  const items = selectedItems(scope);
  if (items.length === 0) return `${label}: en az bir ${scope.mode === SCOPE_MODE.Products ? 'ürün' : 'koleksiyon'} seçin.`;
  return scope.mode === SCOPE_MODE.Products
    ? { all: false, products: items, collections: [] }
    : { all: false, products: [], collections: items };
}
