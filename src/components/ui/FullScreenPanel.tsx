'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * URL değiştirmeden açılan tam ekran çalışma paneli.
 *
 * Neden: manuel sipariş ve manuel ürün girişi kendi rotalarında yaşıyordu; kullanıcı
 * listeden çıkıp başka bir sayfaya gidiyor, işi bitince geri dönüyordu. Bu ekranlar
 * listenin ÜSTÜNDE açılan bir çalışma alanı olarak çok daha doğal — modül panellerinin
 * (Radar, Monitoring…) zaten kullandığı desen bu.
 *
 * Deep-link'ler KIRILMAZ: eski rotalar (/orders/manual-orders, /products/new-products)
 * olduğu gibi duruyor; bu bileşen yalnızca aynı ekranı yerinde açmanın ikinci yolu.
 */
export function FullScreenPanel({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  // Esc ile kapatma + panel açıkken arka planın kaymaması.
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex flex-col bg-[var(--bg)]"
    >
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--border-soft)] bg-[var(--card)] px-4 py-2.5">
        <h2 className="m-0 text-ui-md font-extrabold tracking-tight text-[var(--fg)]">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Kapat"
          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-[5px] border border-[var(--border-soft)] bg-[var(--card)] text-[var(--fg-muted)] transition hover:text-[var(--fg)]"
        >
          <X size={14} />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
