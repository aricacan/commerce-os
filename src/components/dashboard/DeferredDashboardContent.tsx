'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';

const StaticWidgets = dynamic(() => import('./StaticWidgets').then((module) => module.StaticWidgets), {
  ssr: false,
});
const DashboardGrid = dynamic(() => import('./DashboardGrid').then((module) => module.DashboardGrid), {
  ssr: false,
});

export function DeferredDashboardContent() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setShouldLoad(true);
        observer.disconnect();
      },
      { rootMargin: '400px 0px' },
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className={shouldLoad ? undefined : 'min-h-80'}>
      {shouldLoad && (
        <>
          <StaticWidgets />
          <div className="shrink-0">
            <DashboardGrid />
          </div>
        </>
      )}
    </div>
  );
}
