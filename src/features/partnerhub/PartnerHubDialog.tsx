'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

// PartnerHub pencerelerinin ortak, erişilebilir kabuğu:
//   • role="dialog" + aria-modal + başlığa bağlı aria-labelledby (ekran okuyucu "pencere" der)
//   • Escape kapatır (dismissible=false iken — ör. secret tek seferlik gösterilirken — kapatmaz)
//   • açılınca ilk odaklanabilir öğeye odak, Tab/Shift+Tab pencere içinde döner,
//     kapanınca odak pencereyi açan öğeye geri döner
// Önceki pencereler yalnızca fareyle kapanıyordu ve klavye odağı arkadaki sayfada kalıyordu.

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

type DialogTone = 'default' | 'warning' | 'danger';

const TONE_BORDER: Record<DialogTone, string> = {
  default: 'border-border-soft',
  warning: 'border-warning',
  danger: 'border-danger',
};

interface PartnerHubDialogProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  icon?: ReactNode;
  tone?: DialogTone;
  /** false: Escape ve arka plan tıklaması kapatmaz (kullanıcı bilinçli düğmeye basmalı). */
  dismissible?: boolean;
}

export function PartnerHubDialog({
  title, onClose, children, icon, tone = 'default', dismissible = true,
}: PartnerHubDialogProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  // Odak yönetimi: açılışta içeri al, kapanışta açan öğeye geri ver. Çocuklardan biri
  // (ör. autoFocus'lu input) odağı zaten aldıysa ona dokunulmaz.
  const openerRef = useRef<HTMLElement | null>(
    typeof document !== 'undefined' && document.activeElement instanceof HTMLElement ? document.activeElement : null,
  );
  useEffect(() => {
    const panel = panelRef.current;
    if (panel && !panel.contains(document.activeElement)) {
      (panel.querySelector<HTMLElement>(FOCUSABLE_SELECTOR) ?? panel).focus();
    }
    const opener = openerRef.current;
    return () => opener?.focus();
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && dismissible) {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key === 'Tab') trapTab(event, panelRef.current);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [dismissible, onClose]);

  if (typeof document === 'undefined') return null;

  // z-[40000] = layers.modal (features/shared/design.ts): modül tam ekran katmanı (20000) üstünde
  // kalmalı; z-50 iken pencere arkada açılıyor ve tıklanamıyordu.
  return createPortal(
    <div
      className="fixed inset-0 z-[40000] flex items-center justify-center bg-black/30 p-4 backdrop-blur-xs"
      onMouseDown={() => { if (dismissible) onClose(); }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onMouseDown={(event) => event.stopPropagation()}
        className={`flex max-h-full w-full max-w-md flex-col gap-4 overflow-y-auto rounded-[4px] border bg-card p-5 shadow-xl focus:outline-none ${TONE_BORDER[tone]}`}
      >
        <div className="flex items-center justify-between gap-2 border-b border-border-soft pb-2.5">
          <div className="flex min-w-0 items-center gap-2">
            {icon}
            <h2 id={titleId} className="truncate text-sm font-bold text-fg">{title}</h2>
          </div>
          {dismissible && (
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-[3px] p-1 text-fg-subtle transition-colors hover:bg-card-hover hover:text-fg"
              aria-label="Kapat"
            >
              <X size={13} />
            </button>
          )}
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

function trapTab(event: KeyboardEvent, panel: HTMLElement | null) {
  if (!panel) return;
  const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
  if (focusable.length === 0) {
    event.preventDefault();
    return;
  }
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = document.activeElement;

  if (event.shiftKey && (active === first || active === panel)) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
}
