'use client';

import { useCallback, useState } from 'react';
import { describeError } from '../../lib/errors';

const CONFLICT_PREFIX = '409:';

// Sipariş kartındaki işlemlerin ortak koşucusu: meşgul bayrağı, sunucunun Türkçe `detail`
// hatası ve başarıda tazeleme. Çakışmada (409: sipariş arada değişti) da tazelenir ki temsilci
// güncel hâli görüp tekrar denesin. İşlem başarılıysa true döner.
export function useChatOrderAction(onDone: () => Promise<void>) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (action: () => Promise<unknown>): Promise<boolean> => {
    setBusy(true);
    setError(null);
    try {
      await action();
      await onDone();
      return true;
    } catch (e) {
      setError(describeError(e));
      if (e instanceof Error && e.message.startsWith(CONFLICT_PREFIX)) await onDone().catch(() => undefined);
      return false;
    } finally {
      setBusy(false);
    }
  }, [onDone]);

  return { busy, error, run };
}
