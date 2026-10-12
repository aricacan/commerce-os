'use client';

import { useCallback, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { qualityApi } from '../../lib/api/omnichannel-quality';
import { EvalTrendChart } from './EvalTrendChart';
import { formInputClass, secondaryButtonClass } from './formClasses';
import { MonitoringPanel } from './MonitoringParts';
import { QualityLivePanel } from './QualityLivePanel';
import { QualityRunKpiCard } from './QualityRunKpiCard';
import { UpdatePendingNotice } from './UpdatePendingNotice';
import { useServerResource } from './useServerResource';

const LIVE_DAY_OPTIONS = [7, 14, 30] as const;

// Kalite Merkezi › Genel Bakış: sürüm başına son koşu (hızlı puan + iz göstergeleri), koşular boyunca tur başarısı
// trendi (%95 hedef çizgisi) ve canlı trafiğin son günlerdeki kalitesi.
export function QualityOverviewSection() {
  const [days, setDays] = useState<number>(LIVE_DAY_OPTIONS[0]);
  const load = useCallback(() => qualityApi.getOverview(days), [days]);
  const overview = useServerResource(load, String(days));
  const data = overview.data;

  return (
    <section className="flex min-w-0 flex-col gap-4" aria-busy={overview.loading}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="m-0 text-ui-sm font-bold text-fg">Güncel kalite</h3>
        <div className="flex items-center gap-2">
          <select
            aria-label="Canlı trafik dönemi" value={days} onChange={(e) => setDays(Number(e.target.value))}
            className={`${formInputClass} w-auto`}
          >
            {LIVE_DAY_OPTIONS.map((option) => <option key={option} value={option}>Son {option} gün</option>)}
          </select>
          <button type="button" className={secondaryButtonClass} onClick={overview.reload} disabled={overview.loading}>
            <RefreshCw size={13} aria-hidden /> Yenile
          </button>
        </div>
      </div>

      {overview.updatePending && <UpdatePendingNotice />}
      {overview.error && <p role="alert" className="m-0 text-ui-xs text-danger">{overview.error}</p>}
      {overview.loading && !data && <p className="m-0 text-ui-xs text-fg-muted">Göstergeler yükleniyor…</p>}

      {data && (
        <>
          {data.latestRuns.length === 0 ? (
            <p className="m-0 rounded-xl border border-dashed border-border px-4 py-6 text-center text-ui-xs text-fg-muted">
              Henüz tamamlanmış değerlendirme koşusu yok. Koşular bölümünden bir veri seti koşturun.
            </p>
          ) : (
            <div className="grid gap-2 lg:grid-cols-2">
              {data.latestRuns.map((run) => <QualityRunKpiCard key={run.runId} run={run} target={data.target} />)}
            </div>
          )}
          <MonitoringPanel title="Tur başarısı trendi" hint="Tamamlanan koşular, eskiden yeniye. Kesikli çizgi hedef.">
            <EvalTrendChart points={data.trend} target={data.target} />
          </MonitoringPanel>
          <QualityLivePanel live={data.live} />
        </>
      )}
    </section>
  );
}
