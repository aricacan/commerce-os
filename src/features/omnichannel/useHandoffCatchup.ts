'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { handoffCatchupApi, type CatchupPreviewDto, type CatchupResultDto } from '../../lib/api/handoff-catchup';
import { describeError, httpStatusOf } from '../../lib/errors';
import { useFeedback } from '../shared/Feedback';
import {
  idsToRun, summarizeResults, toggleAll, toggleSelection, type CatchupSummary,
} from './handoffCatchupRules';

const NOT_FOUND = 404;
const UNAVAILABLE_MESSAGE = 'Bu özellik bu sürümde yok. Sunucu güncellenince açılır.';

// Panelin durumu: aday listesi, seçim, çalıştırma ve sonuç özeti. Çalıştırma sonrası liste tazelenir.
export function useHandoffCatchup() {
  const [preview, setPreview] = useState<CatchupPreviewDto | null>(null);
  const [loadedAt, setLoadedAt] = useState(() => Date.now());
  const [selected, setSelected] = useState<ReadonlySet<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<CatchupSummary | null>(null);
  const { notify, confirm } = useFeedback();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await handoffCatchupApi.preview();
      setPreview(data);
      setLoadedAt(Date.now());
      setSelected(new Set(data.eligible.map((c) => c.conversationId)));
    } catch (e) {
      setError(httpStatusOf(e) === NOT_FOUND ? UNAVAILABLE_MESSAGE : describeError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const orderedIds = useMemo(() => (preview?.eligible ?? []).map((c) => c.conversationId), [preview]);

  const run = useCallback(async () => {
    const ids = idsToRun(selected, orderedIds);
    if (ids.length === 0) return;
    const accepted = await confirm({
      title: `${ids.length} müşteriye mesaj gidecek`,
      body: 'Bot devri kapatır ve müşteriye özür mesajı + cevap yazar. Bu işlem geri alınamaz.',
      confirmLabel: 'Çalıştır',
      danger: true,
    });
    if (!accepted) return;
    setRunning(true);
    try {
      const results: CatchupResultDto[] = [];
      for (const id of ids) {
        try {
          results.push(...(await handoffCatchupApi.runOne(id)).results);
        } catch (e) {
          if (httpStatusOf(e) === NOT_FOUND) { notify.error(UNAVAILABLE_MESSAGE); return; }
          results.push({ conversationId: id, outcome: 'failed', detail: describeError(e) });
        }
      }
      setSummary(summarizeResults(results));
      await load();
    } finally {
      setRunning(false);
    }
  }, [selected, orderedIds, confirm, load, notify]);

  return {
    preview, loadedAt, selected, loading, running, error, summary,
    toggleOne: (id: number) => setSelected((current) => toggleSelection(current, id)),
    toggleEvery: () => setSelected((current) => toggleAll(current, orderedIds)),
    reload: load,
    run,
  };
}
