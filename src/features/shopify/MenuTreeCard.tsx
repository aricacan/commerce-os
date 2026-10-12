'use client';

import { ChevronRight, GripVertical, Plus, Trash2 } from 'lucide-react';
import type { ShopifyMenuNodeDto } from '../../lib/api/shopify-store-content';
import { iconButtonClass } from './contentStyles';
import type { NodeMark } from './menuMarks';
import { pathKey } from './menuMarks';
import { MENU_TYPE, MAX_MENU_DEPTH, canIndent, canMove, canOutdent, indentNode, menuTypeLabel, moveNode, outdentNode, removeNode, updateNode, type NodePath } from './menuTree';
import { MenuMoveButtons } from './MenuMoveButtons';
import { useMenuTree } from './menuTreeContext';
import { MenuTypeIcon } from './MenuTypeIcon';
import { fieldClass } from './styles';
import { TREE_CARD_CLASS, TREE_ROW_CLASS } from './treeStyles';
import type { DropIndicator } from './useMenuDrag';

const MARK_CLASS: Record<NodeMark, string> = {
  added: 'border-success bg-success-soft',
  moved: 'border-warning bg-warning-soft',
  edited: 'border-warning bg-warning-soft',
};
const MARK_LABEL: Record<NodeMark, string> = { added: 'Yeni', moved: 'Taşındı', edited: 'Düzenlendi' };

function dropClass(indicator: DropIndicator | null): string {
  if (indicator === null) return '';
  if (indicator.reason !== null) return 'border-danger bg-danger-soft';
  if (indicator.position === 'before') return 'shadow-[0_-3px_0_0_var(--fg)]';
  return indicator.position === 'after' ? 'shadow-[0_3px_0_0_var(--fg)]' : 'border-fg bg-bg-subtle';
}

interface Props {
  node: ShopifyMenuNodeDto;
  path: NodePath;
  open: boolean;
  onToggleAdd: () => void;
}

// Ağaçtaki tek düğüm kartı: tutamaç (sürükle) · aç/kapa · tür simgesi · satır içi ad · taşıma/ekle/sil düğmeleri.
export function MenuTreeCard({ node, path, open, onToggleAdd }: Props) {
  const { items, marks, onChange, onToggle, bindDrag } = useMenuTree();
  const key = pathKey(path);
  const label = node.title || 'başlıksız öğe';
  const drag = bindDrag(path);
  const mark = marks.get(key);
  const hasChildren = node.items.length > 0;
  const surface = mark ? MARK_CLASS[mark] : 'border-border-soft';

  const actions = {
    canUp: canMove(items, path, -1), canDown: canMove(items, path, 1), canIndent: canIndent(items, path), canOutdent: canOutdent(path),
    onUp: () => onChange(moveNode(items, path, -1)), onDown: () => onChange(moveNode(items, path, 1)),
    onIndent: () => onChange(indentNode(items, path)), onOutdent: () => onChange(outdentNode(items, path)),
  };

  return (
    <div data-tree-card className={`group/card ${TREE_CARD_CLASS} flex-col ${surface} ${dropClass(drag.indicator)} ${drag.isDragged ? 'opacity-40' : ''}`} {...drag.zoneProps}>
      <div className={`flex items-center gap-1.5 ${TREE_ROW_CLASS}`}>
        <button type="button" aria-label={`${label} sürükle`} className="cursor-grab text-fg-subtle hover:text-fg active:cursor-grabbing" {...drag.handleProps}>
          <GripVertical size={14} aria-hidden />
        </button>
        {hasChildren
          ? (
            <button type="button" tabIndex={-1} aria-label={`${label} ${open ? 'daralt' : 'genişlet'}`} className="text-fg-muted hover:text-fg" onClick={() => onToggle(key)}>
              <ChevronRight size={15} aria-hidden className={`transition-transform duration-200 motion-reduce:transition-none ${open ? 'rotate-90' : ''}`} />
            </button>
          )
          : <span className="w-[15px] shrink-0" aria-hidden />}
        <MenuTypeIcon type={node.type} />
        <input aria-label={`${label} başlığı`} value={node.title} onChange={(e) => onChange(updateNode(items, path, { title: e.target.value }))} className={`${fieldClass} flex-1`} />
        {mark && <span className="shrink-0 text-ui-2xs font-semibold text-fg-muted">{MARK_LABEL[mark]}</span>}
        <span className="hidden shrink-0 rounded-md bg-bg-subtle px-1.5 py-0.5 text-ui-2xs text-fg-muted lg:inline">{menuTypeLabel(node.type)}</span>
        {hasChildren && !open && <span className="shrink-0 rounded-full bg-bg-subtle px-1.5 text-ui-2xs text-fg-muted">{node.items.length}</span>}
        <span className="flex shrink-0 gap-1 opacity-0 transition-opacity duration-200 focus-within:opacity-100 group-hover/card:opacity-100 pointer-coarse:opacity-100">
          <MenuMoveButtons label={label} actions={actions} />
          <button type="button" className={iconButtonClass} aria-label={`${label} altına öğe ekle`} disabled={path.length >= MAX_MENU_DEPTH} onClick={onToggleAdd}><Plus size={14} aria-hidden /></button>
          <button type="button" className={iconButtonClass} aria-label={`${label} sil`} onClick={() => onChange(removeNode(items, path))}><Trash2 size={14} aria-hidden /></button>
        </span>
      </div>
      {node.type === MENU_TYPE.Http && (
        <input aria-label={`${label} adresi`} value={node.url ?? ''} onChange={(e) => onChange(updateNode(items, path, { url: e.target.value }))} className={`${fieldClass} mb-2`} />
      )}
      {drag.indicator?.reason && <p role="status" className="m-0 pb-2 text-ui-2xs font-semibold text-danger">{drag.indicator.reason}</p>}
    </div>
  );
}
