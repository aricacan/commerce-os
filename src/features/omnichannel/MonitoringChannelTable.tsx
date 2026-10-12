'use client';

import { useState } from 'react';
import { CHANNEL_STATUS, type ChannelStatus } from '../../lib/api/omnichannel';
import type { ChannelHealthRowDto } from '../../lib/api/omnichannel-monitoring';
import { formatDateTime } from '../../lib/format';
import { TABLE_HEAD_CELL, TABLE_WRAPPER } from './MonitoringParts';
import { MS_PER_HOUR, QUIET_CHANNEL_HOURS, formatSeconds } from './monitoringRules';
import { CHANNEL_STATUS_META, channelTypeMeta } from './shared';

// Kanal bazlı hacim, bot cevap süresi ve bağlantı sağlığı (bağlı/hata, son webhook).
export function MonitoringChannelTable({ rows }: { rows: readonly ChannelHealthRowDto[] }) {
  // "Sessiz kanal" hesabı tablo çizildiği ana göre yapılır (render saf kalsın).
  const [now] = useState(() => Date.now());
  return (
    <div className={TABLE_WRAPPER}>
      <table className="w-full text-ui-xs">
        <thead>
          <tr className="border-b border-border-soft">
            <th className={TABLE_HEAD_CELL}>Kanal</th>
            <th className={`${TABLE_HEAD_CELL} text-right`}>Gelen</th>
            <th className={`${TABLE_HEAD_CELL} text-right`}>Giden</th>
            <th className={`${TABLE_HEAD_CELL} text-right`}>Hatalı</th>
            <th className={`${TABLE_HEAD_CELL} text-right`}>Bot turu</th>
            <th className={`${TABLE_HEAD_CELL} text-right`}>p95</th>
            <th className={TABLE_HEAD_CELL}>Son Meta bildirimi</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => <ChannelRow key={row.channelId} row={row} now={now} />)}
        </tbody>
      </table>
    </div>
  );
}

function ChannelRow({ row, now }: { row: ChannelHealthRowDto; now: number }) {
  const meta = channelTypeMeta(row.type);
  const lastMs = row.lastWebhookAt ? new Date(row.lastWebhookAt).getTime() : null;
  const quiet = lastMs === null || now - lastMs > QUIET_CHANNEL_HOURS * MS_PER_HOUR;
  return (
    <tr className="border-b border-border-soft last:border-b-0">
      <td className="p-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="inline-flex items-center gap-1.5 text-fg">
            <meta.Icon size={12} color={meta.color} /> {row.displayName}
            <StatusDot status={row.status} />
          </span>
          {row.lastError && <span className="max-w-xs break-words text-ui-2xs text-danger">{row.lastError}</span>}
        </div>
      </td>
      <td className="p-2 text-right font-mono">{row.inboundCount}</td>
      <td className="p-2 text-right font-mono">{row.outboundCount}</td>
      <td className={`p-2 text-right font-mono ${row.failedCount > 0 ? 'text-danger' : ''}`}>{row.failedCount}</td>
      <td className="p-2 text-right font-mono">{row.botTurnCount}</td>
      <td className="p-2 text-right font-mono">{formatSeconds(row.p95DurationMs)}</td>
      <td className={`p-2 ${quiet ? 'text-warning' : 'text-fg-muted'}`}>
        {row.lastWebhookAt ? formatDateTime(row.lastWebhookAt) : 'Hiç gelmedi'}
      </td>
    </tr>
  );
}

function StatusDot({ status }: { status: ChannelStatus }) {
  const meta = CHANNEL_STATUS_META[status] ?? CHANNEL_STATUS_META[CHANNEL_STATUS.Disconnected];
  return (
    <span className={`inline-flex items-center gap-1 text-ui-2xs ${meta.textClass}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden /> {meta.label}
    </span>
  );
}
