'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import type { KpiTrendPoint } from './KpiTrendChart';

const KpiTrendChart = dynamic(() => import('./KpiTrendChart').then((module) => module.KpiTrendChart), {
  ssr: false,
});

export function DeferredKpiTrendChart({
  data,
  orderOnly,
  formatValue,
}: {
  data: KpiTrendPoint[];
  orderOnly: boolean;
  formatValue: (value: number) => string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      setShouldLoad(true);
      observer.disconnect();
    }, { rootMargin: '200px 0px' });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="mt-1 h-[155px] w-full">
      {shouldLoad && <KpiTrendChart data={data} orderOnly={orderOnly} formatValue={formatValue} />}
    </div>
  );
}
