'use client';

import { useEffect, useState } from 'react';

// Geri sayımlar dakikalık gösterilir: yarım dakikada bir tazelemek yeter, gereksiz çizim yapılmaz.
const TICK_MS = 30_000;

// Şu an (ms); geri sayım ve "ne zamandır bekliyor" etiketleri için düzenli tazelenir.
export function useNowTick(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, []);
  return now;
}
