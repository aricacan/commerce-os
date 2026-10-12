'use client';

import { useEffect, useState } from 'react';
import { consultRemainingMs } from './consultationRules';

const TICK_MS = 1000;

// expiresAt'e kalan süre (ms), saniyede bir güncellenir; bitince tick durur.
export function useConsultCountdown(expiresAt: string): number {
  const [remaining, setRemaining] = useState(() => consultRemainingMs(expiresAt, Date.now()));

  useEffect(() => {
    const update = () => setRemaining(consultRemainingMs(expiresAt, Date.now()));
    update();
    const timer = setInterval(() => {
      update();
      if (consultRemainingMs(expiresAt, Date.now()) === 0) clearInterval(timer);
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [expiresAt]);

  return remaining;
}
