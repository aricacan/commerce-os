import type { ReactNode } from 'react';

// Kanal kartındaki küçük bilgi etiketi (ülke, katalog, bot).
export function ChannelChip({ icon, children, title }: { icon?: ReactNode; children: ReactNode; title?: string }) {
  return (
    <span
      title={title}
      className="inline-flex max-w-full items-center gap-1 rounded-md bg-[var(--bg-subtle)] px-2 py-0.5 text-ui-2xs font-semibold text-[var(--fg-muted)]"
    >
      {icon}
      <span className="truncate">{children}</span>
    </span>
  );
}
