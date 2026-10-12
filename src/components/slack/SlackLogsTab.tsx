'use client';

import { useQuery } from '@tanstack/react-query';
import { AlertCircle, CheckCircle2, RefreshCw, XCircle } from 'lucide-react';
import {
  slackDeliveryApi,
  SLACK_STATUS_BLOCKED,
  SLACK_STATUS_FAILED,
  SLACK_STATUS_SENT,
  type NotificationEventType,
  type SlackDeliveryStatus,
} from '../../lib/api/notification-routes';
import { automationUi, formatDateTime, t, type Lang } from '../shared/automation-ui';

interface SlackLogsTabProps {
  lang: Lang;
  eventTypes: NotificationEventType[];
}

const LOG_LIMIT = 100;

export function SlackLogsTab({ lang, eventTypes }: SlackLogsTabProps) {
  const { data: logs = [], isFetching, refetch } = useQuery({
    queryKey: ['slack-delivery-logs'],
    queryFn: () => slackDeliveryApi.logs(LOG_LIMIT),
    staleTime: 10_000,
  });

  const describe = (key: string) => eventTypes.find((et) => et.key === key)?.description ?? key;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className={automationUi.sectionTitle}>
            {t(lang, 'Giden Slack Mesajları', 'Sent Slack Messages')}
          </h3>
          <p className={automationUi.sectionHint}>
            {t(lang, `Son ${LOG_LIMIT} gönderim kaydı`, `Last ${LOG_LIMIT} dispatch events`)}
          </p>
        </div>
        <button type="button" onClick={() => refetch()} className={automationUi.buttonGhost}>
          <RefreshCw className={`h-3 w-3 ${isFetching ? 'animate-spin' : ''}`} />
          <span>{t(lang, 'Yenile', 'Refresh')}</span>
        </button>
      </div>

      <div className="overflow-x-auto rounded-[2px] border border-[#64748b]">
        <table className="w-full text-left text-xs">
          <thead className={`border-b bg-[var(--bg-muted)]/80 text-[11px] font-bold uppercase text-[var(--fg-muted)] ${automationUi.divider}`}>
            <tr>
              <th className="px-3 py-2">{t(lang, 'Tarih', 'Date')}</th>
              <th className="px-3 py-2">{t(lang, 'Olay', 'Event')}</th>
              <th className="px-3 py-2">{t(lang, 'Hedef', 'Destination')}</th>
              <th className="px-3 py-2">{t(lang, 'Mesaj', 'Message')}</th>
              <th className="px-3 py-2">{t(lang, 'Durum', 'Status')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#cbd5e1] bg-[var(--card)] text-[11px] dark:divide-[#334155]">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-[var(--fg-muted)]">
                  {t(lang, 'Henüz gönderim kaydı yok.', 'No delivery logs yet.')}
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="transition-colors hover:bg-[var(--card-hover)]">
                  <td className="whitespace-nowrap px-3 py-2 font-mono tabular-nums text-[var(--fg-muted)]">
                    {formatDateTime(log.sentAtUtc)}
                  </td>
                  <td className="max-w-[140px] truncate px-3 py-2 font-medium text-[var(--fg)]">
                    {describe(log.eventType)}
                    {log.isManualTest && (
                      <span className="ml-1.5 rounded-[2px] bg-slate-100 px-1 py-px text-[9px] font-bold uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {t(lang, 'test', 'test')}
                      </span>
                    )}
                  </td>
                  <td className="max-w-[160px] truncate px-3 py-2 font-mono text-[var(--fg-muted)]">
                    {log.target}
                  </td>
                  <td className="max-w-[220px] truncate px-3 py-2 text-[var(--fg)]" title={log.summary}>
                    {log.summary}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <StatusBadge lang={lang} status={log.status} error={log.errorMessage} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({
  lang,
  status,
  error,
}: {
  lang: Lang;
  status: SlackDeliveryStatus;
  error: string | null;
}) {
  const base = 'inline-flex items-center gap-1 rounded-[2px] px-1.5 py-0.5 text-[10px] font-bold';

  if (status === SLACK_STATUS_SENT) {
    return (
      <span className={`${base} bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300`}>
        <CheckCircle2 className="h-3 w-3" /> {t(lang, 'Gönderildi', 'Sent')}
      </span>
    );
  }

  if (status === SLACK_STATUS_FAILED) {
    return (
      <span
        className={`${base} bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300`}
        title={error ?? ''}
      >
        <XCircle className="h-3 w-3" /> {t(lang, 'Hata', 'Failed')}
      </span>
    );
  }

  if (status === SLACK_STATUS_BLOCKED) {
    return (
      <span
        className={`${base} bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300`}
        title={error ?? ''}
      >
        <AlertCircle className="h-3 w-3" /> {t(lang, 'Engellendi', 'Blocked')}
      </span>
    );
  }

  return null;
}
