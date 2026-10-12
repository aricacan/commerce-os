'use client';

import { useState } from 'react';
import type { ShopifyMenuNodeDto } from '../../lib/api/shopify-store-content';
import { AddMenuNodeForm } from './AddMenuNodeForm';
import { pathKey } from './menuMarks';
import { addNode, type NodePath } from './menuTree';
import { MenuTreeCard } from './MenuTreeCard';
import { useMenuTree } from './menuTreeContext';
import { TREE_CHILDREN_CLASS, treeConnectorClass } from './treeStyles';
import { TreeCollapsible } from './TreeCollapsible';

interface Props {
  node: ShopifyMenuNodeDto;
  path: NodePath;
  isLast: boolean;
}

// Odaklı düğümün kartını (alt ağacı değil) çerçeveler; kök düğümlerde konnektör yok.
const FOCUS_CLASS = 'outline-none focus-visible:[&>[data-tree-card]]:ring-2 focus-visible:[&>[data-tree-card]]:ring-fg';

// Özyinelemeli ağaç düğümü (role=treeitem): kart + (açılır) alt ağaç. Roving tabindex: yalnız odaklı düğüm sekme sırasında.
export function MenuTreeItem({ node, path, isLast }: Props) {
  const { items, collapsed, focusKey, storeId, onChange, onFocusKey } = useMenuTree();
  const [adding, setAdding] = useState(false);
  const key = pathKey(path);
  const hasChildren = node.items.length > 0;
  const open = !collapsed.has(key);

  return (
    <li
      role="treeitem" aria-selected={false} aria-level={path.length} aria-label={node.title || 'başlıksız öğe'} aria-expanded={hasChildren ? open : undefined}
      data-tree-key={key} tabIndex={focusKey === key ? 0 : -1}
      className={`${FOCUS_CLASS} ${path.length > 1 ? treeConnectorClass(isLast) : 'pb-1.5'}`}
      onFocus={(e) => { if (e.target === e.currentTarget) onFocusKey(key); }}
    >
      <MenuTreeCard node={node} path={path} open={open} onToggleAdd={() => setAdding((v) => !v)} />
      {adding && (
        <div className="pt-1.5">
          <AddMenuNodeForm startOpen storeId={storeId} onClosed={() => setAdding(false)} onAdd={(child) => onChange(addNode(items, path, child))} />
        </div>
      )}
      {hasChildren && (
        <TreeCollapsible open={open}>
          <ul role="group" className={TREE_CHILDREN_CLASS}>
            {node.items.map((child, index) => (
              <MenuTreeItem key={pathKey([...path, index])} node={child} path={[...path, index]} isLast={index === node.items.length - 1} />
            ))}
          </ul>
        </TreeCollapsible>
      )}
    </li>
  );
}
