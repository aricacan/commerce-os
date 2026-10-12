'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { haptic } from '../../lib/haptics';

// Mobilde modal yerine alttan açılan panel. Sebep: telefonda başparmak ekranın üst
// yarısına zor ulaşıyor; ortada duran bir modal'ın kapatma düğmesi erişilemez oluyor.
//
// Aşağı sürükleyerek kapatma dahil — telefonda beklenen davranış bu, kapatma düğmesini
// aramak zorunda kalmamalı.

const CLOSE_DRAG_PX = 100;   // Bu kadar aşağı sürüklenirse bırakıldığında kapanır
const MAX_HEIGHT = '80vh';
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function focusableIn(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
}

// Tab/Shift+Tab odağı panelin içinde döndürür — klavyeyle arkadaki sayfaya kaçılmasın.
function trapTab(e: KeyboardEvent, root: HTMLElement) {
  const items = focusableIn(root);
  if (items.length === 0) {
    e.preventDefault();
    root.focus();
    return;
  }
  const first = items[0];
  const last = items[items.length - 1];
  const active = document.activeElement;
  if (e.shiftKey && (active === first || !root.contains(active))) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && (active === last || !root.contains(active))) {
    e.preventDefault();
    first.focus();
  }
}

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** BottomNav'ın üstünde mi dursun (mobil gezinme çubuğunu örtmesin). */
  aboveBottomNav?: boolean;
  /** Masaüstünde geniş, ortalanmış dialog; mobilde sheet davranışı korunur. */
  desktopDialog?: boolean;
}

// Kapalıyken içerik hiç render edilmez — sürükleme durumu her açılışta kendiliğinden
// sıfırlanır, "açılışta sıfırla" effect'ine gerek kalmaz.
export function BottomSheet({ open, ...rest }: BottomSheetProps) {
  if (!open) return null;
  return <SheetBody {...rest} />;
}

function SheetBody({ onClose, title, children, aboveBottomNav = false, desktopDialog = false }: Omit<BottomSheetProps, 'open'>) {
  const [dragY, setDragY] = useState(0);
  const startYRef = useRef<number | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  // onClose her render yeni fonksiyon olabilir; odak/klavye effect'i yalnız açılışta kurulsun.
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    const dialog = dialogRef.current;
    // Açılışta odak panele girer, kapanınca açan öğeye döner (klavye/ekran okuyucu kullanıcısı kaybolmasın).
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (dialog) (focusableIn(dialog)[0] ?? dialog).focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCloseRef.current();
      else if (e.key === 'Tab' && dialog) trapTab(e, dialog);
    }
    document.addEventListener('keydown', onKey);

    // Panel açıkken arkadaki sayfa kaymasın — mobilde en can sıkıcı hatalardan biri.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, []);

  function onTouchStart(e: React.TouchEvent) {
    startYRef.current = e.touches[0].clientY;
  }

  function onTouchMove(e: React.TouchEvent) {
    if (startYRef.current === null) return;
    const delta = e.touches[0].clientY - startYRef.current;
    if (delta > 0) setDragY(delta);   // Yalnızca aşağı — yukarı sürükleme paneli uzatmaz
  }

  function onTouchEnd() {
    startYRef.current = null;
    if (dragY >= CLOSE_DRAG_PX) {
      haptic.light();
      onClose();
    }
    setDragY(0);
  }

  const bottom = aboveBottomNav
    ? 'calc(60px + env(safe-area-inset-bottom) + 8px)'
    : 'env(safe-area-inset-bottom)';

  return (
    <>
      <div
        onClick={onClose}
        role="presentation"
        className="fixed inset-0 z-[100] bg-black/50 animate-[sheetFade_.15s_ease]"
      />

      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`fixed inset-x-2.5 z-[101] overflow-y-auto outline-none rounded-[20px] border border-[var(--border)] bg-[var(--card)] pb-3 shadow-[var(--shadow-xl)] animate-[sheetUp_.2s_cubic-bezier(0.16,1,0.3,1)] ${desktopDialog ? 'bottom-sheet-desktop-dialog' : ''}`}
        style={{
          bottom,
          maxHeight: MAX_HEIGHT,
          transform: dragY ? `translateY(${dragY}px)` : undefined,
          transition: dragY ? 'none' : 'transform .2s',
        }}
      >
        <style>{`
          @keyframes sheetFade { from { opacity:0 } to { opacity:1 } }
          @keyframes sheetUp { from { transform:translateY(100%) } to { transform:translateY(0) } }
          @media (min-width: 640px) {
            .bottom-sheet-desktop-dialog {
              left: 50% !important;
              right: auto !important;
              top: 50% !important;
              bottom: auto !important;
              width: min(980px, calc(100vw - 48px));
              max-height: calc(100vh - 48px) !important;
              transform: translate(-50%, -50%) !important;
              border-radius: 24px;
              overflow: hidden;
              padding-bottom: 0;
            }
            .bottom-sheet-desktop-dialog > div:first-of-type > div:first-child {
              display: none;
            }
            .bottom-sheet-desktop-dialog > div:first-of-type > div:last-child {
              padding-top: 16px;
              padding-bottom: 12px;
              border-bottom: 1px solid var(--border-soft);
            }
          }
        `}</style>

        {/* Tutamak — sürükleme alanı burası; içerik kaydırmasıyla çakışmasın diye
            jest dinleyicileri yalnızca başlık bölgesinde. */}
        <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
          <div className="flex justify-center pt-3 pb-2">
            <span className="h-1 w-9 rounded-full bg-[var(--border)]" />
          </div>

          {title && (
            <div className="flex items-center justify-between px-5 pb-3">
              <span className="text-sm font-bold text-[var(--fg)]">{title}</span>
              <button
                onClick={onClose}
                aria-label="Kapat"
                className="cursor-pointer border-none bg-transparent p-1 text-[var(--fg-muted)]"
              >
                <X size={18} />
              </button>
            </div>
          )}
        </div>

        {children}
      </div>
    </>
  );
}
