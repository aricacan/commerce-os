'use client';

import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  notificationRoutesApi,
  CHANNEL_ID_EVENT_TYPES,
  type NotificationRoute,
  type NotificationEventType,
} from '../../lib/api/notification-routes';
import { pushAlert } from '../../stores/alert-stack';
import { useI18n } from '../../lib/i18n';
import { FormSelect } from '../../components/ui/FormSelect';

const HOURS = Array.from({ length: 24 }, (_, i) => i);

const DAYS: { key: string; label: string }[] = [
  { key: 'Monday', label: 'Pzt' },
  { key: 'Tuesday', label: 'Sal' },
  { key: 'Wednesday', label: 'Çar' },
  { key: 'Thursday', label: 'Per' },
  { key: 'Friday', label: 'Cum' },
  { key: 'Saturday', label: 'Cmt' },
  { key: 'Sunday', label: 'Paz' },
];
const ALL_DAYS = DAYS.map((d) => d.key);
const SCHEDULED_TYPES = new Set([
  'daily.report',
  'weekly.report',
  'sentostrack.top_seller_export',
  'basetrack.stock_alert',
  'basetrack.stock_export',
  'monthly.pnl',
  'weekly.top_products',
  'weekly.loss_products',
  'daily.loss_orders',
  'weekly.cancellation_rate',
]);

type RouteFormBody = { webhookUrl: string | null; slackChannelId: string | null; label: string | null };
type Schedule = { days: string[]; hour: number };

