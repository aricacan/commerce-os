'use client';

import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  ArrowLeft, FileWarning, CheckCircle2, AlertTriangle, HelpCircle, Loader2, Send, X,
} from 'lucide-react';
import {
  trendyolInvoiceApi,
  type InvoiceUploadFile,
  type InvoiceSendResult,
  type InvoiceSendDecision,
} from '../../lib/api';
import { useI18n } from '../../lib/i18n';

interface FileRow extends InvoiceUploadFile {
  included: boolean;
}

function toRow(file: InvoiceUploadFile): FileRow {
  return { ...file, included: file.status === 'AutoMatched' && file.sendStatus === 'NotSent' };
}

function statusMeta(status: InvoiceUploadFile['status'], isTr: boolean) {
  switch (status) {
    case 'AutoMatched':
      return { label: isTr ? 'Eşleşti' : 'Matched', tone: 'emerald', Icon: CheckCircle2 };
    case 'Ambiguous':
      return { label: isTr ? 'Belirsiz — seçim yapın' : 'Ambiguous — pick one', tone: 'amber', Icon: AlertTriangle };
    case 'Unmatched':
      return { label: isTr ? 'Sipariş bulunamadı' : 'No order found', tone: 'rose', Icon: HelpCircle };
    case 'UnsupportedFileType':
      return { label: isTr ? 'Desteklenmeyen dosya türü' : 'Unsupported file type', tone: 'rose', Icon: FileWarning };
    case 'ParseFailed':
    default:
      return { label: isTr ? 'Dosya adı tanınamadı' : 'Filename not recognized', tone: 'rose', Icon: FileWarning };
  }
}

const TONE_CLASSES: Record<string, string> = {
  emerald: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  amber: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400',
  rose: 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400',
};

