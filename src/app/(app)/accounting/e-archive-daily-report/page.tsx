'use client';

import { localDateStr } from '../../../../utils/date';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Check, RefreshCw, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { eArchiveDailyReportApi, type EArchiveDailyReportSummary } from '../../../../lib/api/e-belge';
import { useBillingEntitySelector } from '../../../../features/accounting/useBillingEntitySelector';
import { AccountingSubTabBar } from '../../../../components/layout/AccountingSubTabBar';
import { FilterSelect } from '../../../../components/ui/FilterSelect';
import { toast } from '../../../../lib/toast';
import { useI18n } from '../../../../lib/i18n';

function fmt(n: number) {
  return n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function todayIso() {
  return localDateStr();
}

function firstOfMonthIso() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function NoteDialog({ row, tr, pending, onCancel, onConfirm }: {
  row: EArchiveDailyReportSummary;
  tr: boolean;
  pending: boolean;
  onCancel: () => void;
  onConfirm: (note: string) => void;
}) {
  const [note, setNote] = useState('');

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      onClick={onCancel}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-[4px] border border-[var(--border)] bg-[var(--card)] shadow-2xl p-5 text-[var(--fg)]"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-[var(--fg)]">
            {tr ? 'Bildirildi Olarak İşaretle' : 'Mark as Reported'}
          </h2>
          <button type="button" onClick={onCancel} className="text-[var(--fg-muted)] hover:text-[var(--fg)] cursor-pointer">
            <X size={15} />
          </button>
        </div>
        <p className="mt-1.5 text-xs text-[var(--fg-muted)]">
          {row.reportDate} — {row.invoiceCount} {tr ? 'fatura' : 'invoices'}
        </p>
        <div className="mt-3">
          <label className="mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase tracking-wider">
            {tr ? 'Not (opsiyonel)' : 'Note (optional)'}
          </label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={tr ? 'Örn: GİB portalından elle bildirildi.' : 'e.g. Manually reported via GİB portal.'}
            className="h-8.5 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-3 text-xs text-[var(--fg)] outline-none focus:border-[var(--fg)]"
          />
        </div>
        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="inline-flex h-8 items-center rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-semibold text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer"
          >
            {tr ? 'İptal' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={() => onConfirm(note)}
            disabled={pending}
            className="inline-flex h-8 items-center rounded-[4px] bg-[var(--fg)] px-4 text-xs font-bold text-[var(--bg)] shadow-xs hover:opacity-90 transition cursor-pointer disabled:opacity-50"
          >
            {pending ? (tr ? 'Kaydediliyor...' : 'Saving...') : tr ? 'Bildirildi İşaretle' : 'Mark Reported'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function EArchiveDailyReportPage() {
  const { lang } = useI18n();
  const tr = lang === 'tr';
  const qc = useQueryClient();

  const { entities, billingEntityId, setBillingEntityId } = useBillingEntitySelector();
  const [from, setFrom] = useState(firstOfMonthIso());
  const [to, setTo] = useState(todayIso());
  const [noteRow, setNoteRow] = useState<EArchiveDailyReportSummary | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['e-archive-daily-report', billingEntityId, from, to],
    queryFn: () => eArchiveDailyReportApi.list(billingEntityId!, from, to),
    enabled: billingEntityId !== null,
    staleTime: 10_000,
  });

  const rows = data ?? [];

  const markReported = useMutation({
    mutationFn: ({ reportDate, note }: { reportDate: string; note?: string }) =>
      eArchiveDailyReportApi.markReported(billingEntityId!, reportDate, note),
    onSuccess: () => {
      toast.success(tr ? 'Gün bildirildi olarak işaretlendi.' : 'Day marked as reported.');
      void qc.invalidateQueries({ queryKey: ['e-archive-daily-report'] });
      setNoteRow(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : (tr ? 'İşaretlenemedi.' : 'Failed to mark.')),
  });

  const unmarkReported = useMutation({
    mutationFn: (reportDate: string) => eArchiveDailyReportApi.unmarkReported(billingEntityId!, reportDate),
    onSuccess: () => {
      toast.success(tr ? 'İşaret kaldırıldı.' : 'Mark removed.');
      void qc.invalidateQueries({ queryKey: ['e-archive-daily-report'] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : (tr ? 'Kaldırılamadı.' : 'Failed to unmark.')),
  });

  const pendingCount = rows.filter((r) => !r.isReported && r.invoiceCount > 0).length;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-transparent">
      <AccountingSubTabBar />

      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div data-tour="earchive-header">
            <h1 className="text-base font-bold text-[var(--fg)] tracking-tight">
              {tr ? 'e-Arşiv Günlük Rapor İzleme' : 'e-Archive Daily Report Tracking'}
            </h1>
            <p className="text-xs text-[var(--fg-muted)] mt-0.5">
              {tr
                ? 'Günlük e-Arşiv fatura özetleri ve GİB\'e bildirim durumu.'
                : 'Daily e-Archive invoice summaries and GİB reporting status.'}
            </p>
          </div>

          <div data-tour="earchive-actions" className="flex items-center gap-2 flex-wrap">
            <FilterSelect
              value={billingEntityId ? String(billingEntityId) : ''}
              placeholder={tr ? 'Şirket Seçin' : 'Select Entity'}
              onChange={(v) => setBillingEntityId(v ? Number(v) : 0)}
              options={entities.map((be) => ({ value: String(be.id), label: be.legalName }))}
              minWidth={200}
            />
            <div className="flex items-center gap-1.5 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-2 py-1 shadow-xs">
              <input
                type="date"
                value={from}
                max={to}
                onChange={(e) => setFrom(e.target.value)}
                className="bg-transparent text-xs font-semibold text-[var(--fg)] focus:outline-none cursor-pointer"
                aria-label={tr ? 'Başlangıç' : 'From'}
              />
              <span className="text-[var(--fg-muted)]">—</span>
              <input
                type="date"
                value={to}
                min={from}
                max={todayIso()}
                onChange={(e) => setTo(e.target.value)}
                className="bg-transparent text-xs font-semibold text-[var(--fg)] focus:outline-none cursor-pointer"
                aria-label={tr ? 'Bitiş' : 'To'}
              />
            </div>
            <button
              type="button"
              onClick={() => refetch()}
              title={tr ? 'Yenile' : 'Refresh'}
              className="flex h-8 w-8 items-center justify-center rounded-[4px] border border-[var(--border)] bg-[var(--card)] text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer"
            >
              <RefreshCw size={13} />
            </button>
          </div>
        </div>

        {isError && (
          <div className="flex items-start gap-2 rounded-[4px] border border-red-500/30 bg-red-500/10 px-3 py-2.5">
            <AlertTriangle size={14} className="text-red-400 mt-0.5 shrink-0" />
            <p className="text-xs text-red-300">{(error as Error)?.message ?? (tr ? 'Veriler alınamadı.' : 'Failed to load.')}</p>
          </div>
        )}

        {isLoading && (
          <p className="text-xs text-[var(--fg-muted)]">{tr ? 'Yükleniyor…' : 'Loading…'}</p>
        )}

        {!isLoading && !isError && (
          <>
            {pendingCount > 0 && (
              <div data-tour="earchive-kpi" className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3 shadow-xs">
                <div className="text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase tracking-wide">
                  {tr ? 'Bildirilmemiş Gün Sayısı' : 'Unreported Days'}
                </div>
                <div className="text-base font-bold text-amber-400 mt-0.5">{pendingCount}</div>
              </div>
            )}

            <div data-tour="earchive-table" className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead className="border-b border-[var(--border-soft)] bg-[var(--bg-subtle)]/50 text-[10.5px] font-bold uppercase tracking-wider text-[var(--fg-muted)]">
                    <tr>
                      <th className="px-4 py-3">{tr ? 'TARİH' : 'DATE'}</th>
                      <th className="px-4 py-3 text-right">{tr ? 'FATURA ADEDİ' : 'INVOICE COUNT'}</th>
                      <th className="px-4 py-3 text-right">{tr ? 'TOPLAM TUTAR' : 'TOTAL AMOUNT'}</th>
                      <th className="px-4 py-3">{tr ? 'BİLDİRİLDİ Mİ?' : 'REPORTED?'}</th>
                      <th className="px-4 py-3">{tr ? 'NOT' : 'NOTE'}</th>
                      <th className="px-4 py-3 text-right">{tr ? 'İŞLEM' : 'ACTION'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-soft)]">
                    {rows.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-xs text-[var(--fg-muted)]">
                          {tr ? 'Seçilen dönemde kayıt bulunamadı.' : 'No records in this period.'}
                        </td>
                      </tr>
                    ) : (
                      rows.map((r) => (
                        <tr key={r.reportDate} className="hover:bg-[var(--bg-subtle)]/40 transition">
                          <td className="px-4 py-3 font-semibold text-[var(--fg)]">{r.reportDate}</td>
                          <td className="px-4 py-3 text-right tabular-nums text-[var(--fg)]">{r.invoiceCount}</td>
                          <td className="px-4 py-3 text-right tabular-nums text-[var(--fg)]">{fmt(r.totalAmount)} ₺</td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center gap-1 rounded-[3px] border px-2 py-0.5 text-[10.5px] font-bold ${
                                r.isReported
                                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                                  : 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                              }`}
                            >
                              {r.isReported && <Check size={10} />}
                              {r.isReported ? (tr ? 'Bildirildi' : 'Reported') : tr ? 'Bekliyor' : 'Pending'}
                            </span>
                            {r.isReported && r.reportedAt && (
                              <div className="mt-0.5 text-[10px] text-[var(--fg-muted)]">
                                {new Date(r.reportedAt).toLocaleString('tr-TR')}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-[var(--fg-muted)]">{r.note || '—'}</td>
                          <td className="px-4 py-3 text-right">
                            {r.isReported ? (
                              <button
                                type="button"
                                onClick={() => unmarkReported.mutate(r.reportDate)}
                                disabled={unmarkReported.isPending}
                                className="inline-flex h-7 items-center gap-1 rounded-[3px] border border-[var(--border)] bg-[var(--card)] px-2.5 text-xs font-semibold text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer disabled:opacity-50"
                              >
                                {tr ? 'İşareti Kaldır' : 'Unmark'}
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setNoteRow(r)}
                                disabled={r.invoiceCount === 0}
                                title={r.invoiceCount === 0 ? (tr ? 'Bu günde fatura yok.' : 'No invoices this day.') : undefined}
                                className="inline-flex h-7 items-center gap-1 rounded-[3px] bg-[var(--fg)] px-2.5 text-xs font-bold text-[var(--bg)] shadow-xs hover:opacity-90 transition cursor-pointer disabled:opacity-40"
                              >
                                <Check size={11} />
                                <span>{tr ? 'Bildirildi İşaretle' : 'Mark Reported'}</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {noteRow && (
        <NoteDialog
          row={noteRow}
          tr={tr}
          pending={markReported.isPending}
          onCancel={() => setNoteRow(null)}
          onConfirm={(note) => markReported.mutate({ reportDate: noteRow.reportDate, note: note.trim() || undefined })}
        />
      )}
    </div>
  );
}
