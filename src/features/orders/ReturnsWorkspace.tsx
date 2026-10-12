'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { returnsApi, type ReturnDocument, type ReturnStatusName } from '../../lib/api/returns';
import { NewReturnDialog } from './NewReturnDialog';
import { AddReturnLineForm } from './AddReturnLineForm';
import { ReturnCustomerPicker } from './ReturnCustomerPicker';
import { describeError } from '../../lib/errors';

export type ReturnAction = 'approve' | 'reject' | 'complete' | 'creditNote' | 'markStockHandled';

/**
 * Hangi durumda hangi aksiyonun görüneceği — saf, bileşenden ayrı.
 */
export function nextReturnActions(status: ReturnStatusName): ReturnAction[] {
  switch (status) {
    case 'Draft':
      return ['approve', 'reject'];
    case 'Approved':
      return ['complete', 'reject'];
    case 'Completed':
      return ['creditNote', 'markStockHandled'];
    case 'Rejected':
      return [];
  }
}

export function returnStatusLabel(status: ReturnStatusName): string {
  switch (status) {
    case 'Draft':
      return 'Taslak';
    case 'Approved':
      return 'Onaylandı';
    case 'Completed':
      return 'Tamamlandı';
    case 'Rejected':
      return 'Reddedildi';
  }
}

const ACTION_LABEL: Record<ReturnAction, string> = {
  approve: 'Onayla',
  reject: 'Reddet',
  complete: 'Tamamla',
  creditNote: 'İade Faturası Kes',
  markStockHandled: 'Depo Girişi Yapıldı',
};

const STATUS_BADGE: Record<ReturnStatusName, string> = {
  Draft: 'bg-bg-subtle text-fg-muted',
  Approved: 'bg-info-soft text-info',
  Completed: 'bg-success-soft text-success',
  Rejected: 'bg-danger-soft text-danger',
};

const FILTERS: ReadonlyArray<{ id: ReturnStatusName | null; label: string }> = [
  { id: null, label: 'Tümü' },
  { id: 'Draft', label: 'Taslak' },
  { id: 'Approved', label: 'Onaylandı' },
  { id: 'Completed', label: 'Tamamlandı' },
  { id: 'Rejected', label: 'Reddedildi' },
];

