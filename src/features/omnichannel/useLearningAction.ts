'use client';

import { useCallback, useState } from 'react';
import { useFeedback } from '../shared/Feedback';
import { describeError } from '../../lib/errors';

// Öğrenme önerisi üzerinde tek işlem: çalıştır → bildir → listeyi yenile. Aynı anda ikinci
// tıklama engellenir (busy) — çift onay iki SSS kaydı açmasın.
export function useLearningAction(onChanged: () => void) {
  const [busy, setBusy] = useState(false);
  const { notify } = useFeedback();

  const run = useCallback(async (action: () => Promise<unknown>, successMessage: string) => {
    setBusy(true);
    try {
      await action();
      notify.success(successMessage);
      onChanged();
    } catch (e) {
      notify.error(describeError(e));
    } finally {
      setBusy(false);
    }
  }, [notify, onChanged]);

  return { busy, run };
}
