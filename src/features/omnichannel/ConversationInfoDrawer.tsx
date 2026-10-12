'use client';

import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { focusRing, motionFast } from '../shared/design';

const TITLE = 'Konuşma ayrıntıları';

interface Props {
  id: string;
  open: boolean;
  onClose: () => void;
  isMobile: boolean;
  children: ReactNode;
}

// "Ayrıntılar" paneli. Telefonda alttan açılan sayfa; masaüstünde mesajların üstüne sağdan kayan
// çekmece — yazma alanını örtmez, temsilci devir notunu okurken yazmaya devam edebilir.
export function ConversationInfoDrawer({ id, open, onClose, isMobile, children }: Props) {
  if (isMobile) {
    return (
      <BottomSheet open={open} onClose={onClose} title={TITLE}>
        <div id={id} className="flex flex-col gap-3 px-3 pb-2">{children}</div>
      </BottomSheet>
    );
  }
  return <DesktopDrawer id={id} open={open} onClose={onClose}>{children}</DesktopDrawer>;
}

// Kapalıyken de kurulu kalır (görünmez + inert): açılış/kapanış 200 ms kayarak olur.
function DesktopDrawer({ id, open, onClose, children }: Omit<Props, 'isMobile'>) {
  const closeRef = useRef<HTMLButtonElement>(null);

  // Açılınca odak çekmeceye girer; klavye kullanıcısı nerede olduğunu kaybetmesin.
  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);

  const handleKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key !== 'Escape') return;
    e.stopPropagation();
    onClose();
  };

  return (
    <aside
      id={id}
      aria-label={TITLE}
      inert={!open}
      onKeyDown={handleKeyDown}
      className={`absolute inset-y-0 right-0 z-10 flex w-[min(380px,100%)] flex-col border-l border-border bg-bg shadow-[var(--shadow-lg)] transition-[transform,opacity,visibility] duration-200 ease-out motion-reduce:transition-none ${
        open ? 'visible translate-x-0 opacity-100' : 'pointer-events-none invisible translate-x-6 opacity-0'
      }`}
    >
      <header className="flex shrink-0 items-center gap-2 border-b border-border-soft bg-card px-4 py-2">
        <h2 className="m-0 min-w-0 flex-1 truncate text-ui-sm font-bold text-fg">{TITLE}</h2>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Ayrıntıları kapat"
          title="Kapat (Esc)"
          className={`flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border-0 bg-transparent text-fg-muted hover:bg-bg-subtle hover:text-fg ${motionFast} ${focusRing}`}
        >
          <X size={16} aria-hidden />
        </button>
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">{children}</div>
    </aside>
  );
}
