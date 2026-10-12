import type { MonitoringHandoffDto } from '../../lib/api/omnichannel-monitoring';
import { MonitoringPanel, MonitoringStat, TABLE_HEAD_CELL, TABLE_WRAPPER } from './MonitoringParts';
import { formatMinutes, handoffReasonLabel, shareOf } from './monitoringRules';

// Devir nedenleri + çözülme süresi ve ilk yanıt SLA ihlalleri.
export function MonitoringHandoffSection({ data }: { data: MonitoringHandoffDto }) {
  const slaRate = shareOf(data.slaBreachedCount, data.slaTrackedCount);
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <MonitoringStat label="Devir" value={String(data.ticketCount)} hint={`${data.resolvedCount} tanesi çözüldü`} />
        <MonitoringStat
          label="Ortalama çözülme" value={formatMinutes(data.avgResolveMinutes)}
          hint={`Medyan ${formatMinutes(data.medianResolveMinutes)}`}
        />
        <MonitoringStat
          label="SLA ihlali" value={String(data.slaBreachedCount)} danger={data.slaBreachedCount > 0}
          hint={`${data.slaTrackedCount} süreli konuşmadan`}
        />
        <MonitoringStat
          label="SLA ihlal oranı" value={slaRate === null ? '—' : `%${slaRate}`} danger={(slaRate ?? 0) > 0}
          hint="İlk yanıt süresi dolan konuşmalar"
        />
      </div>
      <div className="grid gap-2 lg:grid-cols-2">
        <ReasonTable data={data} />
        <SlaChannelPanel data={data} />
      </div>
    </div>
  );
}

function ReasonTable({ data }: { data: MonitoringHandoffDto }) {
  return (
    <div className={TABLE_WRAPPER}>
      <table className="w-full text-ui-xs">
        <thead>
          <tr className="border-b border-border-soft">
            <th className={TABLE_HEAD_CELL}>Devir nedeni</th>
            <th className={`${TABLE_HEAD_CELL} text-right`}>Adet</th>
            <th className={`${TABLE_HEAD_CELL} text-right`}>Çözülen</th>
            <th className={`${TABLE_HEAD_CELL} text-right`}>Ort. süre</th>
          </tr>
        </thead>
        <tbody>
          {data.reasons.map((row) => (
            <tr key={row.reason} className="border-b border-border-soft last:border-b-0">
              <td className="p-2 text-fg">{handoffReasonLabel(row.reason)}</td>
              <td className="p-2 text-right font-mono">{row.count}</td>
              <td className="p-2 text-right font-mono">{row.resolvedCount}</td>
              <td className="p-2 text-right font-mono">{formatMinutes(row.avgResolveMinutes)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SlaChannelPanel({ data }: { data: MonitoringHandoffDto }) {
  return (
    <MonitoringPanel title="Kanal bazlı SLA" hint="İhlal / süresi dolan konuşma">
      {data.slaChannels.length === 0 ? (
        <p className="m-0 text-ui-xs text-fg-muted">Bu dönemde süresi dolan konuşma yok (kanalda ilk yanıt süresi tanımlı olmayabilir).</p>
      ) : data.slaChannels.map((row) => (
        <div key={row.channelId} className="flex items-center justify-between gap-2 py-0.5 text-ui-xs">
          <span className="min-w-0 break-words text-fg">{row.displayName}</span>
          <span className={`shrink-0 font-mono ${row.breached > 0 ? 'text-danger' : 'text-fg-muted'}`}>{row.breached} / {row.tracked}</span>
        </div>
      ))}
    </MonitoringPanel>
  );
}
