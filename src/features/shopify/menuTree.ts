import type { ShopifyMenuChangeKind, ShopifyMenuNodeDto, ShopifyMenuTargetDto } from '../../lib/api/shopify-store-content';

// Menü ağacı düzenleme kuralları (saf): ekle / sil / yeniden adlandır / sırala / girintile. Shopify en fazla 3 seviye
// kabul eder; bu sınır burada engellenir (sunucu ayrıca doğrular). Ağaç her işlemde YENİ nesne döner (React durumu için).

export const MAX_MENU_DEPTH = 3;

// Düğümün ağaçtaki yeri: kökten itibaren kardeş sırası ([0] = ilk üst öğe, [0, 2] = onun üçüncü alt öğesi).
export type NodePath = readonly number[];

export interface MenuRow {
  path: NodePath;
  node: ShopifyMenuNodeDto;
  depth: number;
}

export const MENU_TYPE = {
  Collection: 'COLLECTION',
  Product: 'PRODUCT',
  Page: 'PAGE',
  Http: 'HTTP',
} as const;

// Ekranda eklenebilen düğüm türleri (diğer Shopify türleri canlı menüden gelirse korunur ama burada eklenmez).
export const ADDABLE_MENU_TYPES = [MENU_TYPE.Collection, MENU_TYPE.Product, MENU_TYPE.Page, MENU_TYPE.Http] as const;

const TYPE_LABELS: Record<string, string> = {
  COLLECTION: 'Koleksiyon',
  PRODUCT: 'Ürün',
  PAGE: 'Sayfa',
  HTTP: 'Bağlantı',
  BLOG: 'Blog',
  ARTICLE: 'Makale',
  FRONTPAGE: 'Ana sayfa',
  CATALOG: 'Tüm ürünler',
  COLLECTIONS: 'Koleksiyonlar',
  SEARCH: 'Arama',
  SHOP_POLICY: 'Politika',
  CUSTOMER_ACCOUNT_PAGE: 'Hesap sayfası',
  METAOBJECT: 'Metaobject',
};

export function menuTypeLabel(type: string): string {
  return TYPE_LABELS[type] ?? type;
}

export const CHANGE_KIND_LABELS: Record<ShopifyMenuChangeKind, string> = {
  Added: 'Eklenen',
  Removed: 'Silinen',
  Renamed: 'Yeniden adlandırılan',
  Moved: 'Taşınan',
  Retargeted: 'Hedefi değişen',
};

export function newMenuNode(init: Pick<ShopifyMenuNodeDto, 'title' | 'type'> & Partial<ShopifyMenuNodeDto>): ShopifyMenuNodeDto {
  return { id: null, resourceId: null, url: null, tags: [], items: [], ...init };
}

// Arama sonucundan düğüm: kaynağa bağlı türde url gönderilmez (Shopify kendisi kurar).
export function nodeFromTarget(target: ShopifyMenuTargetDto, title?: string): ShopifyMenuNodeDto {
  return newMenuNode({ title: title?.trim() || target.title, type: target.type, resourceId: target.resourceId });
}

export function flattenMenu(items: ShopifyMenuNodeDto[], parentPath: NodePath = []): MenuRow[] {
  return items.flatMap((node, index) => {
    const path = [...parentPath, index];
    return [{ path, node, depth: parentPath.length + 1 }, ...flattenMenu(node.items, path)];
  });
}

export function countNodes(items: ShopifyMenuNodeDto[]): number {
  return items.reduce((sum, node) => sum + 1 + countNodes(node.items), 0);
}

// Düğümün kendisi dahil en derin alt öğesine kadar kaç seviye.
export function nodeHeight(node: ShopifyMenuNodeDto): number {
  return 1 + node.items.reduce((max, child) => Math.max(max, nodeHeight(child)), 0);
}

export function mapList(
  items: ShopifyMenuNodeDto[], listPath: NodePath, change: (list: ShopifyMenuNodeDto[]) => ShopifyMenuNodeDto[],
): ShopifyMenuNodeDto[] {
  if (listPath.length === 0) return change(items);
  const [head, ...rest] = listPath;
  return items.map((node, index) => (index === head ? { ...node, items: mapList(node.items, rest, change) } : node));
}

