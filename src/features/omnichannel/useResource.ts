'use client';

import { useEffect, useRef, useState } from 'react';
import { describeError } from '../../lib/errors';

export interface Resource<T> {
  data: T | null;
  error: string | null;
  // true: ilk yükleme ya da yeniden yükleme sürüyor. Yeniden yüklemede eski veri ekranda kalır.
  loading: boolean;
}

// Genel Bakış widget'larının ortak yükleyicisi: `key` değişince (filtre, dönem, yenile düğmesi) `load` yeniden çalışır.
// Hata sessizce yutulmaz: error doluysa widget bunu kullanıcıya gösterir. Eski bir isteğin yanıtı yenisini ezmez.
export function useResource<T>(load: () => Promise<T>, key: string): Resource<T> {
  const [state, setState] = useState<Resource<T>>({ data: null, error: null, loading: true });
  const loadRef = useRef(load);

  useEffect(() => { loadRef.current = load; });

  useEffect(() => {
    let cancelled = false;
    setState((previous) => ({ ...previous, error: null, loading: true }));
    loadRef.current()
      .then((data) => { if (!cancelled) setState({ data, error: null, loading: false }); })
      .catch((e: unknown) => { if (!cancelled) setState((previous) => ({ ...previous, error: describeError(e), loading: false })); });
    return () => { cancelled = true; };
  }, [key]);

  return state;
}
