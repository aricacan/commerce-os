'use client';

import { ChevronRight, Folder, FolderOpen, Hand, WandSparkles } from 'lucide-react';
import type { CollectionTreeNode } from './collectionTree';
import { TREE_CHILDREN_CLASS, TREE_ROW_CLASS, TREE_CARD_CLASS, treeConnectorClass } from './treeStyles';
import { TreeCollapsible } from './TreeCollapsible';

export interface CollectionTreeState {
  openKeys: ReadonlySet<string>;
  selectedId: number | null;
  focusKey: string;
  onToggle: (key: string) => void;
  onSelect: (collectionId: number) => void;
  onFocusKey: (key: string) => void;
}

interface Props {
  node: CollectionTreeNode;
  depth: number;
  isLast: boolean;
  state: CollectionTreeState;
}

const ICON_SIZE = 15;
const FOCUS_CLASS = 'outline-none focus-visible:[&>[data-tree-card]]:ring-2 focus-visible:[&>[data-tree-card]]:ring-fg';

function NodeIcon({ node, open }: { node: CollectionTreeNode; open: boolean }) {
  if (node.collection === null || node.children.length > 0) {
    const Icon = open ? FolderOpen : Folder;
    return <Icon size={ICON_SIZE} aria-hidden className="shrink-0 text-fg-muted" />;
  }
  const Icon = node.collection.isSmart ? WandSparkles : Hand;
  return <Icon size={ICON_SIZE} aria-label={node.collection.isSmart ? 'Akıllı koleksiyon' : 'Manuel koleksiyon'} role="img" className="shrink-0 text-fg-muted" />;
}

// Koleksiyon ağacı düğümü (role=treeitem): marka/grup ya da koleksiyon. Koleksiyona tıklamak detayı açar, gruba tıklamak açar/kapatır.
export function CollectionTreeItem({ node, depth, isLast, state }: Props) {
  const hasChildren = node.children.length > 0;
  const open = state.openKeys.has(node.key);
  const collection = node.collection;
  const selected = collection !== null && collection.id === state.selectedId;
  const activate = () => (collection ? state.onSelect(collection.id) : state.onToggle(node.key));

  return (
    <li
      role="treeitem" aria-level={depth} aria-label={node.label} aria-expanded={hasChildren ? open : undefined}
      aria-selected={collection ? selected : undefined} data-tree-key={node.key} tabIndex={state.focusKey === node.key ? 0 : -1}
      className={`${FOCUS_CLASS} ${depth > 1 ? treeConnectorClass(isLast) : 'pb-1.5'}`}
      onFocus={(e) => { if (e.target === e.currentTarget) state.onFocusKey(node.key); }}
      onKeyDown={(e) => { if (e.target === e.currentTarget && e.key === 'Enter') activate(); }}
    >
      <div data-tree-card className={`${TREE_CARD_CLASS} ${TREE_ROW_CLASS} flex-row items-center gap-1.5 ${selected ? 'border-fg bg-bg-subtle' : 'border-border-soft'}`}>
        {hasChildren
          ? (
            <button type="button" tabIndex={-1} aria-label={`${node.label} ${open ? 'daralt' : 'genişlet'}`} className="text-fg-muted hover:text-fg" onClick={() => state.onToggle(node.key)}>
              <ChevronRight size={ICON_SIZE} aria-hidden className={`transition-transform duration-200 motion-reduce:transition-none ${open ? 'rotate-90' : ''}`} />
            </button>
          )
          : <span className="w-[15px] shrink-0" aria-hidden />}
        <NodeIcon node={node} open={open} />
        <button type="button" tabIndex={-1} className="min-w-0 flex-1 truncate text-left text-ui-sm font-semibold text-fg" onClick={activate}>{node.label}</button>
        {hasChildren && <span className="shrink-0 text-ui-2xs text-fg-muted">{node.children.length} alt</span>}
        <span className="shrink-0 rounded-full bg-bg-subtle px-2 py-0.5 text-ui-2xs text-fg">{node.productCount} ürün</span>
      </div>
      {hasChildren && (
        <TreeCollapsible open={open}>
          <ul role="group" className={TREE_CHILDREN_CLASS}>
            {node.children.map((child, index) => (
              <CollectionTreeItem key={child.key} node={child} depth={depth + 1} isLast={index === node.children.length - 1} state={state} />
            ))}
          </ul>
        </TreeCollapsible>
      )}
    </li>
  );
}
