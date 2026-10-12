'use client';

import { type ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';
import { useMobile } from '../../hooks/useMobile';

// Kaydırılabilir bir listeyi sarar, aşağı çekince yeniler.
// Masaüstünde hiç devreye girmez — orada F5 ve yenile butonu zaten var.

interface PullToRefreshProps {
  onRefresh: () => Promise<unknown>;
  children: ReactNode;
  className?: string;
}

export function PullToRefresh({ onRefresh, children, className = '' }: PullToRefreshProps) {
  const isMobile = useMobile();
  const { containerRef, pullDistance, isRefreshing } = usePullToRefresh(onRefresh);

  if (!isMobile) {
    return <div className={`h-full overflow-y-auto ${className}`}>{children}</div>;
  }

  const active = pullDistance > 0 || isRefreshing;

  return (
    <div ref={containerRef} className={`relative h-full overflow-y-auto ${className}`}>
      {/* Gösterge içeriğin ÜSTÜNDE yüzer — layout'u itmediği için liste zıplamaz. */}
      {active && (
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center"
          style={{ transform: `translateY(${isRefreshing ? 12 : pullDistance - 28}px)` }}
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-md)]">
            <RefreshCw
              size={15}
              className={`text-[var(--accent)] ${isRefreshing ? 'animate-spin' : ''}`}
              style={isRefreshing ? undefined : { transform: `rotate(${pullDistance * 3}deg)` }}
            />
          </span>
        </div>
      )}

      <div style={{ transform: `translateY(${isRefreshing ? 28 : pullDistance}px)`, transition: pullDistance ? undefined : 'transform .2s' }}>
        {children}
      </div>
    </div>
  );
}
