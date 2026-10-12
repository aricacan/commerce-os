import { MonitoringPanel, ShareBar } from './MonitoringParts';
import { shareOf } from './monitoringRules';

interface Props { botCount: number; agentCount: number }

// Giden mesajların kaçı bottan, kaçı temsilciden çıktı. Sistem mesajları (hoş geldin vb.) iki tarafa da sayılmaz.
export function MonitoringActorSplit({ botCount, agentCount }: Props) {
  const total = botCount + agentCount;
  const botShare = shareOf(botCount, total);
  const agentShare = shareOf(agentCount, total);
  return (
    <MonitoringPanel title="Bot ve insan dağılımı" hint="Müşteriye giden mesajları kimin yazdığı">
      {botShare === null ? (
        <p className="m-0 text-ui-xs text-fg-muted">Bu dönemde bot ya da temsilci mesajı yok.</p>
      ) : (
        <>
          <ShareBar value={botCount} max={total} label="Bot payı" />
          <div className="flex flex-wrap justify-between gap-2 text-ui-xs">
            <span className="text-fg">Bot: <b>{botCount}</b> (%{botShare})</span>
            <span className="text-fg">Temsilci: <b>{agentCount}</b> (%{agentShare})</span>
          </div>
        </>
      )}
    </MonitoringPanel>
  );
}
