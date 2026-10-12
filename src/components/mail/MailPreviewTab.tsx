'use client';

import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Check, Copy, Monitor, RefreshCw, Send, Smartphone } from 'lucide-react';
import {
  MAIL_REPORT_CUSTOM_TEMPLATE,
  userMailApi,
  type UserMailAccountDto,
  type UserMailReportType,
} from '../../lib/api/user-mail';
import { orderMailTemplateApi } from '../../lib/api/order-mail-templates';
import { pushAlert } from '../../stores/alert-stack';
import { FormSelect } from '../ui/FormSelect';
import { mailUi, reportTypeOptions, t, type Lang } from './mail-ui';

interface MailPreviewTabProps {
  lang: Lang;
  account: UserMailAccountDto | null | undefined;
}

type Viewport = 'desktop' | 'mobile';

/** Mobil e-posta istemcisinin tipik içerik genişliği. */
const MOBILE_WIDTH_PX = 390;
const FRAME_HEIGHT_PX = 460;

export function MailPreviewTab({ lang, account }: MailPreviewTabProps) {
  const [reportType, setReportType] = useState<UserMailReportType>(0);
  const [templateId, setTemplateId] = useState<number | null>(null);
  const [viewport, setViewport] = useState<Viewport>('desktop');
  const [testTarget, setTestTarget] = useState('');
  const [copied, setCopied] = useState(false);

  const { data: templates = [] } = useQuery({
    queryKey: ['order-mail-templates'],
    queryFn: orderMailTemplateApi.list,
    staleTime: 60_000,
  });

  const needsTemplate = reportType === MAIL_REPORT_CUSTOM_TEMPLATE;
  const canPreview = !needsTemplate || templateId !== null;

  const { data: preview, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['user-mail-preview', reportType, templateId],
    queryFn: () => userMailApi.previewReport(reportType, templateId),
    enabled: canPreview,
    staleTime: 60_000,
  });

  const sendPreview = useMutation({
    mutationFn: () =>
      userMailApi.sendPreview({
        reportType,
        customTemplateId: templateId,
        targetEmail: testTarget.trim() || undefined,
      }),
    onSuccess: (res) => pushAlert(res.message, res.success ? 'success' : 'error'),
    onError: (err: unknown) =>
      pushAlert(
        t(lang, 'Gönderilemedi: ', 'Send failed: ') + (err instanceof Error ? err.message : String(err)),
        'error'
      ),
  });

  const copyHtml = async () => {
    if (!preview?.htmlBody) return;
    try {
      await navigator.clipboard.writeText(preview.htmlBody);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      pushAlert(t(lang, 'Panoya kopyalanamadı', 'Could not copy to clipboard'), 'error');
    }
  };

  const senderName = account?.senderDisplayName || account?.emailAddress || '';
  const recipient = testTarget.trim() || account?.emailAddress || '';

  return (
    <div className="space-y-4">
      {/* Araç çubuğu — tek satır, çerçevesiz seçiciler */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <FormSelect
          value={reportType}
          options={reportTypeOptions(lang)}
          onChange={(next) => {
            setReportType(next);
            setTemplateId(null);
          }}
          className="w-[260px]"
          triggerClassName="h-8 rounded-[2px]"
        />

        {needsTemplate && (
          <FormSelect
            value={templateId}
            options={templates.map((tpl) => ({ value: tpl.id, label: tpl.name }))}
            onChange={setTemplateId}
            placeholder={t(lang, 'Şablon seçin', 'Select a template')}
            className="w-[200px]"
            triggerClassName="h-8 rounded-[2px]"
          />
        )}

        <div className="ml-auto flex items-center gap-1">
          <ToolButton
            active={viewport === 'desktop'}
            title={t(lang, 'Masaüstü', 'Desktop')}
            onClick={() => setViewport('desktop')}
          >
            <Monitor className="h-3.5 w-3.5" />
          </ToolButton>
          <ToolButton
            active={viewport === 'mobile'}
            title={t(lang, 'Mobil', 'Mobile')}
            onClick={() => setViewport('mobile')}
          >
            <Smartphone className="h-3.5 w-3.5" />
          </ToolButton>

          <span className="mx-1 h-4 w-px bg-[#cbd5e1] dark:bg-[#475569]" />

          <ToolButton
            title={t(lang, 'HTML kaynağını kopyala', 'Copy HTML source')}
            onClick={copyHtml}
            disabled={!preview?.htmlBody}
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
          </ToolButton>
          <ToolButton title={t(lang, 'Yenile', 'Refresh')} onClick={() => refetch()}>
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          </ToolButton>
        </div>
      </div>

      {/* Mesaj başlığı — mail istemcisindeki gibi etiketli alanlar */}
      <dl className="grid grid-cols-[64px_1fr] gap-x-3 gap-y-1.5 text-[12px]">
        <HeaderField label={t(lang, 'Kimden', 'From')}>
          {account ? (
            <>
              <span className="text-[var(--fg)]">{senderName}</span>
              <span className="text-[var(--fg-muted)] font-mono"> &lt;{account.emailAddress}&gt;</span>
            </>
          ) : (
            <span className="text-amber-600 dark:text-amber-400">
              {t(lang, 'Mail hesabı tanımlı değil', 'No mail account configured')}
            </span>
          )}
        </HeaderField>

        <HeaderField label={t(lang, 'Kime', 'To')}>
          <span className="font-mono text-[var(--fg-muted)]">
            {recipient || t(lang, '—', '—')}
          </span>
        </HeaderField>

        <HeaderField label={t(lang, 'Konu', 'Subject')}>
          <span className="font-semibold text-[var(--fg)]">
            {preview?.subject ?? <span className="font-normal text-[var(--fg-muted)]">…</span>}
          </span>
        </HeaderField>
      </dl>

      {/* Gövde çerçevesi */}
      <div className="rounded-[2px] border border-[#cbd5e1] dark:border-[#475569] bg-[#eef1f5] dark:bg-[#0b0f16] p-3">
        {!canPreview ? (
          <FrameMessage>{t(lang, 'Önce bir özel şablon seçin.', 'Pick a custom template first.')}</FrameMessage>
        ) : isLoading ? (
          <FrameMessage>
            <RefreshCw className="mr-2 inline h-4 w-4 animate-spin" />
            {t(lang, 'Rapor oluşturuluyor…', 'Building report…')}
          </FrameMessage>
        ) : error ? (
          <FrameMessage tone="error">
            {t(lang, 'Önizleme oluşturulamadı: ', 'Preview failed: ')}
            {error instanceof Error ? error.message : String(error)}
          </FrameMessage>
        ) : preview?.htmlBody ? (
          <iframe
            title="Email preview"
            srcDoc={preview.htmlBody}
            // sandbox="" — allow-same-origin YOK. Özel şablonların gövdesi kullanıcının
            // yazdığı HTML; aynı kaynağa alınırsa panelin DOM'una erişebilir.
            sandbox=""
            className="mx-auto block border-0 bg-white shadow-sm"
            style={{
              width: viewport === 'mobile' ? MOBILE_WIDTH_PX : '100%',
              height: FRAME_HEIGHT_PX,
            }}
          />
        ) : (
          <FrameMessage>{t(lang, 'Önizleme verisi yok', 'No preview available')}</FrameMessage>
        )}
      </div>

      {/* Test gönderimi */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-[var(--fg-muted)]">
          {t(
            lang,
            'Rakamlar canlı veriden gelir — alıcıya gidecek hâli budur.',
            'Figures come from live data — this is what recipients receive.'
          )}
        </p>
        <div className="flex items-center gap-2">
          <input
            type="email"
            placeholder={t(lang, 'Test alıcısı (boşsa kendinize)', 'Test recipient (defaults to you)')}
            value={testTarget}
            onChange={(e) => setTestTarget(e.target.value)}
            className="w-56 border-b border-[#cbd5e1] dark:border-[#475569] bg-transparent py-1 text-xs text-[var(--fg)] focus:border-sky-500 focus:outline-none"
          />
          <button
            type="button"
            disabled={!account || !canPreview || sendPreview.isPending}
            onClick={() => sendPreview.mutate()}
            className={mailUi.buttonGhost}
            title={
              account
                ? t(lang, 'Bu raporu test olarak gönder', 'Send this report as a test')
                : t(lang, 'Önce mail hesabınızı ayarlayın', 'Configure your mail account first')
            }
          >
            {sendPreview.isPending ? (
              <RefreshCw className="h-3 w-3 animate-spin" />
            ) : (
              <Send className="h-3 w-3 text-sky-600" />
            )}
            <span>{t(lang, 'Test gönder', 'Send test')}</span>
          </button>
        </div>
      </div>
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

function ToolButton({
  children,
  title,
  onClick,
  active = false,
  disabled = false,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-[2px] p-1.5 transition-colors disabled:opacity-40 ${
        active
          ? 'bg-[var(--card-hover)] text-[var(--fg)]'
          : 'text-[var(--fg-muted)] hover:bg-[var(--card-hover)] hover:text-[var(--fg)]'
      }`}
    >
      {children}
    </button>
  );
}

function FrameMessage({
  children,
  tone = 'muted',
}: {
  children: React.ReactNode;
  tone?: 'muted' | 'error';
}) {
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
