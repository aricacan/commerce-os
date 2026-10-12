'use client';

import { Trash2 } from 'lucide-react';
import type { MenuRow } from './menuTree';
import { MENU_TYPE, menuTypeLabel } from './menuTree';
import { MenuMoveButtons, type MenuMoveActions } from './MenuMoveButtons';
import { fieldClass } from './styles';
import { iconButtonClass } from './contentStyles';

export interface MenuRowActions extends MenuMoveActions {
  onTitle: (title: string) => void;
  onUrl: (url: string) => void;
  onRemove: () => void;
}

// Derinliğe göre sol girinti (Tailwind dinamik sınıf üretemediği için sabit eşleme; en fazla 3 seviye).
const INDENT_CLASS = ['pl-0', 'pl-6', 'pl-12'] as const;

interface Props {
  row: MenuRow;
  actions: MenuRowActions;
}

// Liste görünümündeki tek satır: başlık düzenle, (bağlantıysa) adres düzenle, sırala / girintile / sil.
export function MenuNodeRow({ row, actions }: Props) {
  const { node, depth } = row;
  const label = node.title || 'başlıksız öğe';
  return (
    <li className={INDENT_CLASS[depth - 1]}>
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-border-soft bg-card px-2 py-1.5">
        <input
          aria-label={`${label} başlığı`} value={node.title} onChange={(e) => actions.onTitle(e.target.value)}
          className={`${fieldClass} basis-40 flex-1`}
        />
        <span className="shrink-0 rounded-md bg-bg-subtle px-1.5 py-0.5 text-ui-2xs text-fg-muted">{menuTypeLabel(node.type)}</span>
        {node.type === MENU_TYPE.Http
          ? <input aria-label={`${label} adresi`} value={node.url ?? ''} onChange={(e) => actions.onUrl(e.target.value)} className={`${fieldClass} basis-48 flex-[2]`} />
          : <span className="min-w-0 basis-40 flex-[2] break-all text-ui-2xs text-fg-muted">{node.url ?? node.resourceId ?? ''}</span>}
        <span className="flex gap-1">
          <MenuMoveButtons label={label} actions={actions} />
          <button type="button" className={iconButtonClass} aria-label={`${label} sil`} onClick={actions.onRemove}><Trash2 size={14} aria-hidden /></button>
        </span>
      </div>
    </li>
  );
}
