import type { ShopifyMenuNodeDto } from '../../lib/api/shopify-store-content';
import { flattenMenu, type NodePath } from './menuTree';

// Taslağın canlı menüye göre farkı (ağaçta renkli vurgu için): eklenen / taşınan / düzenlenen düğümler + silinenler.
// Kesin fark yine sunucudaki fark önizlemesidir (MenuDiffPanel); bu yalnız düzenlerken anlık görsel ipucudur.

export type NodeMark = 'added' | 'moved' | 'edited';

const ROOT = '';
const NEW_PARENT = '\u0000new';

interface LiveEntry {
  node: ShopifyMenuNodeDto;
  parent: string;
}

export const pathKey = (path: NodePath): string => path.join('-');

function indexLive(items: ShopifyMenuNodeDto[], parent: string, entries: Map<string, LiveEntry>, children: Map<string, string[]>) {
  children.set(parent, items.flatMap((node) => (node.id ? [node.id] : [])));
  for (const node of items) {
    if (!node.id) continue;
    entries.set(node.id, { node, parent });
    indexLive(node.items, node.id, entries, children);
  }
}

const sameTarget = (a: ShopifyMenuNodeDto, b: ShopifyMenuNodeDto) =>
  a.title === b.title && a.type === b.type && a.resourceId === b.resourceId && a.url === b.url;

export function menuMarks(live: ShopifyMenuNodeDto[], draft: ShopifyMenuNodeDto[]): Map<string, NodeMark> {
  const entries = new Map<string, LiveEntry>();
  const liveChildren = new Map<string, string[]>();
  indexLive(live, ROOT, entries, liveChildren);
  const marks = new Map<string, NodeMark>();

  const visit = (items: ShopifyMenuNodeDto[], parent: string, parentPath: NodePath) => {
    const kept = items.flatMap((node) => (node.id && entries.get(node.id)?.parent === parent ? [node.id] : []));
    const liveOrder = (liveChildren.get(parent) ?? []).filter((id) => kept.includes(id));
    items.forEach((node, index) => {
      const path = [...parentPath, index];
      const entry = node.id ? entries.get(node.id) : undefined;
      if (!node.id || !entry) marks.set(pathKey(path), 'added');
      else if (entry.parent !== parent || liveOrder.indexOf(node.id) !== kept.indexOf(node.id)) marks.set(pathKey(path), 'moved');
      else if (!sameTarget(entry.node, node)) marks.set(pathKey(path), 'edited');
      visit(node.items, node.id ?? NEW_PARENT, path);
    });
  };
  visit(draft, ROOT, []);
  return marks;
}

// Canlı menüde olup taslakta olmayan öğelerin başlıkları.
export function removedTitles(live: ShopifyMenuNodeDto[], draft: ShopifyMenuNodeDto[]): string[] {
  const present = new Set(flattenMenu(draft).flatMap((row) => (row.node.id ? [row.node.id] : [])));
  return flattenMenu(live).filter((row) => row.node.id && !present.has(row.node.id)).map((row) => row.node.title);
}
