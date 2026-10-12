'use client';

import { formatDate, formatDateTime } from '@/lib/format';
import { useState, type ReactNode } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { CustomerProfileDto, TagColor } from '../../lib/api/customers';

// Müşteri paneli bölümlerinin ortak parçaları — tek tip başlık, buton ve girdi görünümü.

// Profil verisini okuyan bölümlerin ortak sözleşmesi: değişiklikten sonra onChanged profili yeniden yükler.
export interface CustomerSectionProps {
  profile: CustomerProfileDto;
  readOnly: boolean;
  onChanged: () => Promise<void>;
}

export const inputClass =
  'h-7 w-full min-w-0 rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2 text-xs text-[var(--fg)] outline-none focus:border-[var(--fg)]';

export const ghostButtonClass =
  'inline-flex h-7 shrink-0 items-center gap-1 rounded-[4px] border border-[var(--border)] px-2 text-[11px] text-[var(--fg)] hover:bg-[var(--bg-subtle)] disabled:opacity-40';

export const primaryButtonClass =
  'inline-flex h-7 shrink-0 items-center gap-1 rounded-[4px] bg-[var(--fg)] px-2.5 text-[11px] font-bold text-[var(--bg)] hover:opacity-90 disabled:opacity-40';

export const iconButtonClass =
  'flex h-6 w-6 shrink-0 items-center justify-center rounded-[3px] text-[var(--fg-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--fg)] disabled:opacity-40';

// Etiket renkleri tema değişkenleri yerine sabit Tailwind tonları: iki temada da okunur
// kalan yarı saydam zemin + aynı renkte yazı.
const TAG_CLASSES: Record<TagColor, string> = {
  neutral: 'bg-[var(--bg-subtle)] text-[var(--fg)]',
  blue: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  green: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  amber: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  rose: 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
  violet: 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
};

export function tagClass(color: string): string {
  return TAG_CLASSES[color as TagColor] ?? TAG_CLASSES.neutral;
}

// Durum rozeti: etiket paletinin tonları (iki temada da okunur).
export function ToneBadge({ tone, children }: { tone: TagColor; children: ReactNode }) {
  return (
    <span className={`shrink-0 rounded-[3px] px-1.5 py-px text-[10px] font-semibold ${TAG_CLASSES[tone]}`}>{children}</span>
  );
}

const PANEL_DATE: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' };
const PANEL_DATE_TIME: Intl.DateTimeFormatOptions = { ...PANEL_DATE, hour: '2-digit', minute: '2-digit' };

export function formatPanelDate(iso: string | null, withTime = false): string {
  if (!iso) return '—';
  return withTime ? formatDateTime(iso, 'tr', PANEL_DATE_TIME) : formatDate(iso, 'tr', PANEL_DATE);
}

interface SectionProps {
  title: string;
  count?: number;
  action?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}

// Katlanabilir bölüm. Panel dar olduğu için az kullanılanlar (sipariş, geçmiş, KVKK)
// kapalı başlar; başlık satırı hep görünür.
export function PanelSection({ title, count, action, defaultOpen = true, children }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const Chevron = open ? ChevronDown : ChevronRight;

  return (
    <section className="flex flex-col gap-2 border-b border-[var(--border-soft)] px-4 py-3">
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => setOpen((o) => !o)}
          className="flex flex-1 items-center gap-1 text-left text-[11px] font-bold uppercase tracking-wide text-[var(--fg-muted)] hover:text-[var(--fg)]">
          <Chevron size={13} />
          {title}
          {count !== undefined && count > 0 && <span className="font-mono normal-case">({count})</span>}
        </button>
        {open && action}
      </div>
      {open && children}
    </section>
  );
}

export function EmptyLine({ children }: { children: ReactNode }) {
  return <p className="text-[11px] text-[var(--fg-muted)]">{children}</p>;
}
