'use client';

import type { ConversationFilter, OverviewSummaryDto } from '../../lib/api/omnichannel';
import { KpiSkeleton, KpiTile } from './OverviewCards';
import { buildKpis, type InsightsSlice } from './overviewKpis';

const SKELETON_COUNT = 8;
const GRID_CLASS = 'grid grid-cols-2 gap-3 md:grid-cols-4';

interface Props {
  // null: özet henüz gelmedi (iskelet çizilir).
  summary: OverviewSummaryDto | null;
  insights: InsightsSlice;
  // "Cevap bekleyen" / "Süresi geçen" kutuları gelen kutusunu o filtreyle açar.
  onOpenInbox?: (filter: ConversationFilter) => void;
}

// Üst şerit: 8 kompakt sayı kutusu. Telefonda iki, tablet ve masaüstünde dört sütun.
export function OverviewKpiStrip({ summary, insights, onOpenInbox }: Props) {
  if (!summary) {
    return (
      <div className={GRID_CLASS} aria-busy>
        {Array.from({ length: SKELETON_COUNT }, (_, i) => <KpiSkeleton key={i} />)}
      </div>
    );
  }

  return (
    <div className={GRID_CLASS}>
      {buildKpis(summary, insights).map((kpi) => {
        const { openFilter } = kpi;
        return (
          <KpiTile
            key={kpi.id} label={kpi.label} value={kpi.value} hint={kpi.hint} warn={kpi.warn} storea={kpi.storea}
            onClick={onOpenInbox && openFilter !== undefined ? () => onOpenInbox(openFilter) : undefined}
            actionLabel={openFilter !== undefined ? 'Gelen kutusunda aç' : undefined}
          />
        );
      })}
    </div>
  );
}
