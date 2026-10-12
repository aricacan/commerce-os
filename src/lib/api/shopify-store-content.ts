import { request } from './core';
import type { ShopifyPageDto, ShopifyWriteResultDto } from './shopify-explorer';

// ─── Shopify Hub: koleksiyonlar + menüler (canlı okuma + yazma) ─────────────────
//
// Koleksiyonlar Shopify'dan CANLI okunur (panelde kopya yok). Menüde "taslak" ekranda yaşar; sunucu her yayında canlıyı
// okuyup doğrular ve yedekler. Parmak izi (hash) düzenleme başlarken alınır, yayında geri gönderilir:
// arada Shopify admininden değişiklik olduysa yayın 409 döner. Yedek türü metin ("PrePublish" / "PreRollback").

export interface ShopifyCollectionRuleDto {
  column: string;
  relation: string;
  condition: string;
}

export interface ShopifyCollectionListItemDto {
  id: number;
  title: string;
  handle: string;
  isSmart: boolean;
  productCount: number;
  updatedAt: string | null;
}

export interface ShopifyCollectionProductDto {
  id: number;
  title: string;
  handle: string | null;
}

export interface ShopifyCollectionDetailDto {
  id: number;
  title: string;
  handle: string;
  descriptionHtml: string | null;
  sortOrder: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  isSmart: boolean;
  appliedDisjunctively: boolean;
  rules: ShopifyCollectionRuleDto[];
  products: ShopifyCollectionProductDto[];
}

// Boş (undefined) alan güncellemede Shopify'da DEĞİŞMEZ. rules DOLUYSA koleksiyon akıllıdır; yoksa manuel.
export interface SaveShopifyCollectionBody {
  title?: string;
  handle?: string;
  descriptionHtml?: string;
  seoTitle?: string;
  seoDescription?: string;
  sortOrder?: string;
  appliedDisjunctively?: boolean;
  rules?: ShopifyCollectionRuleDto[];
}

export interface ShopifyMenuNodeDto {
  // Shopify'da var olan öğede dolu; yeni öğede null.
  id: string | null;
  title: string;
  type: string;
  resourceId: string | null;
  url: string | null;
  tags: string[];
  items: ShopifyMenuNodeDto[];
}

export interface ShopifyMenuListItemDto {
  id: number;
  handle: string;
  title: string;
  isDefault: boolean;
  itemCount: number;
}

export interface ShopifyMenuDto {
  id: number;
  handle: string;
  title: string;
  isDefault: boolean;
  hash: string;
  items: ShopifyMenuNodeDto[];
}

export interface SaveShopifyMenuBody {
  title?: string;
  handle?: string;
  items: ShopifyMenuNodeDto[];
  expectedHash?: string;
  overwriteLive?: boolean;
}

export type ShopifyMenuChangeKind = 'Added' | 'Removed' | 'Renamed' | 'Moved' | 'Retargeted';

export interface ShopifyMenuChangeDto {
  kind: ShopifyMenuChangeKind;
  path: string;
  detail: string | null;
}

export interface ShopifyMenuDiffDto {
  changes: ShopifyMenuChangeDto[];
  liveChanged: boolean;
  errors: string[];
}

export interface ShopifyMenuSnapshotDto {
  id: number;
  menuId: number;
  handle: string;
  title: string;
  reason: string;
  takenBy: number | null;
  takenAt: string;
  itemCount: number;
}

export interface ShopifyMenuSnapshotDetailDto {
  snapshot: ShopifyMenuSnapshotDto;
  items: ShopifyMenuNodeDto[];
}

export interface ShopifyMenuTargetDto {
  resourceId: string;
  type: string;
  title: string;
  handle: string | null;
}

const storePath = (storeId: number) => `/shopify/stores/${storeId}`;

function json(method: string, body?: unknown): RequestInit {
  return { method, body: body === undefined ? undefined : JSON.stringify(body) };
}

function withQuery(path: string, params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

export const shopifyStoreContentApi = {
  collections: (storeId: number, search: string, after: string | null) =>
    request<ShopifyPageDto<ShopifyCollectionListItemDto>>(
      withQuery(`${storePath(storeId)}/collections`, { search: search.trim(), after: after ?? undefined }),
    ),
  collection: (storeId: number, collectionId: number) =>
    request<ShopifyCollectionDetailDto>(`${storePath(storeId)}/collections/${collectionId}`),
  createCollection: (storeId: number, body: SaveShopifyCollectionBody) =>
    request<ShopifyWriteResultDto>(`${storePath(storeId)}/collections`, json('POST', body)),
  updateCollection: (storeId: number, collectionId: number, body: SaveShopifyCollectionBody) =>
    request<ShopifyWriteResultDto>(`${storePath(storeId)}/collections/${collectionId}`, json('PUT', body)),
  deleteCollection: (storeId: number, collectionId: number) =>
    request<ShopifyWriteResultDto>(`${storePath(storeId)}/collections/${collectionId}`, json('DELETE')),
  addCollectionProducts: (storeId: number, collectionId: number, productIds: number[]) =>
    request<ShopifyWriteResultDto>(`${storePath(storeId)}/collections/${collectionId}/products`, json('POST', { productIds })),
  removeCollectionProducts: (storeId: number, collectionId: number, productIds: number[]) =>
    request<ShopifyWriteResultDto>(`${storePath(storeId)}/collections/${collectionId}/products/remove`, json('POST', { productIds })),

  menus: (storeId: number) => request<ShopifyMenuListItemDto[]>(`${storePath(storeId)}/menus`),
  menu: (storeId: number, menuId: number) => request<ShopifyMenuDto>(`${storePath(storeId)}/menus/${menuId}`),
  menuTargets: (storeId: number, kind: string, search: string) =>
    request<ShopifyMenuTargetDto[]>(withQuery(`${storePath(storeId)}/menu-targets`, { kind, search: search.trim() })),
  diffMenu: (storeId: number, menuId: number, body: SaveShopifyMenuBody) =>
    request<ShopifyMenuDiffDto>(`${storePath(storeId)}/menus/${menuId}/diff`, json('POST', body)),
  createMenu: (storeId: number, body: SaveShopifyMenuBody) =>
    request<ShopifyWriteResultDto>(`${storePath(storeId)}/menus`, json('POST', body)),
  publishMenu: (storeId: number, menuId: number, body: SaveShopifyMenuBody) =>
    request<ShopifyWriteResultDto>(`${storePath(storeId)}/menus/${menuId}`, json('PUT', body)),
  menuSnapshots: (storeId: number, menuId: number) =>
    request<ShopifyMenuSnapshotDto[]>(`${storePath(storeId)}/menus/${menuId}/snapshots`),
  menuSnapshot: (storeId: number, snapshotId: number) =>
    request<ShopifyMenuSnapshotDetailDto>(`${storePath(storeId)}/menu-snapshots/${snapshotId}`),
  rollbackMenu: (storeId: number, snapshotId: number) =>
    request<ShopifyWriteResultDto>(`${storePath(storeId)}/menu-snapshots/${snapshotId}/rollback`, json('POST')),
};
