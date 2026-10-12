'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronRight, Images, Pencil, RefreshCw, Send, Trash2 } from 'lucide-react';
import { productGapApi, type ProductGapDispatchLog } from '../../lib/api/product-gap';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { toast } from '../../lib/toast';
import { describeError } from '../../lib/errors';
import { dispatchStatusLabel } from './product-gap-ui';

const GHOST_BTN =
  'inline-flex items-center gap-1 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-2 h-7 text-[11px] font-semibold text-[var(--fg)] transition hover:bg-[var(--bg-subtle)] cursor-pointer disabled:opacity-40';

// Payload alan adı → okunur etiket. Bilinmeyen alan ham adıyla gösterilir (gizlenmez).
const FIELD_LABELS: Record<string, string> = {
  name: 'Ürün adı',
  sku: 'SKU',
  barcode: 'Barkod',
  brand: 'Marka',
  price: 'Satış fiyatı',
  purchasePrice: 'Alış fiyatı',
  currency: 'Para birimi',
  stockQuantity: 'Stok',
  warehouseId: 'Depo',
  vatRate: 'KDV',
  desi: 'Desi',
};

export function DispatchLogTable({ isTr }: { isTr: boolean }) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProductGapDispatchLog | null>(null);

  const logQuery = useQuery({
    queryKey: ['product-gap', 'dispatch-log'],
    queryFn: () => productGapApi.dispatchLog(),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['product-gap'] });
  };

  const retry = useMutation({
    mutationFn: (candidateId: number) => productGapApi.send(candidateId, { includeImages: true }),
    onSuccess: (result) => {
      invalidate();
      if (result.success) toast.success(isTr ? 'Yeniden gönderildi.' : 'Re-sent.');
      else toast.error(result.error ?? (isTr ? 'Gönderilemedi.' : 'Send failed.'));
    },
    onError: (e) => toast.error(describeError(e)),
  });

  const deleteFromErp = useMutation({
    mutationFn: (candidateId: number) => productGapApi.deleteFromErp(candidateId),
    onSuccess: (result) => {
      invalidate();
      setDeleteTarget(null);
      if (result.success) toast.success(isTr ? 'Ürün hedef ERP\'den silindi.' : 'Deleted from target ERP.');
      else toast.error(result.error ?? (isTr ? 'Silinemedi.' : 'Delete failed.'));
    },
    onError: (e) => {
      setDeleteTarget(null);
      toast.error(describeError(e));
    },
  });

  const rows = logQuery.data ?? [];

  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <table className="w-full min-w-[960px] border-collapse text-left text-xs">
        <thead className="sticky top-0 z-10 bg-[var(--card)] text-[10.5px] font-bold uppercase tracking-wider text-[var(--fg-muted)] shadow-[inset_0_-1px_0_var(--border-soft)]">
          <tr>
            <th className="w-8 px-3 py-2.5"></th>
            <th className="px-3 py-2.5">{isTr ? 'Ürün' : 'Product'}</th>
            <th className="px-3 py-2.5">{isTr ? 'Kaynak → Hedef' : 'Source → Target'}</th>
            <th className="px-3 py-2.5">{isTr ? 'Gönderen' : 'Sent by'}</th>
            <th className="px-3 py-2.5">{isTr ? 'Tarih' : 'Date'}</th>
            <th className="px-3 py-2.5">{isTr ? 'Şekil' : 'Mode'}</th>
            <th className="px-3 py-2.5">{isTr ? 'Durum' : 'Status'}</th>
            <th className="px-3 py-2.5 text-right">{isTr ? 'İşlem' : 'Action'}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border-soft)]">
          {logQuery.isLoading && (
            <tr><td colSpan={8} className="px-4 py-10 text-center text-[var(--fg-muted)]">
              {isTr ? 'Yükleniyor…' : 'Loading…'}
            </td></tr>
          )}
          {!logQuery.isLoading && rows.length === 0 && (
            <tr><td colSpan={8} className="px-4 py-10 text-center text-[var(--fg-muted)]">
              {isTr ? 'Henüz gönderim yapılmadı.' : 'Nothing sent yet.'}
            </td></tr>
          )}
          {rows.map((row) => {
            const status = dispatchStatusLabel(row.dispatchStatus, isTr);
            const isOpen = expanded === row.id;
            return (
              <>
                <tr key={row.id} className="transition hover:bg-[var(--bg-subtle)]/40">
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => setExpanded(isOpen ? null : row.id)}
                      title={isTr ? 'Gönderilen bilgiler' : 'Sent fields'}
                      className="flex h-6 w-6 items-center justify-center rounded-[4px] text-[var(--fg-muted)] transition hover:bg-[var(--bg-subtle)] hover:text-[var(--fg)] cursor-pointer"
                    >
                      {isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                    </button>
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-semibold text-[var(--fg)]">{row.productName}</div>
                    <div className="font-mono text-[10.5px] text-[var(--fg-muted)]">{row.productSku || '—'}</div>
                  </td>
                  <td className="px-3 py-2 text-[11.5px] text-[var(--fg)]">
                    {row.sourceName} <span className="text-[var(--fg-muted)]">→</span> {row.targetName}
                  </td>
                  <td className="px-3 py-2 text-[11px] text-[var(--fg-muted)]">{row.sentByName}</td>
                  <td className="px-3 py-2 font-mono text-[10.5px] text-[var(--fg-muted)]">
                    {new Date(row.sentAt).toLocaleString(isTr ? 'tr-TR' : 'en-US')}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5 text-[10.5px] text-[var(--fg-muted)]">
                      {row.wasEdited
                        ? <span className="inline-flex items-center gap-1"><Pencil size={10} />{isTr ? 'Düzenlenmiş' : 'Edited'}</span>
                        : <span>{isTr ? 'Birebir' : 'As-is'}</span>}
                      {row.includedImages && (
                        <span className="inline-flex items-center gap-1"><Images size={10} />{isTr ? 'Fotoğraflı' : 'Photos'}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-col items-start gap-1">
                      {status && (
                        <span className={`inline-flex rounded-[4px] px-1.5 py-0.5 text-[10px] font-bold ${status.className}`}>
                          {status.label}
                        </span>
                      )}
                      {row.erpExternalId && (
                        <span className="font-mono text-[10px] text-[var(--fg-muted)]">
                          {isTr ? 'ERP kaydı' : 'ERP record'} #{row.erpExternalId}
                        </span>
                      )}
                      {row.deletedFromErpAt && (
                        <span className="text-[10px] font-semibold text-[var(--fg-muted)]">
                          {isTr ? "ERP'den silindi" : 'Deleted in ERP'}
                        </span>
                      )}
                      {row.dispatchError && (
                        <span className="max-w-[260px] text-[10px] leading-snug text-rose-500">{row.dispatchError}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {row.canRetry && row.candidateId !== null && (
                        <button
                          type="button"
                          disabled={retry.isPending}
                          onClick={() => retry.mutate(row.candidateId!)}
                          className={GHOST_BTN}
                        >
                          <RefreshCw size={11} className={retry.isPending ? 'animate-spin' : ''} />
                          {isTr ? 'Tekrar Gönder' : 'Retry'}
                        </button>
                      )}
                      {row.canDeleteFromErp && (
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(row)}
                          className="inline-flex h-7 items-center gap-1 rounded-[4px] border border-rose-500/40 bg-rose-500/10 px-2 text-[11px] font-semibold text-rose-600 transition hover:bg-rose-500/20 cursor-pointer dark:text-rose-400"
                        >
                          <Trash2 size={11} />
                          {isTr ? "ERP'den Sil" : 'Delete in ERP'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>

                {isOpen && (
                  <tr key={`${row.id}-detail`} className="bg-[var(--bg-subtle)]/40">
                    <td colSpan={8} className="px-10 py-3">
                      <div className="mb-1.5 flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-[var(--fg-muted)]">
                        <Send size={11} />
                        {isTr ? 'Karşı ERP’ye giden bilgiler' : 'Fields sent to target ERP'}
                      </div>
                      <div className="grid grid-cols-2 gap-x-8 gap-y-1 sm:grid-cols-3 lg:grid-cols-4">
                        {Object.entries(row.sentFields).map(([key, value]) => (
                          <div key={key} className="flex items-baseline justify-between gap-2 border-b border-[var(--border-soft)] py-1">
                            <span className="text-[10.5px] text-[var(--fg-muted)]">{FIELD_LABELS[key] ?? key}</span>
                            <span className="font-mono text-[11px] text-[var(--fg)]">{value ?? '—'}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>

      <ConfirmDialog
        open={deleteTarget !== null}
        title={isTr ? "Ürünü hedef ERP'den sil" : 'Delete product in target ERP'}
        description={isTr
          ? `"${deleteTarget?.productName}" ürünü ${deleteTarget?.targetName} tarafında KALICI olarak silinecek (ERP kaydı #${deleteTarget?.erpExternalId}). Geri alınamaz. Aday tekrar "bekliyor" durumuna döner.`
          : `"${deleteTarget?.productName}" will be PERMANENTLY deleted in ${deleteTarget?.targetName} (ERP record #${deleteTarget?.erpExternalId}). This cannot be undone.`}
        confirmLabel={isTr ? 'Kalıcı olarak sil' : 'Delete permanently'}
        cancelLabel={isTr ? 'Vazgeç' : 'Cancel'}
        onConfirm={() => { if (deleteTarget?.candidateId) deleteFromErp.mutate(deleteTarget.candidateId); }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
