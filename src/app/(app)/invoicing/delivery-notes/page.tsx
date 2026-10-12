'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Link2, Unlink, FileDown, Search, Check, FileText, Download, ChevronDown, ChevronRight, BarChart3 } from 'lucide-react';
import { deliveryNoteApi, type DeliveryNote, type DeliveryNoteStatus } from '../../../../lib/api/delivery-note';
import { InvoicingSubTabBar } from '../../../../components/layout/InvoicingSubTabBar';
import { DeliveryNoteFormDialog } from '../../../../features/invoicing/DeliveryNoteFormDialog';
import { LinkDeliveryNotesDialog } from '../../../../features/invoicing/LinkDeliveryNotesDialog';
import { FilterSelect } from '../../../../components/ui/FilterSelect';
import { downloadExcel, type ExportColumn } from '../../../../lib/export';
import { toast } from '../../../../lib/toast';
import { describeError } from '../../../../lib/errors';
import { useI18n } from '../../../../lib/i18n';

const STATUS_CONFIG: Record<DeliveryNoteStatus, { tr: string; en: string; badge: string }> = {
  Draft: { tr: 'Taslak', en: 'Draft', badge: 'border-zinc-500/30 bg-zinc-500/10 text-zinc-400' },
  Issued: { tr: 'Düzenlendi', en: 'Issued', badge: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' },
  Cancelled: { tr: 'İptal', en: 'Cancelled', badge: 'border-rose-500/30 bg-rose-500/10 text-rose-400' },
};

function toIsoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function startOfThisMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

// Giden e-İrsaliye özet raporu (FAZ 7.3) — sadece bu firmanın kendi gönderdiği sevkiyatları
// kapsar (bkz. lib/api/delivery-note.ts → deliveryNoteApi.report yorumu).
function DeliveryNoteReportPanel() {
  const { lang } = useI18n();
  const tr = lang === 'tr';

  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(() => toIsoDate(startOfThisMonth()));
  const [to, setTo] = useState(() => toIsoDate(new Date()));

  const { data, isLoading, isError } = useQuery({
    queryKey: ['delivery-notes-report', from, to],
    queryFn: () => deliveryNoteApi.report({ from, to }),
    enabled: open && !!from && !!to,
    staleTime: 10_000,
  });

  const statCards = data
    ? [
        { label: tr ? 'Toplam' : 'Total', value: data.totalCount },
        { label: tr ? 'Taslak' : 'Draft', value: data.draftCount },
        { label: tr ? 'Kesinleşen' : 'Issued', value: data.issuedCount },
        { label: tr ? 'İptal' : 'Cancelled', value: data.cancelledCount },
        { label: tr ? 'Faturaya Bağlı' : 'Linked to Invoice', value: data.linkedToInvoiceCount },
        { label: tr ? 'Bağlı Değil' : 'Unlinked', value: data.unlinkedCount },
      ]
    : [];

  return (
    <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] shadow-xs overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3.5 py-2.5 text-xs font-bold text-[var(--fg)] hover:bg-[var(--bg-subtle)]/40 transition cursor-pointer"
      >
        <span className="inline-flex items-center gap-1.5">
          <BarChart3 size={13} className="text-[var(--fg-muted)]" />
          {tr ? 'Giden e-İrsaliye Raporu' : 'Outgoing Delivery Note Report'}
        </span>
        {open ? <ChevronDown size={13} className="text-[var(--fg-muted)]" /> : <ChevronRight size={13} className="text-[var(--fg-muted)]" />}
      </button>

      {open && (
        <div className="border-t border-[var(--border-soft)] p-3.5 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-[10.5px] font-bold uppercase text-[var(--fg-muted)]">
              {tr ? 'Başlangıç' : 'From'}
            </label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="h-8 rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] focus:border-[var(--fg-muted)] focus:outline-none"
            />
            <label className="text-[10.5px] font-bold uppercase text-[var(--fg-muted)]">
              {tr ? 'Bitiş' : 'To'}
            </label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="h-8 rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] focus:border-[var(--fg-muted)] focus:outline-none"
            />
          </div>

          {isLoading ? (
            <p className="text-xs text-[var(--fg-muted)]">{tr ? 'Rapor hazırlanıyor...' : 'Building report...'}</p>
          ) : isError ? (
            <p className="text-xs text-rose-400">
              {tr ? 'Rapor yüklenirken hata oluştu.' : 'Failed to load the report.'}
            </p>
          ) : data ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              {statCards.map((c) => (
                <div key={c.label} className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)]/30 p-2.5">
                  <div className="text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase tracking-wide">
                    {c.label}
                  </div>
                  <div className="text-base font-bold text-[var(--fg)] mt-0.5">{c.value}</div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

export default function DeliveryNotesPage() {
  const qc = useQueryClient();
  const { lang } = useI18n();
  const tr = lang === 'tr';

  const [status, setStatus] = useState<DeliveryNoteStatus | 'All'>('All');
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [linkOpen, setLinkOpen] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['delivery-notes', status],
    queryFn: () => deliveryNoteApi.list({ status: status === 'All' ? undefined : status }),
    staleTime: 15_000,
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, newStatus }: { id: number; newStatus: DeliveryNoteStatus }) =>
      deliveryNoteApi.updateStatus(id, newStatus),
    onSuccess: () => {
      toast.success(tr ? 'Durum güncellendi.' : 'Status updated.');
      void qc.invalidateQueries({ queryKey: ['delivery-notes'] });
    },
    onError: (e) => toast.error(describeError(e)),
  });

  const unlink = useMutation({
    mutationFn: (id: number) => deliveryNoteApi.unlink(id),
    onSuccess: () => {
      toast.success(tr ? 'Fatura bağlantısı kaldırıldı.' : 'Invoice link removed.');
      void qc.invalidateQueries({ queryKey: ['delivery-notes'] });
    },
    onError: (e) => toast.error(describeError(e)),
  });

  const downloadXml = useMutation({
    mutationFn: (id: number) => deliveryNoteApi.downloadUblXml(id),
    onSuccess: ({ fileName, blob }) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(tr ? 'UBL Despatch Advice XML indirildi.' : 'UBL XML downloaded.');
    },
    onError: (e) => toast.error(describeError(e)),
  });

  const notes = useMemo(() => data ?? [], [data]);

  const filteredNotes = useMemo(() => {
    if (!search.trim()) return notes;
    const lower = search.toLowerCase();
    return notes.filter(
      (n) =>
        n.deliveryNoteNumber.toLowerCase().includes(lower) ||
        (n.recipientName && n.recipientName.toLowerCase().includes(lower)) ||
        (n.invoiceNumber && n.invoiceNumber.toLowerCase().includes(lower)) ||
        (n.recipientAddress && n.recipientAddress.toLowerCase().includes(lower))
    );
  }, [notes, search]);

  const selectedNotes = useMemo(
    () => notes.filter((n) => selectedIds.includes(n.id)),
    [notes, selectedIds]
  );

  // KPI Hesaplamaları
  const stats = useMemo(() => {
    const total = notes.length;
    const issued = notes.filter((n) => n.status === 'Issued').length;
    const draft = notes.filter((n) => n.status === 'Draft').length;
    const linked = notes.filter((n) => Boolean(n.invoiceId)).length;
    return { total, issued, draft, linked };
  }, [notes]);

  function toggleSelect(id: number) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleSelectAll() {
    const unlinkedIds = filteredNotes.filter((n) => !n.invoiceId).map((n) => n.id);
    if (unlinkedIds.every((id) => selectedIds.includes(id))) {
      setSelectedIds((prev) => prev.filter((id) => !unlinkedIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...unlinkedIds])));
    }
  }

  const handleExportExcel = () => {
    if (filteredNotes.length === 0) {
      toast.error(tr ? 'Dışa aktarılacak irsaliye yok.' : 'No delivery notes to export.');
      return;
    }
    const cols: ExportColumn[] = [
      { header: tr ? 'İrsaliye No' : 'Note No', key: 'deliveryNoteNumber', type: 'text' },
      { header: tr ? 'Tarih' : 'Date', key: 'deliveryDate', type: 'text' },
      { header: tr ? 'Alıcı' : 'Recipient', key: 'recipientName', type: 'text' },
      { header: tr ? 'Alıcı Adresi' : 'Address', key: 'recipientAddress', type: 'text' },
      { header: tr ? 'Bağlı Fatura' : 'Invoice', key: 'invoiceNumber', type: 'text' },
      { header: tr ? 'Durum' : 'Status', key: 'status', type: 'text' },
      { header: tr ? 'Kalem Sayısı' : 'Line Count', key: 'lineCount', type: 'int' },
    ];
    const rows = filteredNotes.map((n) => ({
      deliveryNoteNumber: n.deliveryNoteNumber,
      deliveryDate: n.deliveryDate,
      recipientName: n.recipientName || '—',
      recipientAddress: n.recipientAddress || '—',
      invoiceNumber: n.invoiceNumber || '—',
      status: STATUS_CONFIG[n.status]?.tr ?? n.status,
      lineCount: n.lines?.length ?? 0,
    }));
    void downloadExcel(`Irsaliyeler_${new Date().toISOString().slice(0, 10)}`, rows, cols);
    toast.success(tr ? 'İrsaliyeler Excel dosyası indirildi.' : 'Exported to Excel.');
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-transparent">
      {/* Üst Sekme Barı */}
      <InvoicingSubTabBar />

      {/* Ana İçerik Alanı */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
        {/* Başlık ve Aksiyon Barı */}
        <div data-tour="delivery-notes-header" className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-base font-bold text-[var(--fg)] tracking-tight">
              {tr ? 'İrsaliyeler' : 'Delivery Notes'}
            </h1>
            <p className="text-xs text-[var(--fg-muted)] mt-0.5">
              {tr
                ? 'Dahili ve resmi sevkiyat takibi. Çoklu irsaliye tek faturaya konsolide edilebilir.'
                : 'Track internal dispatches and consolidate multiple delivery notes into single invoices.'}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex h-8 items-center gap-1.5 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-semibold text-[var(--fg)] shadow-xs hover:bg-[var(--bg-subtle)] transition cursor-pointer"
            >
              <Download size={13} />
              <span>Excel</span>
            </button>

            {selectedIds.length > 0 && (
              <button
                type="button"
                onClick={() => setLinkOpen(true)}
                className="inline-flex h-8 items-center gap-1.5 rounded-[4px] border border-blue-500/40 bg-blue-500/10 px-3 text-xs font-bold text-blue-400 shadow-xs hover:bg-blue-500/20 transition cursor-pointer"
              >
                <Link2 size={13} />
                <span>
                  {tr ? 'Faturaya Bağla' : 'Link to Invoice'} ({selectedIds.length})
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="inline-flex h-8 items-center gap-1.5 rounded-[4px] border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--bg-subtle)] px-3 text-xs font-bold text-[var(--fg)] shadow-xs transition hover:border-[var(--fg-muted)] cursor-pointer"
            >
              <Plus size={14} />
              <span>{tr ? 'Yeni İrsaliye Ekle' : 'New Delivery Note'}</span>
            </button>
          </div>
        </div>

        {/* KPI Metrik Kartları */}
        <div data-tour="delivery-notes-kpi" className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3 shadow-xs">
            <div className="text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase tracking-wide">
              {tr ? 'Toplam İrsaliye' : 'Total Notes'}
            </div>
            <div className="text-base font-bold text-[var(--fg)] mt-0.5">{stats.total}</div>
          </div>

          <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3 shadow-xs">
            <div className="text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase tracking-wide">
              {tr ? 'Düzenlendi' : 'Issued'}
            </div>
            <div className="text-base font-bold text-[var(--fg)] mt-0.5">{stats.issued}</div>
          </div>

          <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3 shadow-xs">
            <div className="text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase tracking-wide">
              {tr ? 'Taslak' : 'Draft'}
            </div>
            <div className="text-base font-bold text-[var(--fg)] mt-0.5">{stats.draft}</div>
          </div>

          <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3 shadow-xs">
            <div className="text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase tracking-wide">
              {tr ? 'Faturaya Bağlı' : 'Linked to Invoice'}
            </div>
            <div className="text-base font-bold text-[var(--fg)] mt-0.5">{stats.linked}</div>
          </div>
        </div>

        {/* Giden e-İrsaliye Raporu */}
        <div data-tour="delivery-notes-report">
          <DeliveryNoteReportPanel />
        </div>

        {/* Filtre ve Arama Çubuğu */}
        <div data-tour="delivery-notes-filters" className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-2.5 shadow-xs">
          <div className="relative flex-1 max-w-sm">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={tr ? 'İrsaliye no, alıcı veya fatura ara...' : 'Search note number, recipient...'}
              className="h-8 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] pl-8 pr-3 text-xs text-[var(--fg)] placeholder:text-[var(--fg-subtle)] focus:border-[var(--fg-muted)] focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <FilterSelect
              value={status === 'All' ? '' : status}
              placeholder={tr ? 'Tüm Durumlar' : 'All Statuses'}
              onChange={(val) => setStatus((val || 'All') as DeliveryNoteStatus | 'All')}
              minWidth={140}
              options={[
                { value: 'Draft', label: tr ? 'Taslak' : 'Draft' },
                { value: 'Issued', label: tr ? 'Düzenlendi' : 'Issued' },
                { value: 'Cancelled', label: tr ? 'İptal' : 'Cancelled' },
              ]}
            />
          </div>
        </div>

        {/* İrsaliye Tablosu */}
        <div data-tour="delivery-notes-table" className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--bg-subtle)]/30 text-[10.5px] font-bold uppercase tracking-wider text-[var(--fg-muted)]">
                  <th className="px-3 py-2.5 w-10 text-center">
                    <input
                      type="checkbox"
                      onChange={toggleSelectAll}
                      checked={
                        filteredNotes.filter((n) => !n.invoiceId).length > 0 &&
                        filteredNotes
                          .filter((n) => !n.invoiceId)
                          .every((n) => selectedIds.includes(n.id))
                      }
                      aria-label="Tümünü seç"
                      className="rounded-[2px] border-[var(--border)] accent-[var(--fg)] cursor-pointer"
                    />
                  </th>
                  <th className="px-4 py-2.5">{tr ? 'İRSALİYE NO' : 'NOTE NO'}</th>
                  <th className="px-4 py-2.5">{tr ? 'TARİH' : 'DATE'}</th>
                  <th className="px-4 py-2.5">{tr ? 'ALICI' : 'RECIPIENT'}</th>
                  <th className="px-4 py-2.5">{tr ? 'FATURA BAĞLANTISI' : 'INVOICE'}</th>
                  <th className="px-4 py-2.5">{tr ? 'DURUM' : 'STATUS'}</th>
                  <th className="px-4 py-2.5 text-right">{tr ? 'İŞLEMLER' : 'ACTIONS'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-soft)]">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-xs text-[var(--fg-muted)]">
                      {tr ? 'İrsaliyeler yükleniyor...' : 'Loading delivery notes...'}
                    </td>
                  </tr>
                ) : isError ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-xs text-rose-400">
                      {tr ? 'Veriler yüklenirken hata oluştu.' : 'Failed to load delivery notes.'}
                    </td>
                  </tr>
                ) : filteredNotes.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-xs text-[var(--fg-muted)]">
                      {tr ? 'Görüntülenecek irsaliye kaydı bulunamadı.' : 'No delivery notes found.'}
                    </td>
                  </tr>
                ) : (
                  filteredNotes.map((note: DeliveryNote) => {
                    const st = STATUS_CONFIG[note.status] || STATUS_CONFIG.Draft;
                    const isSelected = selectedIds.includes(note.id);
                    const isLinked = Boolean(note.invoiceId);

                    return (
                      <tr
                        key={note.id}
                        className={`hover:bg-[var(--bg-subtle)]/40 transition ${
                          isSelected ? 'bg-blue-500/5' : ''
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="px-3 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(note.id)}
                            disabled={isLinked}
                            className="rounded-[2px] border-[var(--border)] accent-[var(--fg)] cursor-pointer disabled:opacity-40"
                          />
                        </td>

                        {/* İrsaliye No */}
                        <td className="px-4 py-3">
                          <div className="font-mono font-bold text-[var(--fg)]">
                            {note.deliveryNoteNumber}
                          </div>
                          {note.lines && note.lines.length > 0 && (
                            <div className="text-[10.5px] text-[var(--fg-muted)] mt-0.5">
                              {note.lines.length} {tr ? 'kalem mal/ürün' : 'items'}
                            </div>
                          )}
                        </td>

                        {/* Tarih */}
                        <td className="px-4 py-3 text-[var(--fg-muted)] font-mono">
                          {note.deliveryDate}
                        </td>

                        {/* Alıcı */}
                        <td className="px-4 py-3">
                          <div className="font-semibold text-[var(--fg)]">{note.recipientName || '—'}</div>
                          {note.recipientAddress && (
                            <div className="text-[10.5px] text-[var(--fg-muted)] truncate max-w-xs">
                              {note.recipientAddress}
                            </div>
                          )}
                        </td>

                        {/* Fatura Bağlantısı */}
                        <td className="px-4 py-3">
                          {note.invoiceNumber ? (
                            <span className="inline-flex items-center gap-1 rounded-[3px] border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-[10.5px] font-bold text-blue-400">
                              <FileText size={10} />
                              <span>{note.invoiceNumber}</span>
                            </span>
                          ) : (
                            <span className="text-[10.5px] text-[var(--fg-subtle)] italic">
                              {tr ? 'Bağlı Değil' : 'Unlinked'}
                            </span>
                          )}
                        </td>

                        {/* Durum */}
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center rounded-[3px] border px-2 py-0.5 text-[10.5px] font-bold ${st.badge}`}
                          >
                            {tr ? st.tr : st.en}
                          </span>
                        </td>

                        {/* İşlemler */}
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-1.5 justify-end">
                            <button
                              type="button"
                              onClick={() => downloadXml.mutate(note.id)}
                              disabled={downloadXml.isPending}
                              title="UBL Despatch Advice XML taslağını indir"
                              className="inline-flex h-7 items-center gap-1 rounded-[3px] border border-[var(--border)] bg-[var(--card)] px-2 text-[11px] font-semibold text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer disabled:opacity-50"
                            >
                              <FileDown size={11} />
                              <span>XML</span>
                            </button>

                            {note.invoiceId && (
                              <button
                                type="button"
                                onClick={() => unlink.mutate(note.id)}
                                title={tr ? 'Fatura bağlantısını kaldır' : 'Unlink invoice'}
                                className="inline-flex h-7 items-center gap-1 rounded-[3px] border border-rose-500/30 bg-rose-500/10 px-2 text-[11px] font-semibold text-rose-400 hover:bg-rose-500/20 transition cursor-pointer"
                              >
                                <Unlink size={11} />
                                <span>{tr ? 'Ayır' : 'Unlink'}</span>
                              </button>
                            )}

                            {note.status === 'Draft' && (
                              <button
                                type="button"
                                onClick={() => updateStatus.mutate({ id: note.id, newStatus: 'Issued' })}
                                className="inline-flex h-7 items-center gap-1 rounded-[3px] border border-emerald-500/30 bg-emerald-500/10 px-2 text-[11px] font-semibold text-emerald-400 hover:bg-emerald-500/20 transition cursor-pointer"
                              >
                                <Check size={11} />
                                <span>{tr ? 'Düzenlendi İşaretle' : 'Mark Issued'}</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* İrsaliye Ekleme Modalı */}
      {createOpen && (
        <DeliveryNoteFormDialog
          onClose={() => setCreateOpen(false)}
          onSaved={() => {
            void qc.invalidateQueries({ queryKey: ['delivery-notes'] });
          }}
        />
      )}

      {/* Faturaya Bağlama Modalı */}
      {linkOpen && selectedNotes.length > 0 && (
        <LinkDeliveryNotesDialog
          selected={selectedNotes}
          onClose={() => setLinkOpen(false)}
          onLinked={() => {
            setSelectedIds([]);
            void qc.invalidateQueries({ queryKey: ['delivery-notes'] });
          }}
        />
      )}
    </div>
  );
}
