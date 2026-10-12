'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, CheckCircle2, RefreshCw, XCircle } from 'lucide-react';
import {
  MAIL_STATUS_FAILED,
  MAIL_STATUS_SENT,
  MAIL_STATUS_SKIPPED,
  userMailApi,
  type UserMailDeliveryStatus,
} from '../../lib/api/user-mail';
import { formatDateTime, mailUi, t, type Lang } from './mail-ui';

interface MailLogsTabProps {
  lang: Lang;
}

const LOG_LIMIT = 100;

export function MailLogsTab({ lang }: MailLogsTabProps) {
  const { data: logs = [], isFetching, refetch } = useQuery({
    queryKey: ['user-mail-logs'],
    queryFn: () => userMailApi.listLogs(LOG_LIMIT),
    staleTime: 10_000,
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--fg)]">
            {t(lang, 'Son Gönderim Kayıtları', 'Recent Dispatches')}
          </h3>
          <p className="text-[11px] text-[var(--fg-muted)]">
            {t(lang, `Son ${LOG_LIMIT} gönderim kaydı`, `Last ${LOG_LIMIT} dispatch events`)}
          </p>
        </div>
        <button type="button" onClick={() => refetch()} className={mailUi.buttonGhost}>
          <RefreshCw className={`h-3 w-3 ${isFetching ? 'animate-spin' : ''}`} />
          <span>{t(lang, 'Yenile', 'Refresh')}</span>
        </button>
      </div>

      <div className="overflow-x-auto rounded-[2px] border border-[#64748b]">
        <table className="w-full text-left text-xs">
          <thead
            className={`border-b bg-[var(--bg-muted)]/80 text-[11px] font-bold uppercase text-[var(--fg-muted)] ${mailUi.divider}`}
          >
            <tr>
              <th className="px-3 py-2">{t(lang, 'Tarih', 'Date')}</th>
              <th className="px-3 py-2">{t(lang, 'Kural', 'Rule')}</th>
              <th className="px-3 py-2">{t(lang, 'Alıcı', 'Recipient')}</th>
              <th className="px-3 py-2">{t(lang, 'Konu', 'Subject')}</th>
              <th className="px-3 py-2">{t(lang, 'Durum', 'Status')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#cbd5e1] dark:divide-[#334155] bg-[var(--card)] font-mono text-[11px]">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-slate-400 font-sans">
                  {t(lang, 'Henüz gönderim kaydı yok.', 'No delivery logs found.')}
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-[var(--card-hover)] transition-colors">
                  <td className="px-3 py-2 whitespace-nowrap text-[var(--fg-muted)]">{formatDateTime(log.sentAtUtc)}</td>
                  <td className="px-3 py-2 font-sans font-medium text-[var(--fg)] truncate max-w-[120px]">
                    {log.ruleName ?? t(lang, 'Elle test', 'Manual test')}
                  </td>
                  <td className="px-3 py-2 text-[var(--fg)] truncate max-w-[160px]">{log.recipientEmail}</td>
                  <td className="px-3 py-2 font-sans text-[var(--fg)] truncate max-w-[200px]" title={log.subject}>
                    {log.subject}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
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
  status: UserMailDeliveryStatus;
  error: string | null;
}) {
  const base =
    'inline-flex items-center gap-1 rounded-[2px] px-1.5 py-0.5 text-[10px] font-bold font-sans';

  if (status === MAIL_STATUS_SENT) {
    return (
      <span className={`${base} bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300`}>
        <CheckCircle2 className="h-3 w-3" /> {t(lang, 'Gönderildi', 'Sent')}
      </span>
    );
  }

  if (status === MAIL_STATUS_FAILED) {
    return (
      <span
        className={`${base} bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300`}
        title={error ?? ''}
      >
        <XCircle className="h-3 w-3" /> {t(lang, 'Hata', 'Failed')}
      </span>
    );
  }

  if (status === MAIL_STATUS_SKIPPED) {
    return (
      <span className={`${base} bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300`}>
        <AlertCircle className="h-3 w-3" /> {t(lang, 'Kota Aşıldı', 'Skipped')}
      </span>
    );
  }

  return null;
}
