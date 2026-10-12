'use client';

import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Copy, Check, RefreshCw } from 'lucide-react';
import { slackDeliveryApi, type NotificationEventType } from '../../lib/api/notification-routes';
import { pushAlert } from '../../stores/alert-stack';
import { FormSelect } from '../ui/FormSelect';
import { automationUi, t, type Lang } from '../shared/automation-ui';
import { SlackBlockPreview } from './SlackBlockPreview';

interface SlackPreviewTabProps {
  lang: Lang;
  eventTypes: NotificationEventType[];
  routeCountByType: Map<string, number>;
}

const FRAME_HEIGHT_PX = 460;

export function SlackPreviewTab({ lang, eventTypes, routeCountByType }: SlackPreviewTabProps) {
  const [eventType, setEventType] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!eventType && eventTypes.length > 0) setEventType(eventTypes[0].key);
  }, [eventType, eventTypes]);

  const { data: preview, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['slack-preview', eventType],
    queryFn: () => slackDeliveryApi.preview(eventType),
    enabled: !!eventType,
    staleTime: 60_000,
  });

  const copyText = async () => {
    if (!preview) return;
    try {
      await navigator.clipboard.writeText(preview.fallbackText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      pushAlert(t(lang, 'Panoya kopyalanamadı', 'Could not copy to clipboard'), 'error');
    }
  };

  const targetCount = routeCountByType.get(eventType) ?? 0;

  return (
    <div className="space-y-4">
      {/* Araç çubuğu — mail önizlemesiyle aynı düzen */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <FormSelect
          value={eventType || null}
          onChange={setEventType}
          placeholder={t(lang, 'Olay tipi seçin', 'Select an event type')}
          options={eventTypes.map((et) => {
            const count = routeCountByType.get(et.key) ?? 0;
            return {
              value: et.key,
              label: et.description,
              hint: count > 0 ? `${count} webhook` : undefined,
            };
          })}
          className="w-[300px]"
          triggerClassName="h-8 rounded-[2px]"
        />

        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            title={t(lang, 'Düz metin karşılığını kopyala', 'Copy plain-text fallback')}
            onClick={copyText}
            disabled={!preview}
            className="rounded-[2px] p-1.5 text-[var(--fg-muted)] transition-colors hover:bg-[var(--card-hover)] hover:text-[var(--fg)] disabled:opacity-40"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            title={t(lang, 'Yenile', 'Refresh')}
            onClick={() => refetch()}
            className="rounded-[2px] p-1.5 text-[var(--fg-muted)] transition-colors hover:bg-[var(--card-hover)] hover:text-[var(--fg)]"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Mesaj başlığı — mail sekmesindeki Kimden/Kime/Konu'nun karşılığı */}
      <dl className="grid grid-cols-[64px_1fr] gap-x-3 gap-y-1.5 text-[12px]">
        <HeaderField label={t(lang, 'Olay', 'Event')}>
          <span className="font-mono text-[var(--fg-muted)]">{eventType || '—'}</span>
        </HeaderField>
        <HeaderField label={t(lang, 'Kanal', 'Channel')}>
          {targetCount > 0 ? (
            <span className="text-[var(--fg)]">
              {targetCount} {t(lang, 'webhook’a gider', 'webhook(s)')}
            </span>
          ) : (
            <span className="text-amber-600 dark:text-amber-400">
              {t(lang, 'Bağlı webhook yok — bu mesaj hiçbir yere gitmiyor', 'No webhook attached — this message goes nowhere')}
            </span>
          )}
        </HeaderField>
        <HeaderField label={t(lang, 'Bildirim', 'Notification')}>
          <span className="text-[var(--fg)]">{preview?.fallbackText ?? '…'}</span>
        </HeaderField>
      </dl>

      {/* Gövde çerçevesi */}
      <div className="rounded-[2px] border border-[#cbd5e1] bg-[#eef1f5] p-3 dark:border-[#475569] dark:bg-[#0b0f16]">
        {isLoading ? (
          <FrameMessage>
            <RefreshCw className="mr-2 inline h-4 w-4 animate-spin" />
            {t(lang, 'Mesaj oluşturuluyor…', 'Building message…')}
          </FrameMessage>
        ) : error ? (
          <FrameMessage tone="error">
            {t(lang, 'Önizleme oluşturulamadı: ', 'Preview failed: ')}
            {error instanceof Error ? error.message : String(error)}
          </FrameMessage>
        ) : preview?.blocks?.length ? (
          <div
            className="mx-auto overflow-y-auto border border-[#e8e8e8] bg-white shadow-sm"
            style={{ height: FRAME_HEIGHT_PX }}
          >
            <SlackBlockPreview blocks={preview.blocks} />
          </div>
        ) : (
          <FrameMessage>{t(lang, 'Önizleme verisi yok', 'No preview available')}</FrameMessage>
        )}
      </div>

      <p className="text-[11px] text-[var(--fg-muted)]">
        {preview?.isLiveData
          ? t(
              lang,
              'Rakamlar canlı veriden gelir — kanala gidecek hâli budur.',
              'Figures come from live data — this is what the channel receives.'
            )
          : t(
              lang,
              'Bu olay tipi olay anında oluşur; burada gördüğünüz yalnızca mesaj yapısıdır.',
              'This event is built when it happens; only the message structure is shown here.'
            )}
      </p>
    </div>
  );
}

function HeaderField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="pt-px text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--fg-muted)]">
        {label}
      </dt>
      <dd className="min-w-0 truncate">{children}</dd>
    </>
  );
}

function FrameMessage({ children, tone = 'muted' }: { children: React.ReactNode; tone?: 'muted' | 'error' }) {
  return (
    <div
      className={`flex items-center justify-center px-6 text-center text-xs ${
        tone === 'error' ? 'text-rose-600 dark:text-rose-400' : 'text-[var(--fg-muted)]'
      }`}
      style={{ height: FRAME_HEIGHT_PX }}
    >
      {children}
    </div>
  );
}

void automationUi;
