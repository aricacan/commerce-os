'use client';

import { Profiler, useCallback, useRef, type ProfilerOnRenderCallback, type ReactNode } from 'react';

interface RenderBudgetBoundaryProps {
  children: ReactNode;
  name: string;
}

export function RenderBudgetBoundary({ children, name }: RenderBudgetBoundaryProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const recordRender: ProfilerOnRenderCallback = useCallback((
    _id,
    _phase,
    actualDuration,
  ) => {
    containerRef.current?.setAttribute('data-render-duration-ms', actualDuration.toFixed(2));
  }, []);

  return (
    <Profiler id={name} onRender={recordRender}>
      <div ref={containerRef} data-performance-budget={name}>
        {children}
      </div>
    </Profiler>
  );
}
