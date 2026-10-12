'use client';

import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, RefreshCw, Eye, FileDown } from 'lucide-react';
import { purchaseOrderApi, type PurchaseOrderStatus } from '../../../lib/api/purchase-order';
import { supplierApi } from '../../../lib/api/supplier';
import { ErrorState } from '../../../components/ui/ErrorState';
import { PurchaseOrderFormDialog } from '../../../features/purchase-orders/PurchaseOrderFormDialog';
import { PurchaseOrderDetailDialog } from '../../../features/purchase-orders/PurchaseOrderDetailDialog';
import { ProcurementSubTabBar } from '../../../components/layout/ProcurementSubTabBar';
import { FilterSelect } from '../../../components/ui/FilterSelect';
import { downloadExcel, type ExportColumn } from '../../../lib/export';
import { toast } from '../../../lib/toast';
import { useI18n } from '../../../lib/i18n';

const STATUS_CONFIG: Record<PurchaseOrderStatus, { tr: string; en: string; badge: string }> = {
  Draft: { tr: 'Taslak', en: 'Draft', badge: 'border-zinc-500/30 bg-zinc-500/10 text-zinc-400' },
  Submitted: { tr: 'Gönderildi', en: 'Submitted', badge: 'border-blue-500/30 bg-blue-500/10 text-blue-400' },
  PartiallyReceived: { tr: 'Kısmen Teslim', en: 'Partially Received', badge: 'border-amber-500/30 bg-amber-500/10 text-amber-400' },
  Completed: { tr: 'Tamamlandı', en: 'Completed', badge: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' },
  Cancelled: { tr: 'İptal Edildi', en: 'Cancelled', badge: 'border-rose-500/30 bg-rose-500/10 text-rose-400' },
};

const STATUS_TABS: Array<PurchaseOrderStatus | 'All'> = ['All', 'Draft', 'Submitted', 'PartiallyReceived', 'Completed', 'Cancelled'];

export default function PurchaseOrdersPage() {
  const { lang } = useI18n();
  const tr = lang === 'tr';
  const qc = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<PurchaseOrderStatus | 'All'>('All');
  const [supplierFilter, setSupplierFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const suppliersQuery = useQuery({
    queryKey: ['suppliers', ''],
    queryFn: () => supplierApi.list(),
    staleTime: 60_000,
  });
  const suppliers = suppliersQuery.data ?? [];

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['purchase-orders', statusFilter],
    queryFn: () => purchaseOrderApi.list(statusFilter === 'All' ? undefined : statusFilter),
    staleTime: 15_000,
  });

  const orders = useMemo(() => data ?? [], [data]);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (supplierFilter && o.supplierId !== Number(supplierFilter)) return false;
      if (search.trim()) {
        const lower = search.toLowerCase();
        const matches =
          o.orderNumber.toLowerCase().includes(lower) ||
          o.supplierName.toLowerCase().includes(lower) ||
          (o.notes && o.notes.toLowerCase().includes(lower));
        if (!matches) return false;
      }
      return true;
    });
  }, [orders, search, supplierFilter]);

  // KPI Calculations
  const stats = useMemo(() => {
    const totalCount = orders.length;
    const draftCount = orders.filter((o) => o.status === 'Draft').length;
    const submittedCount = orders.filter((o) => o.status === 'Submitted').length;
    const partiallyCount = orders.filter((o) => o.status === 'PartiallyReceived').length;
    const completedCount = orders.filter((o) => o.status === 'Completed').length;
    const totalValue = orders.reduce(
      (acc, o) => acc + o.lines.reduce((lAcc, l) => lAcc + l.quantity * l.unitPrice, 0),
      0
    );
    return { totalCount, draftCount, submittedCount, partiallyCount, completedCount, totalValue };
  }, [orders]);

  const handleExportExcel = () => {
    if (filteredOrders.length === 0) {
      toast.error(tr ? 'Dışa aktarılacak sipariş yok.' : 'No orders to export.');
      return;
    }
    const cols: ExportColumn[] = [
      { header: tr ? 'Sipariş No' : 'PO Number', key: 'orderNumber', type: 'text' },
      { header: tr ? 'Tedarikçi' : 'Supplier', key: 'supplierName', type: 'text' },
      { header: tr ? 'Sipariş Tarihi' : 'Order Date', key: 'orderDate', type: 'text' },
      { header: tr ? 'Beklenen Teslimat' : 'Expected Date', key: 'expectedDate', type: 'text' },
      { header: tr ? 'Kalem Sayısı' : 'Lines', key: 'lineCount', type: 'int' },
      { header: tr ? 'Toplam Miktar' : 'Total Qty', key: 'totalQty', type: 'int' },
      { header: tr ? 'Teslim Alınan' : 'Received Qty', key: 'receivedQty', type: 'int' },
      { header: tr ? 'Toplam Tutar' : 'Total Amount', key: 'totalAmount', type: 'money' },
      { header: tr ? 'Para Birimi' : 'Currency', key: 'currency', type: 'text' },
      { header: tr ? 'Durum' : 'Status', key: 'status', type: 'text' },
      { header: tr ? 'Notlar' : 'Notes', key: 'notes', type: 'text' },
    ];

    const rows = filteredOrders.map((o) => {
      const totalOrderValue = o.lines.reduce((acc, l) => acc + l.quantity * l.unitPrice, 0);
      const totalQty = o.lines.reduce((acc, l) => acc + l.quantity, 0);
      const totalReceived = o.lines.reduce((acc, l) => acc + l.receivedQuantity, 0);
      const cfg = STATUS_CONFIG[o.status] || STATUS_CONFIG.Draft;
      return {
        orderNumber: o.orderNumber,
        supplierName: o.supplierName,
        orderDate: o.orderDate,
        expectedDate: o.expectedDate || '—',
        lineCount: o.lines.length,
        totalQty,
        receivedQty: totalReceived,
        totalAmount: totalOrderValue,
        currency: o.lines[0]?.currency || 'TRY',
        status: tr ? cfg.tr : cfg.en,
        notes: o.notes || '',
      };
    });

    void downloadExcel(
      `satin_alma_siparisleri_${new Date().toISOString().slice(0, 10)}`,
      rows,
      cols,
      'Siparisler'
    );
    toast.success(tr ? 'Sipariş listesi Excel olarak indirildi.' : 'Orders exported as Excel.');
  };

  return (
    <div className="flex flex-1 flex-col h-full overflow-hidden bg-[var(--bg)] text-[var(--fg)]">
      {/* ── Sub Tab Navigation ── */}
      <ProcurementSubTabBar />

      {/* ── Main Scrollable Area ── */}
      <div className="flex flex-1 flex-col overflow-y-auto p-5 gap-5">
        
        {/* KPI Metrics Strip */}
        <div data-tour="po-kpi" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3.5 shadow-xs">
            <div className="text-[11px] font-semibold text-[var(--fg-muted)]">{tr ? 'Toplam Sipariş' : 'Total Orders'}</div>
            <div className="mt-1 text-lg font-bold text-[var(--fg)]">{stats.totalCount}</div>
          </div>
          <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3.5 shadow-xs">
            <div className="text-[11px] font-semibold text-[var(--fg-muted)]">{tr ? 'Bekleyen / Gönderildi' : 'Submitted / Pending'}</div>
            <div className="mt-1 text-lg font-bold text-blue-500">{stats.submittedCount}</div>
          </div>
          <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3.5 shadow-xs">
            <div className="text-[11px] font-semibold text-[var(--fg-muted)]">{tr ? 'Kısmen Teslim Alınan' : 'Partially Received'}</div>
            <div className="mt-1 text-lg font-bold text-amber-500">{stats.partiallyCount}</div>
          </div>
          <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3.5 shadow-xs">
            <div className="text-[11px] font-semibold text-[var(--fg-muted)]">{tr ? 'Tamamlandı' : 'Completed'}</div>
            <div className="mt-1 text-lg font-bold text-emerald-500">{stats.completedCount}</div>
          </div>
          <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3.5 shadow-xs">
            <div className="text-[11px] font-semibold text-[var(--fg-muted)]">{tr ? 'Toplam Sipariş Hacmi' : 'Total Value'}</div>
            <div className="mt-1 text-lg font-mono font-bold text-[var(--fg)]">
              {stats.totalValue.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TRY
            </div>
          </div>
        </div>

        {/* Action & Filter Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3 shadow-xs">
          {/* Status Tabs & Supplier Filter */}
          <div data-tour="po-supplier-filter" className="flex items-center gap-2 overflow-x-auto [-webkit-overflow-scrolling:touch]">
            <div data-tour="po-tabs" className="flex items-center gap-1">
              {STATUS_TABS.map((s) => {
                const active = statusFilter === s;
                const label = s === 'All' ? (tr ? 'Tümü' : 'All') : tr ? STATUS_CONFIG[s].tr : STATUS_CONFIG[s].en;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatusFilter(s)}
                    className={`inline-flex h-7.5 items-center justify-center rounded-[3px] px-3 text-xs font-semibold transition cursor-pointer ${
                      active
                        ? 'border border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--fg)] shadow-xs font-bold'
                        : 'text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)]/50'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <FilterSelect
              value={supplierFilter}
              onChange={(v) => setSupplierFilter(v)}
              placeholder={tr ? 'Tüm Tedarikçiler' : 'All Suppliers'}
              searchable={true}
              minWidth={170}
              height="h-7.5"
              options={suppliers.map((s) => ({
                value: String(s.id),
                label: s.name,
                sublabel: s.shortCode || undefined,
              }))}
            />
          </div>

          {/* Search & Actions */}
          <div data-tour="po-actions" className="flex items-center gap-2">
            <div data-tour="po-search" className="relative w-56 sm:w-64">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={tr ? 'Sipariş No / Tedarikçi Ara...' : 'Search PO / Supplier...'}
                className="h-8 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] pl-8 pr-3 text-xs text-[var(--fg)] placeholder-[var(--fg-muted)] outline-none focus:border-[var(--fg)]"
              />
            </div>

            <button
              type="button"
              onClick={handleExportExcel}
              disabled={filteredOrders.length === 0}
              title={tr ? 'Excel İndir' : 'Export Excel'}
              className="inline-flex h-8 items-center gap-1.5 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-semibold text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer disabled:opacity-50"
            >
              <FileDown size={13} />
              <span className="hidden sm:inline">{tr ? 'Excel İndir' : 'Export'}</span>
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
              <span>{tr ? 'Yeni Sipariş' : 'New Order'}</span>
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div data-tour="po-table" className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="border-b border-[var(--border-soft)] bg-[var(--bg-subtle)]/50 text-[10.5px] font-bold uppercase tracking-wider text-[var(--fg-muted)]">
                <tr>
                  <th className="px-4 py-3">{tr ? 'SİPARİŞ NO' : 'PO NUMBER'}</th>
                  <th className="px-4 py-3">{tr ? 'TEDARİKÇİ' : 'SUPPLIER'}</th>
                  <th className="px-4 py-3">{tr ? 'TARİH' : 'ORDER DATE'}</th>
                  <th className="px-4 py-3">{tr ? 'BEKLENEN TESLİMAT' : 'EXPECTED DATE'}</th>
                  <th className="px-4 py-3">{tr ? 'SATIRLAR' : 'LINES'}</th>
                  <th className="px-4 py-3">{tr ? 'TOPLAM TUTAR' : 'TOTAL AMOUNT'}</th>
                  <th className="px-4 py-3">{tr ? 'DURUM' : 'STATUS'}</th>
                  <th className="px-4 py-3 text-right">{tr ? 'İŞLEMLER' : 'ACTIONS'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-soft)]">
                {/* HATA once kontrol edilir: aksi halde basarisiz sorgu bos listeye dusup
                    "hic siparis yok" gibi gorunurdu - sessiz ve yaniltici. */}
                {isError ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-6">
                      <ErrorState
                        title={tr ? 'Satın alma siparişleri yüklenemedi' : 'Could not load purchase orders'}
                        onRetry={() => refetch()}
                      />
                    </td>
                  </tr>
                ) : isLoading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-xs text-[var(--fg-muted)]">
                      {tr ? 'Satın alma siparişleri yükleniyor...' : 'Loading purchase orders...'}
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-xs text-[var(--fg-muted)]">
                      {tr ? 'Görüntülenecek satın alma siparişi bulunamadı.' : 'No purchase orders found.'}
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((o) => {
                    const totalOrderValue = o.lines.reduce((acc, l) => acc + l.quantity * l.unitPrice, 0);
                    const totalQty = o.lines.reduce((acc, l) => acc + l.quantity, 0);
                    const totalReceived = o.lines.reduce((acc, l) => acc + l.receivedQuantity, 0);
                                      const cfg = STATUS_CONFIG[o.status] || STATUS_CONFIG.Draft;

                    return (
                      <tr
                        key={o.id}
                        onClick={() => setSelectedId(o.id)}
                        className="hover:bg-[var(--bg-subtle)]/40 transition cursor-pointer"
                      >
                        <td className="px-4 py-3">
                          <span className="font-mono font-bold text-[var(--fg)]">{o.orderNumber}</span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-[var(--fg)]">
                          {o.supplierName}
                        </td>
                        <td className="px-4 py-3 text-[var(--fg-muted)]">
                          {o.orderDate}
                        </td>
                        <td className="px-4 py-3 text-[var(--fg-muted)]">
                          {o.expectedDate || '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-[var(--fg)]">{o.lines.length} {tr ? 'kalem' : 'items'}</span>
                            <span className="text-[10.5px] text-[var(--fg-muted)]">
                              ({totalReceived}/{totalQty})
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-[var(--fg)]">
                          {totalOrderValue.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                          {o.lines[0]?.currency || 'TRY'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center rounded-[3px] border px-2 py-0.5 text-[10.5px] font-bold ${cfg.badge}`}>
                            {tr ? cfg.tr : cfg.en}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => setSelectedId(o.id)}
                            className="inline-flex h-7 items-center gap-1 rounded-[3px] border border-[var(--border)] bg-[var(--card)] px-2.5 text-xs font-semibold text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer"
                          >
                            <Eye size={11} />
                            <span>{tr ? 'Detay & Teslim' : 'Details'}</span>
                          </button>
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

      {/* New Order Dialog */}
      {createOpen && (
        <PurchaseOrderFormDialog
          onClose={() => setCreateOpen(false)}
          onSaved={() => {
            void qc.invalidateQueries({ queryKey: ['purchase-orders'] });
          }}
        />
      )}

      {/* Order Detail & Receive Dialog */}
      {selectedId !== null && (
        <PurchaseOrderDetailDialog
          orderId={selectedId}
          onClose={() => setSelectedId(null)}
          onChanged={() => {
            void qc.invalidateQueries({ queryKey: ['purchase-orders'] });
          }}
        />
      )}
    </div>
  );
}
