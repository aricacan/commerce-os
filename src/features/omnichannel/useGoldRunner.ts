'use client';

import { useCallback, useState } from 'react';
import { goldApi } from '../../lib/api/omnichannel-gold';
import { describeError } from '../../lib/errors';
import { useFeedback } from '../shared/Feedback';
import { GOLD_MANUAL_LABEL, type GoldRunProgress } from './goldSetRules';

// "Şimdi koştur": koşuyu başlatır, senaryoları TEK TEK koşturur (tek uzun istek vekil sunucuda kesilirdi),
// sonunda bitirir. Tek senaryonun isteği düşerse koşu sürer; sayı sonda bildirilir.
export function useGoldRunner(onFinished: () => Promise<void>) {
  const [progress, setProgress] = useState<GoldRunProgress | null>(null);
  const { notify } = useFeedback();

  const run = useCallback(async () => {
    try {
      const start = await goldApi.startRun(GOLD_MANUAL_LABEL);
      const total = start.scenarioIds.length;
      let skipped = 0;
      setProgress({ done: 0, total });

      for (const [index, scenarioId] of start.scenarioIds.entries()) {
        try {
          await goldApi.runScenario(start.runId, scenarioId);
        } catch {
          skipped += 1;
        }
        setProgress({ done: index + 1, total });
      }

      await goldApi.finishRun(start.runId);
      if (skipped > 0) notify.error(`${skipped} senaryo koşulamadı; ortalamaya girmedi.`);
      else notify.success('Senaryo koşusu tamamlandı.');
    } catch (e) {
      notify.error(describeError(e));
    } finally {
      setProgress(null);
      await onFinished();
    }
  }, [notify, onFinished]);

  return { progress, running: progress !== null, run };
}
