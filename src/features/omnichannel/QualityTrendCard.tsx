'use client';

import { useMemo } from 'react';
import { omnichannelApi, type QualityAuditItemDto } from '../../lib/api/omnichannel';
import { ChartCard } from './OverviewCards';
import { QualityTrendChart } from './QualityTrendChart';
import { useResource } from './useResource';
import { formatScore, isLowScore, qualityCaption, QUALITY_TREND_DAYS, toQualityPoints } from './qualityRules';

interface Props {
  reloadKey: number;
  onOpenConversation?: (conversationId: number) => void;
  className?: string;
}

// "Kalite" kartı (P39): her gün dünün konuşmalarından alınan örneklemin ortalama puanı ve en düşük puanlı
// konuşmalar. Dönem sabit 7 gün: denetim günlük çalışır, kısa dönem seçimi anlamlı bir trend vermez.
export function QualityTrendCard({ reloadKey, onOpenConversation, className }: Props) {
  const quality = useResource(() => omnichannelApi.getQualityTrend(QUALITY_TREND_DAYS), `quality-${reloadKey}`);
  const trend = quality.data;
  const points = useMemo(() => (trend ? toQualityPoints(trend.daily) : []), [trend]);

  return (
    <ChartCard
      title="Bot kalitesi (son 7 gün)" className={className} loading={quality.loading && !trend} error={quality.error}
      caption={trend ? qualityCaption(trend) : undefined}
    >
      {trend && (
        <>
          <QualityTrendChart points={points} />
          {trend.lowest.length > 0 && (
            <ul aria-label="En düşük puanlı konuşmalar" className="m-0 flex list-none flex-col gap-2 p-0">
              {trend.lowest.map((item) => (
                <LowestRow key={item.conversationId} item={item} onOpen={onOpenConversation} />
              ))}
            </ul>
          )}
        </>
      )}
    </ChartCard>
  );
}

function LowestRow({ item, onOpen }: { item: QualityAuditItemDto; onOpen?: (conversationId: number) => void }) {
  return (
    <li className="flex items-start justify-between gap-3 rounded-md border border-border-soft p-2">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-ui-sm font-semibold text-fg">
          <span className={isLowScore(item.score) ? 'text-warning' : 'text-fg'}>{formatScore(item.score)}</span>
          {item.contactName && <span className="font-normal text-fg-muted"> · {item.contactName}</span>}
        </span>
        <span className="text-ui-xs text-fg-muted">{item.rationale}</span>
      </div>
      {onOpen && (
        <button
          type="button" onClick={() => onOpen(item.conversationId)}
          className="shrink-0 cursor-pointer rounded-md border border-border bg-transparent px-2.5 py-1.5 text-ui-xs text-fg hover:bg-bg-subtle"
        >
          Konuşmayı aç
        </button>
      )}
    </li>
  );
}
