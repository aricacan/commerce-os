'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';

/**
 * "Detay" penceresi — bir panelin ana ekrandaki kutusuna sığmayan hâli.
 *
 * NEDEN VAR: SellingView tek ekranlık bir terminal. Uzun bir tablo ya da liste
 * ana ekranı aşağı doğru uzatırsa terminal olmaktan çıkar; kutunun içine
 * sıkıştırıp minik bir kaydırma çubuğu vermek ise okumayı imkânsız kılar.
 * Üçüncü yol: ana ekranda ilk satırlar görünür, "Detay" tam ekranı açar.
 *
 * Kaydırma YALNIZCA burada var ve tek katman — ana ekranda hiçbir kutunun
 * kendi kaydırması yok.
 */
export function DetailOverlay({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    return () => { document.body.style.overflow = previousOverflow; };
  }, []);

  return createPortal(
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      tabIndex={-1}
      onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); onClose(); } }}
      className="fixed inset-0 z-[40000] flex flex-col bg-bg"
    >
      <div className="flex shrink-0 items-baseline gap-3 border-b border-border-soft bg-card px-5 py-3">
        <span className="text-ui-md font-extrabold tracking-tight text-fg">{title}</span>
        {subtitle && <span className="text-ui-xs text-fg-muted">{subtitle}</span>}
        <button
          type="button"
          onClick={onClose}
          aria-label="Kapat"
          className="ml-auto flex h-8 w-8 cursor-pointer items-center justify-center self-center rounded-[6px] border border-border-soft text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg"
        >
          <X size={15} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>,
    document.body,
  );
}

/** Panel başlıklarındaki tekdüze "Detay" düğmesi. */
export function DetailButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 cursor-pointer rounded-[4px] border border-border-soft px-1.5 py-0.5 text-ui-2xs font-semibold text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg"
    >
      Detay
    </button>
  );
}
