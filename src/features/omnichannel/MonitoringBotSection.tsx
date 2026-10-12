import type { BotHealthDto } from '../../lib/api/omnichannel-monitoring';
import { MonitoringActorSplit } from './MonitoringActorSplit';
import { MonitoringChannelTable } from './MonitoringChannelTable';
import { MonitoringKpiGrid } from './MonitoringKpiGrid';
import { CountRow, MonitoringPanel } from './MonitoringParts';
import { buildKpiCards, withoutSandbox } from './monitoringRules';

// Bot ve kanal bölümü: ana göstergeler (önceki dönem kıyaslı), bot/insan oranı, kanal tablosu, botun hata sebepleri.
// Türetilmiş değerler elle useMemo ile değil React Compiler'ın otomatik önbelleğiyle tutulur.
export function MonitoringBotSection({ data }: { data: BotHealthDto }) {
  const cards = buildKpiCards(data.current, data.previous, { p95Ms: data.p95TargetMs, handoffPercent: data.handoffTargetPercent });
  const channels = withoutSandbox(data.channels);
  return (
    <div className="flex flex-col gap-2">
      <MonitoringKpiGrid cards={cards} />
      <div className="grid gap-2 lg:grid-cols-2">
        <MonitoringActorSplit botCount={data.botOutboundCount} agentCount={data.agentOutboundCount} />
        <MonitoringPanel title="Botun en sık hata sebepleri" hint="Yanıt veremediği ya da araç/veri kaynağı hatası aldığı turlar">
          {data.topFailureReasons.length === 0
            ? <p className="m-0 text-ui-xs text-fg-muted">Bu dönemde bot hatası yok.</p>
            : data.topFailureReasons.map((reason) => <CountRow key={reason.reason} label={reason.reason} count={reason.count} danger />)}
        </MonitoringPanel>
      </div>
      <MonitoringChannelTable rows={channels} />
    </div>
  );
}
