'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Upload, FileDown, FileText, Send, Check, RefreshCw, Search, ArrowDownLeft, ArrowUpRight, Eye, Landmark, Copy } from 'lucide-react';
import { invoiceApi, type Invoice, type InvoiceStatus, type InvoiceDirection, type EInvoiceStatus } from '../../../../lib/api/invoice';
import { InvoiceFormDialog } from '../../../../features/invoicing/InvoiceFormDialog';
import { ImportIncomingInvoiceDialog } from '../../../../features/invoicing/ImportIncomingInvoiceDialog';
import { InvoicingSubTabBar } from '../../../../components/layout/InvoicingSubTabBar';
import { FilterSelect } from '../../../../components/ui/FilterSelect';
import { downloadExcel, type ExportColumn } from '../../../../lib/export';
import { toast } from '../../../../lib/toast';
import { describeError } from '../../../../lib/errors';
import { useI18n } from '../../../../lib/i18n';

const STATUS_CONFIG: Record<InvoiceStatus, { tr: string; en: string; badge: string }> = {
  Draft: { tr: 'Taslak', en: 'Draft', badge: 'border-zinc-500/30 bg-zinc-500/10 text-zinc-400' },
  Approved: { tr: 'Onaylandı', en: 'Approved', badge: 'border-blue-500/30 bg-blue-500/10 text-blue-400' },
  Issued: { tr: 'Kesildi', en: 'Issued', badge: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' },
  Cancelled: { tr: 'İptal', en: 'Cancelled', badge: 'border-rose-500/30 bg-rose-500/10 text-rose-400' },
  Error: { tr: 'Hata', en: 'Error', badge: 'border-rose-500/30 bg-rose-500/10 text-rose-400' },
};

const EINVOICE_CONFIG: Partial<Record<EInvoiceStatus, { tr: string; en: string; badge: string }>> = {
  Prepared: { tr: 'XML Hazır', en: 'XML Prepared', badge: 'border-zinc-500/30 bg-zinc-500/10 text-zinc-400' },
  Queued: { tr: 'Kuyrukta', en: 'Queued', badge: 'border-zinc-500/30 bg-zinc-500/10 text-zinc-400' },
  Sent: { tr: 'Gönderildi', en: 'Sent', badge: 'border-blue-500/30 bg-blue-500/10 text-blue-400' },
  Delivered: { tr: 'İletildi', en: 'Delivered', badge: 'border-blue-500/30 bg-blue-500/10 text-blue-400' },
  Accepted: { tr: 'Kabul Edildi', en: 'Accepted', badge: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' },
  Rejected: { tr: 'Reddedildi', en: 'Rejected', badge: 'border-rose-500/30 bg-rose-500/10 text-rose-400' },
  Failed: { tr: 'Gönderim Hatası', en: 'Failed', badge: 'border-rose-500/30 bg-rose-500/10 text-rose-400' },
  Cancelled: { tr: 'İptal Edildi', en: 'Cancelled', badge: 'border-zinc-500/30 bg-zinc-500/10 text-zinc-400' },
};

export default function InvoicesPage() {
  const { lang } = useI18n();
  const tr = lang === 'tr';
  const qc = useQueryClient();

  const [direction, setDirection] = useState<InvoiceDirection | 'All'>('All');
  const [status, setStatus] = useState<InvoiceStatus | 'All'>('All');
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['invoices', direction, status],
    queryFn: () =>
      invoiceApi.list({
        direction: direction === 'All' ? undefined : direction,
        status: status === 'All' ? undefined : status,
      }),
    staleTime: 15_000,
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, newStatus }: { id: number; newStatus: InvoiceStatus }) => invoiceApi.updateStatus(id, newStatus),
    onSuccess: () => {
      toast.success(tr ? 'Durum güncellendi.' : 'Status updated.');
      void qc.invalidateQueries({ queryKey: ['invoices'] });
    },
    onError: (e) => toast.error(describeError(e)),
  });

  const approve = useMutation({
    mutationFn: (id: number) => invoiceApi.approve(id),
    onSuccess: () => {
      toast.success(tr ? 'Fatura onaylandı.' : 'Invoice approved.');
      void qc.invalidateQueries({ queryKey: ['invoices'] });
    },
    onError: (e) => toast.error(describeError(e)),
  });

  const send = useMutation({
    mutationFn: (id: number) => invoiceApi.send(id),
    onSuccess: () => {
      toast.success(tr ? 'Gönderim kuyruğuna alındı.' : 'Queued for sending.');
      void qc.invalidateQueries({ queryKey: ['invoices'] });
    },
    onError: (e) => toast.error(describeError(e)),
  });

  const downloadXml = useMutation({
    mutationFn: (id: number) => invoiceApi.downloadUblXml(id),
    onSuccess: ({ fileName, blob }) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(tr ? 'UBL-TR XML indirildi.' : 'UBL-TR XML downloaded.');
    },
    onError: (e) => toast.error(describeError(e)),
  });

  const downloadPdf = useMutation({
    mutationFn: (id: number) => invoiceApi.downloadPdf(id),
    onSuccess: ({ fileName, blob }) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(tr ? 'PDF görsel taslağı indirildi.' : 'PDF downloaded.');
    },
    onError: (e) => toast.error(describeError(e)),
  });

  const viewHtml = useMutation({
    // Sekme, fetch tamamlanmadan (kullanıcı tıklamasının hemen ardından) açılır — aksi halde
    // async onSuccess içinde window.open çağrısı çoğu tarayıcıda popup engelleyiciye takılır.
    mutationFn: async (id: number) => {
      const tab = window.open('', '_blank');
      const url = await invoiceApi.getHtmlViewUrl(id);
      if (tab) tab.location.href = url;
      else window.open(url, '_blank');
    },
    onError: (e) => toast.error(describeError(e)),
  });

  // Taslak kopyalama — kaynak faturanın başlık+satırlarını kopyalayan yeni bir Draft oluşturur.
  const duplicate = useMutation({
    mutationFn: (id: number) => invoiceApi.duplicate(id),
    onSuccess: (created) => {
      toast.success(tr ? `Taslak kopyalandı: ${created.invoiceNumber}` : `Draft duplicated: ${created.invoiceNumber}`);
      void qc.invalidateQueries({ queryKey: ['invoices'] });
    },
    onError: (e) => toast.error(describeError(e)),
  });

  const postToLedger = useMutation({
    mutationFn: (id: number) => invoiceApi.postToLedger(id),
    onSuccess: (entry) => {
      toast.success(entry.entryNumber ? `Muhasebeleştirildi — fiş ${entry.entryNumber}.` : 'Muhasebeleştirildi (taslak fiş).');
    },
    onError: (e) => toast.error(describeError(e)),
  });

  const invoices = useMemo(() => data ?? [], [data]);

  const filteredInvoices = useMemo(() => {
    if (!search.trim()) return invoices;
    const lower = search.toLowerCase();
    return invoices.filter(
      (i) =>
        i.invoiceNumber.toLowerCase().includes(lower) ||
        (i.supplierName && i.supplierName.toLowerCase().includes(lower)) ||
        (i.buyerName && i.buyerName.toLowerCase().includes(lower)) ||
        (i.buyerTaxNumber && i.buyerTaxNumber.toLowerCase().includes(lower))
    );
  }, [invoices, search]);

  // KPI Calculations
  const stats = useMemo(() => {
    const total = invoices.length;
    const outgoing = invoices.filter((i) => i.direction === 'Outgoing').length;
    const incoming = invoices.filter((i) => i.direction === 'Incoming').length;
    const draft = invoices.filter((i) => i.status === 'Draft' || i.status === 'Approved').length;
    const totalAmount = invoices.reduce((acc, i) => acc + (i.amount || 0), 0);
    return { total, outgoing, incoming, draft, totalAmount };
  }, [invoices]);

  // Excel Export
  const handleExportExcel = () => {
    if (filteredInvoices.length === 0) {
      toast.error(tr ? 'Dışa aktarılacak fatura yok.' : 'No invoices to export.');
      return;
    }
    const cols: ExportColumn[] = [
      { header: tr ? 'Fatura No' : 'Invoice No', key: 'invoiceNumber', type: 'text' },
      { header: tr ? 'Yön' : 'Direction', key: 'direction', type: 'text' },
      { header: tr ? 'Karşı Taraf (Alıcı/Tedarikçi)' : 'Party', key: 'party', type: 'text' },
      { header: tr ? 'Fatura Tarihi' : 'Invoice Date', key: 'invoiceDate', type: 'text' },
      { header: tr ? 'Tutar' : 'Amount', key: 'amount', type: 'money' },
      { header: tr ? 'KDV Tutarı' : 'VAT Amount', key: 'vatAmount', type: 'money' },
      { header: tr ? 'Para Birimi' : 'Currency', key: 'currency', type: 'text' },
      { header: tr ? 'Durum' : 'Status', key: 'status', type: 'text' },
      { header: tr ? 'e-Fatura Durumu' : 'e-Invoice Status', key: 'einvoiceStatus', type: 'text' },
      { header: tr ? 'İade Faturası' : 'Credit Note', key: 'isCreditNote', type: 'text' },
    ];

    const rows = filteredInvoices.map((inv) => ({
      invoiceNumber: inv.invoiceNumber,
      direction: inv.direction === 'Incoming' ? (tr ? 'Gelen (Alış)' : 'Incoming') : tr ? 'Giden (Satış)' : 'Outgoing',
      party: inv.direction === 'Incoming' ? inv.supplierName || '—' : inv.buyerName || '—',
      invoiceDate: inv.invoiceDate,
      amount: inv.amount,
      vatAmount: inv.vatAmount ?? 0,
      currency: inv.currency,
      status: STATUS_CONFIG[inv.status]?.tr || inv.status,
      einvoiceStatus: EINVOICE_CONFIG[inv.einvoiceStatus]?.tr || inv.einvoiceStatus || '—',
      isCreditNote: inv.isCreditNote ? (tr ? 'Evet (İade)' : 'Yes') : tr ? 'Hayır' : 'No',
    }));

    void downloadExcel(`faturalar_${new Date().toISOString().slice(0, 10)}`, rows, cols, 'Faturalar');
    toast.success(tr ? 'Faturalar Excel olarak indirildi.' : 'Invoices exported as Excel.');
  };

  return (
    <div className="flex flex-1 flex-col h-full overflow-hidden bg-[var(--bg)] text-[var(--fg)]">
      {/* ── Sub Tab Navigation ── */}
      <InvoicingSubTabBar />

      {/* ── Main Scrollable Area ── */}
      <div className="flex flex-1 flex-col overflow-y-auto p-5 gap-5">
        
        {/* KPI Metrics Strip */}
        <div data-tour="invoices-kpi" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3.5 shadow-xs">
            <div className="text-[11px] font-semibold text-[var(--fg-muted)]">{tr ? 'Toplam Fatura' : 'Total Invoices'}</div>
            <div className="mt-1 text-lg font-bold text-[var(--fg)]">{stats.total}</div>
          </div>
          <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3.5 shadow-xs">
            <div className="text-[11px] font-semibold text-[var(--fg-muted)]">{tr ? 'Giden (Satış) Faturaları' : 'Outgoing (Sales)'}</div>
            <div className="mt-1 text-lg font-bold text-blue-500">{stats.outgoing}</div>
          </div>
          <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3.5 shadow-xs">
            <div className="text-[11px] font-semibold text-[var(--fg-muted)]">{tr ? 'Gelen (Alış) Faturaları' : 'Incoming (Purchases)'}</div>
            <div className="mt-1 text-lg font-bold text-amber-500">{stats.incoming}</div>
          </div>
          <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3.5 shadow-xs">
            <div className="text-[11px] font-semibold text-[var(--fg-muted)]">{tr ? 'Taslak / Onay Bekleyen' : 'Draft / Pending'}</div>
            <div className="mt-1 text-lg font-bold text-zinc-400">{stats.draft}</div>
          </div>
          <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3.5 shadow-xs">
            <div className="text-[11px] font-semibold text-[var(--fg-muted)]">{tr ? 'Toplam Fatura Hacmi' : 'Total Volume'}</div>
            <div className="mt-1 text-lg font-mono font-bold text-[var(--fg)]">
              {stats.totalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TRY
            </div>
          </div>
        </div>

        {/* Action & Filter Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3 shadow-xs">
          {/* Direction & Status Filters */}
          <div data-tour="invoices-filters" className="flex items-center gap-2 overflow-x-auto">
            {/* Direction Tabs */}
            <div className="flex items-center rounded-[3px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] p-0.5">
              {[
                { key: 'All', label: tr ? 'Tümü' : 'All' },
                { key: 'Outgoing', label: tr ? 'Giden (Satış)' : 'Sales' },
                { key: 'Incoming', label: tr ? 'Gelen (Alış)' : 'Purchases' },
              ].map((d) => (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => setDirection(d.key as InvoiceDirection | 'All')}
                  className={`h-7 px-2.5 text-xs font-semibold rounded-[2px] transition cursor-pointer ${
                    direction === d.key ? 'bg-[var(--card)] text-[var(--fg)] shadow-xs font-bold' : 'text-[var(--fg-muted)] hover:text-[var(--fg)]'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>

            {/* Status Dropdown */}
            <FilterSelect
              value={status === 'All' ? '' : status}
              placeholder={tr ? 'Tüm Durumlar' : 'All Statuses'}
              onChange={(v) => setStatus((v || 'All') as InvoiceStatus | 'All')}
              minWidth={140}
              options={[
                { value: 'Draft', label: tr ? 'Taslak' : 'Draft' },
                { value: 'Approved', label: tr ? 'Onaylandı' : 'Approved' },
                { value: 'Issued', label: tr ? 'Kesildi' : 'Issued' },
                { value: 'Cancelled', label: tr ? 'İptal' : 'Cancelled' },
                { value: 'Error', label: tr ? 'Hata' : 'Error' },
              ]}
            />
          </div>

          {/* Search & Actions */}
          <div data-tour="invoices-actions" className="flex items-center gap-2">
            <div data-tour="invoices-search" className="relative w-56 sm:w-64">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={tr ? 'Fatura No / Karşı Taraf Ara...' : 'Search invoice / party...'}
                className="h-8 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] pl-8 pr-3 text-xs text-[var(--fg)] placeholder-[var(--fg-muted)] outline-none focus:border-[var(--fg)]"
              />
            </div>

            <button
              type="button"
              onClick={handleExportExcel}
              disabled={filteredInvoices.length === 0}
              title={tr ? 'Excel Dışa Aktar' : 'Export Excel'}
              className="inline-flex h-8 items-center gap-1.5 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-semibold text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer disabled:opacity-50"
            >
              <FileDown size={13} />
              <span className="hidden sm:inline">{tr ? 'Excel İndir' : 'Export'}</span>
            </button>

            <button
              type="button"
              onClick={() => setImportOpen(true)}
              className="inline-flex h-8 items-center gap-1.5 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-semibold text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer"
            >
              <Upload size={13} />
              <span className="hidden sm:inline">{tr ? 'XML İçe Aktar' : 'Import XML'}</span>
            </button>

            <button
              type="button"
              onClick={() => refetch()}
              title={tr ? 'Yenile' : 'Refresh'}
              className="flex h-8 w-8 items-center justify-center rounded-[4px] border border-[var(--border)] bg-[var(--card)] text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer"
            >
              <RefreshCw size={13} />
            </button>

            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="inline-flex h-8 items-center gap-1.5 rounded-[4px] bg-[var(--fg)] px-3 text-xs font-bold text-[var(--bg)] shadow-xs hover:opacity-90 transition cursor-pointer"
            >
              <Plus size={13} />
              <span>{tr ? 'Fatura Ekle' : 'New Invoice'}</span>
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div data-tour="invoices-table" className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="border-b border-[var(--border-soft)] bg-[var(--bg-subtle)]/50 text-[10.5px] font-bold uppercase tracking-wider text-[var(--fg-muted)]">
                <tr>
                  <th className="px-4 py-3">{tr ? 'FATURA NO' : 'INVOICE NO'}</th>
                  <th className="px-4 py-3">{tr ? 'YÖN' : 'DIRECTION'}</th>
                  <th className="px-4 py-3">{tr ? 'KARŞI TARAF' : 'PARTY'}</th>
                  <th className="px-4 py-3">{tr ? 'TARİH' : 'DATE'}</th>
                  <th className="px-4 py-3">{tr ? 'TUTAR' : 'AMOUNT'}</th>
                  <th className="px-4 py-3">{tr ? 'DURUM' : 'STATUS'}</th>
                  <th className="px-4 py-3 text-right">{tr ? 'İŞLEMLER' : 'ACTIONS'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-soft)]">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-xs text-[var(--fg-muted)]">
                      {tr ? 'Faturalar yükleniyor...' : 'Loading invoices...'}
                    </td>
                  </tr>
                ) : filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-xs text-[var(--fg-muted)]">
                      {tr ? 'Görüntülenecek fatura kaydı bulunamadı.' : 'No invoices found.'}
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv: Invoice) => {
                    const st = STATUS_CONFIG[inv.status] || STATUS_CONFIG.Draft;
                    const einv = EINVOICE_CONFIG[inv.einvoiceStatus];
                    const isOutgoing = inv.direction === 'Outgoing';

                    return (
                      <tr key={inv.id} className="hover:bg-[var(--bg-subtle)]/40 transition">
                        {/* Invoice Number & Badges */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-[var(--fg)]">{inv.invoiceNumber}</span>
                            {inv.isCreditNote && (
                              <span className="rounded-[2px] border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.2 text-[10px] font-bold text-amber-500">
                                {tr ? 'İADE' : 'CREDIT NOTE'}
                              </span>
                            )}
                          </div>
                          {inv.isCreditNote && inv.originalInvoiceNumber && (
                            <div className="font-mono text-[10.5px] text-[var(--fg-muted)] mt-0.5">
                              Ref: {inv.originalInvoiceNumber}
                            </div>
                          )}
                        </td>

                        {/* Direction */}
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 rounded-[3px] border px-2 py-0.5 text-[10.5px] font-bold ${
                              isOutgoing
                                ? 'border-blue-500/30 bg-blue-500/10 text-blue-400'
                                : 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                            }`}
                          >
                            {isOutgoing ? <ArrowUpRight size={10} /> : <ArrowDownLeft size={10} />}
                            <span>{isOutgoing ? (tr ? 'Satış' : 'Sales') : tr ? 'Alış' : 'Purchase'}</span>
                          </span>
                        </td>

                        {/* Party */}
                        <td className="px-4 py-3">
                          <div className="font-semibold text-[var(--fg)]">
                            {isOutgoing ? inv.buyerName || '—' : inv.supplierName || '—'}
                          </div>
                          {isOutgoing && inv.buyerTaxNumber && (
                            <div className="font-mono text-[10.5px] text-[var(--fg-muted)]">
                              VKN: {inv.buyerTaxNumber}
                            </div>
                          )}
                        </td>

                        {/* Date */}
                        <td className="px-4 py-3 text-[var(--fg-muted)]">
                          {inv.invoiceDate}
                        </td>

                        {/* Amount */}
                        <td className="px-4 py-3 font-mono font-bold text-[var(--fg)]">
                          {inv.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                          {inv.currency}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className={`inline-flex items-center rounded-[3px] border px-2 py-0.5 text-[10.5px] font-bold ${st.badge}`}>
                              {tr ? st.tr : st.en}
                            </span>
                            {einv && (
                              <span
                                title={inv.providerStatusMessage ?? (tr ? 'e-Belge (GİB gönderim) durumu' : 'e-Invoice status')}
                                className={`inline-flex items-center rounded-[3px] border px-2 py-0.5 text-[10.5px] font-bold ${einv.badge}`}
                              >
                                {tr ? einv.tr : einv.en}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-1.5 justify-end">
                            {isOutgoing && inv.lines.length > 0 && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => downloadXml.mutate(inv.id)}
                                  disabled={downloadXml.isPending}
                                  title="UBL-TR XML taslağını indir"
                                  className="inline-flex h-7 items-center gap-1 rounded-[3px] border border-[var(--border)] bg-[var(--card)] px-2 text-[11px] font-semibold text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer disabled:opacity-50"
                                >
                                  <FileDown size={11} />
                                  <span>XML</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => downloadPdf.mutate(inv.id)}
                                  disabled={downloadPdf.isPending}
                                  title="Görsel PDF taslağını indir"
                                  className="inline-flex h-7 items-center gap-1 rounded-[3px] border border-[var(--border)] bg-[var(--card)] px-2 text-[11px] font-semibold text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer disabled:opacity-50"
                                >
                                  <FileText size={11} />
                                  <span>PDF</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => viewHtml.mutate(inv.id)}
                                  disabled={viewHtml.isPending}
                                  title="HTML görünümünü aç"
                                  className="inline-flex h-7 items-center gap-1 rounded-[3px] border border-[var(--border)] bg-[var(--card)] px-2 text-[11px] font-semibold text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer disabled:opacity-50"
                                >
                                  <Eye size={11} />
                                  <span>Görüntüle</span>
                                </button>
                              </>
                            )}

                            {isOutgoing &&
                              inv.lines.length > 0 &&
                              (inv.einvoiceStatus === 'NotCreated' || inv.einvoiceStatus === 'Prepared' || inv.einvoiceStatus === 'Failed') && (
                                <button
                                  type="button"
                                  onClick={() => send.mutate(inv.id)}
                                  disabled={send.isPending}
                                  title={tr ? 'Asenkron gönderim kuyruğuna al' : 'Queue for sending'}
                                  className="inline-flex h-7 items-center gap-1 rounded-[3px] border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--bg-subtle)] px-2 text-[11px] font-bold text-[var(--fg)] shadow-xs transition cursor-pointer disabled:opacity-50"
                                >
                                  <Send size={11} />
                                  <span>{tr ? 'Gönder' : 'Send'}</span>
                                </button>
                              )}

                            {inv.status === 'Draft' && (
                              <button
                                type="button"
                                onClick={() => approve.mutate(inv.id)}
                                disabled={approve.isPending}
                                className="inline-flex h-7 items-center gap-1 rounded-[3px] border border-blue-500/30 bg-blue-500/10 px-2 text-[11px] font-semibold text-blue-400 hover:bg-blue-500/20 transition cursor-pointer disabled:opacity-50"
                              >
                                <Check size={11} />
                                <span>{tr ? 'Onayla' : 'Approve'}</span>
                              </button>
                            )}

                            {(inv.status === 'Draft' || inv.status === 'Approved') && (
                              <button
                                type="button"
                                onClick={() => updateStatus.mutate({ id: inv.id, newStatus: 'Issued' })}
                                className="inline-flex h-7 items-center rounded-[3px] border border-[var(--border)] bg-[var(--bg-subtle)] px-2 text-[11px] font-semibold text-[var(--fg)] hover:bg-[var(--card)] transition cursor-pointer"
                              >
                                {tr ? 'Kesildi İşaretle' : 'Mark Issued'}
                              </button>
                            )}

                            {inv.status === 'Issued' && (
                              <button
                                type="button"
                                onClick={() => postToLedger.mutate(inv.id)}
                                disabled={postToLedger.isPending}
                                title="Genel Muhasebe'ye işle — Hesap Eşlemeleri tanımlı olmalı"
                                className="inline-flex h-7 items-center gap-1 rounded-[3px] border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--bg-subtle)] px-2 text-[11px] font-semibold text-[var(--fg)] shadow-xs transition cursor-pointer disabled:opacity-50"
                              >
                                <Landmark size={11} />
                                <span>{tr ? 'Muhasebeleştir' : 'Post to Ledger'}</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => duplicate.mutate(inv.id)}
                              disabled={duplicate.isPending}
                              title={tr ? 'Taslak olarak kopyala' : 'Duplicate as draft'}
                              className="flex h-7 w-7 items-center justify-center rounded-[3px] border border-[var(--border)] bg-[var(--card)] text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer disabled:opacity-50"
                            >
                              <Copy size={11} />
                            </button>
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

      {/* Invoice Create Modal */}
      {createOpen && (
        <InvoiceFormDialog
          onClose={() => setCreateOpen(false)}
          onSaved={() => {
            void qc.invalidateQueries({ queryKey: ['invoices'] });
          }}
        />
      )}

      {/* Incoming XML Import Modal */}
      {importOpen && (
        <ImportIncomingInvoiceDialog
          onClose={() => setImportOpen(false)}
          onSaved={() => {
            toast.success(tr ? 'Gelen fatura içe aktarıldı.' : 'Invoice imported.');
            void qc.invalidateQueries({ queryKey: ['invoices'] });
          }}
        />
      )}
    </div>
  );
}
