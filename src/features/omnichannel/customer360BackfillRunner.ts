import type { Customer360BackfillPageDto } from '../../lib/api/omnichannel-maintenance';
import { runCursorBackfill, type BackfillOutcome } from './cursorBackfill';

// Customer 360 geçmiş veri doldurma: imleç nextAfterConversationId (ortak döngü: cursorBackfill).
// Sunucu işlemi idempotent: yarıda durdurulup baştan başlatılırsa kopya üretmez.

export const CUSTOMER_BACKFILL_PAGE_SIZE = 100;

export interface Customer360BackfillProgress {
  pages: number;
  processed: number;
  messages: number;
  merged: number;
  orders: number;
  events: number;
  // Son sayfadan sonra işlenmemiş konuşma; ilk sayfa gelmeden bilinmez.
  remaining: number | null;
}

export interface Customer360BackfillDeps {
  fetchPage: (afterConversationId: number, pageSize: number) => Promise<Customer360BackfillPageDto>;
  shouldStop: () => boolean;
  onProgress: (progress: Customer360BackfillProgress) => void;
}

export const EMPTY_CUSTOMER_BACKFILL_PROGRESS: Customer360BackfillProgress = {
  pages: 0, processed: 0, messages: 0, merged: 0, orders: 0, events: 0, remaining: null,
};

export function addCustomerPage(
  progress: Customer360BackfillProgress, page: Customer360BackfillPageDto,
): Customer360BackfillProgress {
  return {
    pages: progress.pages + 1,
    processed: progress.processed + page.conversationsProcessed,
    messages: progress.messages + page.messagesScanned,
    merged: progress.merged + page.profilesMerged,
    orders: progress.orders + page.ordersRecorded,
    events: progress.events + page.eventsAdded,
    remaining: page.remaining,
  };
}

export async function runCustomer360Backfill(deps: Customer360BackfillDeps): Promise<BackfillOutcome> {
  let progress = EMPTY_CUSTOMER_BACKFILL_PROGRESS;
  return runCursorBackfill({
    fetchPage: deps.fetchPage,
    pageSize: CUSTOMER_BACKFILL_PAGE_SIZE,
    shouldStop: deps.shouldStop,
    stepOf: (page) => ({
      processed: page.conversationsProcessed, nextCursor: page.nextAfterConversationId, remaining: page.remaining,
    }),
    onPage: (page) => {
      progress = addCustomerPage(progress, page);
      deps.onProgress(progress);
    },
  });
}
