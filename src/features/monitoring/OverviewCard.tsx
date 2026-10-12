'use client';

import type { KeyboardEvent, ReactNode } from 'react';
import { ArrowUpRight, type LucideIcon } from 'lucide-react';
import { Skeleton } from '../../components/ui/Skeleton';

interface Props {
  title: string;
  Icon: LucideIcon;
  /** Kartın ana sayısı ("3", "12 hata"). Liste kartında verilmez. */
  value?: ReactNode;
  /** Değer kötü bir durumu anlatıyorsa kırmızı yazılır. */
  alert?: boolean;
  isLoading: boolean;
  isError: boolean;
  onOpen: () => void;
  children?: ReactNode;
}

// Genel Bakış kartı: başlık, tek büyük sayı, altında kısa ayrıntı. Kartın tamamı ilgili
// sekmeye götürür. <button> yerine role="button": içerikte liste (<ul>) olabiliyor, düğme
// yalnız satır içi içerik alır.
export function OverviewCard({ title, Icon, value, alert = false, isLoading, isError, onOpen, children }: Props) {
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    onOpen();
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={onKeyDown}
      className="group flex min-w-0 cursor-pointer flex-col gap-2 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-4 transition-colors hover:border-[var(--border)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--fg-muted)]"
    >
      <div className="flex items-center gap-2 text-[var(--fg-muted)]">
        <Icon size={14} />
        <span className="flex-1 truncate text-ui-2xs font-bold uppercase tracking-wider">{title}</span>
        <ArrowUpRight size={13} className="opacity-0 transition-opacity group-hover:opacity-100" />
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          <Skeleton height={28} width={80} />
          <Skeleton height={12} width="70%" />
        </div>
      ) : isError ? (
        <p className="text-xs text-[var(--danger)]">Veri yüklenemedi.</p>
      ) : (
        <>
          {value !== undefined ? (
            <div className={`text-ui-2xl font-bold tracking-tight ${alert ? 'text-[var(--danger)]' : 'text-[var(--fg)]'}`}>
              {value}
            </div>
          ) : null}
          {children}
        </>
      )}
    </div>
  );
}
