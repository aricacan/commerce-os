'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { describeError } from '../../lib/errors';
import { isServerUpdatePending } from './botTraceRules';

export interface ServerResource<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  // Uç sunucuda henüz yok (ön yüz backend'den önce yayına çıkar): hata yerine sakin boş durum.
  updatePending: boolean;
  reload: () => void;
}

interface State<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  updatePending: boolean;
}

// Tek kaynak okuma: `key` (süzgeç/sayfa) değişince ya da reload() çağrılınca yeniden okunur; eski isteğin yanıtı yenisini
// ezmez. Yeniden okumada eski veri ekranda kalır (titreme yok), yükleniyor bayrağı açılır.
export function useServerResource<T>(load: () => Promise<T>, key: string): ServerResource<T> {
  const [state, setState] = useState<State<T>>({ data: null, loading: true, error: null, updatePending: false });
  const [token, setToken] = useState(0);
  const loadRef = useRef(load);
  useEffect(() => { loadRef.current = load; }, [load]);

  useEffect(() => {
    let cancelled = false;
    setState((previous) => ({ ...previous, loading: true, error: null }));
    loadRef.current()
      .then((data) => { if (!cancelled) setState({ data, loading: false, error: null, updatePending: false }); })
      .catch((e: unknown) => {
        if (cancelled) return;
        const updatePending = isServerUpdatePending(e);
        setState((previous) => ({ ...previous, loading: false, updatePending, error: updatePending ? null : describeError(e) }));
      });
    return () => { cancelled = true; };
  }, [key, token]);

  const reload = useCallback(() => setToken((value) => value + 1), []);
  return { ...state, reload };
}
