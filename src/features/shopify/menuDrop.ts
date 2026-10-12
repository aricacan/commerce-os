import type { ShopifyMenuNodeDto } from '../../lib/api/shopify-store-content';
import { mapList, MAX_MENU_DEPTH, nodeAt, nodeHeight, removeNode, type NodePath } from './menuTree';

// Sürükle-bırak taşıma kuralları (saf): hedefin öncesi / sonrası / içi; kendi içine ve 3. seviyeden derine bırakma reddedilir.

export type DropPosition = 'before' | 'after' | 'inside';
export type DropCheck = { ok: true } | { ok: false; reason: string };

export const DEPTH_REASON = `Menü en fazla ${MAX_MENU_DEPTH} seviye olabilir.`;
const SELF_REASON = 'Öğe kendi içine taşınamaz.';
const SAME_REASON = 'Öğe zaten burada.';
const MISSING_REASON = 'Taşınan öğe bulunamadı.';

const startsWith = (path: NodePath, prefix: NodePath) => prefix.length <= path.length && prefix.every((v, i) => path[i] === v);

export function checkDrop(items: ShopifyMenuNodeDto[], from: NodePath, target: NodePath, position: DropPosition): DropCheck {
  const node = nodeAt(items, from);
  if (node === null) return { ok: false, reason: MISSING_REASON };
  if (from.length === target.length && startsWith(target, from)) return { ok: false, reason: SAME_REASON };
  if (startsWith(target, from)) return { ok: false, reason: SELF_REASON };
  const level = position === 'inside' ? target.length + 1 : target.length;
  return level + nodeHeight(node) - 1 > MAX_MENU_DEPTH ? { ok: false, reason: DEPTH_REASON } : { ok: true };
}

// Düğüm çıkarılınca aynı listede ondan sonra gelen kardeşlerin (ve alt ağaçlarının) yolu bir kayar.
function shiftAfterRemoval(target: NodePath, removed: NodePath): NodePath {
  const level = removed.length - 1;
  const sameList = target.length > level && removed.slice(0, level).every((v, i) => target[i] === v);
  if (!sameList || target[level] <= removed[level]) return target;
  return target.map((value, i) => (i === level ? value - 1 : value));
}

export function moveNodeTo(items: ShopifyMenuNodeDto[], from: NodePath, target: NodePath, position: DropPosition): ShopifyMenuNodeDto[] {
  const node = nodeAt(items, from);
  if (node === null || !checkDrop(items, from, target, position).ok) return items;
  const without = removeNode(items, from);
  const adjusted = shiftAfterRemoval(target, from);
  if (position === 'inside') return mapList(without, adjusted, (list) => [...list, node]);
  const at = adjusted[adjusted.length - 1] + (position === 'after' ? 1 : 0);
  return mapList(without, adjusted.slice(0, -1), (list) => [...list.slice(0, at), node, ...list.slice(at)]);
}
