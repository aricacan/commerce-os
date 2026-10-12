import { CircleDot, FileText, LayoutGrid, Link2, Package, type LucideIcon } from 'lucide-react';
import { MENU_TYPE } from './menuTree';

const TYPE_ICONS: Record<string, LucideIcon> = {
  [MENU_TYPE.Collection]: LayoutGrid,
  [MENU_TYPE.Product]: Package,
  [MENU_TYPE.Page]: FileText,
  [MENU_TYPE.Http]: Link2,
};

const ICON_SIZE = 15;

// Menü öğesinin hedef türü simgesi (koleksiyon / ürün / sayfa / bağlantı; diğer Shopify türleri nötr nokta).
export function MenuTypeIcon({ type }: { type: string }) {
  const Icon = TYPE_ICONS[type] ?? CircleDot;
  return <Icon size={ICON_SIZE} aria-hidden className="shrink-0 text-fg-muted" />;
}
