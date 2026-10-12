import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  FIRST_INBOX_PAGE, INBOX_PAGE_SIZES, hasNextInboxPage, inboxPageItems, inboxTotalPages, PAGE_GAP,
} from './inboxPagination';

interface Props {
  page: number;
  pageSize: number;
  loadedCount: number;
  // Seçili durum hapının sayacı; gelmediyse sayfa numaraları yerine "Sayfa N" yazılır, "Sonraki" dolu sayfaya göre açılır.
  total: number | undefined;
  loading: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

const STEP_CLASS =
  'inline-flex h-8 items-center gap-1 rounded-full border border-border-soft px-2.5 text-ui-xs font-semibold text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg disabled:pointer-events-none disabled:opacity-40';
const PAGE_CLASS =
  'inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-ui-xs font-semibold tabular-nums transition-colors disabled:pointer-events-none';

// Listenin en sonunda (sabit değil): kullanıcı aşağı kaydırınca görünür. Sayfa boyutu seçilebilir (25/50/100);
// listede en küçük boyuttan az konuşma varsa ve tek sayfaysa gizlenir.
export function ConversationListPager({
  page, pageSize, loadedCount, total, loading, onPageChange, onPageSizeChange,
}: Props) {
  const hasPrevious = page > FIRST_INBOX_PAGE;
  const hasNext = hasNextInboxPage(page, loadedCount, total, pageSize);
  const known = total ?? loadedCount;
  if (!hasPrevious && !hasNext && known <= INBOX_PAGE_SIZES[0]) return null;

  const pages = inboxTotalPages(total, pageSize);

  return (
    <nav aria-label="Konuşma sayfaları" className="flex flex-wrap items-center justify-between gap-2 border-t border-border-soft px-4 py-3">
      <div className="flex min-w-0 flex-wrap items-center gap-1">
        <button type="button" aria-label="Önceki sayfa" disabled={!hasPrevious || loading} onClick={() => onPageChange(page - 1)} className={STEP_CLASS}>
          <ChevronLeft size={13} aria-hidden />
        </button>
        {pages === null ? (
          <span aria-live="polite" className="px-2 text-ui-xs font-semibold tabular-nums text-fg-muted">Sayfa {page}</span>
        ) : (
          <PageNumbers page={page} pages={pages} loading={loading} onPageChange={onPageChange} />
        )}
        <button type="button" aria-label="Sonraki sayfa" disabled={!hasNext || loading} onClick={() => onPageChange(page + 1)} className={STEP_CLASS}>
          <ChevronRight size={13} aria-hidden />
        </button>
      </div>
      <label className="flex items-center gap-1.5 text-ui-xs text-fg-muted">
        Sayfada
        <select
          value={pageSize}
          disabled={loading}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="h-8 rounded-full border border-border-soft bg-card px-2 text-ui-xs font-semibold tabular-nums text-fg"
        >
          {INBOX_PAGE_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
        </select>
      </label>
    </nav>
  );
}

function PageNumbers({ page, pages, loading, onPageChange }: {
  page: number; pages: number; loading: boolean; onPageChange: (page: number) => void;
}) {
  return (
    <ol className="m-0 flex list-none items-center gap-0.5 p-0">
      {inboxPageItems(page, pages).map((item, index) => (
        item === PAGE_GAP ? (
          // Boşluk iki sayfa arasında en fazla bir kez geçer; konumu anahtar olarak yeter.
          <li key={`gap-${index}`} aria-hidden className="px-1 text-ui-xs text-fg-muted">…</li>
        ) : (
          <li key={item}>
            <button
              type="button"
              aria-current={item === page ? 'page' : undefined}
              aria-label={`Sayfa ${item}`}
              disabled={loading || item === page}
              onClick={() => onPageChange(item)}
              className={`${PAGE_CLASS} ${item === page ? 'bg-fg text-bg' : 'text-fg-muted hover:bg-bg-subtle hover:text-fg'}`}
            >
              {item}
            </button>
          </li>
        )
      ))}
    </ol>
  );
}
