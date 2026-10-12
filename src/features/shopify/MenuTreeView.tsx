'use client';

import { useMemo, useState } from 'react';
import type { ShopifyMenuNodeDto } from '../../lib/api/shopify-store-content';
import { AddMenuNodeForm } from './AddMenuNodeForm';
import { menuMarks, pathKey, removedTitles } from './menuMarks';
import { addNode } from './menuTree';
import { MenuTreeContext, type MenuTreeContextValue } from './menuTreeContext';
import { MenuTreeItem } from './MenuTreeItem';
import { handleTreeKeyDown } from './treeKeyboard';
import { useMenuDrag } from './useMenuDrag';

interface Props {
  storeId: number;
  items: ShopifyMenuNodeDto[];
  // Canlı menü: ekrandaki taslağın renkli vurgusu (eklenen / taşınan / silinen) bununla karşılaştırılır.
  liveItems: ShopifyMenuNodeDto[];
  onChange: (items: ShopifyMenuNodeDto[]) => void;
}

const FIRST_KEY = pathKey([0]);

// Masaüstü menü düzenleyici: dallanan ağaç, animasyonlu aç/kapa, sürükle-bırak, satır içi düzenleme.
// Değişiklikler yalnız ekrandaki taslağı etkiler; Shopify'a gitmesi için fark → onay → yayın gerekir.
export function MenuTreeView({ storeId, items, liveItems, onChange }: Props) {
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  const [focusKey, setFocusKey] = useState(FIRST_KEY);
  const { bind } = useMenuDrag(items, onChange);
  const marks = useMemo(() => menuMarks(liveItems, items), [liveItems, items]);
  const removed = useMemo(() => removedTitles(liveItems, items), [liveItems, items]);

  const toggle = (key: string) => setCollapsed((current) => {
    const next = new Set(current);
    if (!next.delete(key)) next.add(key);
    return next;
  });

  const context: MenuTreeContextValue = {
    storeId, items, marks, collapsed, focusKey, onChange, onToggle: toggle, onFocusKey: setFocusKey, bindDrag: bind,
  };

  return (
    <div className="flex flex-col gap-3">
      {items.length === 0 && <p className="m-0 text-ui-xs text-fg-muted">Menüde öğe yok. &quot;Öğe ekle&quot; ile başlayın.</p>}
      <MenuTreeContext.Provider value={context}>
        <ul role="tree" aria-label="Menü ağacı" className="m-0 flex list-none flex-col p-0" onKeyDown={(e) => handleTreeKeyDown(e, toggle)}>
          {items.map((node, index) => (
            <MenuTreeItem key={pathKey([index])} node={node} path={[index]} isLast={index === items.length - 1} />
          ))}
        </ul>
      </MenuTreeContext.Provider>
      {removed.length > 0 && (
        <p className="m-0 flex flex-wrap items-center gap-1.5 text-ui-2xs text-fg-muted" aria-label="Silinecek öğeler">
          Silinecek:
          {removed.map((title, index) => (
            <span key={`${title}-${index}`} className="rounded-md border border-danger bg-danger-soft px-1.5 py-0.5 text-danger line-through">{title}</span>
          ))}
        </p>
      )}
      <AddMenuNodeForm storeId={storeId} onAdd={(node) => onChange(addNode(items, null, node))} />
    </div>
  );
}