export function ReturnsWorkspace({
  search = '',
  showInfo = false,
  onCloseInfo,
}: {
  search?: string;
  showInfo?: boolean;
  onCloseInfo?: () => void;
} = {}) {
  const [status, setStatus] = useState<ReturnStatusName | null>(null);
  const [rows, setRows] = useState<ReturnDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const reload = useCallback(async (next: ReturnStatusName | null) => {
    setLoading(true);
    try {
      setRows(await returnsApi.list(next ?? undefined));
      setError(null);
    } catch {
      setError('İade belgeleri yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload(status);
  }, [status, reload]);

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.trim().toLowerCase();
    return rows.filter(
      (r) =>
        r.id.toString().includes(q) ||
        (r.orderId && r.orderId.toString().toLowerCase().includes(q)) ||
        (r.reason && r.reason.toLowerCase().includes(q)) ||
        (r.creditNoteInvoiceId && r.creditNoteInvoiceId.toString().toLowerCase().includes(q))
    );
  }, [rows, search]);

  async function run(id: number, action: ReturnAction) {
    setBusyId(id);
    setError(null);
    try {
      if (action === 'approve') await returnsApi.approve(id);
      if (action === 'reject') await returnsApi.reject(id);
      if (action === 'complete') await returnsApi.complete(id);
      if (action === 'creditNote') await returnsApi.creditNote(id);
      if (action === 'markStockHandled') await returnsApi.markStockHandled(id);
      await reload(status);
    } catch {
      setError(`${ACTION_LABEL[action]} işlemi başarısız oldu.`);
    } finally {
      setBusyId(null);
    }
  }

  async function removeLine(returnId: number, lineId: number) {
    setBusyId(returnId);
    setError(null);
    try {
      const updated = await returnsApi.removeLine(returnId, lineId);
      setRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    } catch (e) {
      setError(describeError(e));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex min-h-full flex-col gap-3 p-4 sm:p-5">
      {/* Durum Filtreleri + yeni belge */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border-soft pb-2.5">
        <div className="flex items-center gap-1 rounded-[4px] border border-border-soft bg-bg-subtle p-0.5">
          {FILTERS.map((item) => (
            <button
              key={item.id ?? 'all'}
              type="button"
              onClick={() => setStatus(item.id)}
              className={`h-7 cursor-pointer rounded-[4px] px-3 text-ui-xs font-medium transition-colors ${
                status === item.id
                  ? 'bg-card text-fg font-semibold shadow-xs'
                  : 'text-fg-muted hover:text-fg'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-[4px] border border-border-soft bg-bg-subtle/50 px-2.5 text-ui-xs font-medium text-fg hover:border-border hover:bg-card-hover"
        >
          <Plus size={13} />
          Talepten İade Aç
        </button>
      </div>

      {/* Tıklanınca açılan sade bilgi kutusu */}
      {showInfo && (
        <div className="relative shrink-0 rounded-[4px] border border-border-soft bg-bg-subtle/70 p-3 pr-8 text-ui-xs leading-relaxed text-fg-muted transition-all">
          <button
            type="button"
            onClick={onCloseInfo}
            className="absolute right-2 top-2 rounded-[4px] p-1 text-fg-subtle hover:text-fg cursor-pointer"
          >
            <X size={13} />
          </button>
          <p className="m-0">
            <strong className="font-semibold text-fg">İade belgesi</strong>, pazaryeri iade talebinden ayrı ticari kaydımızdır. Tamamlandığında iade tutarı cariye alacak olarak yazılır; depo girişi ayrı bir adımdır.
          </p>
        </div>
      )}

      {error && (
        <div className="shrink-0 rounded-[4px] border border-danger/20 bg-danger-soft p-2.5 text-ui-xs text-danger">
          {error}
        </div>
      )}

      {loading && (
        <div className="py-12 text-center text-ui-xs text-fg-muted">Yükleniyor…</div>
      )}

      {!loading && filteredRows.length === 0 && (
        <div className="rounded-[4px] border border-dashed border-border-soft p-12 text-center text-ui-xs text-fg-muted">
          {search.trim() ? 'Aramanıza uygun iade belgesi bulunamadı.' : 'Bu filtrede iade belgesi bulunamadı.'}
        </div>
      )}

      {/* Belge Kart Listesi */}
      <div className="flex flex-col gap-2">
        {filteredRows.map((row) => (
          <div
            key={row.id}
            className="flex flex-col gap-2.5 rounded-[6px] border border-border-soft bg-card p-3.5 shadow-xs transition-colors hover:border-border"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-fg text-ui-xs">İade #{row.id}</span>
                <span
                  className={`rounded-[4px] px-2 py-0.5 text-[11px] font-medium ${
                    STATUS_BADGE[row.status]
                  }`}
                >
                  {returnStatusLabel(row.status)}
                </span>
                {row.orderId && (
                  <span className="font-mono text-ui-xs text-fg-muted">Sipariş #{row.orderId}</span>
                )}
                {row.creditNoteInvoiceId && (
                  <span className="text-ui-xs text-fg-muted">
                    Fatura #{row.creditNoteInvoiceId}
                  </span>
                )}
                {row.status === 'Completed' && !row.stockHandledAt && (
                  <span className="rounded-[4px] bg-warning-soft px-2 py-0.5 text-[11px] font-medium text-warning">
                    Depo Girişi Bekliyor
                  </span>
                )}
              </div>

              <div className="font-mono text-ui-xs font-bold tabular-nums text-fg">
                {row.refundAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}{' '}
                {row.currency}
              </div>
            </div>

            {row.reason && <p className="m-0 text-ui-xs text-fg-muted">{row.reason}</p>}

            {/* SATIRLAR: neyin iade edildigi gorunmeden onay vermek, korlemesine para
                harcamaktir. Taslakta yanlis satir kaldirilabilir — oncesinde tek duzeltme
                yolu belgeyi reddedip yenisini acmakti. */}
            {row.lines.length > 0 ? (
              <ul className="flex list-none flex-col gap-1 p-0">
                {row.lines.map((line) => (
                  <li
                    key={line.id}
                    className="flex items-center gap-2 rounded-[2px] bg-bg-subtle/50 px-2 py-1 text-[11px]"
                  >
                    <span
                      className="min-w-0 flex-1 truncate text-fg-muted"
                      title={line.productName ?? undefined}
                    >
                      {/* Ürün ADI gösterilir; yalnızca id ("Ürün #4312") onaylayanın
                          "neyi onaylıyorum" sorusunu yanıtlamıyordu. Ürün silinmişse
                          uydurma bir ad basılmaz, durum açıkça yazılır. */}
                      {line.productName ?? `Ürün #${line.productId} (silinmiş)`}
                      {line.productSku && (
                        <span className="ml-1.5 font-mono text-fg-subtle">{line.productSku}</span>
                      )}
                      {line.condition === 'Arizali' && (
                        <span className="ml-1.5 rounded-[2px] bg-warning-soft px-1 py-0.5 text-warning">
                          Arızalı
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 font-mono tabular-nums text-fg-muted">
                      {line.quantity} ×{' '}
                      {line.unitPrice.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </span>
                    {row.status === 'Draft' && (
                      <button
                        type="button"
                        disabled={busyId === row.id}
                        onClick={() => void removeLine(row.id, line.id)}
                        title="Satırı kaldır"
                        className="shrink-0 cursor-pointer rounded-[2px] p-0.5 text-fg-subtle hover:text-danger disabled:opacity-50"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              // Satirsiz belge, talepten uretilirken SKU eslesmedigi ya da tutar bos oldugu
              // icin olusur (bkz. ReturnService.CreateFromClaimAsync). Backend satirsiz
              // iadeyi ONAYLAMIYOR — bu yuzden satir ekleme yolu ZORUNLU, yoksa belge olu kalir.
              <p className="m-0 rounded-[2px] bg-warning-soft px-2 py-1 text-[11px] text-warning">
                Bu belgede satır yok — ürün eşleşmemiş olabilir. Onaylanmadan önce satır eklenmeli.
              </p>
            )}

            {/* CARİ BAĞI: belgenin PARA tarafı buna bağlı. Taslakta bağlanabilir; sonraki
                durumlarda yalnızca bilgi olarak görünür (onaylayan neyi onayladığını
                bilmeli, para kime yazılacak sonradan değişmemeli). */}
            {row.status === 'Draft' ? (
              <ReturnCustomerPicker
                returnId={row.id}
                customerId={row.customerId}
                onChanged={(updated) =>
                  setRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))}
              />
            ) : row.customerId === null && row.status !== 'Rejected' ? (
              <p className="m-0 rounded-[2px] bg-warning-soft px-2 py-1 text-[11px] text-warning">
                Cari bağlı değil — bu belgenin tutarı hiçbir hesaba alacak yazılmadı/yazılmayacak.
              </p>
            ) : null}

            {row.status === 'Draft' && row.storeId !== null && (
              <AddReturnLineForm
                returnId={row.id}
                storeId={row.storeId}
                onAdded={(updated) =>
                  setRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))}
              />
            )}

            {row.status === 'Draft' && row.storeId === null && (
              // Magaza cozulemedi: belge ne siparise ne de talebe bagli. Urun aramasi
              // magaza icinde yapildigi icin form gosterilemez — sessizce gizlemek yerine
              // sebebini yaz.
              <p className="m-0 text-[11px] text-fg-subtle">
                Mağaza çözülemediği için satır eklenemiyor (belge bir siparişe veya pazaryeri
                talebine bağlı değil).
              </p>
            )}

            {nextReturnActions(row.status).length > 0 && (
              <div className="flex flex-wrap gap-1.5 border-t border-border-soft/60 pt-2">
                {nextReturnActions(row.status).map((action) => (
                  <button
                    key={action}
                    type="button"
                    disabled={busyId === row.id}
                    onClick={() => void run(row.id, action)}
                    className="inline-flex h-7 cursor-pointer items-center justify-center rounded-[4px] border border-border-soft bg-bg-subtle/50 px-2.5 text-ui-xs font-medium text-fg transition-colors hover:border-border hover:bg-card-hover disabled:opacity-50"
                  >
                    {ACTION_LABEL[action]}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {dialogOpen && (
        <NewReturnDialog
          onCreated={(document) => {
            // Yeni belge Taslak durumunda acilir; aktif filtre onu gostermiyorsa listeye
            // eklemek yaniltici olurdu — o durumda filtreyi Taslak'a alip yeniden yukleriz.
            if (status === null || status === document.status) {
              setRows((prev) => [document, ...prev]);
            } else {
              setStatus(document.status);
            }
            setDialogOpen(false);
          }}
          onClose={() => setDialogOpen(false)}
        />
      )}
    </div>
  );
}
