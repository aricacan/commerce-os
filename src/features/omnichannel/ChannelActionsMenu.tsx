'use client';

import { useEffect, useLayoutEffect, useRef, useState, type ComponentType, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { History, MessageSquareText, MoreHorizontal, Power, Stethoscope, Trash2, Wifi } from 'lucide-react';

import { placeMenu } from './menuPlacement';

export interface ChannelMenuAction {
  key: string;
  label: string;
  Icon: ComponentType<{ size?: number }>;
  onSelect: () => void;
  disabled?: boolean;
  danger?: boolean;
}

interface ActionOptions {
  isActive: boolean;
  testing: boolean;
  importingHistory: boolean;
  onTest: () => void;
  onDiagnose: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
  // Yalnız ilgili kanal tipinde verilir (Facebook/Instagram geçmişi, WhatsApp şablonları).
  onImportHistory?: () => void;
  onOpenTemplates?: () => void;
}

// Menüdeki eylem listesi: sık kullanılandan yıkıcıya. Sil her zaman son ve kırmızı.
export function buildChannelMenuActions(o: ActionOptions): ChannelMenuAction[] {
  const actions: Array<ChannelMenuAction | false> = [
    { key: 'test', label: o.testing ? 'Test ediliyor…' : 'Bağlantıyı test et', Icon: Wifi, onSelect: o.onTest, disabled: o.testing },
    { key: 'diagnose', label: 'Teşhis Et', Icon: Stethoscope, onSelect: o.onDiagnose },
    !!o.onImportHistory && {
      key: 'history',
      label: o.importingHistory ? 'Geçmiş aktarılıyor…' : 'Geçmiş mesajları getir',
      Icon: History,
      onSelect: o.onImportHistory,
      disabled: o.importingHistory,
    },
    !!o.onOpenTemplates && { key: 'templates', label: 'WhatsApp Şablonları', Icon: MessageSquareText, onSelect: o.onOpenTemplates },
    { key: 'toggle', label: o.isActive ? 'Pasife al' : 'Aktif et', Icon: Power, onSelect: o.onToggleActive },
    { key: 'delete', label: 'Sil', Icon: Trash2, onSelect: o.onDelete, danger: true },
  ];
  return actions.filter((a): a is ChannelMenuAction => a !== false);
}

const ITEM_BASE =
  'flex w-full cursor-pointer items-center gap-2 rounded-sm px-2.5 py-2 text-left text-ui-sm font-semibold outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-50';
const ITEM_NORMAL = 'text-[var(--fg)] hover:bg-[var(--bg-subtle)] focus-visible:bg-[var(--bg-subtle)]';
const ITEM_DANGER = 'text-[var(--danger)] hover:bg-[var(--danger)]/10 focus-visible:bg-[var(--danger)]/10';
const ENABLED_ITEM_SELECTOR = 'button:not(:disabled)';

// "⋯" menüsü: ikincil kanal eylemleri. Dışarı tıklama / Esc ile kapanır, ↑↓ ile gezilir.
export function ChannelActionsMenu({ actions, channelName }: { actions: ChannelMenuAction[]; channelName: string }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Menü document.body'ye taşınır: kartın hover transform'u yığın bağlamı açıyor, çalışma
  // alanı da z-20000 tam ekran katman. Katman, design.ts'teki layers.modal ile aynı (40000).
  // Konum tetikleyiciden hesaplanır.
  useLayoutEffect(() => {
    const menu = menuRef.current;
    const trigger = triggerRef.current;
    if (!open || !menu || !trigger) return;
    const reposition = () => {
      const { top, left } = placeMenu(
        trigger.getBoundingClientRect(),
        { width: menu.offsetWidth, height: menu.offsetHeight },
        { width: window.innerWidth, height: window.innerHeight },
      );
      menu.style.top = `${top}px`;
      menu.style.left = `${left}px`;
    };
    reposition();
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    return () => {
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLButtonElement>(ENABLED_ITEM_SELECTOR)?.focus();
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  const closeAndRestoreFocus = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const onMenuKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeAndRestoreFocus();
      return;
    }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const items = [...(menuRef.current?.querySelectorAll<HTMLButtonElement>(ENABLED_ITEM_SELECTOR) ?? [])];
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    const step = e.key === 'ArrowDown' ? 1 : -1;
    items[(index + step + items.length) % items.length]?.focus();
  };

  return (
    <div ref={rootRef} className="shrink-0">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${channelName} için diğer eylemler`}
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-[var(--fg-muted)] outline-none transition-colors hover:bg-[var(--bg-subtle)] hover:text-[var(--fg)] focus-visible:ring-2 focus-visible:ring-[var(--fg)]"
      >
        <MoreHorizontal size={16} />
      </button>
      {open && createPortal(
        <div
          ref={menuRef}
          role="menu"
          onKeyDown={onMenuKeyDown}
          className="fixed left-0 top-0 z-[40000] flex w-56 flex-col gap-0.5 rounded-md border border-[var(--border-soft)] bg-[var(--card)] p-1 shadow-[var(--shadow-lg)]"
        >
          {actions.map(({ key, label, Icon, onSelect, disabled, danger }) => (
            <button
              key={key}
              type="button"
              role="menuitem"
              disabled={disabled}
              onClick={() => { setOpen(false); onSelect(); }}
              className={`${ITEM_BASE} ${danger ? ITEM_DANGER : ITEM_NORMAL}`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </div>
  );
}
