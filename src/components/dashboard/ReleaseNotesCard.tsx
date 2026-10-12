import Link from 'next/link';
import { History } from 'lucide-react';
import {
  RELEASE_NOTES,
  formatReleaseDateShort,
  releaseVersion,
} from '../../lib/release-notes';
import { DetailHint } from './DashboardCardParts';

// Kartta gösterilen en yeni günün madde sayısı; geri kalanı sayfada.
const PREVIEW_ITEM_COUNT = 3;

export const PATCHES_HREF = '/dashboard/patches';

// Dashboard'un sağ yarısı: son sürüm güncellemesinin özeti. Tıklayınca gün gün sürüm sayfası açılır.
export function ReleaseNotesCard() {
  const latest = RELEASE_NOTES[0];
  if (!latest) return null;

  return (
    <Link
      href={PATCHES_HREF}
      className="group relative flex h-full min-h-[140px] w-full flex-col gap-3 rounded-[12px] border border-[var(--border)] bg-[var(--card)] p-5 pb-8 text-left shadow-xs transition-all hover:border-[var(--border-strong)] hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--fg)] sm:p-6 sm:pb-8 lg:p-7 lg:pb-8"
    >
      <div className="flex items-center justify-between gap-2 border-b border-[var(--border-soft)] pb-3">
        <div className="flex min-w-0 items-center gap-2">
          <History size={16} strokeWidth={2} className="shrink-0 text-[var(--fg-muted)]" />
          <span className="truncate text-[12px] font-extrabold uppercase tracking-[0.08em] text-[var(--fg)] sm:text-[13px]">
            Sürüm güncellemeleri
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="rounded-md bg-[var(--fg)] px-2 py-0.5 text-[10px] font-bold tracking-wider text-[var(--bg)]">
            {releaseVersion(latest)}
          </span>
          <span className="rounded-md bg-[var(--bg-subtle)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--fg-muted)]">
            {formatReleaseDateShort(latest.date)}
          </span>
        </div>
      </div>

      <ul className="m-0 flex flex-1 list-none flex-col gap-1.5 p-0">
        {latest.items.slice(0, PREVIEW_ITEM_COUNT).map((item) => (
          <li key={item} className="line-clamp-2 text-[12.5px] leading-snug text-[var(--fg)]">
            <span aria-hidden className="mr-1.5 text-[var(--fg-muted)]">•</span>
            {item}
          </li>
        ))}
      </ul>

      <DetailHint />
    </Link>
  );
}
