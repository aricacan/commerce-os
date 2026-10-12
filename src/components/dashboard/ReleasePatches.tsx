import Link from 'next/link';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  RELEASE_NOTES,
  formatReleaseDateNumeric,
  paginateReleaseNotes,
  releaseVersion,
} from '../../lib/release-notes';

const DASHBOARD_HREF = '/dashboard';
const PATCHES_HREF = '/dashboard/patches';

// /dashboard/patches — gün gün sürüm güncellemeleri. Yalnız kayıtlı günler listelenir;
// güncelleme yapılmayan günler atlanır (03/10 → 06/10 gibi). Sayfalama adres çubuğundan (?page=2).
export function ReleasePatches({ requestedPage }: { requestedPage: number }) {
  const { days, page, totalPages } = paginateReleaseNotes(requestedPage);
  const latest = RELEASE_NOTES[0];

  return (
    <div className="flex h-full flex-col overflow-y-auto p-4 sm:p-6 lg:p-8">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-col gap-1">
            <Link
              href={DASHBOARD_HREF}
              className="inline-flex w-fit items-center gap-1 text-[12px] font-semibold text-[var(--fg-muted)] transition-colors hover:text-[var(--fg)]"
            >
              <ArrowLeft size={13} />
              Panoya dön
            </Link>
            <h1 className="m-0 text-[20px] font-extrabold tracking-[-0.4px] text-[var(--fg)] sm:text-[24px]">
              Sürüm güncellemeleri
            </h1>
          </div>

          {latest && (
            <span className="w-fit rounded-md bg-[var(--fg)] px-2.5 py-1 text-[12px] font-bold tracking-wider text-[var(--bg)]">
              Güncel sürüm {releaseVersion(latest)}
            </span>
          )}
        </header>

        <ol className="m-0 flex list-none flex-col gap-4 p-0">
          {days.map((day) => (
            <li
              key={day.date}
              className="flex flex-col gap-3 rounded-[10px] border border-[var(--border)] bg-[var(--card)] p-4 shadow-xs sm:p-5"
            >
              <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border-soft)] pb-2.5">
                <span className="rounded-md bg-[var(--fg)] px-2 py-0.5 text-[11px] font-bold tracking-wider text-[var(--bg)]">
                  {releaseVersion(day)}
                </span>
                <h2 className="m-0 text-[14px] font-extrabold tabular-nums text-[var(--fg)]">
                  {formatReleaseDateNumeric(day.date)}
                </h2>
              </div>

              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {day.items.map((item) => (
                  <li key={item} className="text-[13px] leading-relaxed text-[var(--fg)]">
                    <span aria-hidden className="mr-2 text-[var(--fg-muted)]">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>

        {totalPages > 1 && <Pagination page={page} totalPages={totalPages} />}
      </div>
    </div>
  );
}

function pageHref(page: number): string {
  return page <= 1 ? PATCHES_HREF : `${PATCHES_HREF}?page=${page}`;
}

function Pagination({ page, totalPages }: { page: number; totalPages: number }) {
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);

  return (
    <nav aria-label="Sayfalama" className="flex flex-wrap items-center justify-center gap-1.5 pb-2">
      <PageLink href={pageHref(page - 1)} disabled={page <= 1} label="Önceki">
        <ChevronLeft size={14} />
        <span className="hidden sm:inline">Önceki</span>
      </PageLink>

      {pages.map((number) => (
        <PageLink key={number} href={pageHref(number)} active={number === page} label={`Sayfa ${number}`}>
          {number}
        </PageLink>
      ))}

      <PageLink href={pageHref(page + 1)} disabled={page >= totalPages} label="Sonraki">
        <span className="hidden sm:inline">Sonraki</span>
        <ChevronRight size={14} />
      </PageLink>
    </nav>
  );
}

const PAGE_LINK_BASE = 'inline-flex h-8 min-w-8 items-center justify-center gap-1 rounded-[6px] border px-2.5 text-[12px] font-semibold tabular-nums transition-colors';

function PageLink({ href, label, active = false, disabled = false, children }: {
  href: string;
  label: string;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span aria-disabled className={`${PAGE_LINK_BASE} cursor-not-allowed border-[var(--border-soft)] text-[var(--fg-muted)] opacity-50`}>
        {children}
      </span>
    );
  }

  const tone = active
    ? 'border-[var(--fg)] bg-[var(--fg)] text-[var(--bg)]'
    : 'border-[var(--border)] bg-[var(--card)] text-[var(--fg)] hover:border-[var(--border-strong)]';

  return (
    <Link href={href} aria-label={label} aria-current={active ? 'page' : undefined} className={`${PAGE_LINK_BASE} ${tone}`}>
      {children}
    </Link>
  );
}
