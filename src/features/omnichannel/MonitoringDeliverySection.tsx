import type { MonitoringDeliveryDto } from '../../lib/api/omnichannel-monitoring';
import { formatDateTime } from '../../lib/format';
import { CountRow, MonitoringPanel, TABLE_HEAD_CELL, TABLE_WRAPPER } from './MonitoringParts';
import { shareOf } from './monitoringRules';
import { outboundKindLabel } from './outboundEmailRules';

// Teslimat: giden e-posta başarısı, e-posta kutusu okuma durumu, mesaj gönderim (Meta) hata kodları.
export function MonitoringDeliverySection({ data }: { data: MonitoringDeliveryDto }) {
  return (
    <div className="grid gap-2 lg:grid-cols-2">
      <EmailPanel data={data} />
      <MetaErrorPanel data={data} />
      {data.mailboxes.length > 0 && <MailboxTable data={data} />}
    </div>
  );
}

function EmailPanel({ data }: { data: MonitoringDeliveryDto }) {
  const sent = data.emailByKind.reduce((sum, row) => sum + row.sent, 0);
  const failed = data.emailByKind.reduce((sum, row) => sum + row.failed, 0);
  const successRate = shareOf(sent, sent + failed);
  return (
    <MonitoringPanel
      title="Giden e-posta"
      hint={successRate === null ? 'Bu dönemde giden e-posta yok' : `${sent + failed} e-posta · başarı %${successRate}`}
    >
      {data.emailByKind.map((row) => (
        <div key={row.kind} className="flex items-center justify-between gap-2 py-0.5 text-ui-xs">
          <span className="text-fg">{outboundKindLabel(row.kind)}</span>
          <span className="font-mono text-fg-muted">
            {row.sent} gitti{row.failed > 0 && <span className="text-danger"> · {row.failed} hata</span>}
          </span>
        </div>
      ))}
      {data.emailTopErrors.map((error) => <CountRow key={error.reason} label={error.reason} count={error.count} danger />)}
    </MonitoringPanel>
  );
}

function MetaErrorPanel({ data }: { data: MonitoringDeliveryDto }) {
  const hasAny = data.metaErrorCodes.length > 0 || data.failedWithoutCode > 0;
  return (
    <MonitoringPanel title="Mesaj gönderim hataları" hint="Kanala ulaşmayan giden mesajların hata kodları">
      {!hasAny && <p className="m-0 text-ui-xs text-fg-muted">Bu dönemde gönderim hatası yok.</p>}
      {data.metaErrorCodes.map((row) => (
        <div key={row.code} className="flex flex-col gap-0.5">
          <CountRow label={`Kod ${row.code}`} count={row.count} danger />
          {row.sampleReason && <span className="break-words text-ui-2xs text-fg-muted">{row.sampleReason}</span>}
        </div>
      ))}
      {data.failedWithoutCode > 0 && <CountRow label="Kodsuz hata" count={data.failedWithoutCode} danger />}
    </MonitoringPanel>
  );
}

function MailboxTable({ data }: { data: MonitoringDeliveryDto }) {
  return (
    <div className={`${TABLE_WRAPPER} lg:col-span-2`}>
      <table className="w-full text-ui-xs">
        <thead>
          <tr className="border-b border-border-soft">
            <th className={TABLE_HEAD_CELL}>E-posta kutusu</th>
            <th className={TABLE_HEAD_CELL}>Son başarılı okuma</th>
            <th className={TABLE_HEAD_CELL}>Durum</th>
          </tr>
        </thead>
        <tbody>
          {data.mailboxes.map((row) => (
            <tr key={row.channelId} className="border-b border-border-soft last:border-b-0">
              <td className="p-2 text-fg">{row.displayName}</td>
              <td className="p-2 text-fg-muted">{row.lastSuccessAt ? formatDateTime(row.lastSuccessAt) : 'Hiç okunmadı'}</td>
              <td className={`p-2 ${row.lastError ? 'text-danger' : 'text-success'}`}>{row.lastError ?? 'Sorun yok'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
