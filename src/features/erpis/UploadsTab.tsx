'use client';

import { useState } from 'react';
import { AlertTriangle, ChevronLeft, ChevronRight, Plus, Trash2, X } from 'lucide-react';
import { UploadWizardDialog } from './UploadWizardDialog';
import {
  EmptyState, ErrorState, SectionCard, formatDate, formatDateTime, formatNumber, formatPeriod,
} from './shared';
import { useDeleteErpisUpload, useErpisRows, useErpisUploads } from '@/hooks/erpis/useErpis';
import { LiveDataBanner } from './LiveDataBanner';

const ROWS_PER_PAGE = 25;

// Liste sayfa başına kaç yükleme gösterir.
//
// Canlı SQL senkronu her koşuda bir yükleme üretiyor; liste eskiden tamamını çekiyordu
// ve binlerce satıra çıkıp sayfayı kilitliyordu.
const UPLOADS_PER_PAGE = 25;

export function UploadsTab({ onOpenLiveData }: { onOpenLiveData: () => void }) {
  const [wizardOpen, setWizardOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [uploadPage, setUploadPage] = useState(1);

  const uploads = useErpisUploads(null, null, uploadPage, UPLOADS_PER_PAGE);
  const rows = useErpisRows(selectedId, page, ROWS_PER_PAGE);
  const deleteUpload = useDeleteErpisUpload();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function select(id: number) {
    setSelectedId((current) => (current === id ? null : id));
    setPage(1);
  }

  // Sunucu, normalize katmanı bu yüklemeden türemişse silmeyi 409 ile reddediyor; mesaj
  // kullanıcıya gösterilmeli. Önceden hata yakalanmıyordu ve düğme sessizce hiçbir şey
  // yapmıyor gibi görünürdü.
  async function handleDelete(id: number, fileName: string) {
    if (!window.confirm(`«${fileName}» yüklemesi ve tüm satırları silinecek. Devam edilsin mi?`)) return;
    setDeleteError(null);
    try {
      await deleteUpload.mutateAsync(id);
      if (selectedId === id) setSelectedId(null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Yükleme silinemedi.');
    }
  }

  if (uploads.error) {
    return <div className="p-4"><ErrorState text={uploads.error instanceof Error ? uploads.error.message : undefined} /></div>;
  }

  const totalPages = Math.max(1, Math.ceil((rows.data?.total ?? 0) / ROWS_PER_PAGE));

  return (
    <div className="flex flex-col gap-3 p-4">
      <div data-tour="erpis-uploads-live-banner">
        <LiveDataBanner onOpenLiveData={onOpenLiveData} />
      </div>
      {deleteError && <ErrorState text={deleteError} />}
      {(uploads.data?.items.length ?? 0) === 0 && !uploads.isLoading ? (
        <EmptyState title="Henüz yükleme yok" hint="Erpis'ten bir rapor indirip buradan yükleyin." />
      ) : (
        <div data-tour="erpis-uploads-history">
          <SectionCard title="Yükleme Geçmişi">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[11.5px]">
              <thead>
                <tr className="bg-[var(--bg-subtle)] text-[var(--fg)]">
                  <Th>Dosya</Th>
                  <Th>Firma</Th>
                  <Th>Rapor Tipi</Th>
                  <Th align="right">Satır</Th>
                  <Th>Dönem</Th>
                  <Th>Yüklendi</Th>
                  <Th align="right">İşlem</Th>
                </tr>
              </thead>
              <tbody>
                {(uploads.data?.items ?? []).map((upload) => (
                  <tr
                    key={upload.id}
                    onClick={() => select(upload.id)}
                    className={`cursor-pointer border-t border-[var(--border-soft)] ${
                      selectedId === upload.id ? 'bg-[var(--bg-subtle)]' : ''
                    }`}
                  >
                    <Td>
                      <span className="flex items-center gap-1.5 font-semibold text-[var(--fg)]">
                        {upload.fileName}
                        {/* Aynı dönemin ikinci kez yüklenmesi engellenmiyor ama sessiz de
                            bırakılmıyor: toplamların iki katına çıkması buradan fark edilir. */}
                        {upload.hasPeriodOverlap && (
                          <span title="Bu dönem başka bir yüklemeyle çakışıyor">
                            <AlertTriangle size={12} strokeWidth={2} className="text-[var(--fg-muted)]" />
                          </span>
                        )}
                      </span>
                    </Td>
                    <Td>{upload.companyName}</Td>
                    <Td>{upload.datasetName}</Td>
                    <Td align="right">{formatNumber(upload.rowCount)}</Td>
                    <Td>{formatPeriod(upload.periodStart, upload.periodEnd)}</Td>
                    <Td>{formatDateTime(upload.uploadedAt)}</Td>
                    <Td align="right">
                      <button
                        type="button"
                        aria-label="Yüklemeyi sil"
                        onClick={(e) => { e.stopPropagation(); void handleDelete(upload.id, upload.fileName); }}
                        className="rounded-[4px] border border-[var(--border-soft)] p-1 text-[var(--fg-muted)]"
                      >
                        <Trash2 size={12} strokeWidth={1.8} />
                      </button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Sayfa şeridi YALNIZ birden çok sayfa varsa. Tek sayfalık listede
              "1 / 1" yazan ölü bir kontrol olurdu. */}
          {(uploads.data?.total ?? 0) > UPLOADS_PER_PAGE && (
            <div className="flex items-center justify-between gap-2 border-t border-[var(--border-soft)] px-3 py-2 text-[11.5px] text-[var(--fg-muted)]">
              <span className="tabular-nums">
                {formatNumber(uploads.data!.total)} yükleme
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  aria-label="Önceki sayfa"
                  disabled={uploadPage <= 1}
                  onClick={() => { setUploadPage((p) => Math.max(1, p - 1)); setSelectedId(null); }}
                  className="rounded-[4px] border border-[var(--border-soft)] p-1 disabled:opacity-40"
                >
                  <ChevronLeft size={13} strokeWidth={1.8} />
                </button>
                <span className="tabular-nums">
                  {uploadPage} / {Math.max(1, Math.ceil((uploads.data?.total ?? 0) / UPLOADS_PER_PAGE))}
                </span>
                <button
                  type="button"
                  aria-label="Sonraki sayfa"
                  disabled={uploadPage >= Math.ceil((uploads.data?.total ?? 0) / UPLOADS_PER_PAGE)}
                  onClick={() => { setUploadPage((p) => p + 1); setSelectedId(null); }}
                  className="rounded-[4px] border border-[var(--border-soft)] p-1 disabled:opacity-40"
                >
                  <ChevronRight size={13} strokeWidth={1.8} />
                </button>
              </div>
            </div>
          )}
        </SectionCard>
        </div>
      )}

      {/* Ham satır paneli KAPATILABİLİR: bir yüklemeye tıklayınca 50 satırlık tablo
          altta açılıyor ve kullanıcı listeye dönmek için başka yere tıklamak zorunda
          kalıyordu. Başlıkta hangi dosyanın satırları olduğu da yazıyor. */}
      {selectedId != null && (
        <SectionCard
          title={`Satırlar · ${uploads.data?.items.find((u) => u.id === selectedId)?.fileName ?? ''}`}
          action={
            <div className="flex items-center gap-2 text-[11px] text-[var(--fg-muted)]">
              <button
                type="button"
                aria-label="Önceki sayfa"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-[4px] border border-[var(--border-soft)] p-1 disabled:opacity-40"
              >
                <ChevronLeft size={12} strokeWidth={1.8} />
              </button>
              <span className="tabular-nums">{page} / {totalPages}</span>
              <button
                type="button"
                aria-label="Sonraki sayfa"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-[4px] border border-[var(--border-soft)] p-1 disabled:opacity-40"
              >
                <ChevronRight size={12} strokeWidth={1.8} />
              </button>
              <button
                type="button"
                aria-label="Satır panelini kapat"
                onClick={() => setSelectedId(null)}
                className="rounded-[4px] border border-[var(--border-soft)] p-1"
              >
                <X size={12} strokeWidth={1.8} />
              </button>
            </div>
          }
        >
          {(rows.data?.items.length ?? 0) === 0 ? (
            <EmptyState title="Satır bulunamadı" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[11px]">
                <thead>
                  <tr className="bg-[var(--bg-subtle)] text-[var(--fg)]">
                    <Th align="right">#</Th>
                    <Th>Tarih</Th>
                    <Th align="right">Tutar</Th>
                    <Th>Para Birimi</Th>
                    <Th align="right">Miktar</Th>
                    <Th>Cari</Th>
                    <Th>Stok Kodu</Th>
                  </tr>
                </thead>
                <tbody>
                  {(rows.data?.items ?? []).map((row) => (
                    <tr key={row.id} className="border-t border-[var(--border-soft)]">
                      <Td align="right">{row.rowIndex}</Td>
                      <Td>{formatDate(row.docDate)}</Td>
                      <Td align="right">{formatNumber(row.amount, 2)}</Td>
                      <Td>{row.currency ?? '—'}</Td>
                      <Td align="right">{formatNumber(row.quantity, 2)}</Td>
                      <Td>{row.partyName ?? '—'}</Td>
                      <Td>{row.itemCode ?? '—'}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      )}

      <div data-tour="erpis-uploads-action" className="flex justify-end pt-1">
        <button
          type="button"
          onClick={() => setWizardOpen(true)}
          className="flex items-center gap-1.5 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-3.5 py-2 text-[12px] font-bold text-[var(--fg)] shadow-xs hover:bg-[var(--bg-subtle)] transition-colors"
        >
          <Plus size={14} strokeWidth={1.8} />
          Rapor Yükle
        </button>
      </div>

      {wizardOpen && <UploadWizardDialog onClose={() => setWizardOpen(false)} />}
    </div>
  );
}

function Th({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <th className={`whitespace-nowrap px-2 py-1.5 font-bold ${align === 'right' ? 'text-right' : 'text-left'}`}>
      {children}
    </th>
  );
}

function Td({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <td className={`whitespace-nowrap px-1.5 py-1.5 text-[var(--fg-muted)] md:px-2 ${align === 'right' ? 'text-right tabular-nums' : ''}`}>
      {children}
    </td>
  );
}
