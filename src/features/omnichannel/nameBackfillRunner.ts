import type {
  ContactNameBackfillPageDto, ContactNameFailureGroupDto,
} from '../../lib/api/omnichannel-maintenance';
import { runCursorBackfill, type BackfillOutcome } from './cursorBackfill';

// Meta'dan isim doldurma: imleç nextAfterContactId (ortak döngü: cursorBackfill).

export const NAME_BACKFILL_PAGE_SIZE = 50;

export interface NameBackfillProgress {
  pages: number;
  processed: number;
  named: number;
  failed: number;
  profilesNamed: number;
  // Tüm sayfalarda toplanan başarısızlık nedenleri, en sık önce.
  failureReasons: ContactNameFailureGroupDto[];
  // Son sayfadan sonra hâlâ adı bilinmeyen kişi; ilk sayfa gelmeden bilinmez.
  remaining: number | null;
}

export type NameBackfillOutcome = BackfillOutcome;

export interface NameBackfillDeps {
  fetchPage: (afterContactId: number, pageSize: number) => Promise<ContactNameBackfillPageDto>;
  shouldStop: () => boolean;
  onProgress: (progress: NameBackfillProgress) => void;
}

export const EMPTY_NAME_BACKFILL_PROGRESS: NameBackfillProgress = {
  pages: 0, processed: 0, named: 0, failed: 0, profilesNamed: 0, failureReasons: [], remaining: null,
};

export function addPage(progress: NameBackfillProgress, page: ContactNameBackfillPageDto): NameBackfillProgress {
  return {
    pages: progress.pages + 1,
    processed: progress.processed + page.processed,
    named: progress.named + page.named,
    failed: progress.failed + page.failed,
    profilesNamed: progress.profilesNamed + (page.profilesNamed ?? 0),
    failureReasons: mergeReasons(progress.failureReasons, page.failureReasons ?? []),
    remaining: page.remaining,
  };
}

function mergeReasons(
  current: ContactNameFailureGroupDto[], incoming: ContactNameFailureGroupDto[],
): ContactNameFailureGroupDto[] {
  const counts = new Map(current.map((g) => [g.reason, g.count]));
  for (const g of incoming) counts.set(g.reason, (counts.get(g.reason) ?? 0) + g.count);
  return [...counts].map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count);
}

export async function runNameBackfill(deps: NameBackfillDeps): Promise<NameBackfillOutcome> {
  let progress = EMPTY_NAME_BACKFILL_PROGRESS;
  return runCursorBackfill({
    fetchPage: deps.fetchPage,
    pageSize: NAME_BACKFILL_PAGE_SIZE,
    shouldStop: deps.shouldStop,
    stepOf: (page) => ({ processed: page.processed, nextCursor: page.nextAfterContactId, remaining: page.remaining }),
    onPage: (page) => {
      progress = addPage(progress, page);
      deps.onProgress(progress);
    },
  });
}
