'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { icon } from '../shared/design';

// Sağ çekmece — kalem ve stok kartı detayının ortak kabuğu.
//
// İki ekran da aynı davranışı istiyor (Esc ile kapanma, arka plana tıklayınca kapanma,
// mobilde tam ekran). Ayrı yazılsaydı biri klavye erişimini kazanırken diğeri geride
// kalırdı.
interface Props {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}

export function ErpisDrawer({ title, subtitle, onClose, children }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[20100] flex justify-end">
      <button
        type="button"
        aria-label="Kapat"
        onClick={onClose}
        className="absolute inset-0 bg-black/25"
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative flex h-full w-full max-w-[520px] flex-col border-l border-[var(--border-soft)] bg-[var(--card)] shadow-2xl"
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--border-soft)] px-4 py-3">
          <div className="flex min-w-0 flex-col">
            <h2 className="truncate text-[14px] font-extrabold text-[var(--fg)]">{title}</h2>
            {subtitle && (
              <p className="truncate text-[11.5px] text-[var(--fg-muted)]">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Çekmeceyi kapat"
            className="rounded-[4px] p-1 text-[var(--fg-muted)] hover:bg-[var(--bg-subtle)]"
          >
            <X size={icon.lg} strokeWidth={icon.stroke} />
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
          {children}
        </div>
      </aside>
    </div>
  );
}

// Etiket–değer satırı. Boş değerler "—" gösterir: alanın var olduğunu ama dolmadığını
// bilmek, alanın hiç görünmemesinden daha faydalı.
export function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-[var(--border-soft)] py-1.5 last:border-0">
      <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.02em] text-[var(--fg-muted)]">
        {label}
      </span>
      <span className="min-w-0 break-words text-right text-[12.5px] font-semibold text-[var(--fg)]">
        {value === null || value === undefined || value === '' ? '—' : value}
      </span>
    </div>
  );
}

export function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col">
      <h3 className="mb-1 text-[11px] font-extrabold uppercase tracking-[0.04em] text-[var(--fg-muted)]">
        {title}
      </h3>
      {children}
    </section>
  );
}