export function SlackRoutesPanel() {
  const { lang } = useI18n();
  const qc = useQueryClient();
  const [selectedType, setSelectedType] = useState<string>('');
  const [triggeringId, setTriggeringId] = useState<number | null>(null);

  const { data: routes, isLoading } = useQuery({
    queryKey: ['notification-routes'],
    queryFn: notificationRoutesApi.list,
    staleTime: 30_000,
  });

  const { data: eventTypes } = useQuery({
    queryKey: ['notification-event-types'],
    queryFn: notificationRoutesApi.eventTypes,
    staleTime: 300_000,
  });

  const createMutation = useMutation({
    meta: { silentError: true } as const,
    mutationFn: notificationRoutesApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notification-routes'] });
      pushAlert(lang === 'tr' ? 'Webhook başarıyla eklendi' : 'Webhook added successfully', 'success');
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      pushAlert((lang === 'tr' ? 'Ekleme başarısız: ' : 'Failed to add: ') + msg, 'error');
    },
  });

  const updateMutation = useMutation({
    meta: { silentError: true } as const,
    mutationFn: (vars: {
      id: number;
      webhookUrl: string | null;
      slackChannelId: string | null;
      label: string | null;
      isActive: boolean;
      scheduleDays: string[];
      scheduleHour: number;
    }) => notificationRoutesApi.update(vars.id, vars),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notification-routes'] }),
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      pushAlert((lang === 'tr' ? 'Güncelleme başarısız: ' : 'Update failed: ') + msg, 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: notificationRoutesApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notification-routes'] });
      pushAlert(lang === 'tr' ? 'Yönlendirme silindi' : 'Route deleted', 'info');
    },
  });

  const triggerMutation = useMutation({
    meta: { silentError: true } as const,
    mutationFn: notificationRoutesApi.trigger,
    onMutate: (id) => setTriggeringId(id),
    onSuccess: () => {
      setTriggeringId(null);
      pushAlert(
        lang === 'tr' ? 'Slack kanalına test bildirimi gönderildi' : 'Test notification sent to Slack channel',
        'success'
      );
    },
    onError: (err) => {
      setTriggeringId(null);
      const msg = err instanceof Error ? err.message : String(err);
      pushAlert((lang === 'tr' ? 'Gönderim başarısız: ' : 'Dispatch failed: ') + msg, 'error');
    },
  });

  const routesByType = useMemo(() => {
    const map = new Map<string, NotificationRoute[]>();
    for (const r of routes ?? []) {
      const list = map.get(r.eventType) ?? [];
      list.push(r);
      map.set(r.eventType, list);
    }
    return map;
  }, [routes]);

  const totalRoutes = routes?.length ?? 0;
  const activeRoutes = routes?.filter((r) => r.isActive).length ?? 0;
  const coveredTypes = eventTypes?.filter((et) => (routesByType.get(et.key)?.length ?? 0) > 0).length ?? 0;

  const effectiveType = selectedType || eventTypes?.[0]?.key || '';
  const selectedEventType = eventTypes?.find((et) => et.key === effectiveType);

  return (
    <div className="flex w-full flex-col gap-4 text-left">
      {/* Üst özet — dört eşit kutu yerine tek satır. Buradaki tek eyleme dönük bilgi
          "kaç webhook aktif"; aktif yoksa hiçbir bildirim gitmiyor demektir ve bu
          sayıyı kutulardan birine gömmek yerine ayrıca uyarmak gerekiyor. */}
      <div className="flex flex-col gap-2">
        <p className="text-xs text-[var(--fg-muted)]">
          <span className="font-semibold tabular-nums text-[var(--fg)]">
            {coveredTypes}/{eventTypes?.length ?? 0}
          </span>{' '}
          {lang === 'tr' ? 'olay tipine webhook bağlı' : 'event types have a webhook'} ·{' '}
          <span className="font-semibold tabular-nums text-[var(--fg)]">{totalRoutes}</span>{' '}
          {lang === 'tr' ? 'webhook' : 'webhooks'},{' '}
          <span className="font-semibold tabular-nums text-[var(--fg)]">{activeRoutes}</span>{' '}
          {lang === 'tr' ? 'aktif' : 'active'}
        </p>

        {totalRoutes > 0 && activeRoutes === 0 && (
          <p className="border-l-2 border-amber-500 pl-2.5 text-[11px] text-amber-700 dark:text-amber-400">
            {lang === 'tr'
              ? 'Aktif webhook yok — şu anda hiçbir Slack bildirimi gönderilmiyor.'
              : 'No active webhook — no Slack notification is being sent right now.'}
          </p>
        )}
      </div>

      {/* Olay Tipi Seçici */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--fg-subtle)]">
          {lang === 'tr' ? 'Olay Tipi' : 'Event Type'}
        </label>
        <FormSelect
          value={effectiveType}
          onChange={setSelectedType}
          disabled={!eventTypes}
          placeholder={lang === 'tr' ? 'Yükleniyor…' : 'Loading…'}
          options={(eventTypes ?? []).map((et) => {
            const count = routesByType.get(et.key)?.length ?? 0;
            return {
              value: et.key,
              label: et.description,
              hint: count > 0 ? `${count} webhook` : undefined,
            };
          })}
        />
      </div>

      {/* Seçili Olay Tipi Detayı */}
      {selectedEventType && (
        <EventTypeDetail
          eventType={selectedEventType}
          routes={routesByType.get(selectedEventType.key) ?? []}
          lang={lang}
          isLoading={isLoading}
          triggeringId={triggeringId}
          creating={createMutation.isPending}
          saving={updateMutation.isPending}
          onCreate={(body, schedule) =>
            createMutation.mutate({
              eventType: selectedEventType.key,
              ...body,
              scheduleDays: schedule.days,
              scheduleHour: schedule.hour,
            })
          }
          onSaveRoute={(r, body) =>
            updateMutation.mutate({
              id: r.id,
              ...body,
              isActive: r.isActive,
              scheduleDays: r.scheduleDays,
              scheduleHour: r.scheduleHour,
            })
          }
          onSaveSchedule={(rs, schedule) =>
            rs.forEach((r) =>
              updateMutation.mutate({
                id: r.id,
                webhookUrl: r.webhookUrl,
                slackChannelId: r.slackChannelId,
                label: r.label,
                isActive: r.isActive,
                scheduleDays: schedule.days,
                scheduleHour: schedule.hour,
              })
            )
          }
          onToggle={(r) =>
            updateMutation.mutate({
              id: r.id,
              webhookUrl: r.webhookUrl,
              slackChannelId: r.slackChannelId,
              label: r.label,
              isActive: !r.isActive,
              scheduleDays: r.scheduleDays,
              scheduleHour: r.scheduleHour,
            })
          }
          onDelete={(id) => {
            if (
              confirm(
                lang === 'tr'
                  ? 'Bu webhook yönlendirmesini silmek istediğinize emin misiniz?'
                  : 'Are you sure you want to delete this webhook route?'
              )
            ) {
              deleteMutation.mutate(id);
            }
          }}
          onTrigger={(id) => triggerMutation.mutate(id)}
        />
      )}
    </div>
  );
}

function isSlackWebhookUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' && url.hostname === 'hooks.slack.com' && url.pathname.startsWith('/services/');
  } catch {
    return false;
  }
}

function maskWebhookUrl(value: string): string {
  try {
    const url = new URL(value);
    const parts = url.pathname.split('/').filter(Boolean);
    const suffix = parts.at(-1)?.slice(-6) ?? '';
    return `${url.origin}/services/...${suffix ? `/${suffix}` : ''}`;
  } catch {
    return 'https://hooks.slack.com/services/...';
  }
}

