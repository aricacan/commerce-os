'use client';

import { InfinityTrack } from '../ui/InfinityTrack';

export function AppSplash({ done }: { done?: boolean }) {
  if (done) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg)',
        gap: 16,
      }}
    >
      <InfinityTrack />
    </div>
  );
}
