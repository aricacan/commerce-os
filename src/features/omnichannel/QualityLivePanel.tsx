import type { QualityLiveDto } from '../../lib/api/omnichannel-quality';
import { formatDuration, outcomeChip, tracePathLabel } from './botTraceRules';
import { formatScore } from './evalRules';
import { CountRow, MonitoringPanel, MonitoringStat } from './MonitoringParts';

const count = (value: number) => value.toLocaleString('tr-TR');

// Canlı trafik kalitesi (tur izinden, Test Alanı hariç): turlar, yedek cevap, bastırılan tekrar, devirler; sonuç,
// karar yolu ve devir sebebi dağılımları.
export function QualityLivePanel({ live }: { live: QualityLiveDto }) {
  return (
    <section className="flex min-w-0 flex-col gap-2">
      <h3 className="m-0 text-ui-sm font-bold text-fg">Canlı trafik · son {live.days} gün</h3>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <MonitoringStat label="Bot turu" value={count(live.turns)} hint={`Ort. ${formatDuration(live.avgLatencyMs)}`} />
        <MonitoringStat
          label="Yedek cevap" value={count(live.fallbacks)} hint={`Turların ${formatScore(live.fallbackRate)}`}
          danger={live.fallbacks > 0}
        />
        <MonitoringStat label="Bastırılan tekrar" value={count(live.duplicateSuppressed)} />
        <MonitoringStat
          label="Devir" value={count(live.handoffs)}
          hint={live.tokensPerTurn === null ? undefined : `${count(live.tokensPerTurn)} jeton / tur`}
        />
      </div>
      <div className="grid gap-2 lg:grid-cols-3">
        <MonitoringPanel title="Sonuçlar">
          {live.outcomes.length === 0
            ? <Empty />
            : live.outcomes.map((o) => <CountRow key={o.outcome} label={outcomeChip(o.outcome).label} count={o.count} />)}
        </MonitoringPanel>
        <MonitoringPanel title="Karar yolları" hint="En sık 12 yol">
          {live.paths.length === 0
            ? <Empty />
            : live.paths.map((p) => <CountRow key={p.key} label={tracePathLabel(p.key)} count={p.count} />)}
        </MonitoringPanel>
        <MonitoringPanel title="Devir sebepleri">
          {live.handoffReasons.length === 0
            ? <Empty />
            : live.handoffReasons.map((r) => <CountRow key={r.key} label={r.label} count={r.count} />)}
        </MonitoringPanel>
      </div>
    </section>
  );
}

function Empty() {
  return <p className="m-0 text-ui-xs text-fg-muted">Bu dönemde kayıt yok.</p>;
}
