import type { ReactNode } from 'react';

// İzleme bölümlerinin ortak küçük parçaları: kart, sayı kutusu, oran çubuğu, etiket-sayı satırı.

const CARD = 'rounded-md border border-border-soft bg-card';

export function MonitoringPanel({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <div className={`${CARD} flex min-w-0 flex-col gap-2 p-4`}>
      <div className="flex flex-col gap-0.5">
        <h4 className="m-0 text-ui-sm font-semibold text-fg">{title}</h4>
        {hint && <p className="m-0 text-ui-xs text-fg-muted">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

export function MonitoringStat({ label, value, hint, danger = false }: { label: string; value: string; hint?: string; danger?: boolean }) {
  return (
    <div className={`${CARD} flex min-w-0 flex-col gap-1 p-4`}>
      <span className="text-ui-2xs font-semibold uppercase text-fg-muted">{label}</span>
      <span className={`text-ui-xl font-bold ${danger ? 'text-danger' : 'text-fg'}`}>{value}</span>
      {hint && <span className="text-ui-xs text-fg-muted">{hint}</span>}
    </div>
  );
}

// Dinamik genişlik yerine <progress>: satır içi stil gerekmez, ekran okuyucuya da oran olarak okunur.
export function ShareBar({ value, max, label }: { value: number; max: number; label: string }) {
  return (
    <progress
      value={value} max={Math.max(max, 1)} aria-label={label}
      className="h-2 w-full appearance-none overflow-hidden rounded-full [&::-webkit-progress-bar]:bg-bg-subtle [&::-webkit-progress-value]:bg-fg-muted [&::-moz-progress-bar]:bg-fg-muted"
    />
  );
}

export function CountRow({ label, count, danger = false }: { label: string; count: number; danger?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-2 py-0.5 text-ui-xs">
      <span className="min-w-0 break-words text-fg">{label}</span>
      <span className={`shrink-0 font-mono ${danger ? 'text-danger' : 'text-fg-muted'}`}>{count}</span>
    </div>
  );
}

export const TABLE_WRAPPER = `${CARD} overflow-x-auto`;
export const TABLE_HEAD_CELL = 'p-2 text-left text-ui-2xs font-semibold uppercase text-fg-muted';
