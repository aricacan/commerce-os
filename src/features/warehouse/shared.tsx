import type { CSSProperties } from 'react';
import { LayoutGrid, Box, Search, PackagePlus, ClipboardCheck, Settings, Scale } from 'lucide-react';
import type { WorkspaceTab } from '../shared/ModuleWorkspace';

// Sorgula/Mal Kabul/Toplama/Yönetim gibi liste ağırlıklı sekmeler geniş panelde
// kenardan kenara yayılmasın diye ortalanmış, sınırlı genişlikte bir kolon
// kullanır — editör/3D gibi kendi düzenini yöneten sekmeler bunu kullanmaz.
export const TAB_CENTER_STYLE: CSSProperties = { maxWidth: 760, width: '100%', margin: '0 auto' };

export type WmsTab = 'editor' | 'viewer3d' | 'operations' | 'management' | 'receiving' | 'picking' | 'mutabakat';

export const WMS_TABS: readonly WorkspaceTab[] = [
  { key: 'editor',     label: 'Depo Kur',        Icon: LayoutGrid },
  { key: 'viewer3d',   label: '3D Gez',           Icon: Box },
  { key: 'operations', label: 'Sorgula & İşlem',  Icon: Search },
  { key: 'receiving',  label: 'Mal Kabul',        Icon: PackagePlus },
  { key: 'picking',    label: 'Toplama',          Icon: ClipboardCheck },
  { key: 'management', label: 'Yönetim',          Icon: Settings },
  { key: 'mutabakat',  label: 'ERP Mutabakatı',   Icon: Scale },
];
