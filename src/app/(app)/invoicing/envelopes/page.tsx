'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Mail, AlertTriangle, Info } from 'lucide-react';
import {
  envelopeApi,
  ENVELOPE_STATUS_LABEL,
  type EnvelopeStatus,
} from '../../../../lib/api/e-belge';
import { useBillingEntitySelector } from '../../../../features/accounting/useBillingEntitySelector';
import { InvoicingSubTabBar } from '../../../../components/layout/InvoicingSubTabBar';
import { FilterSelect } from '../../../../components/ui/FilterSelect';
import { describeError } from '../../../../lib/errors';
import { useI18n } from '../../../../lib/i18n';

const STATUS_TONE: Record<EnvelopeStatus, string> = {
  Taslak: 'bg-[var(--bg-subtle)] text-[var(--fg-muted)]',
  Gonderilecek: 'bg-sky-500/15 text-sky-300',
  Gonderildi: 'bg-emerald-500/15 text-emerald-400',
  Gonderilemedi: 'bg-red-500/15 text-red-400',
  AliciyaUlasmadi: 'bg-amber-500/15 text-amber-300',
};

export default function EnvelopesPage() {
  const { lang } = useI18n();
  const tr = lang === 'tr';

  const { entities, billingEntityId, setBillingEntityId } = useBillingEntitySelector();
  const [direction, setDirection] = useState('');
  const [status, setStatus] = useState('');

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['envelopes', direction, status, billingEntityId],
    queryFn: () => envelopeApi.list(direction || undefined, status || undefined, billingEntityId ?? undefined),
    staleTime: 10_000,
  });

  const envelopes = data ?? [];
  const failed = envelopes.filter((e) => e.status === 'Gonderilemedi' || e.status === 'AliciyaUlasmadi');

  return (
    <div className="flex h-full flex-col overflow-hidden bg-transparent">
      <InvoicingSubTabBar />

      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-base font-bold text-[var(--fg)] tracking-tight">
              {tr ? 'Zarflar' : 'Envelopes'}
            </h1>
            <p className="text-xs text-[var(--fg-muted)] mt-0.5">
              {tr
                ? 'GİB belge taşıma birimi. Zarf ulaşmazsa içindeki hiçbir fatura ulaşmaz.'
                : 'The GİB transport unit. If an envelope fails, none of its invoices arrive.'}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <FilterSelect
              value={billingEntityId ? String(billingEntityId) : ''}
              placeholder={tr ? 'Tüm Şirketler' : 'All Entities'}
              onChange={(v) => setBillingEntityId(v ? Number(v) : 0)}
              options={entities.map((be) => ({ value: String(be.id), label: be.legalName }))}
              minWidth={180}
            />
            <FilterSelect
              value={direction}
              placeholder={tr ? 'Tüm Yönler' : 'All Directions'}
              onChange={setDirection}
              options={[
                { value: '', label: tr ? 'Tüm Yönler' : 'All' },
                { value: 'Outgoing', label: tr ? 'Giden' : 'Outgoing' },
                { value: 'Incoming', label: tr ? 'Gelen' : 'Incoming' },
              ]}
              minWidth={130}
            />
            <FilterSelect
              value={status}
              placeholder={tr ? 'Tüm Durumlar' : 'All Statuses'}
              onChange={setStatus}
              options={[
                { value: '', label: tr ? 'Tüm Durumlar' : 'All' },
                ...(Object.keys(ENVELOPE_STATUS_LABEL) as EnvelopeStatus[]).map((s) => ({
                  value: s,
                  label: ENVELOPE_STATUS_LABEL[s],
                })),
              ]}
              minWidth={160}
            />
          </div>
        </div>

        {isError && (
          <div className="flex items-start gap-2 rounded-[4px] border border-red-500/30 bg-red-500/10 px-3 py-2.5">
            <AlertTriangle size={14} className="text-red-400 mt-0.5 shrink-0" />
            <p className="text-xs text-red-300">{describeError(error)}</p>
          </div>
        )}

        {failed.length > 0 && (
          <div className="flex items-start gap-2 rounded-[4px] border border-amber-500/40 bg-amber-500/10 px-3 py-2.5">
            <AlertTriangle size={14} className="text-amber-400 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-200/90 leading-relaxed">
              {tr
                ? `${failed.length} zarf alıcısına ulaşmadı veya gönderilemedi — içindeki ${failed.reduce((s, e) => s + e.documentCount, 0)} belge de ulaşmamış demektir.`
                : `${failed.length} envelopes failed.`}
            </p>
          </div>
        )}

        <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[var(--border-soft)] text-[var(--fg-muted)]">
                  <th className="px-3 py-2 text-left font-semibold">{tr ? 'Zarf No' : 'Envelope ID'}</th>
                  <th className="px-3 py-2 text-left font-semibold">{tr ? 'Yön' : 'Direction'}</th>
                  <th className="px-3 py-2 text-left font-semibold">{tr ? 'Durum' : 'Status'}</th>
                  <th className="px-3 py-2 text-left font-semibold">{tr ? 'Şirket' : 'Entity'}</th>
                  <th className="px-3 py-2 text-right font-semibold">{tr ? 'Belge' : 'Docs'}</th>
                  <th className="px-3 py-2 text-left font-semibold">{tr ? 'GİB Kodu' : 'GİB Code'}</th>
                  <th className="px-3 py-2 text-left font-semibold">{tr ? 'Gönderim' : 'Sent'}</th>
                  <th className="px-3 py-2 text-left font-semibold">{tr ? 'Faturalar' : 'Invoices'}</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr><td colSpan={8} className="px-3 py-6 text-center text-[var(--fg-muted)]">{tr ? 'Yükleniyor…' : 'Loading…'}</td></tr>
                )}
                {!isLoading && envelopes.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center text-[var(--fg-muted)]">
                      {tr
                        ? 'Zarf kaydı yok. Zarflar gerçek sağlayıcı entegrasyonu bağlandığında oluşur.'
                        : 'No envelopes yet — created once a real provider is connected.'}
                    </td>
                  </tr>
                )}
                {envelopes.map((e) => (
                  <tr key={e.id} className="border-b border-[var(--border-soft)] last:border-0">
                    <td className="px-3 py-2 font-mono text-[10px] text-[var(--fg)] break-all">{e.envelopeId ?? '—'}</td>
                    <td className="px-3 py-2 text-[var(--fg-muted)]">
                      {e.direction === 'Outgoing' ? (tr ? 'Giden' : 'Outgoing') : (tr ? 'Gelen' : 'Incoming')}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`rounded-[3px] px-2 py-0.5 text-[10.5px] font-bold ${STATUS_TONE[e.status]}`}>
                        {ENVELOPE_STATUS_LABEL[e.status]}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-[var(--fg-muted)]">{e.billingEntityName ?? '—'}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-[var(--fg)]">{e.documentCount}</td>
                    <td className="px-3 py-2 tabular-nums text-[var(--fg-muted)]">{e.gibStatusCode ?? '—'}</td>
                    <td className="px-3 py-2 tabular-nums text-[var(--fg-muted)]">
                      {e.sentAt ? new Date(e.sentAt).toLocaleString('tr-TR') : '—'}
                    </td>
                    <td className="px-3 py-2 text-[var(--fg-muted)]">
                      {e.invoices.length === 0 ? '—' : e.invoices.map((i) => i.invoiceNumber).join(', ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex items-start gap-2 rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] px-3 py-2.5">
          <Mail size={14} className="text-[var(--fg-muted)] mt-0.5 shrink-0" />
          <p className="text-[11px] text-[var(--fg-muted)] leading-relaxed">
            {tr
              ? '"Alıcısına Ulaşmadı" durumu teknik bir gönderim hatası değildir: zarf GİB\'e ulaşmış ama alıcının posta kutusuna düşmemiştir. Çözümü genellikle alıcı etiketinin (GİB posta kutusu) yanlış olmasıdır — Adres Defteri\'nden etiketi kontrol edin.'
              : '"Not delivered" means the envelope reached GİB but not the recipient\'s mailbox — usually a wrong alias.'}
          </p>
        </div>

        <div className="flex items-start gap-2 rounded-[4px] border border-[var(--border-soft)] px-3 py-2.5">
          <Info size={14} className="text-[var(--fg-muted)] mt-0.5 shrink-0" />
          <p className="text-[11px] text-[var(--fg-muted)] leading-relaxed">
            {tr
              ? 'Bu ekran yalnızca OKUMA yapar. Zarf üretimi ve gönderimi gerçek e-Fatura sağlayıcı entegrasyonuna bağlıdır; sağlayıcı bağlanana kadar bu liste boş kalır — sahte zarf kaydı üretilmez.'
              : 'Read-only. Envelopes are created by the real provider integration.'}
          </p>
        </div>
      </div>
    </div>
  );
}
