'use client';

import type { ShopifyMenuNodeDto } from '../../lib/api/shopify-store-content';
import { useMobile } from '../../hooks/useMobile';
import { MenuListEditor } from './MenuListEditor';
import { MenuTreeView } from './MenuTreeView';

interface Props {
  storeId: number;
  items: ShopifyMenuNodeDto[];
  liveItems: ShopifyMenuNodeDto[];
  onChange: (items: ShopifyMenuNodeDto[]) => void;
}

// Menü düzenleyici seçici: dar ekranda (<768px) sürükle-bırak yok → eski liste düzenleyici (yukarı/aşağı/girinti düğmeleri);
// masaüstünde dallanan ağaç. Düzenleme mantığı (menuTree.ts) ve yayın akışı iki görünümde de aynıdır.
export function MenuTreeEditor({ storeId, items, liveItems, onChange }: Props) {
  const isMobile = useMobile();
  return isMobile
    ? <MenuListEditor storeId={storeId} items={items} onChange={onChange} />
    : <MenuTreeView storeId={storeId} items={items} liveItems={liveItems} onChange={onChange} />;
}
