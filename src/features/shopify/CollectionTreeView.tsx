'use client';

import { useMemo, useState } from 'react';
import type { ShopifyCollectionListItemDto } from '../../lib/api/shopify-store-content';
import { buildCollectionTree, filterCollectionTree } from './collectionTree';
import { CollectionTreeItem, type CollectionTreeState } from './CollectionTreeItem';
import { handleTreeKeyDown } from './treeKeyboard';

interface Props {
  collections: ShopifyCollectionListItemDto[];
  query: string;
  selectedId: number | null;
  onSelect: (collectionId: number) => void;
}

// Koleksiyon haritası: Marka → Model ağacı. Arama ağacı süzer ve eşleşen dalları açar; aksi halde dallar kapalı başlar.
export function CollectionTreeView({ collections, query, selectedId, onSelect }: Props) {
  const [userOpen, setUserOpen] = useState<ReadonlySet<string>>(new Set());
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const tree = useMemo(() => buildCollectionTree(collections), [collections]);
  const { nodes, openKeys } = useMemo(() => filterCollectionTree(tree, query), [tree, query]);

  const toggle = (key: string) => setUserOpen((current) => {
    const next = new Set(current);
    if (!next.delete(key)) next.add(key);
    return next;
  });

  const state: CollectionTreeState = {
    openKeys: new Set([...userOpen, ...openKeys]),
    selectedId,
    focusKey: focusKey ?? nodes[0]?.key ?? '',
    onToggle: toggle,
    onSelect,
    onFocusKey: setFocusKey,
  };

  if (nodes.length === 0) return <p className="m-0 text-ui-xs text-fg-muted">Aramaya uyan koleksiyon yok.</p>;

  return (
    <ul role="tree" aria-label="Koleksiyon ağacı" className="m-0 flex list-none flex-col p-0" onKeyDown={(e) => handleTreeKeyDown(e, toggle)}>
      {nodes.map((node, index) => (
        <CollectionTreeItem key={node.key} node={node} depth={1} isLast={index === nodes.length - 1} state={state} />
      ))}
    </ul>
  );
}