const parentPathOf = (path: NodePath): NodePath => path.slice(0, -1);
const indexOf = (path: NodePath): number => path[path.length - 1];

export function nodeAt(items: ShopifyMenuNodeDto[], path: NodePath): ShopifyMenuNodeDto | null {
  let list = items;
  let found: ShopifyMenuNodeDto | null = null;
  for (const index of path) {
    found = list[index] ?? null;
    if (found === null) return null;
    list = found.items;
  }
  return found;
}

// parentPath null = üst seviyeye ekle. Derinlik sınırı aşılacaksa ağaç değişmez.
export function addNode(items: ShopifyMenuNodeDto[], parentPath: NodePath | null, node: ShopifyMenuNodeDto): ShopifyMenuNodeDto[] {
  const listPath = parentPath ?? [];
  if (listPath.length + nodeHeight(node) > MAX_MENU_DEPTH) return items;
  return mapList(items, listPath, (list) => [...list, node]);
}

export function removeNode(items: ShopifyMenuNodeDto[], path: NodePath): ShopifyMenuNodeDto[] {
  return mapList(items, parentPathOf(path), (list) => list.filter((_, index) => index !== indexOf(path)));
}

export function updateNode(items: ShopifyMenuNodeDto[], path: NodePath, patch: Partial<ShopifyMenuNodeDto>): ShopifyMenuNodeDto[] {
  return mapList(items, parentPathOf(path), (list) => list.map((node, index) => (index === indexOf(path) ? { ...node, ...patch } : node)));
}

export function canMove(items: ShopifyMenuNodeDto[], path: NodePath, delta: -1 | 1): boolean {
  const target = indexOf(path) + delta;
  const siblings = nodeAt(items, parentPathOf(path))?.items ?? items;
  return target >= 0 && target < siblings.length;
}

export function moveNode(items: ShopifyMenuNodeDto[], path: NodePath, delta: -1 | 1): ShopifyMenuNodeDto[] {
  if (!canMove(items, path, delta)) return items;
  const from = indexOf(path);
  return mapList(items, parentPathOf(path), (list) => {
    const next = [...list];
    [next[from], next[from + delta]] = [next[from + delta], next[from]];
    return next;
  });
}

// Girintile: önceki kardeşin son alt öğesi olur (en fazla 3 seviye).
export function canIndent(items: ShopifyMenuNodeDto[], path: NodePath): boolean {
  const node = nodeAt(items, path);
  return node !== null && indexOf(path) > 0 && path.length + nodeHeight(node) <= MAX_MENU_DEPTH;
}

export function indentNode(items: ShopifyMenuNodeDto[], path: NodePath): ShopifyMenuNodeDto[] {
  const node = nodeAt(items, path);
  if (node === null || !canIndent(items, path)) return items;
  const withoutNode = removeNode(items, path);
  const previousPath = [...parentPathOf(path), indexOf(path) - 1];
  return mapList(withoutNode, previousPath, (list) => [...list, node]);
}

// Girintiyi azalt: ebeveyninin hemen altındaki kardeş olur.
export function canOutdent(path: NodePath): boolean {
  return path.length > 1;
}

export function outdentNode(items: ShopifyMenuNodeDto[], path: NodePath): ShopifyMenuNodeDto[] {
  const node = nodeAt(items, path);
  if (node === null || !canOutdent(path)) return items;
  const withoutNode = removeNode(items, path);
  const parentPath = parentPathOf(path);
  return mapList(withoutNode, parentPathOf(parentPath), (list) => {
    const next = [...list];
    next.splice(indexOf(parentPath) + 1, 0, node);
    return next;
  });
}

// Ekranda değişiklik var mı (yayın düğmesi ve "kaydedilmemiş" uyarısı için).
export function sameTree(left: ShopifyMenuNodeDto[], right: ShopifyMenuNodeDto[]): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}
