'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Send, Trash2, AlertTriangle, ShieldAlert, Clock, Plus } from 'lucide-react';
import {
  commercialApi,
  OBJECTION_CHANNEL_LABEL,
  OBJECTION_STATUS_LABEL,
  RESPONSE_STATUS_LABEL,
  RESPONSE_TYPE_LABEL,
  type ApplicationResponseType,
  type ObjectionChannel,
} from '../../../../lib/api/e-belge';
import { InvoicingSubTabBar } from '../../../../components/layout/InvoicingSubTabBar';
import { toast } from '../../../../lib/toast';
import { describeError } from '../../../../lib/errors';
import { useI18n } from '../../../../lib/i18n';

export default function CommercialResponsesPage() {
  const qc = useQueryClient();
  const { lang } = useI18n();
  const tr = lang === 'tr';

  const [invoiceIdInput, setInvoiceIdInput] = useState('');
  const [invoiceId, setInvoiceId] = useState<number | null>(null);

  const [responseForm, setResponseForm] = useState<{ type: ApplicationResponseType; reason: string; note: string }>({
    type: 'Kabul', reason: '', note: '',
  });
  const [objectionForm, setObjectionForm] = useState<{ channel: ObjectionChannel; reason: string; objectionDate: string; reference: string }>({
    channel: 'Kep', reason: '', objectionDate: '', reference: '',
  });

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['commercial-status', invoiceId],
    queryFn: () => commercialApi.status(invoiceId!),
    enabled: invoiceId !== null,
    staleTime: 5_000,
  });

  const invalidate = () => void qc.invalidateQueries({ queryKey: ['commercial-status'] });

  const createResponse = useMutation({
    mutationFn: () =>
      commercialApi.createResponse(invoiceId!, {
        responseType: responseForm.type,
        reason: responseForm.reason.trim() || null,
        note: responseForm.note.trim() || null,
      }),
    onSuccess: () => {
      toast.success(tr ? 'Yanıt taslağı oluşturuldu. GİB\'e henüz gönderilmedi.' : 'Draft created. Not sent yet.');
      setResponseForm({ type: 'Kabul', reason: '', note: '' });
      invalidate();
    },
    onError: (e) => toast.error(describeError(e)),
  });

  const queueResponse = useMutation({
    mutationFn: (responseId: number) => commercialApi.queueResponse(responseId),
    onSuccess: () => { toast.success(tr ? 'Yanıt gönderim kuyruğuna alındı.' : 'Queued for sending.'); invalidate(); },
    onError: (e) => toast.error(describeError(e)),
  });

  const deleteResponse = useMutation({
    mutationFn: (responseId: number) => commercialApi.deleteResponse(responseId),
    onSuccess: () => { toast.success(tr ? 'Taslak silindi.' : 'Draft deleted.'); invalidate(); },
    onError: (e) => toast.error(describeError(e)),
  });

  const createObjection = useMutation({
    mutationFn: () =>
      commercialApi.createObjection(invoiceId!, {
        channel: objectionForm.channel,
        reason: objectionForm.reason,
        objectionDate: objectionForm.objectionDate || null,
        reference: objectionForm.reference.trim() || null,
      }),
    onSuccess: () => {
      toast.success(tr ? 'İtiraz kaydedildi.' : 'Objection recorded.');
      setObjectionForm({ channel: 'Kep', reason: '', objectionDate: '', reference: '' });
      invalidate();
    },
    onError: (e) => toast.error(describeError(e)),
  });

  const deadlineTone = !data
    ? ''
    : data.isExpired
      ? 'border-red-500/40 bg-red-500/10 text-red-300'
      : data.daysRemaining <= 3
        ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
        : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300';

  return (
    <div className="flex h-full flex-col overflow-hidden bg-transparent">
      <InvoicingSubTabBar />

      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-base font-bold text-[var(--fg)] tracking-tight">
              {tr ? 'Ticari Yanıt ve İtiraz' : 'Commercial Response & Objection'}
            </h1>
            <p className="text-xs text-[var(--fg-muted)] mt-0.5">
              {tr
                ? 'Gelen faturaya uygulama yanıtı (Kabul/Red/İade) ve itiraz kanalı yönetimi.'
                : 'Application responses and objection channels for incoming invoices.'}
            </p>
          </div>

          <form
            className="flex items-end gap-2"
            onSubmit={(e) => { e.preventDefault(); setInvoiceId(Number(invoiceIdInput) || null); }}
          >
            <label className="flex flex-col gap-1">
              <span className="text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase tracking-wide">
                {tr ? 'Fatura ID' : 'Invoice ID'}
              </span>
              <input
                value={invoiceIdInput}
                onChange={(e) => setInvoiceIdInput(e.target.value.replace(/\D/g, ''))}
                inputMode="numeric"
                className="h-8 w-32 rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2 text-xs tabular-nums text-[var(--fg)] focus:outline-none focus:border-[var(--fg-muted)]"
              />
            </label>
            <button
              type="submit"
              className="inline-flex h-8 items-center gap-1.5 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-semibold text-[var(--fg)] shadow-xs hover:bg-[var(--bg-subtle)] transition cursor-pointer"
            >
              <Search size={13} />
              <span>{tr ? 'Getir' : 'Load'}</span>
            </button>
          </form>
        </div>

        {isError && (
          <div className="flex items-start gap-2 rounded-[4px] border border-red-500/30 bg-red-500/10 px-3 py-2.5">
            <AlertTriangle size={14} className="text-red-400 mt-0.5 shrink-0" />
            <p className="text-xs text-red-300">{describeError(error)}</p>
          </div>
        )}

        {invoiceId === null && (
          <p className="text-xs text-[var(--fg-muted)]">
            {tr ? 'Başlamak için bir gelen fatura ID’si girin.' : 'Enter an incoming invoice ID to begin.'}
          </p>
        )}

        {isLoading && <p className="text-xs text-[var(--fg-muted)]">{tr ? 'Yükleniyor…' : 'Loading…'}</p>}

        {data && (
          <>
            {/* Fatura künyesi ve süre */}
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3 shadow-xs">
                <div className="text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase tracking-wide">
                  {tr ? 'Fatura' : 'Invoice'}
                </div>
                <div className="text-sm font-bold text-[var(--fg)] mt-0.5 font-mono">{data.invoiceNumber}</div>
                <div className="text-[11px] text-[var(--fg-muted)] mt-0.5 tabular-nums">{data.invoiceDate}</div>
              </div>

              <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3 shadow-xs">
                <div className="text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase tracking-wide">
                  {tr ? 'Fatura Türü' : 'Profile'}
                </div>
                <div className="text-sm font-bold text-[var(--fg)] mt-0.5">{data.profile ?? (tr ? 'Bilinmiyor' : 'Unknown')}</div>
              </div>

              <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3 shadow-xs">
                <div className="text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase tracking-wide">
                  {tr ? 'Geliş Zamanı' : 'Received'}
                </div>
                <div className="text-xs font-semibold text-[var(--fg)] mt-0.5 tabular-nums">
                  {data.receivedAt ? new Date(data.receivedAt).toLocaleString('tr-TR') : '—'}
                </div>
              </div>

              <div className={`rounded-[4px] border p-3 shadow-xs ${deadlineTone}`}>
                <div className="text-[10.5px] font-semibold uppercase tracking-wide opacity-80">
                  {tr ? 'Kalan Gün' : 'Days Left'}
                </div>
                <div className="mt-0.5 flex items-center gap-1 text-base font-bold">
                  <Clock size={14} />
                  {data.isExpired ? (tr ? 'Süre doldu' : 'Expired') : data.daysRemaining}
                </div>
              </div>
            </div>

            {/* Yanıt verilemiyorsa nedenini AÇIKÇA söyle */}
            {!data.canRespond && data.cannotRespondReason && (
              <div className="flex items-start gap-2 rounded-[4px] border border-amber-500/40 bg-amber-500/10 px-3 py-2.5">
                <ShieldAlert size={14} className="text-amber-400 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-200/90 leading-relaxed">{data.cannotRespondReason}</p>
              </div>
            )}

            <div className="grid gap-3 lg:grid-cols-2">
              {/* ── Uygulama Yanıtları ── */}
              <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] overflow-hidden shadow-xs">
                <div className="border-b border-[var(--border-soft)] px-3 py-2">
                  <h2 className="text-xs font-bold text-[var(--fg)]">
                    {tr ? 'Uygulama Yanıtları' : 'Application Responses'}
                  </h2>
                </div>

                <div className="divide-y divide-[var(--border-soft)]">
                  {data.responses.length === 0 && (
                    <p className="px-3 py-6 text-center text-xs text-[var(--fg-muted)]">
                      {tr ? 'Henüz yanıt yok.' : 'No responses yet.'}
                    </p>
                  )}
                  {data.responses.map((r) => (
                    <div key={r.id} className="flex items-start justify-between gap-3 px-3 py-2.5">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[var(--fg)]">{RESPONSE_TYPE_LABEL[r.responseType]}</span>
                          <span className="rounded-[3px] bg-[var(--bg-subtle)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--fg-muted)]">
                            {RESPONSE_STATUS_LABEL[r.status]}
                          </span>
                        </div>
                        {r.reason && <p className="text-[11px] text-[var(--fg-muted)] mt-1">{r.reason}</p>}
                        <p className="text-[10px] text-[var(--fg-muted)] mt-1 tabular-nums">
                          {new Date(r.createdAt).toLocaleString('tr-TR')}
                          {r.gibStatusCode && ` · GİB ${r.gibStatusCode}`}
                        </p>
                      </div>

                      {r.status === 'Taslak' && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            title={tr ? 'Gönderim kuyruğuna al' : 'Queue for sending'}
                            onClick={() => queueResponse.mutate(r.id)}
                            className="rounded-[3px] p-1.5 text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer"
                          >
                            <Send size={13} />
                          </button>
                          <button
                            type="button"
                            title={tr ? 'Taslağı sil' : 'Delete draft'}
                            onClick={() => deleteResponse.mutate(r.id)}
                            className="rounded-[3px] p-1.5 text-[var(--fg-muted)] hover:text-red-400 hover:bg-[var(--bg-subtle)] transition cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {data.canRespond && (
                  <form
                    className="border-t border-[var(--border-soft)] p-3 space-y-2"
                    onSubmit={(e) => { e.preventDefault(); createResponse.mutate(); }}
                  >
                    <div className="flex items-center gap-2">
                      <select
                        value={responseForm.type}
                        onChange={(e) => setResponseForm({ ...responseForm, type: e.target.value as ApplicationResponseType })}
                        className="h-8 rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2 text-xs font-semibold text-[var(--fg)] focus:outline-none cursor-pointer"
                      >
                        <option value="Kabul">{tr ? 'Kabul' : 'Accept'}</option>
                        <option value="Red">{tr ? 'Red' : 'Reject'}</option>
                        <option value="Iade">{tr ? 'İade' : 'Return'}</option>
                      </select>
                      <input
                        value={responseForm.reason}
                        onChange={(e) => setResponseForm({ ...responseForm, reason: e.target.value })}
                        placeholder={responseForm.type === 'Kabul'
                          ? (tr ? 'Gerekçe (opsiyonel)' : 'Reason (optional)')
                          : (tr ? 'Gerekçe (zorunlu)' : 'Reason (required)')}
                        required={responseForm.type !== 'Kabul'}
                        className="h-8 flex-1 rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2 text-xs text-[var(--fg)] focus:outline-none focus:border-[var(--fg-muted)]"
                      />
                      <button
                        type="submit"
                        disabled={createResponse.isPending}
                        className="inline-flex h-8 items-center gap-1 rounded-[4px] bg-[var(--fg)] px-3 text-xs font-bold text-[var(--bg)] transition cursor-pointer disabled:opacity-40"
                      >
                        <Plus size={13} />
                        {tr ? 'Taslak' : 'Draft'}
                      </button>
                    </div>
                    <p className="text-[10.5px] text-[var(--fg-muted)]">
                      {tr
                        ? 'Taslak oluşturmak GİB’e hiçbir şey göndermez. Gönderim ayrı bir adımdır.'
                        : 'Creating a draft sends nothing to GİB. Sending is a separate step.'}
                    </p>
                  </form>
                )}
              </div>

              {/* ── İtirazlar ── */}
              <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] overflow-hidden shadow-xs">
                <div className="border-b border-[var(--border-soft)] px-3 py-2">
                  <h2 className="text-xs font-bold text-[var(--fg)]">{tr ? 'İtirazlar' : 'Objections'}</h2>
                </div>

                <div className="divide-y divide-[var(--border-soft)]">
                  {data.objections.length === 0 && (
                    <p className="px-3 py-6 text-center text-xs text-[var(--fg-muted)]">
                      {tr ? 'İtiraz kaydı yok.' : 'No objections.'}
                    </p>
                  )}
                  {data.objections.map((o) => (
                    <div key={o.id} className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[var(--fg)]">{OBJECTION_CHANNEL_LABEL[o.channel]}</span>
                        <span className="rounded-[3px] bg-[var(--bg-subtle)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--fg-muted)]">
                          {OBJECTION_STATUS_LABEL[o.status]}
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--fg-muted)] mt-1">{o.reason}</p>
                      <p className="text-[10px] text-[var(--fg-muted)] mt-1 tabular-nums">
                        {o.objectionDate ?? (tr ? 'Tarih yok' : 'No date')}
                        {o.reference && ` · ${o.reference}`}
                      </p>
                    </div>
                  ))}
                </div>

                <form
                  className="border-t border-[var(--border-soft)] p-3 space-y-2"
                  onSubmit={(e) => { e.preventDefault(); createObjection.mutate(); }}
                >
                  <div className="flex items-center gap-2">
                    <select
                      value={objectionForm.channel}
                      onChange={(e) => setObjectionForm({ ...objectionForm, channel: e.target.value as ObjectionChannel })}
                      className="h-8 rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2 text-xs font-semibold text-[var(--fg)] focus:outline-none cursor-pointer"
                    >
                      <option value="Kep">KEP</option>
                      <option value="GibPortal">{tr ? 'GİB Portalı' : 'GİB Portal'}</option>
                      <option value="ResmiYazi">{tr ? 'Resmi Yazı' : 'Official Letter'}</option>
                    </select>
                    <input
                      type="date"
                      value={objectionForm.objectionDate}
                      onChange={(e) => setObjectionForm({ ...objectionForm, objectionDate: e.target.value })}
                      className="h-8 rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2 text-xs text-[var(--fg)] focus:outline-none cursor-pointer"
                    />
                    <input
                      value={objectionForm.reference}
                      onChange={(e) => setObjectionForm({ ...objectionForm, reference: e.target.value })}
                      placeholder={tr ? 'Referans no' : 'Reference'}
                      className="h-8 w-28 rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2 text-xs text-[var(--fg)] focus:outline-none focus:border-[var(--fg-muted)]"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      value={objectionForm.reason}
                      onChange={(e) => setObjectionForm({ ...objectionForm, reason: e.target.value })}
                      placeholder={tr ? 'İtiraz gerekçesi (zorunlu)' : 'Reason (required)'}
                      required
                      className="h-8 flex-1 rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2 text-xs text-[var(--fg)] focus:outline-none focus:border-[var(--fg-muted)]"
                    />
                    <button
                      type="submit"
                      disabled={createObjection.isPending}
                      className="inline-flex h-8 items-center gap-1 rounded-[4px] bg-[var(--fg)] px-3 text-xs font-bold text-[var(--bg)] transition cursor-pointer disabled:opacity-40"
                    >
                      <Plus size={13} />
                      {tr ? 'Kaydet' : 'Save'}
                    </button>
                  </div>
                  <p className="text-[10.5px] text-[var(--fg-muted)]">
                    {tr
                      ? 'Temel faturaya uygulama yanıtı verilemez; itirazın tek izlenebilir yolu bu kanallardır.'
                      : 'Basic invoices cannot be answered — objections go through these channels.'}
                  </p>
                </form>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
