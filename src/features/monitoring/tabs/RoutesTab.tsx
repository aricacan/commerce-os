'use client';

import { useState } from 'react';
import { Gauge } from 'lucide-react';
import type { RoutePerformanceDto } from '../../../lib/api';
import { useRoutePerformance } from '../../../hooks/monitoring/useMonitoring';
import { DaysSelector, Panel, Pill, QueryStatus, TD_CLASS, TH_CLASS } from '../ui';

// "Hangi uç genel olarak yavaş, hangisi çalışmıyor." Tek tek yavaş istek listesi DEĞİL:
// uç başına tek satır. 1 saat canlı ölçümden, daha uzunu saatlik kalıcı özetten gelir.
const WINDOW_OPTIONS = [
  { value: 1, label: '1 saat' },
  { value: 24, label: '24 saat' },
  { value: 168, label: '7 gün' },
];
const DEFAULT_HOURS = 24;
const SLOW_ROUTE_LIMIT = 30;
const SLOW_P95_MS = 1_000;
const WARN_P95_MS = 300;
const PERCENT = 100;

const COLUMNS = ['Uç', 'İstek', 'Ort.', 'p95', 'p99', 'Hata'];

function failureRate(route: RoutePerformanceDto): number {
  return route.requestCount === 0 ? 0 : (route.failedCount / route.requestCount) * PERCENT;
}

function RouteTable({ rows }: { rows: RoutePerformanceDto[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>{COLUMNS.map((column) => <th key={column} className={TH_CLASS}>{column}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((route) => (
            <tr key={`${route.method} ${route.route}`}>
              <td className={`${TD_CLASS} max-w-[420px] truncate font-mono`} title={route.route}>
                <span className="mr-2 font-bold text-[var(--fg-muted)]">{route.method}</span>
                {route.route}
              </td>
              <td className={TD_CLASS}>{route.requestCount.toLocaleString('tr-TR')}</td>
              <td className={TD_CLASS}>{Math.round(route.averageMs)} ms</td>
              <td className={TD_CLASS}>
                <Pill tone={route.p95Ms >= SLOW_P95_MS ? 'danger' : route.p95Ms >= WARN_P95_MS ? 'warning' : 'success'}>
                  {Math.round(route.p95Ms)} ms
                </Pill>
              </td>
              <td className={TD_CLASS}>{Math.round(route.p99Ms)} ms</td>
              <td className={TD_CLASS}>
                {route.failedCount > 0
                  ? <Pill tone="danger">{route.failedCount} · %{failureRate(route).toFixed(1)}</Pill>
                  : <span className="text-[var(--fg-muted)]">—</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function RoutesTab() {
  const [hours, setHours] = useState(DEFAULT_HOURS);
  const routes = useRoutePerformance(hours);
  const data = routes.data ?? [];

  const failing = data.filter((route) => route.failedCount > 0).sort((a, b) => failureRate(b) - failureRate(a));
  const slowest = [...data].sort((a, b) => b.p95Ms - a.p95Ms).slice(0, SLOW_ROUTE_LIMIT);

  const status = {
    isLoading: routes.isLoading,
    isError: routes.isError,
    onRetry: () => routes.refetch(),
    emptyIcon: Gauge,
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-[var(--fg-muted)]">
          {hours === 1 ? 'Canlı ölçüm (son 1 saat)' : 'Biten saatlerin özeti — içinde bulunulan saat henüz yok'}
        </p>
        <DaysSelector value={hours} onChange={setHours} options={WINDOW_OPTIONS} />
      </div>

      <Panel title={`Hata veren uçlar (${failing.length})`}>
        <QueryStatus {...status} isEmpty={failing.length === 0} emptyTitle="Hata veren uç yok">
          <RouteTable rows={failing} />
        </QueryStatus>
      </Panel>

      <Panel title="En yavaş uçlar (p95)">
        <QueryStatus {...status} isEmpty={slowest.length === 0} emptyTitle="Bu dönemde ölçüm yok">
          <RouteTable rows={slowest} />
        </QueryStatus>
      </Panel>
    </div>
  );
}