function isChannelIdEventType(eventType: string): boolean {
  return CHANNEL_ID_EVENT_TYPES.has(eventType);
}

// ─── Olay Tipi Detayı (dropdown'la seçilen tek olay) ───────────────────────

interface EventTypeDetailProps {
  eventType: NotificationEventType;
  routes: NotificationRoute[];
  lang: string;
  isLoading: boolean;
  triggeringId: number | null;
  creating: boolean;
  saving: boolean;
  onCreate: (body: RouteFormBody, schedule: Schedule) => void;
  onSaveRoute: (route: NotificationRoute, body: RouteFormBody) => void;
  onSaveSchedule: (routes: NotificationRoute[], schedule: Schedule) => void;
  onToggle: (route: NotificationRoute) => void;
  onDelete: (id: number) => void;
  onTrigger: (id: number) => void;
}

function EventTypeDetail({
  eventType,
  routes,
  lang,
  isLoading,
  triggeringId,
  creating,
  saving,
  onCreate,
  onSaveRoute,
  onSaveSchedule,
  onToggle,
  onDelete,
  onTrigger,
}: EventTypeDetailProps) {
  const [adding, setAdding] = useState(false);
  const isScheduled = SCHEDULED_TYPES.has(eventType.key);
  const activeCount = routes.filter((r) => r.isActive).length;

  const pendingKey = `slack-pending-schedule:${eventType.key}`;
  const [pendingSchedule, setPendingSchedule] = useState<Schedule>(() => {
    if (typeof window === 'undefined') return { days: ALL_DAYS, hour: 9 };
    try {
      const raw = window.localStorage.getItem(pendingKey);
      return raw ? JSON.parse(raw) : { days: ALL_DAYS, hour: 9 };
    } catch {
      return { days: ALL_DAYS, hour: 9 };
    }
  });

  const schedule: Schedule =
    routes.length > 0 ? { days: routes[0].scheduleDays, hour: routes[0].scheduleHour } : pendingSchedule;

  const handleScheduleChange = (next: Schedule) => {
    if (routes.length > 0) {
      onSaveSchedule(routes, next);
    } else {
      setPendingSchedule(next);
      try {
        window.localStorage.setItem(pendingKey, JSON.stringify(next));
      } catch {
        /* ignore */
      }
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)]">
      {/* Kart Başlığı */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-soft)] p-3.5">
        <div className="min-w-[160px] flex-1">
          <div className="text-xs font-bold text-[var(--fg)]">{eventType.description}</div>
          <div className="mt-0.5 font-mono text-[10.5px] text-[var(--fg-subtle)]">{eventType.key}</div>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-[11px] font-semibold text-[var(--fg-muted)]">
            {routes.length === 0
              ? (lang === 'tr' ? 'Webhook yok' : 'No webhook')
              : `${activeCount}/${routes.length} ${lang === 'tr' ? 'aktif' : 'active'}`}
          </div>

          <button
            type="button"
            onClick={() => setAdding((o) => !o)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
              adding
                ? 'border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--fg-muted)]'
                : 'border-[var(--border)] bg-[var(--card)] text-[var(--fg)] hover:bg-[var(--card-hover)]'
            }`}
          >
            {adding ? (lang === 'tr' ? 'Vazgeç' : 'Cancel') : (lang === 'tr' ? '+ Webhook Ekle' : '+ Add Webhook')}
          </button>
        </div>
      </div>

      {/* Zamanlama Çubuğu */}
      {isScheduled && (
        <ScheduleBar
          schedule={schedule}
          lang={lang}
          onChange={handleScheduleChange}
          saving={saving}
          persisted={routes.length > 0}
        />
      )}

      {/* Gövde */}
      <div className="flex flex-col gap-2.5 p-3.5">
        {isLoading ? null : routes.length === 0 && !adding ? (
          <div className="rounded-lg border border-dashed border-[var(--border)] p-4 text-center text-xs text-[var(--fg-muted)]">
            {lang === 'tr'
              ? 'Henüz webhook eklenmedi. Bildirimlerin gitmesi için "+ Webhook Ekle" butonunu kullanın.'
              : 'No webhook configured. Use "+ Add Webhook" to wire notifications to a Slack channel.'}
          </div>
        ) : (
          routes.map((r) => (
            <RouteRow
              key={r.id}
              route={r}
              eventType={eventType.key}
              lang={lang}
              triggering={triggeringId === r.id}
              saving={saving}
              onToggle={() => onToggle(r)}
              onDelete={() => onDelete(r.id)}
              onTrigger={() => onTrigger(r.id)}
              onSave={(body) => onSaveRoute(r, body)}
            />
          ))
        )}

        {adding && (
          <RouteForm
            lang={lang}
            eventType={eventType.key}
            busy={creating}
            submitLabel={lang === 'tr' ? 'Webhook Ekle' : 'Add Webhook'}
            onSubmit={(body) => {
              onCreate(body, schedule);
              setAdding(false);
            }}
            onCancel={() => setAdding(false)}
          />
        )}
      </div>
    </div>
  );
}

// ─── Zamanlama Barı ────────────────────────────────────────────────────────

function ScheduleBar({
  schedule,
  lang,
  onChange,
  saving,
  persisted,
}: {
  schedule: Schedule;
  lang: string;
  onChange: (s: Schedule) => void;
  saving: boolean;
  persisted: boolean;
}) {
  const toggleDay = (day: string) => {
    const days = schedule.days.includes(day)
      ? schedule.days.filter((d) => d !== day)
      : [...schedule.days, day];
    if (days.length > 0) onChange({ ...schedule, days });
  };

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-[var(--border-soft)] bg-[var(--bg-subtle)] px-3.5 py-2 text-xs">
      <span className="font-semibold text-[var(--fg)]">
        {lang === 'tr' ? 'Gönderim Zamanı:' : 'Schedule:'}
      </span>

      <div className="flex gap-1">
        {DAYS.map((d) => {
          const active = schedule.days.includes(d.key);
          return (
            <button
              key={d.key}
              type="button"
              onClick={() => toggleDay(d.key)}
              disabled={saving}
              className={`rounded-md px-2 py-1 text-[11px] font-semibold transition-colors ${
                active
                  ? 'bg-[var(--fg)] text-[var(--bg)]'
                  : 'border border-[var(--border)] bg-[var(--card)] text-[var(--fg-muted)] hover:text-[var(--fg)]'
              }`}
            >
              {d.label}
            </button>
          );
        })}
      </div>

      <FormSelect
        value={schedule.hour}
        disabled={saving}
        onChange={(hour) => onChange({ ...schedule, hour })}
        options={HOURS.map((h) => ({ value: h, label: `${String(h).padStart(2, '0')}:00` }))}
        className="w-[84px]"
        triggerClassName="h-7 rounded-md"
      />

      <span className="text-[11px] text-[var(--fg-subtle)]">
        {persisted
          ? (lang === 'tr' ? 'Otomatik gönderilir' : 'Dispatched automatically')
          : (lang === 'tr' ? 'Webhook eklendiğinde kaydedilir' : 'Saved once webhook is attached')}
      </span>
    </div>
  );
}

// ─── Webhook Satırı ────────────────────────────────────────────────────────

function RouteRow({
  route,
  eventType,
  lang,
  triggering,
  saving,
  onToggle,
  onDelete,
  onTrigger,
  onSave,
}: {
  route: NotificationRoute;
  eventType: string;
  lang: string;
  triggering: boolean;
  saving: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onTrigger: () => void;
  onSave: (body: RouteFormBody) => void;
}) {
  const [editing, setEditing] = useState(false);
  const isChannelId = isChannelIdEventType(eventType);

  if (editing) {
    return (
      <RouteForm
        lang={lang}
        eventType={eventType}
        busy={saving}
        submitLabel={lang === 'tr' ? 'Güncelle' : 'Update'}
        initial={{ webhookUrl: route.webhookUrl, slackChannelId: route.slackChannelId, label: route.label }}
        onSubmit={(body) => {
          onSave(body);
          setEditing(false);
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-lg border border-[var(--border-soft)] bg-[var(--card)] p-3 transition-opacity ${
        route.isActive ? 'opacity-100' : 'opacity-60'
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-xs font-bold text-[var(--fg)]">
            {route.label || (lang === 'tr' ? '(Etiketsiz Kanal)' : '(Unlabeled Channel)')}
          </span>
          {!route.isActive && (
            <span className="rounded border border-[var(--border)] px-1.5 py-0.5 text-[9.5px] font-semibold text-[var(--fg-subtle)]">
              {lang === 'tr' ? 'PASİF' : 'INACTIVE'}
            </span>
          )}
        </div>
        <div className="mt-0.5 truncate font-mono text-[10.5px] text-[var(--fg-muted)]">
          {isChannelId
            ? route.slackChannelId || (lang === 'tr' ? '(Kanal ID yok)' : '(No channel ID)')
            : maskWebhookUrl(route.webhookUrl ?? '')}
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onToggle}
          className={`rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors ${
            route.isActive
              ? 'border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--fg)]'
              : 'border-[var(--border)] bg-transparent text-[var(--fg-muted)]'
          }`}
        >
          {route.isActive ? (lang === 'tr' ? 'Açık' : 'On') : (lang === 'tr' ? 'Kapalı' : 'Off')}
        </button>

        <button
          type="button"
          onClick={onTrigger}
          disabled={triggering}
          className="rounded-md border border-[var(--border)] bg-[var(--card)] px-2.5 py-1 text-[11px] font-semibold text-[var(--fg)] hover:bg-[var(--card-hover)] disabled:opacity-50"
        >
          {triggering ? (lang === 'tr' ? 'Gönderiliyor…' : 'Sending…') : (lang === 'tr' ? 'Test Et' : 'Test')}
        </button>

        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded-md border border-[var(--border)] bg-[var(--card)] px-2 py-1 text-[11px] font-semibold text-[var(--fg-muted)] hover:text-[var(--fg)]"
        >
          {lang === 'tr' ? 'Düzenle' : 'Edit'}
        </button>

        <button
          type="button"
          onClick={onDelete}
          className="rounded-md border border-[var(--border)] bg-[var(--card)] px-2 py-1 text-[11px] font-semibold text-[var(--fg-muted)] hover:text-[var(--fg)]"
        >
          {lang === 'tr' ? 'Sil' : 'Delete'}
        </button>
      </div>
    </div>
  );
}

// ─── Webhook Formu ──────────────────────────────────────────────────────────

function RouteForm({
  lang,
  eventType,
  busy,
  submitLabel,
  initial,
  onSubmit,
  onCancel,
}: {
  lang: string;
  eventType: string;
  busy: boolean;
  submitLabel: string;
  initial?: RouteFormBody;
  onSubmit: (body: RouteFormBody) => void;
  onCancel: () => void;
}) {
  const isChannelId = isChannelIdEventType(eventType);
  const [webhookUrl, setWebhookUrl] = useState(initial?.webhookUrl ?? '');
  const [slackChannelId, setSlackChannelId] = useState(initial?.slackChannelId ?? '');
  const [label, setLabel] = useState(initial?.label ?? '');
  const canSubmit = isChannelId ? slackChannelId.trim().length > 0 : isSlackWebhookUrl(webhookUrl);

  return (
    <div className="flex flex-col gap-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg-subtle)] p-3">
      {isChannelId ? (
        <input
          type="text"
          placeholder={lang === 'tr' ? 'Slack Kanal ID (ör. C0123ABCD)' : 'Slack Channel ID (e.g. C0123ABCD)'}
          value={slackChannelId}
          onChange={(e) => setSlackChannelId(e.target.value)}
          className="h-8.5 rounded-md border border-[var(--border)] bg-[var(--card)] px-2.5 font-mono text-xs text-[var(--fg)] outline-none focus:border-[var(--fg)]"
        />
      ) : (
        <input
          type="url"
          placeholder="https://hooks.slack.com/services/…"
          value={webhookUrl}
          onChange={(e) => setWebhookUrl(e.target.value)}
          className="h-8.5 rounded-md border border-[var(--border)] bg-[var(--card)] px-2.5 text-xs text-[var(--fg)] outline-none focus:border-[var(--fg)]"
        />
      )}
      <input
        type="text"
        placeholder={lang === 'tr' ? 'Kanal Etiketi (ör. #stok-uyarilari)' : 'Channel Label (e.g. #stock-alerts)'}
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        className="h-8.5 rounded-md border border-[var(--border)] bg-[var(--card)] px-2.5 text-xs text-[var(--fg)] outline-none focus:border-[var(--fg)]"
      />

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={!canSubmit || busy}
          onClick={() =>
            onSubmit(
              isChannelId
                ? { webhookUrl: null, slackChannelId: slackChannelId.trim(), label: label.trim() || null }
                : { webhookUrl: webhookUrl.trim(), slackChannelId: null, label: label.trim() || null }
            )
          }
          className="flex-1 rounded-md bg-[var(--fg)] py-1.5 text-xs font-semibold text-[var(--bg)] disabled:opacity-50"
        >
          {busy ? (lang === 'tr' ? 'Kaydediliyor…' : 'Saving…') : submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-xs font-semibold text-[var(--fg-muted)] hover:text-[var(--fg)]"
        >
          {lang === 'tr' ? 'Vazgeç' : 'Cancel'}
        </button>
      </div>
    </div>
  );
}
