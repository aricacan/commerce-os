'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Send, MessagesSquare, Mail } from 'lucide-react';
import { radarApi } from '../../../lib/api';
import { useRadarCompanies } from '../../../hooks/radar/useRadarCompanies';
import { useRadarMessages } from '../../../hooks/radar/useRadarMessages';
import { useRadarEmailTemplates } from '../../../hooks/radar/useRadarEmailTemplates';
import { CountrySelect } from '../CountrySelect';
import type { RadarCompanyListItem, RadarMessageThreadItem } from '../../../types/api';
import { formatDateTime } from '../../../lib/format';
import { sanitizeEmailHtml } from '../../../lib/sanitize';
import { useFeedback } from '../../shared/Feedback';
import { FilterSelect } from '../../../components/ui/FilterSelect';

interface Props {
  initialCompanyId: number | null;
  onConsumeInitialCompanyId: () => void;
}

const INBOX_FILTERS = [
  { id: 'all', label: 'Tüm Mesajlar' },
  { id: 'waiting', label: 'Bizden Cevap Bekleyen' },
  { id: 'active', label: 'Aktif Kampanya' },
  { id: 'completed', label: 'Tamamlananlar' },
] as const;

type InboxFilterType = (typeof INBOX_FILTERS)[number]['id'];

export function MessagesTab({ initialCompanyId, onConsumeInitialCompanyId }: Props) {
  const qc = useQueryClient();
  const { notify } = useFeedback();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<RadarCompanyListItem | null>(null);
  const [inboxFilter, setInboxFilter] = useState<InboxFilterType>('all');
  const [country, setCountry] = useState('');

  const [templateId, setTemplateId] = useState('');
  const [emailAccountId, setEmailAccountId] = useState('');
  const [customSubject, setCustomSubject] = useState('');
  const [customBody, setCustomBody] = useState('');
  const [markCompleted, setMarkCompleted] = useState(true);
  const [replyError, setReplyError] = useState<string | null>(null);

  const mappedStatus = inboxFilter === 'all' ? undefined :
                       inboxFilter === 'waiting' ? 'Replied' :
                       inboxFilter === 'active' ? 'Pending' : 'Completed';

  const { data: searchResults } = useRadarCompanies({
    page: 1,
    pageSize: 30,
    search: search || undefined,
    status: mappedStatus,
    country: country || undefined,
  });

  const { data: thread, isLoading: threadLoading } = useRadarMessages(selected?.id ?? null);
  const { data: templates } = useRadarEmailTemplates();
  const { data: accounts } = useQuery({
    queryKey: ['radar-email-accounts'],
    queryFn: () => radarApi.emailAccounts.list(),
    staleTime: 30_000,
  });

  const replyTemplates = templates?.filter((t) => t.templateType === 'Reply') ?? [];

  useEffect(() => {
    if (initialCompanyId === null) return;
    let cancelled = false;
    radarApi.companies.detail(initialCompanyId)
      .then((detail) => { if (!cancelled) setSelected(detail); })
      .catch(() => {})
      .finally(() => { if (!cancelled) onConsumeInitialCompanyId(); });
    return () => { cancelled = true; };
  }, [initialCompanyId, onConsumeInitialCompanyId]);

  const replyMut = useMutation({
    mutationFn: () => radarApi.companies.reply(selected!.id, {
      emailAccountId: Number(emailAccountId),
      templateId: templateId ? Number(templateId) : null,
      subject: templateId ? undefined : customSubject,
      body: templateId ? undefined : customBody,
      markCompleted,
    }),
    onSuccess: () => {
      notify.success('Yanıt gönderildi.');
      setCustomSubject('');
      setCustomBody('');
      setTemplateId('');
      setReplyError(null);
      qc.invalidateQueries({ queryKey: ['radar-messages', selected?.id] });
      qc.invalidateQueries({ queryKey: ['radar-companies'] });
    },
    onError: (err: Error) => setReplyError(err.message),
  });

  const templateOptions = [
    { value: '', label: 'Şablon Seçin (veya özel yazın)' },
    ...replyTemplates.map((t) => ({ value: String(t.id), label: t.name || t.subject || 'Şablon' })),
  ];

  const accountOptions = [
    { value: '', label: 'Gönderen E-posta Hesabı' },
    ...(accounts ?? []).map((a) => ({ value: String(a.id), label: a.emailAddress })),
  ];

  return (
    <div className="flex-1 flex min-h-0 w-full overflow-hidden text-xs">
      {/* Company Search / Selection List (Left) */}
      <div data-tour="radar-messages-sidebar" className="w-80 shrink-0 flex flex-col h-full border-r border-[var(--border-soft)] bg-[var(--card)]">
        <div className="p-3.5 border-b border-[var(--border-soft)] space-y-2 shrink-0">
          <div className="flex items-center gap-2">
            <MessagesSquare size={15} className="text-[var(--fg-muted)]" />
            <span className="font-bold text-xs text-[var(--fg)]">Gelen Kutusu & Mesajlar</span>
          </div>

          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Firma ara..."
              className="h-7.5 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] pl-7 pr-2 text-xs text-[var(--fg)] outline-none focus:border-[var(--fg)]"
            />
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <FilterSelect
              value={inboxFilter}
              onChange={(v) => setInboxFilter(v as InboxFilterType)}
              placeholder="Filtre"
              height="h-7"
              options={INBOX_FILTERS.map((f) => ({ value: f.id, label: f.label }))}
            />
            <CountrySelect
              value={country}
              onChange={setCountry}
              className="w-full"
            />
          </div>
        </div>

        {/* Company List */}
        <div className="flex-1 overflow-y-auto divide-y divide-[var(--border-soft)]">
          {searchResults?.items.map((company) => {
            const active = company.id === selected?.id;
            return (
              <div
                key={company.id}
                onClick={() => setSelected(company)}
                className={`p-3 cursor-pointer transition flex flex-col gap-1 ${
                  active ? 'bg-[var(--bg-subtle)]' : 'hover:bg-[var(--bg-subtle)]/40'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="font-bold text-xs text-[var(--fg)] truncate">{company.companyName}</span>
                  <span className="font-mono text-[9.5px] px-1 rounded-[2px] bg-[var(--bg)] border border-[var(--border)] text-[var(--fg-muted)]">
                    {company.country}
                  </span>
                </div>
                <div className="text-[10.5px] text-[var(--fg-muted)] truncate font-mono">
                  {company.email || company.website || 'İletişim bilgisi yok'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Message Thread & Reply View (Right) */}
      <div data-tour="radar-messages-thread" className="flex-1 flex flex-col min-w-0 h-full bg-[var(--bg)]">
        {selected ? (
          <>
            {/* Header */}
            <div className="p-3.5 px-5 border-b border-[var(--border-soft)] bg-[var(--card)] flex items-center justify-between shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-[var(--fg)]">{selected.companyName}</h3>
                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-[2px] bg-[var(--bg-subtle)] border border-[var(--border)] text-[var(--fg-muted)]">
                    {selected.country}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-[var(--fg-muted)] font-mono mt-0.5">
                  {selected.email && <span>{selected.email}</span>}
                  {selected.website && <span>{selected.website}</span>}
                </div>
              </div>
            </div>

            {/* Thread Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {threadLoading && <div className="py-8 text-center text-xs text-[var(--fg-muted)]">Mesajlar yükleniyor...</div>}
              {!threadLoading && (!thread?.items || thread.items.length === 0) && (
                <div className="py-12 text-center text-xs text-[var(--fg-muted)] border border-dashed border-[var(--border)] rounded-[4px]">
                  Bu şirketle henüz bir e-posta iletişimi gerçekleşmedi.
                </div>
              )}

              {thread?.items.map((msg: RadarMessageThreadItem) => (
                <div
                  key={msg.id}
                  className={`p-4 rounded-[4px] border ${
                    msg.direction === 'Outbound'
                      ? 'border-[var(--border-soft)] bg-[var(--card)] ml-6'
                      : 'border-[var(--fg)] bg-[var(--bg-subtle)] mr-6'
                  } space-y-2`}
                >
                  <div className="flex items-center justify-between text-[11px] text-[var(--fg-muted)] border-b border-[var(--border-soft)] pb-1.5">
                    <span className="font-bold text-[var(--fg)]">
                      {msg.direction === 'Outbound' ? 'Giden E-posta' : 'Gelen Yanıt'}
                    </span>
                    <span className="font-mono">{formatDateTime(msg.sentAt)}</span>
                  </div>

                  {msg.subject && <div className="font-bold text-xs text-[var(--fg)]">{msg.subject}</div>}

                  <div
                    className="text-xs text-[var(--fg)] whitespace-pre-wrap leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: sanitizeEmailHtml(msg.body) }}
                  />
                </div>
              ))}
            </div>

            {/* Reply Composer */}
            <div className="p-4 border-t border-[var(--border-soft)] bg-[var(--card)] space-y-3 shrink-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <FilterSelect
                  value={emailAccountId}
                  onChange={setEmailAccountId}
                  placeholder="Gönderici Hesap"
                  height="h-8"
                  options={accountOptions}
                />
                <FilterSelect
                  value={templateId}
                  onChange={setTemplateId}
                  placeholder="Şablon Seç"
                  height="h-8"
                  options={templateOptions}
                />
              </div>

              {!templateId && (
                <div className="space-y-2">
                  <input
                    value={customSubject}
                    onChange={(e) => setCustomSubject(e.target.value)}
                    placeholder="E-posta Konusu..."
                    className="h-8 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] outline-none focus:border-[var(--fg)]"
                  />
                  <textarea
                    value={customBody}
                    onChange={(e) => setCustomBody(e.target.value)}
                    placeholder="Yanıt metnini buraya yazın..."
                    rows={3}
                    className="w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] p-2 text-xs text-[var(--fg)] outline-none focus:border-[var(--fg)]"
                  />
                </div>
              )}

              {replyError && (
                <div className="p-2 rounded-[3px] bg-rose-500/10 text-rose-500 text-xs">
                  {replyError}
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-xs font-semibold text-[var(--fg)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={markCompleted}
                    onChange={(e) => setMarkCompleted(e.target.checked)}
                    className="h-4 w-4 rounded-[3px]"
                  />
                  <span>Yanıt sonrası &quot;Tamamlandı&quot; olarak işaretle</span>
                </label>

                <button
                  type="button"
                  onClick={() => replyMut.mutate()}
                  disabled={!emailAccountId || (!templateId && !customBody.trim()) || replyMut.isPending}
                  className="inline-flex h-8 items-center gap-1.5 rounded-[4px] bg-[var(--fg)] px-4 text-xs font-bold text-[var(--bg)] shadow-xs hover:opacity-90 transition cursor-pointer disabled:opacity-40"
                >
                  <Send size={12} />
                  <span>{replyMut.isPending ? 'Gönderiliyor...' : 'Yanıtı Gönder'}</span>
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-xs text-[var(--fg-muted)]">
            <Mail size={32} className="mb-2 text-[var(--fg-muted)] opacity-50" />
            <p>İletişim geçmişini görüntülemek veya yanıt yazmak için sol listeden bir şirket seçin.</p>
          </div>
        )}
      </div>
    </div>
  );
}
