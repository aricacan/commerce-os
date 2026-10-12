'use client';

import { useMemo, useState } from 'react';
import { MonitoringToolbar } from './MonitoringToolbar';
import {
  defaultMonitoringRange, exceedsMaxRange, toMonitoringQuery, type MonitoringRangeValue,
} from './monitoringRules';
import { ShadowComparisonPanel } from './ShadowComparisonPanel';

// Kalite Merkezi › Gölge: gölge sürüm açık kanallarda aynı müşteri mesajına canlı ve gölge hattın cevapları yan yana
// (önceden İzleme'deydi; İzleme'de bu bölüme bağlantı kaldı). Tarih aralığı İzleme'yle aynı seçiciden.
export function QualityShadowSection() {
  const [range, setRange] = useState<MonitoringRangeValue>(() => defaultMonitoringRange());
  const [refreshToken, setRefreshToken] = useState(0);
  const { preset, customFrom, customTo } = range;
  const query = useMemo(() => toMonitoringQuery({ preset, customFrom, customTo }), [preset, customFrom, customTo]);

  return (
    <>
      <MonitoringToolbar
        range={range}
        onRangeChange={(patch) => setRange((current) => ({ ...current, ...patch }))}
        onRefresh={() => setRefreshToken((token) => token + 1)}
        refreshing={false}
        overLimit={query !== null && exceedsMaxRange(query)}
        invalid={query === null}
      />
      {query !== null && <ShadowComparisonPanel range={query} refreshToken={refreshToken} />}
    </>
  );
}
