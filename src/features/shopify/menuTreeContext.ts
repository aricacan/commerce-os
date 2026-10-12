import { createContext, useContext } from 'react';
import type { ShopifyMenuNodeDto } from '../../lib/api/shopify-store-content';
import type { NodeMark } from './menuMarks';
import type { NodePath } from './menuTree';
import type { DragBinding } from './useMenuDrag';

// Ağaç görünümünün ortak durumu: özyinelemeli düğümlere prop taşımamak için tek bağlam.
export interface MenuTreeContextValue {
  storeId: number;
  items: ShopifyMenuNodeDto[];
  marks: ReadonlyMap<string, NodeMark>;
  collapsed: ReadonlySet<string>;
  focusKey: string;
  onChange: (items: ShopifyMenuNodeDto[]) => void;
  onToggle: (key: string) => void;
  onFocusKey: (key: string) => void;
  bindDrag: (path: NodePath) => DragBinding;
}

export const MenuTreeContext = createContext<MenuTreeContextValue | null>(null);

export function useMenuTree(): MenuTreeContextValue {
  const value = useContext(MenuTreeContext);
  if (value === null) throw new Error('MenuTreeContext dışında kullanılamaz.');
  return value;
}