function money(n: number | null): string {
  if (n === null) return '—';
  return `₺${n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function TrendyolInvoiceUploadDetailPageView({ batchId }: { batchId: string }) {
  const { lang } = useI18n();
  const isTr = lang === 'tr';
  const router = useRouter();
  const queryClient = useQueryClient();

  const batchQuery = useQuery({
    queryKey: ['trendyol-invoice-batch-detail', batchId],
    queryFn: () => trendyolInvoiceApi.batchDetail(batchId),
  });

  const [rows, setRows] = useState<FileRow[] | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // Sunucudan gelen veriyi yalnızca İLK yüklemede yerel satır durumuna aktar; sonraki
  // yeniden çekimlerde (invalidate sonrası) kullanıcının o an açık checkbox seçimlerini ezmeyelim.
  const effectiveRows = rows ?? (batchQuery.data ? batchQuery.data.files.map(toRow) : null);

  function updateRow(fileId: string, patch: Partial<FileRow>) {
    if (!effectiveRows) return;
    setRows(effectiveRows.map((row) => (row.fileId === fileId ? { ...row, ...patch } : row)));
  }

  if (batchQuery.isLoading || !effectiveRows || !batchQuery.data) {
    return (
      <div className="flex h-full w-full items-center justify-center p-8 text-xs text-[var(--fg-muted)]">
        {isTr ? 'Yükleniyor…' : 'Loading…'}
      </div>
    );
  }

  const batch = batchQuery.data;
  const readyToSendCount = effectiveRows.filter(
    (row) => row.included && row.selectedShipmentPackageId !== null && row.sendStatus !== 'Sent',
  ).length;
  const allDone = effectiveRows.length > 0 && effectiveRows.every((row) => row.sendStatus !== 'NotSent' || !row.included);

  async function handleSend() {
    if (!effectiveRows) return;
    // Aday, seçili paket numarasıyla BULUNAMAZSA satır sessizce atlanır. Önceden burada
    // non-null assertion (!) vardı: eski bir partide seçim adaylar arasında değilse
    // undefined üzerinden alan okunur ve "Gönder" hiçbir açıklama vermeden çökerdi.
    const decisions = effectiveRows
      .filter((row) => row.included && row.selectedShipmentPackageId !== null && row.sendStatus !== 'Sent')
      .map((row) => {
        const candidate = row.candidates.find((c) => c.shipmentPackageId === row.selectedShipmentPackageId);
        return candidate
          ? {
              fileId: row.fileId,
              shipmentPackageId: candidate.shipmentPackageId,
              platformOrderNumber: candidate.platformOrderNumber,
            }
          : null;
      })
      .filter((decision): decision is InvoiceSendDecision => decision !== null);

    if (decisions.length === 0) {
      setSendError(isTr
        ? 'Gönderilecek geçerli eşleşme yok — sayfayı yenileyip tekrar deneyin.'
        : 'No valid match to send — refresh the page and try again.');
      return;
    }

    setIsSending(true);
    setSendError(null);
    try {
      const results = await trendyolInvoiceApi.send(batchId, decisions);
      setRows(
        effectiveRows.map((row) => {
          const result = results.find((r: InvoiceSendResult) => r.fileId === row.fileId);
          if (!result) return row;
          return { ...row, sendStatus: result.success ? 'Sent' : 'Failed', sendErrorMessage: result.errorMessage };
        }),
      );
      void queryClient.invalidateQueries({ queryKey: ['trendyol-invoice-batches'] });
    } catch (error) {
      setSendError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto bg-transparent p-4 md:p-5">
      <div className="flex min-h-0 flex-1 flex-col rounded-[6px] border border-[var(--border-soft)] bg-[var(--card)]">

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[var(--border-soft)] p-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push('/trendyol/uploads')}
              className="inline-flex h-8 w-8 items-center justify-center rounded-[4px] text-[var(--fg-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--fg)]"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <div className="text-sm font-bold text-[var(--fg)]">
                {batch.erpLabel} → {batch.connectionLabel}
              </div>
              <div className="font-mono text-[11px] text-[var(--fg-muted)]">
                {batch.windowFromDate} — {batch.windowToDate}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={readyToSendCount === 0 || isSending}
            className="inline-flex h-9 items-center gap-2 rounded-[4px] bg-sky-600 px-4 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-40 hover:bg-sky-700"
          >
            {isSending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            {isTr ? `Gönder (${readyToSendCount})` : `Send (${readyToSendCount})`}
          </button>
        </div>

        {/* TAMLIK METRİĞİ: yüklenen PDF yığınında başka firmaların faturaları da karışmış
            olabilir (fiziksel tarama ayrımı yok) — bu, Trendyol'daki gerçek sipariş sayısıyla
            eşleşen sayısını karşılaştırıp "kaç faturanız hâlâ eksik" sorusunu cevaplar. */}
        {batch.totalOrdersInWindow > 0 && (
          <div
            className={`m-3 shrink-0 flex items-center gap-2 rounded-[4px] border px-3 py-2 text-xs ${
              batch.matchedOrderCount >= batch.totalOrdersInWindow
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                : 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400'
            }`}
          >
            {batch.matchedOrderCount >= batch.totalOrdersInWindow ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
            {batch.matchedOrderCount >= batch.totalOrdersInWindow ? (
              <span>
                {isTr
                  ? `Tamam — bu aralıktaki ${batch.totalOrdersInWindow} siparişin hepsine fatura eşleşti.`
                  : `Complete — all ${batch.totalOrdersInWindow} orders in this range have a matched invoice.`}
              </span>
            ) : (
              <span>
                {isTr
                  ? `${batch.matchedOrderCount}/${batch.totalOrdersInWindow} sipariş eşleşti — ${batch.totalOrdersInWindow - batch.matchedOrderCount} faturanız eksik.`
                  : `${batch.matchedOrderCount}/${batch.totalOrdersInWindow} orders matched — ${batch.totalOrdersInWindow - batch.matchedOrderCount} invoices still missing.`}
              </span>
            )}
          </div>
        )}

        {sendError && (
          <div className="m-3 shrink-0 rounded-[4px] border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-700 dark:text-rose-400">
            {sendError}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead className="sticky top-0 z-10 border-b border-[var(--border-soft)] bg-[var(--bg-subtle)] text-[10.5px] font-bold uppercase tracking-wider text-[var(--fg-muted)]">
              <tr>
                <th className="w-8 px-3 py-2.5"></th>
                <th className="px-3.5 py-2.5">{isTr ? 'Dosya' : 'File'}</th>
                <th className="px-3.5 py-2.5">{isTr ? 'Durum' : 'Status'}</th>
                <th className="px-3.5 py-2.5">{isTr ? 'Eşleşen Sipariş' : 'Matched Order'}</th>
                <th className="px-3.5 py-2.5">{isTr ? 'Sipariş İçeriği (bizde)' : 'Order Content (ours)'}</th>
                <th className="px-3.5 py-2.5 text-right">{isTr ? 'Tutar' : 'Amount'}</th>
                <th className="px-3.5 py-2.5">{isTr ? 'Sonuç' : 'Result'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-soft)]">
              {effectiveRows.map((row) => {
                const meta = statusMeta(row.status, isTr);
                const canSend = row.status === 'AutoMatched' || row.status === 'Ambiguous';
                const alreadySent = row.sendStatus === 'Sent';
                const selectedCandidate = row.candidates.find((c) => c.shipmentPackageId === row.selectedShipmentPackageId);

                return (
                  <tr key={row.fileId} className={alreadySent ? 'bg-emerald-500/[0.03]' : row.sendStatus === 'Failed' ? 'bg-rose-500/[0.03]' : ''}>
                    <td className="px-3 py-2">
                      {canSend && !alreadySent && (
                        <input
                          type="checkbox"
                          checked={row.included}
                          onChange={(e) => updateRow(row.fileId, { included: e.target.checked })}
                          className="h-3.5 w-3.5 accent-sky-600"
                        />
                      )}
                    </td>
                    <td className="px-3.5 py-2">
                      <div className="max-w-[220px] truncate font-mono text-[10.5px] text-[var(--fg)]" title={row.fileName}>
                        {row.fileName}
                      </div>
                      {row.parsedCustomerName && (
                        <div className="text-[10px] text-[var(--fg-muted)]">{row.parsedCustomerName}</div>
                      )}
                    </td>
                    <td className="px-3.5 py-2">
                      <span className={`inline-flex items-center gap-1 rounded-[3px] border px-1.5 py-0.5 text-[10px] font-bold ${TONE_CLASSES[meta.tone]}`}>
                        <meta.Icon size={11} /> {meta.label}
                      </span>
                    </td>
                    <td className="px-3.5 py-2">
                      {row.status === 'Ambiguous' && !alreadySent ? (
                        <div className="flex flex-col gap-1">
                          {row.candidates.map((c) => (
                            <label
                              key={c.shipmentPackageId}
                              className={`flex cursor-pointer flex-col gap-0.5 rounded-[4px] border px-2 py-1.5 text-[10.5px] ${
                                row.selectedShipmentPackageId === c.shipmentPackageId
                                  ? 'border-sky-500 bg-sky-500/10'
                                  : 'border-[var(--border-soft)] hover:border-[var(--border)]'
                              }`}
                            >
                              <span className="flex items-center gap-1.5">
                                <input
                                  type="radio"
                                  name={`candidate-${row.fileId}`}
                                  checked={row.selectedShipmentPackageId === c.shipmentPackageId}
                                  onChange={() =>
                                    updateRow(row.fileId, {
                                      selectedShipmentPackageId: c.shipmentPackageId,
                                      selectedPlatformOrderNumber: c.platformOrderNumber,
                                      included: true,
                                    })
                                  }
                                  className="h-3 w-3 accent-sky-600"
                                />
                                <span className="font-mono font-semibold text-[var(--fg)]">{c.platformOrderNumber}</span>
                                <span className="text-[var(--fg-muted)]">{c.customerName}</span>
                                <span className="ml-auto font-mono">{money(c.totalAmount)}</span>
                              </span>
                              {/* Ürün içeriği: PDF'ten hiçbir şey okunmaz, sadece bizdeki sipariş verisi
                                  yanında listelenir — belirsiz eşleşmede karar hep kullanıcıda kalır. */}
                              {c.productSummary.length > 0 ? (
                                <span className="pl-4 text-[10px] text-[var(--fg-muted)]">
                                  {c.productSummary.join(', ')}
                                </span>
                              ) : (
                                <span className="pl-4 text-[10px] italic text-[var(--fg-muted)]">
                                  {isTr ? 'Bizde henüz kalem bilgisi yok' : 'No line items in our system yet'}
                                </span>
                              )}
                            </label>
                          ))}
                        </div>
                      ) : selectedCandidate ? (
                        <div>
                          <div className="font-mono text-[11px] font-semibold text-[var(--fg)]">
                            {selectedCandidate.platformOrderNumber}
                          </div>
                          <div className="text-[10px] text-[var(--fg-muted)]">{selectedCandidate.customerName}</div>
                        </div>
                      ) : (
                        <span className="text-[10.5px] text-[var(--fg-muted)]">—</span>
                      )}
                    </td>
                    <td className="max-w-[260px] px-3.5 py-2">
                      {selectedCandidate && selectedCandidate.productSummary.length > 0 ? (
                        <ul className="space-y-0.5 text-[10.5px] text-[var(--fg-muted)]">
                          {selectedCandidate.productSummary.map((line, i) => (
                            <li key={i} className="truncate" title={line}>{line}</li>
                          ))}
                        </ul>
                      ) : selectedCandidate ? (
                        <span className="text-[10.5px] italic text-[var(--fg-muted)]">
                          {isTr ? 'Bizde henüz kalem bilgisi yok' : 'No line items in our system yet'}
                        </span>
                      ) : (
                        <span className="text-[10.5px] text-[var(--fg-muted)]">—</span>
                      )}
                    </td>
                    <td className="px-3.5 py-2 text-right font-mono tabular-nums">
                      {money(selectedCandidate?.totalAmount ?? null)}
                    </td>
                    <td className="px-3.5 py-2">
                      {row.sendStatus === 'Sent' ? (
                        <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-emerald-600">
                          <CheckCircle2 size={12} /> {isTr ? 'Gönderildi' : 'Sent'}
                        </span>
                      ) : row.sendStatus === 'Failed' ? (
                        <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-rose-600" title={row.sendErrorMessage ?? ''}>
                          <X size={12} /> {isTr ? 'Hata — tekrar deneyin' : 'Failed — retry'}
                        </span>
                      ) : (
                        <span className="text-[10.5px] text-[var(--fg-muted)]">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {allDone && (
          <div className="shrink-0 border-t border-[var(--border-soft)] p-3 text-center text-xs font-semibold text-emerald-600">
            {isTr ? 'Bu yükleme partisi tamamlandı.' : 'This upload batch is complete.'}
          </div>
        )}
      </div>
    </div>
  );
}
