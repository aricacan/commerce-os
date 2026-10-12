'use client';

import type { DataQuality, ForecastEvent } from '../../../types/forecast';
import { NUM, TRY } from './format';

const SEVERITY_CLASS: Record<string, string> = {
  info: 'bg-fg',
  warn: 'bg-warning',
  bad: 'bg-danger',
};

/**
 * Olaylar ve veri sağlığı.
 *
 * Veri sağlığı şeridi bilinçli olarak GÖRÜNÜR: modelin neyi görmediği (kaç iptal
 * dışlandı, kaç kova kırpıldı, kaç seri durdu) ekranda yazmazsa, tahminin neye
 * dayandığı da bilinemez.
 */
export function EventFeed({
  events,
  quality,
}: {
  events: ForecastEvent[];
  quality: DataQuality | null;
}) {
  return (
    <div className="flex flex-col">
      {quality && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 px-3 py-2 border-b border-border-soft">
          <Fact label="Kova" value={NUM.format(quality.totalBuckets)} />
          <Fact
            label="Hariç tutulan"
            value={`${NUM.format(quality.cancelledExcluded)} iptal · ${TRY.format(quality.cancelledExcludedAmount)}`}
          />
          <Fact label="Winsorize" value={NUM.format(quality.winsorizedBuckets)} />
          <Fact label="Boş kova" value={NUM.format(quality.filledBuckets)} />
          <Fact label="Seyrek seri" value={NUM.format(quality.sparseSeries)} />
          <Fact label="Durmuş seri" value={NUM.format(quality.dormantSeries)} />
          {quality.estimatedProfitOrders > 0 && (
            <Fact
              label="Tahmini kâr"
              value={`${NUM.format(quality.estimatedProfitOrders)} sipariş · ${TRY.format(quality.estimatedProfitRevenue)}`}
              warn
            />
          )}
          {quality.scopeFilteredOrders > 0 && (
            <Fact
              label="Kapsam filtresiyle elenen"
              value={`${NUM.format(quality.scopeFilteredOrders)} sipariş`}
              warn
            />
          )}
        </div>
      )}

      {events.length === 0 ? (
        <p className="px-3 py-3 m-0 text-[11px] text-fg-muted">
          Kayda değer olay yok.
        </p>
      ) : (
        events.map((e, idx) => (
          <div
            key={`${e.kind}-${e.timestamp}-${idx}`}
            className="grid grid-cols-[6px_44px_1fr] gap-2 items-start px-3 py-1.5 border-b border-border-soft"
          >
            <span className={`w-1.5 h-1.5 rounded-full mt-1.5 ${SEVERITY_CLASS[e.severity]}`} />
            <time className="text-[10px] text-fg-subtle pt-0.5">
              {new Date(e.timestamp).toLocaleDateString('tr-TR', {
                day: '2-digit',
                month: 'short',
              })}
            </time>
            <p className="m-0 text-[11px] leading-snug text-fg-muted">
              {e.message}
            </p>
          </div>
        ))
      )}
    </div>
  );
}

function Fact({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span className="text-[9.5px] font-semibold uppercase tracking-wider text-fg-subtle">
        {label}
      </span>
      <span
        className={`text-[10.5px] font-semibold tabular-nums ${
          warn ? 'text-warning' : 'text-fg'
        }`}
      >
        {value}
      </span>
    </span>
  );
}
