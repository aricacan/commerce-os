'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  handoffApi, HANDOFF_BULK_ACTION, type HandoffOutcome, type HandoffQueueFilter, type HandoffQueuePage,
} from '../../lib/api/handoff';
import { describeError } from '../../lib/errors';
import { useFeedback } from '../shared/Feedback';
import { FIRST_INBOX_PAGE, INBOX_PAGE_SIZES } from './inboxPagination';
import { useHandoffLive } from './useHandoffLive';

const EMPTY_PAGE: HandoffQueuePage = { items: [], total: 0 };

// Devirler v2 (FAZ 7): sayfalı/filtreli kuyruk, seçim, tekil ve toplu işlemler. Kuyruk canlı olaylarla tazelenir.
export function useHandoffQueue() {
  const [filter, setFilterState] = useState<HandoffQueueFilter>({});
  const [page, setPage] = useState<number>(FIRST_INBOX_PAGE);
  const [pageSize, setPageSize] = useState<number>(INBOX_PAGE_SIZES[0]);
  const [data, setData] = useState<HandoffQueuePage>(EMPTY_PAGE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ReadonlySet<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const { notify } = useFeedback();

  const load = useCallback(async () => {
    setError(null);
    try {
      setData(await handoffApi.page(filter, (page - FIRST_INBOX_PAGE) * pageSize, pageSize));
    } catch (e) {
      setError(describeError(e));
    } finally {
      setLoading(false);
    }
  }, [filter, page, pageSize]);

  useEffect(() => { void load(); }, [load]);
  useHandoffLive(() => { void load(); });

  const setFilter = (next: HandoffQueueFilter) => {
    setFilterState(next);
    setPage(FIRST_INBOX_PAGE);
    setSelected(new Set());
  };

  const changePageSize = (size: number) => {
    setPageSize(size);
    setPage(FIRST_INBOX_PAGE);
  };

  const toggleSelected = (ticketId: number) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(ticketId)) next.delete(ticketId); else next.add(ticketId);
    return next;
  });

  const run = async (action: () => Promise<string | null>) => {
    setBusy(true);
    try {
      const message = await action();
      if (message) notify.success(message);
      setSelected(new Set());
      await load();
      return true;
    } catch (e) {
      notify.error(describeError(e));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const takeOver = (ticketId: number) => run(async () => {
    await handoffApi.takeOver(ticketId);
    return 'Devir size atandı.';
  });

  // Tek kayıt da toplu uçtan geçer: sonuç ve hatalı kayıtlar aynı biçimde bildirilir.
  const resolve = (ticketIds: number[], outcome: HandoffOutcome, note: string) => run(async () => {
    const result = await handoffApi.bulk({ ticketIds, action: HANDOFF_BULK_ACTION.Resolve, outcome, note: note.trim() || undefined });
    return bulkMessage(result.succeeded, result.failedTicketIds.length, 'kapatıldı');
  });

  const assign = (ticketIds: number[], assigneeUserId: number | null) => run(async () => {
    const result = await handoffApi.bulk({ ticketIds, action: HANDOFF_BULK_ACTION.Assign, assigneeUserId });
    return bulkMessage(result.succeeded, result.failedTicketIds.length, assigneeUserId === null ? 'kuyruğa alındı' : 'atandı');
  });

  return {
    filter, setFilter, page, setPage, pageSize, setPageSize: changePageSize, data, loading, error, reload: load,
    selected, toggleSelected, clearSelection: () => setSelected(new Set()), busy, takeOver, resolve, assign,
  };
}

function bulkMessage(succeeded: number, failed: number, verb: string): string {
  const done = succeeded === 1 ? `Devir ${verb}.` : `${succeeded} devir ${verb}.`;
  return failed === 0 ? done : `${done} ${failed} devir yetki ya da durum nedeniyle atlandı.`;
}

export type HandoffQueueState = ReturnType<typeof useHandoffQueue>;
