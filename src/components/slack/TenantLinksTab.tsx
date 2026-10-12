'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, KeyRound, Trash2 } from 'lucide-react';
import { tenantLinksApi, type TenantLinks, type UpdateTenantLinksBody } from '../../lib/api/settings';
import { describeError } from '../../lib/errors';
import { pushAlert } from '../../stores/alert-stack';
import { automationUi, t, type Lang } from '../shared/automation-ui';

const TENANT_LINKS_KEY = ['tenant-links', 'admin'] as const;
const PUBLIC_LINKS_KEY = ['tenant-links', 'public'] as const;
const STALE_MS = 60_000;

interface Props {
  lang: Lang;
}

/**
 * Kiracıya (şirkete) özel bağlantılar: Slack çalışma alanı, varsayılan Slack webhook'u ve
 * Trello panosu. Webhook bir sırdır — sunucu maskeli döndürür; alan boş bırakılırsa mevcut
 * webhook DEĞİŞMEZ, yalnız "Kaldır" siler. Yönlendirmesi olmayan bildirimler bu webhook'a
 * düşer; o da yoksa yalnız sahip şirket sistem kanalına düşer (başka şirket için sızıntı olurdu).
 */
export function TenantLinksTab({ lang }: Props) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: TENANT_LINKS_KEY,
    queryFn: tenantLinksApi.get,
    staleTime: STALE_MS,
  });

  if (isLoading) return <p className={automationUi.sectionHint}>{t(lang, 'Yükleniyor…', 'Loading…')}</p>;
  if (isError || !data) {
    return <p className="text-xs text-[var(--danger)]">{describeError(error)}</p>;
  }

  // Sunucudan gelen veri değişince form baştan kurulur (key) — efektle kopyalamaya gerek yok.
  return <TenantLinksForm key={JSON.stringify(data)} lang={lang} links={data} />;
}

function TenantLinksForm({ lang, links }: { lang: Lang; links: TenantLinks }) {
  const qc = useQueryClient();
  const [workspaceUrl, setWorkspaceUrl] = useState(links.slackWorkspaceUrl ?? '');
  const [newWebhook, setNewWebhook] = useState('');
  const [trelloUrl, setTrelloUrl] = useState(links.trelloBoardUrl ?? '');

  const save = useMutation({
    meta: { silentError: true } as const,
    mutationFn: (body: UpdateTenantLinksBody) => tenantLinksApi.update(body),
    onSuccess: (saved) => {
      qc.setQueryData(TENANT_LINKS_KEY, saved);
      void qc.invalidateQueries({ queryKey: PUBLIC_LINKS_KEY });
      pushAlert(t(lang, 'Bağlantılar kaydedildi', 'Links saved'), 'success');
    },
    onError: (err: unknown) => pushAlert(describeError(err), 'error'),
  });

  const submit = (webhook: string | null) =>
    save.mutate({
      slackWorkspaceUrl: workspaceUrl.trim() || null,
      slackWebhookUrl: webhook,
      trelloBoardUrl: trelloUrl.trim() || null,
    });

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        submit(newWebhook.trim() || null);
      }}
    >
      <div>
        <h3 className={automationUi.sectionTitle}>{t(lang, 'Şirket Bağlantıları', 'Company Links')}</h3>
        <p className={automationUi.sectionHint}>
          {t(
            lang,
            'Bu şirkete özel Slack ve Trello adresleri. Yönlendirmesi olmayan Slack bildirimleri varsayılan webhook\'a gider.',
            'Slack and Trello addresses for this company. Slack notifications without a route go to the default webhook.',
          )}
        </p>
      </div>

      <LinkField
        id="tenant-slack-workspace"
        label={t(lang, 'Slack çalışma alanı', 'Slack workspace')}
        placeholder="https://sirketiniz.slack.com"
        value={workspaceUrl}
        onChange={setWorkspaceUrl}
      />

      <div>
        <label htmlFor="tenant-slack-webhook" className={automationUi.label}>
          {t(lang, 'Varsayılan Slack webhook\'u', 'Default Slack webhook')}
        </label>
        {links.hasSlackWebhook && (
          <div className="mb-1.5 flex items-center justify-between gap-2 rounded-[2px] bg-[var(--bg-subtle)] px-2.5 py-1.5">
            <span className="flex min-w-0 items-center gap-1.5 truncate font-mono text-[11px] text-[var(--fg-muted)]">
              <KeyRound size={12} className="shrink-0" />
              {links.slackWebhookUrl}
            </span>
            <button
              type="button"
              className={automationUi.buttonGhost}
              disabled={save.isPending}
              onClick={() => submit('')}
            >
              <Trash2 size={12} />
              {t(lang, 'Kaldır', 'Remove')}
            </button>
          </div>
        )}
        <input
          id="tenant-slack-webhook"
          className={automationUi.inputMono}
          placeholder="https://hooks.slack.com/services/…"
          value={newWebhook}
          onChange={(event) => setNewWebhook(event.target.value)}
          autoComplete="off"
        />
        <p className={automationUi.hint}>
          {links.hasSlackWebhook
            ? t(lang, 'Boş bırakırsanız mevcut webhook değişmez.', 'Leave empty to keep the current webhook.')
            : links.usesSystemSlackFallback
              ? t(lang, 'Tanımlı değil: bildirimler sistemin genel Slack kanalına gider.', 'Not set: notifications go to the system Slack channel.')
              : t(lang, 'Tanımlı değil: yönlendirmesi olmayan Slack bildirimleri gönderilmez.', 'Not set: Slack notifications without a route are not sent.')}
        </p>
      </div>

      <LinkField
        id="tenant-trello-board"
        label={t(lang, 'Trello panosu', 'Trello board')}
        placeholder="https://trello.com/b/…"
        value={trelloUrl}
        onChange={setTrelloUrl}
      />

      <div className="flex justify-end">
        <button type="submit" className={automationUi.buttonPrimary} disabled={save.isPending}>
          {save.isPending ? t(lang, 'Kaydediliyor…', 'Saving…') : t(lang, 'Kaydet', 'Save')}
        </button>
      </div>
    </form>
  );
}

function LinkField({ id, label, placeholder, value, onChange }: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const href = value.trim();
  return (
    <div>
      <label htmlFor={id} className={automationUi.label}>{label}</label>
      <div className="flex items-center gap-2">
        <input
          id={id}
          className={automationUi.input}
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        {href.startsWith('https://') && (
          <a href={href} target="_blank" rel="noopener noreferrer" className={automationUi.buttonGhost} aria-label={label}>
            <ExternalLink size={12} />
          </a>
        )}
      </div>
    </div>
  );
}
