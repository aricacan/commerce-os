'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  omnichannelApi, HISTORY_IMPORT_JOB_STATE, type HistoryImportResultDto,
} from '../../lib/api/omnichannel';
import { describeError } from '../../lib/errors';
import { historyImportProgressText } from './historyImportSummary';

const POLL_INTERVAL_MS = 3_000;

export type ImportState =
  | { kind: 'idle' }
  | { kind: 'running'; progress: string | null }
  | { kind: 'done'; result: HistoryImportResultDto }
  | { kind: 'failed'; message: string };

// Facebook/Instagram kanalında sayfadaki eski yazışmaları (son 1 yıl) gelen kutusuna çeker.
// Webhook yalnız bağlandıktan SONRAKİ mesajları getirir; bu iş öncesini tamamlar.
// İş arka planda koşar; aynı mesaj iki kez yazılmaz, tekrar başlatmak güvenlidir.
export function useHistoryImport(channelId: number) {
  const [state, setState] = useState<ImportState>({ kind: 'idle' });
  const timer = useRef<number | null>(null);
  // poll kendini yeniden planlar; kendi tanımına doğrudan değil ref üzerinden erişir (React Compiler kuralı).
  const pollRef = useRef<(jobId: string) => void>(() => undefined);

  useEffect(() => () => { if (timer.current !== null) window.clearTimeout(timer.current); }, []);

  const poll = useCallback((jobId: string) => {
    timer.current = window.setTimeout(async () => {
      try {
        const status = await omnichannelApi.getImportHistoryStatus(channelId, jobId);
        if (status.state === HISTORY_IMPORT_JOB_STATE.Running) {
          setState({ kind: 'running', progress: historyImportProgressText(status.progress) });
          pollRef.current(jobId);
          return;
        }
        if (status.state === HISTORY_IMPORT_JOB_STATE.Completed && status.result) {
          setState({ kind: 'done', result: status.result });
          return;
        }
        setState({ kind: 'failed', message: status.errorMessage ?? 'İçe aktarma durumu alınamadı.' });
      } catch (e) {
        setState({ kind: 'failed', message: describeError(e) });
      }
    }, POLL_INTERVAL_MS);
  }, [channelId]);

  useEffect(() => { pollRef.current = poll; }, [poll]);

  const start = useCallback(async () => {
    setState({ kind: 'running', progress: null });
    try {
      const { jobId } = await omnichannelApi.startImportHistory(channelId);
      poll(jobId);
    } catch (e) {
      setState({ kind: 'failed', message: describeError(e) });
    }
  }, [channelId, poll]);

  return { state, start };
}
