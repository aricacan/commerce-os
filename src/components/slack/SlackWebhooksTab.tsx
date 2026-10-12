'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, CheckCircle2, Play, RefreshCw, Trash2, XCircle } from 'lucide-react';
import {
  notificationRoutesApi,
  slackDeliveryApi,
  type BulkRouteAction,
  type NotificationEventType,
  type NotificationRoute,
} from '../../lib/api/notification-routes';
import { pushAlert } from '../../stores/alert-stack';
import { automationUi, formatDateTime, t, type Lang } from '../shared/automation-ui';

interface SlackWebhooksTabProps {
  lang: Lang;
  routes: NotificationRoute[];
  eventTypes: NotificationEventType[];
}

/**
 * Tüm webhook'lar tek düz listede + çoklu seçimle toplu işlem.
 *
 * Neden ayrı sekme: eski panelde bir webhook'a ulaşmak için önce olay tipini bulmak
 * gerekiyordu; "hangi kanallar bağlı" sorusunun tek ekranda cevabı yoktu.
 */
export function SlackWebhooksTab({ lang, routes, eventTypes }: SlackWebhooksTabProps) {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [triggeringId, setTriggeringId] = useState<number | null>(null);

  const descriptionByKey = useMemo(
    () => new Map(eventTypes.map((et) => [et.key, et.description])),
    [eventTypes]
  );

  const clearSelection = () => setSelected(new Set());

  const bulk = useMutation({
    meta: { silentError: true } as const,
    mutationFn: ({ action, ids }: { action: BulkRouteAction; ids: number[] }) =>
      slackDeliveryApi.bulk(action, ids),
    onSuccess: (res, vars) => {
      qc.invalidateQueries({ queryKey: ['notification-routes'] });
      clearSelection();
      pushAlert(
        `${res.affected} ${t(lang, 'yönlendirme güncellendi', 'routes updated')} (${vars.action})`,
        'success'
      );
    },
    onError: (err: unknown) =>
      pushAlert(
        t(lang, 'Toplu işlem başarısız: ', 'Bulk action failed: ') +
          (err instanceof Error ? err.message : String(err)),
        'error'
      ),
  });

  const trigger = useMutation({
    meta: { silentError: true } as const,
    mutationFn: notificationRoutesApi.trigger,
    onMutate: (id: number) => setTriggeringId(id),
    onSuccess: () => {
      setTriggeringId(null);
      qc.invalidateQueries({ queryKey: ['slack-delivery-logs'] });
      pushAlert(t(lang, 'Test mesajı gönderildi', 'Test message sent'), 'success');
    },
    onError: (err: unknown) => {
      setTriggeringId(null);
      pushAlert(
        t(lang, 'Gönderim başarısız: ', 'Dispatch failed: ') +
          (err instanceof Error ? err.message : String(err)),
        'error'
      );
    },
  });

  const toggleOne = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allSelected = routes.length > 0 && selected.size === routes.length;
  const toggleAll = () => (allSelected ? clearSelection() : setSelected(new Set(routes.map((r) => r.id))));

  const activeCount = routes.filter((r) => r.isActive).length;

  if (routes.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center rounded-[2px] border border-dashed p-8 text-center ${automationUi.divider}`}>
        <AlertCircle className="mb-2 h-8 w-8 text-[var(--fg-muted)]/50" />
        <p className="text-xs font-semibold text-[var(--fg)]">
          {t(lang, 'Henüz webhook eklenmemiş', 'No webhooks yet')}
        </p>
        <p className="mt-0.5 max-w-sm text-[11px] text-[var(--fg-muted)]">
          {t(
            lang,
            'Yönlendirmeler sekmesinden bir olay tipi seçip webhook ekleyin.',
            'Add one from the Routes tab by picking an event type.'
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className={automationUi.sectionTitle}>{t(lang, 'Bağlı Webhooklar', 'Connected Webhooks')}</h3>
          <p className={automationUi.sectionHint}>
            <span className="font-semibold tabular-nums text-[var(--fg)]">{routes.length}</span>{' '}
            {t(lang, 'webhook', 'webhooks')},{' '}
            <span className="font-semibold tabular-nums text-[var(--fg)]">{activeCount}</span>{' '}
            {t(lang, 'aktif', 'active')}
          </p>
        </div>

        {selected.size > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold tabular-nums text-[var(--fg-muted)]">
              {selected.size} {t(lang, 'seçili', 'selected')}
            </span>
            <button
              type="button"
              disabled={bulk.isPending}
              onClick={() => bulk.mutate({ action: 'activate', ids: [...selected] })}
              className={automationUi.buttonGhost}
            >
              {t(lang, 'Aktif Et', 'Activate')}
            </button>
            <button
              type="button"
              disabled={bulk.isPending}
              onClick={() => bulk.mutate({ action: 'deactivate', ids: [...selected] })}
              className={automationUi.buttonGhost}
            >
              {t(lang, 'Pasife Al', 'Deactivate')}
            </button>
            <button
              type="button"
              disabled={bulk.isPending}
              onClick={() => {
                const message = t(
                  lang,
                  `${selected.size} yönlendirme silinecek. Emin misiniz?`,
                  `Delete ${selected.size} routes. Are you sure?`
                );
                if (confirm(message)) bulk.mutate({ action: 'delete', ids: [...selected] });
              }}
              className="flex items-center gap-1 rounded-[2px] border border-[#cbd5e1] px-3 py-1 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-50 dark:border-[#475569] dark:hover:bg-rose-950/40"
            >
              <Trash2 className="h-3 w-3" />
              {t(lang, 'Sil', 'Delete')}
            </button>
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded-[2px] border border-[#64748b]">
        <table className="w-full text-left text-xs">
          <thead className={`border-b bg-[var(--bg-muted)]/80 text-[11px] font-bold uppercase text-[var(--fg-muted)] ${automationUi.divider}`}>
            <tr>
              <th className="w-9 px-3 py-2">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label={t(lang, 'Tümünü seç', 'Select all')}
                  className="rounded-[2px]"
                />
              </th>
              <th className="px-3 py-2">{t(lang, 'Hedef', 'Destination')}</th>
              <th className="px-3 py-2">{t(lang, 'Olay Tipi', 'Event Type')}</th>
              <th className="px-3 py-2">{t(lang, 'Zamanlama', 'Schedule')}</th>
              <th className="px-3 py-2">{t(lang, 'Durum', 'Status')}</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#cbd5e1] bg-[var(--card)] dark:divide-[#334155]">
            {routes.map((route) => (
              <tr key={route.id} className="transition-colors hover:bg-[var(--card-hover)]">
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selected.has(route.id)}
                    onChange={() => toggleOne(route.id)}
                    aria-label={route.label ?? String(route.id)}
                    className="rounded-[2px]"
                  />
                </td>
                <td className="max-w-[180px] truncate px-3 py-2 font-semibold text-[var(--fg)]">
                  {route.label ?? route.slackChannelId ?? t(lang, '(etiketsiz)', '(no label)')}
                </td>
                <td className="px-3 py-2 font-mono text-[11px] text-[var(--fg-muted)]" title={route.eventType}>
                  {descriptionByKey.get(route.eventType) ?? route.eventType}
                </td>
                <td className="whitespace-nowrap px-3 py-2 font-mono text-[11px] tabular-nums text-[var(--fg-muted)]">
                  {route.scheduleDays.length > 0
                    ? `${route.scheduleDays.length} ${t(lang, 'gün', 'days')} · ${String(route.scheduleHour).padStart(2, '0')}:00`
                    : '—'}
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  {route.isActive ? (
                    <span className="inline-flex items-center gap-1 rounded-[2px] bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                      <CheckCircle2 className="h-3 w-3" /> {t(lang, 'Aktif', 'Active')}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-[2px] bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      <XCircle className="h-3 w-3" /> {t(lang, 'Pasif', 'Inactive')}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    title={t(lang, 'Test mesajı gönder', 'Send test message')}
                    disabled={trigger.isPending}
                    onClick={() => trigger.mutate(route.id)}
                    className="rounded-[2px] border border-[#cbd5e1] p-1.5 text-sky-600 transition-colors hover:bg-sky-50 disabled:opacity-50 dark:border-[#475569] dark:hover:bg-sky-950/40"
                  >
                    {triggeringId === route.id ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Play className="h-3.5 w-3.5 fill-sky-600" />
                    )}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[10px] text-[var(--fg-muted)]">
        {t(lang, 'Eklendi: ', 'Added: ')}
        {formatDateTime(routes[0]?.createdAt)}
        {t(lang, ' — webhook adresleri güvenlik gereği burada gösterilmez.', ' — webhook URLs are hidden for security.')}
      </p>
    </div>
  );
}
