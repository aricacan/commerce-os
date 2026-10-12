'use client';

import type { ShopifyMenuNodeDto } from '../../lib/api/shopify-store-content';
import { AddMenuNodeForm } from './AddMenuNodeForm';
import { MenuNodeRow, type MenuRowActions } from './MenuNodeRow';
import {
  addNode, canIndent, canMove, canOutdent, flattenMenu, indentNode, moveNode, outdentNode, removeNode, updateNode,
  type MenuRow,
} from './menuTree';

interface Props {
  storeId: number;
  items: ShopifyMenuNodeDto[];
  onChange: (items: ShopifyMenuNodeDto[]) => void;
}

// Liste düzenleyici (mobil görünüm; masaüstü ağaç görünümü MenuTreeView): öğe ekle / sil / yeniden adlandır / sırala / girintile (en fazla 3 seviye).
// Değişiklikler yalnız ekrandaki taslağı etkiler; Shopify'a gitmesi için fark → onay → yayın gerekir.
export function MenuListEditor({ storeId, items, onChange }: Props) {
  const actionsFor = ({ path }: MenuRow): MenuRowActions => ({
    canUp: canMove(items, path, -1),
    canDown: canMove(items, path, 1),
    canIndent: canIndent(items, path),
    canOutdent: canOutdent(path),
    onTitle: (title) => onChange(updateNode(items, path, { title })),
    onUrl: (url) => onChange(updateNode(items, path, { url })),
    onUp: () => onChange(moveNode(items, path, -1)),
    onDown: () => onChange(moveNode(items, path, 1)),
    onIndent: () => onChange(indentNode(items, path)),
    onOutdent: () => onChange(outdentNode(items, path)),
    onRemove: () => onChange(removeNode(items, path)),
  });

  return (
    <div className="flex flex-col gap-3">
      {items.length === 0 && <p className="m-0 text-ui-xs text-fg-muted">Menüde öğe yok. &quot;Öğe ekle&quot; ile başlayın.</p>}
      <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
        {flattenMenu(items).map((row) => (
          <MenuNodeRow key={row.path.join('-')} row={row} actions={actionsFor(row)} />
        ))}
      </ul>
      <AddMenuNodeForm storeId={storeId} onAdd={(node) => onChange(addNode(items, null, node))} />
    </div>
  );
}
