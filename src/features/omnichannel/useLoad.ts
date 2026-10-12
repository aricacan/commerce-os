'use client';

import { useEffect, useState } from 'react';
import { describeError } from '../../lib/errors';

// Tek seferlik okuma: bileşen kapanınca gelen yanıt yok sayılır. `load` useCallback ile sabitlenmeli.
export function useLoad<T>(load: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    load()
      .then((result) => { if (!cancelled) setData(result); })
      .catch((e) => { if (!cancelled) setError(describeError(e)); });
    return () => { cancelled = true; };
  }, [load]);

  return { data, error };
}
