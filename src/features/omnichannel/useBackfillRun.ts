'use client';

import { useEffect, useRef, useState } from 'react';
import type { BackfillOutcome } from './cursorBackfill';
import { maintenanceErrorText } from './maintenanceErrors';

export interface BackfillRunControls<P> {
  shouldStop: () => boolean;
  onProgress: (progress: P) => void;
}

export interface BackfillRunState<P> {
  running: boolean;
  progress: P | null;
  outcome: BackfillOutcome | null;
  error: string | null;
  start: () => Promise<void>;
  stop: () => void;
}

// Bakım kartındaki sayfa sayfa işlerin (isim doldurma, Customer 360 doldurma) ortak durum makinesi:
// çift tıklamada ikinci döngü başlamaz, Durdur bir sonraki sayfada keser, sekmeden çıkınca döngü durur.
export function useBackfillRun<P>(
  run: (controls: BackfillRunControls<P>) => Promise<BackfillOutcome>,
  initialProgress: P,
): BackfillRunState<P> {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<P | null>(null);
  const [outcome, setOutcome] = useState<BackfillOutcome | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Ref: state güncellemesi bir sonraki render'ı bekler; çift tıklama bunu atlatamasın.
  const runningRef = useRef(false);
  const stopRef = useRef(false);

  useEffect(() => () => { stopRef.current = true; }, []);

  const start = async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    stopRef.current = false;
    setRunning(true);
    setProgress(initialProgress);
    setOutcome(null);
    setError(null);
    try {
      setOutcome(await run({ shouldStop: () => stopRef.current, onProgress: setProgress }));
    } catch (e) {
      setError(maintenanceErrorText(e));
    } finally {
      runningRef.current = false;
      setRunning(false);
    }
  };

  return { running, progress, outcome, error, start, stop: () => { stopRef.current = true; } };
}
