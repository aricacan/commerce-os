'use client';

import { useEffect, useState } from 'react';

type AnimatedNumberProps = {
  value: string;
};

export function AnimatedNumber({ value }: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    // If user prefers reduced motion, render immediately without animation
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplayValue(value);
      return;
    }

    // Extract numeric portion if possible (e.g., "₺12.5K", "150", "4.5", "£1,234")
    const match = value.match(/([^\d.,-]*)([\d.,]+)(.*)/);
    if (!match) {
      setDisplayValue(value);
      return;
    }

    const prefix = match[1];
    const rawNumberStr = match[2].replace(/,/g, '');
    const suffix = match[3];
    const targetNum = parseFloat(rawNumberStr);

    if (isNaN(targetNum) || targetNum === 0) {
      setDisplayValue(value);
      return;
    }

    const duration = 600; // ms
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const current = targetNum * easeProgress;

      const formattedCurrent = current < 10 && rawNumberStr.includes('.')
        ? current.toFixed(1)
        : Math.round(current).toLocaleString('tr-TR');

      setDisplayValue(`${prefix}${formattedCurrent}${suffix}`);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setDisplayValue(value);
      }
    };

    const animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [value]);

  return <span>{displayValue}</span>;
}
