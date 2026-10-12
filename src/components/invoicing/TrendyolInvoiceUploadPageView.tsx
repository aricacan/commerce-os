'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, UploadCloud, Loader2, X, ChevronRight, Search } from 'lucide-react';
import { trendyolInvoiceApi } from '../../lib/api';
import { useI18n } from '../../lib/i18n';
import { FilterSelect, type FilterSelectOption } from '../ui/FilterSelect';
import { localDateStr } from '../../utils/date';

export function TrendyolInvoiceUploadPageView() {
  const { lang } = useI18n();
  const isTr = lang === 'tr';
  const router = useRouter();
  const queryClient = useQueryClient();

  const [panelOpen, setPanelOpen] = useState(false);
  const [sourceId, setSourceId] = useState<number | null>(null);
  const [connectionId, setConnectionId] = useState<number | null>(null);
  const [windowFromDate, setWindowFromDate] = useState(localDateStr());
  const [windowToDate, setWindowToDate] = useState(localDateStr());
  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);

  const batchesQuery = useQuery({
    queryKey: ['trendyol-invoice-batches'],
    queryFn: () => trendyolInvoiceApi.batches(),
  });

  const erpSourcesQuery = useQuery({
    queryKey: ['trendyol-invoice-erp-sources'],
    queryFn: () => trendyolInvoiceApi.erpSources(),
    staleTime: 5 * 60_000,
  });

  // Hedef pazaryeri listesi KAYNAKTAN BAĞIMSIZ yüklenir: pazaryeri bağlantısı kendi
  // mağazasında yaşıyor, kaynağın mağazasına göre filtrelemek listeyi hep boş bırakırdı.
  const connectionsQuery = useQuery({
    queryKey: ['trendyol-invoice-marketplace-connections'],
    queryFn: () => trendyolInvoiceApi.marketplaceConnections(),
    staleTime: 5 * 60_000,
  });

  const erpOptions: FilterSelectOption[] = useMemo(
    () => (erpSourcesQuery.data ?? []).map((o) => ({ value: String(o.sourceId), label: o.label })),
    [erpSourcesQuery.data],
  );
  const connectionOptions: FilterSelectOption[] = useMemo(
    () => (connectionsQuery.data ?? []).map((o) => ({ value: String(o.connectionId), label: o.label })),
    [connectionsQuery.data],
  );

  // TEK SEÇENEK VARSA KENDİLİĞİNDEN SEÇİLİR. Kullanıcı "hepsini seçtim" deyip Kaydet'in
  // pasif kalmasıyla karşılaşıyordu; tek adaylı bir listede seçim yaptırmanın bilgi değeri yok.
  useEffect(() => {
    const only = erpSourcesQuery.data?.length === 1 ? erpSourcesQuery.data[0] : null;
    if (only && sourceId === null) setSourceId(only.sourceId);
  }, [erpSourcesQuery.data, sourceId]);

  useEffect(() => {
    const only = connectionsQuery.data?.length === 1 ? connectionsQuery.data[0] : null;
    if (only && connectionId === null) setConnectionId(only.connectionId);
  }, [connectionsQuery.data, connectionId]);

  const matchMutation = useMutation({
    mutationFn: () => trendyolInvoiceApi.match(sourceId!, connectionId!, files, windowFromDate, windowToDate),
    onSuccess: (batch) => {
      void queryClient.invalidateQueries({ queryKey: ['trendyol-invoice-batches'] });
      setPanelOpen(false);
      setFiles([]);
      router.push(`/trendyol/uploads/${batch.batchId}`);
    },
    onError: (error) => setMatchError(error instanceof Error ? error.message : String(error)),
  });

  const canSave = sourceId !== null && connectionId !== null && files.length > 0 && !matchMutation.isPending;

  // PASİF BUTON KENDİNİ AÇIKLAR. Önceden "Kaydet" sessizce pasif kalıyordu ve kullanıcı
  // neyin eksik olduğunu göremediği için tıklayıp "tepki yok" sanıyordu.
  const missingSteps = [
    sourceId === null ? (isTr ? 'kaynak (ERP)' : 'source (ERP)') : null,
    connectionId === null ? (isTr ? 'hedef pazaryeri' : 'target marketplace') : null,
    files.length === 0 ? (isTr ? 'fatura dosyası' : 'invoice file') : null,
  ].filter((step): step is string => step !== null);

  function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setFiles((prev) => [...prev, ...Array.from(fileList)]);
    setMatchError(null);
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function closePanel() {
    setPanelOpen(false);
    setFiles([]);
    setMatchError(null);
  }

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto bg-transparent p-4 md:p-5">
      <div className="flex min-h-0 flex-1 flex-col rounded-[6px] border border-[var(--border-soft)] bg-[var(--card)]">

        {/* ── Üst çubuk ── */}
        <div data-tour="ty-upload-header" className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--border-soft)] p-3">
          <span className="text-sm font-bold text-[var(--fg)]">
            {isTr ? 'Trendyol Fatura Yükleme' : 'Trendyol Invoice Upload'}
          </span>
          <button
            data-tour="ty-upload-btn"
            type="button"
            onClick={() => (panelOpen ? closePanel() : setPanelOpen(true))}
            className="inline-flex h-8 items-center gap-1.5 rounded-[4px] bg-sky-600 px-3 text-xs font-bold text-white hover:bg-sky-700"
          >
            {panelOpen ? <X size={14} /> : <Plus size={14} />}
            {isTr ? 'Yeni Yükleme' : 'New Upload'}
          </button>
        </div>

        {/* ── Yeni Yükleme paneli ── */}
        {panelOpen && (
          <div className="flex shrink-0 flex-col gap-3 border-b border-[var(--border-soft)] bg-[var(--bg-subtle)]/30 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <FilterSelect
                value={sourceId !== null ? String(sourceId) : ''}
                options={erpOptions}
                placeholder={isTr ? 'Kaynak (ERP)' : 'Source (ERP)'}
                onChange={(v) => setSourceId(v ? Number(v) : null)}
                minWidth={200}
              />
              <span className="text-xs text-[var(--fg-muted)]">→</span>
              <FilterSelect
                value={connectionId !== null ? String(connectionId) : ''}
                options={connectionOptions}
                placeholder={isTr ? 'Hedef (Pazaryeri)' : 'Target (Marketplace)'}
                onChange={(v) => setConnectionId(v ? Number(v) : null)}
                minWidth={200}
              />
              <div className="flex items-center gap-1">
                <input
                  type="date"
                  value={windowFromDate}
                  max={windowToDate}
                  onChange={(e) => setWindowFromDate(e.target.value)}
                  className="h-8 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-2 font-mono text-xs font-semibold text-[var(--fg)] outline-none focus:border-[var(--fg)]"
                />
                <span className="text-xs text-[var(--fg-muted)]">—</span>
                <input
                  type="date"
                  value={windowToDate}
                  min={windowFromDate}
                  onChange={(e) => setWindowToDate(e.target.value)}
                  className="h-8 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-2 font-mono text-xs font-semibold text-[var(--fg)] outline-none focus:border-[var(--fg)]"
                />
              </div>
            </div>

            {/* Liste boşsa dropdown sessizce hiçbir şey açmaz; kullanıcı "seçemiyorum"
                der ama nedenini göremezdi. */}
            {erpSourcesQuery.data?.length === 0 && (
              <div className="rounded-[4px] border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                {isTr
                  ? 'Aktif ERP kaynağı bulunamadı — Ayarlar → Entegrasyon Merkezi\'nden bir ERP bağlantısının aktif olduğundan emin olun.'
                  : 'No active ERP source found — check Integration Hub that an ERP connection is active.'}
              </div>
            )}
            {connectionsQuery.data?.length === 0 && (
              <div className="rounded-[4px] border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                {isTr
                  ? 'Aktif Trendyol bağlantısı bulunamadı — fatura gönderilecek hedef yok.'
                  : 'No active Trendyol connection found — there is no target to send invoices to.'}
              </div>
            )}

            <label
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
              className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[6px] border-2 border-dashed p-5 text-center transition-colors ${
                dragOver ? 'border-sky-500 bg-sky-500/5' : 'border-[var(--border-soft)] hover:border-[var(--border)]'
              }`}
            >
              <input
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
              <UploadCloud size={20} className="text-[var(--fg-muted)]" />
              <span className="text-xs font-semibold text-[var(--fg)]">
                {isTr ? 'Fatura PDF/görsellerini buraya sürükleyin ya da seçin' : 'Drag invoice PDFs/images here, or click to select'}
              </span>
              <span className="text-[10.5px] text-[var(--fg-muted)]">
                {isTr ? 'Dosya adı kalıbı: TCKimlik_Ad Soyad_FaturaNo.pdf' : 'Filename pattern: TaxId_Full Name_InvoiceNo.pdf'}
              </span>
            </label>

            {files.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {files.map((file, i) => (
                  <span key={`${file.name}-${i}`} className="inline-flex items-center gap-1 rounded-[3px] border border-[var(--border-soft)] bg-[var(--card)] px-1.5 py-0.5 text-[10.5px] text-[var(--fg)]">
                    {file.name}
                    <button type="button" onClick={() => removeFile(i)} className="text-[var(--fg-muted)] hover:text-rose-600">
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {matchError && (
              <div className="rounded-[4px] border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-700 dark:text-rose-400">
                {matchError}
              </div>
            )}

            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] text-[var(--fg-muted)]">
                {isTr
                  ? 'Dosya adındaki isim, seçilen kaynağın bu aralıktaki Trendyol siparişleriyle eşleştirilir'
                  : "Names in filenames are matched against the source's Trendyol orders in this range"}
              </span>

              <div className="flex shrink-0 items-center gap-2">
                {missingSteps.length > 0 && (
                  <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                    {isTr
                      ? `Eksik: ${missingSteps.join(', ')}`
                      : `Missing: ${missingSteps.join(', ')}`}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => matchMutation.mutate()}
                  disabled={!canSave}
                  className="inline-flex h-8 items-center gap-1.5 rounded-[4px] bg-emerald-600 px-4 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-40 hover:bg-emerald-700"
                >
                  {matchMutation.isPending
                    ? <Loader2 size={14} className="animate-spin" />
                    : <Search size={14} />}
                  {matchMutation.isPending
                    ? (isTr ? 'Eşleştiriliyor…' : 'Matching…')
                    : (isTr ? `Eşleştir (${files.length})` : `Match (${files.length})`)}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Liste ── */}
        <div data-tour="ty-upload-list" className="min-h-0 flex-1 overflow-auto">
          {batchesQuery.isLoading ? (
            <div className="flex h-full items-center justify-center p-8 text-xs text-[var(--fg-muted)]">
              {isTr ? 'Yükleniyor…' : 'Loading…'}
            </div>
          ) : (batchesQuery.data ?? []).length === 0 ? (
            <div className="flex h-full items-center justify-center p-8 text-xs text-[var(--fg-muted)]">
              {isTr ? 'Henüz yükleme partisi yok. "Yeni Yükleme" ile başlayın.' : 'No upload batches yet. Start with "New Upload".'}
            </div>
          ) : (
            <table className="w-full border-collapse text-left text-xs">
              <thead className="sticky top-0 z-10 border-b border-[var(--border-soft)] bg-[var(--bg-subtle)] text-[10.5px] font-bold uppercase tracking-wider text-[var(--fg-muted)]">
                <tr>
                  <th className="px-3.5 py-2.5">{isTr ? 'ERP' : 'ERP'}</th>
                  <th className="px-3.5 py-2.5">{isTr ? 'Hedef' : 'Target'}</th>
                  <th className="px-3.5 py-2.5">{isTr ? 'Tarih Aralığı' : 'Date Range'}</th>
                  <th className="px-3.5 py-2.5 text-right">{isTr ? 'Dosya' : 'Files'}</th>
                  <th className="px-3.5 py-2.5 text-right">{isTr ? 'Eşleşen' : 'Matched'}</th>
                  <th className="px-3.5 py-2.5 text-right">{isTr ? 'Gönderilen' : 'Sent'}</th>
                  <th className="px-3.5 py-2.5">{isTr ? 'Tamlık' : 'Completeness'}</th>
                  <th className="px-3.5 py-2.5">{isTr ? 'Oluşturulma' : 'Created'}</th>
                  <th className="w-8 px-3.5 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-soft)]">
                {(batchesQuery.data ?? []).map((batch) => (
                  <tr
                    key={batch.batchId}
                    onClick={() => router.push(`/trendyol/uploads/${batch.batchId}`)}
                    className="cursor-pointer hover:bg-[var(--bg-subtle)]/40"
                  >
                    <td className="px-3.5 py-2.5 font-semibold text-[var(--fg)]">{batch.erpLabel}</td>
                    <td className="px-3.5 py-2.5 text-[var(--fg-muted)]">{batch.connectionLabel}</td>
                    <td className="px-3.5 py-2.5 font-mono text-[11px] text-[var(--fg-muted)]">
                      {batch.windowFromDate} — {batch.windowToDate}
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-mono tabular-nums">{batch.fileCount}</td>
                    <td className="px-3.5 py-2.5 text-right font-mono tabular-nums">{batch.matchedCount}</td>
                    <td className="px-3.5 py-2.5 text-right font-mono tabular-nums">
                      <span className={batch.sentCount === batch.matchedCount && batch.matchedCount > 0 ? 'text-emerald-600 font-bold' : ''}>
                        {batch.sentCount}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5">
                      {batch.totalOrdersInWindow > 0 ? (
                        <span
                          className={`inline-flex items-center rounded-[3px] border px-1.5 py-0.5 text-[10px] font-bold ${
                            batch.matchedOrderCount >= batch.totalOrdersInWindow
                              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                              : 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400'
                          }`}
                        >
                          {batch.matchedOrderCount}/{batch.totalOrdersInWindow}
                          {batch.matchedOrderCount < batch.totalOrdersInWindow &&
                            ` · ${batch.totalOrdersInWindow - batch.matchedOrderCount} ${isTr ? 'eksik' : 'missing'}`}
                        </span>
                      ) : (
                        <span className="text-[10.5px] text-[var(--fg-muted)]">—</span>
                      )}
                    </td>
                    <td className="px-3.5 py-2.5 text-[10.5px] text-[var(--fg-muted)]">
                      {new Date(batch.createdAt).toLocaleString(isTr ? 'tr-TR' : 'en-US')}
                    </td>
                    <td className="px-3.5 py-2.5 text-[var(--fg-muted)]"><ChevronRight size={14} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
