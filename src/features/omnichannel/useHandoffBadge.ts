'use client';

import { useCallback, useEffect, useState } from 'react';
import { handoffApi } from '../../lib/api/handoff';

// Canlı olay kaçsa da rozet bayat kalmasın: düzenli tazeleme.
const POLL_MS = 60_000;

// "Devirler" menü rozeti: atanmamış ya da süresi aşmış açık devir sayısı. Eski backend'de (uç yok) 0.
export function useHandoffBadge(): number {
  const [count, setCount] = useState(0);

  const load = useCallback(async () => {
    try {
      setCount((await handoffApi.counts())?.attention ?? 0);
    } catch {
      // Rozet yan bilgidir: okunamazsa son değer kalır.
    }
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  return count;
}
