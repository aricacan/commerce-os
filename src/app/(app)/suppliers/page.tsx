'use client';

import { useRef, useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Upload, Pencil, Trash2, RefreshCw, FileDown } from 'lucide-react';
import { supplierApi, type Supplier } from '../../../lib/api/supplier';
import { SupplierFormDialog } from '../../../features/suppliers/SupplierFormDialog';
import { ProcurementSubTabBar } from '../../../components/layout/ProcurementSubTabBar';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { downloadExcel, type ExportColumn } from '../../../lib/export';
import { toast } from '../../../lib/toast';
import { describeError } from '../../../lib/errors';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import { useI18n } from '../../../lib/i18n';

const STATUS_CONFIG: Record<Supplier['status'], { tr: string; en: string; badge: string; dot: string }> = {
  Active: { tr: 'Aktif', en: 'Active', badge: 'border-slate-300 dark:border-slate-700 bg-slate-100/70 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300', dot: 'bg-emerald-500' },
  Candidate: { tr: 'Aday', en: 'Candidate', badge: 'border-slate-300 dark:border-slate-700 bg-slate-100/70 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300', dot: 'bg-blue-500' },
  Inactive: { tr: 'Pasif', en: 'Inactive', badge: 'border-slate-300 dark:border-slate-700 bg-slate-100/50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400', dot: 'bg-slate-400' },
  Blacklisted: { tr: 'Kara Liste', en: 'Blacklisted', badge: 'border-rose-300 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400', dot: 'bg-rose-500' },
};

export default function SuppliersPage() {
  const { lang } = useI18n();
  const tr = lang === 'tr';
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [dialogSupplier, setDialogSupplier] = useState<Supplier | 'new' | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('All');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['suppliers', debouncedSearch],
    queryFn: () => supplierApi.list(debouncedSearch || undefined),
    staleTime: 30_000,
  });

  const invalidate = () => void qc.invalidateQueries({ queryKey: ['suppliers'] });

  const remove = useMutation({
    mutationFn: (id: number) => supplierApi.remove(id),
    onSuccess: () => {
      toast.success(tr ? 'Tedarikçi kartı silindi.' : 'Supplier deleted.');
      invalidate();
      setDeleteTarget(null);
    },
    onError: (e) => toast.error(describeError(e)),
  });

  const importExcel = useMutation({
    mutationFn: (file: File) => supplierApi.importExcel(file),
    onSuccess: (result) => {
      toast.success(
        tr
          ? `İçe aktarıldı: ${result.inserted} yeni, ${result.updated} güncellendi.`
          : `Imported: ${result.inserted} new, ${result.updated} updated.`
      );
      if (result.warnings.length > 0) toast.error(result.warnings.slice(0, 3).join(' '));
      invalidate();
    },
    onError: (e) => toast.error(describeError(e)),
  });

  const suppliers = useMemo(() => data ?? [], [data]);

  const filteredSuppliers = useMemo(() => {
    if (statusFilter === 'All') return suppliers;
    return suppliers.filter((s) => s.status === statusFilter);
  }, [suppliers, statusFilter]);

  // KPI Calculations
  const stats = useMemo(() => {
    const total = suppliers.length;
    const active = suppliers.filter((s) => s.status === 'Active').length;
    const candidate = suppliers.filter((s) => s.status === 'Candidate').length;
    const productSuppliers = suppliers.filter((s) => s.type === 'Product').length;
    const rawMaterialSuppliers = suppliers.filter((s) => s.type === 'RawMaterial').length;
    return { total, active, candidate, productSuppliers, rawMaterialSuppliers };
  }, [suppliers]);

  const handleExportExcel = () => {
    if (filteredSuppliers.length === 0) {
      toast.error(tr ? 'Dışa aktarılacak tedarikçi yok.' : 'No suppliers to export.');
      return;
    }
    const cols: ExportColumn[] = [
      { header: tr ? 'Firma Adı' : 'Company Name', key: 'name', type: 'text' },
      { header: tr ? 'Kısa Kod' : 'Code', key: 'shortCode', type: 'text' },
      { header: tr ? 'Tedarikçi Türü' : 'Type', key: 'type', type: 'text' },
      { header: tr ? 'İlgili Kişi' : 'Contact Person', key: 'contactPerson', type: 'text' },
      { header: tr ? 'Telefon' : 'Phone', key: 'phone', type: 'text' },
      { header: tr ? 'E-posta' : 'Email', key: 'email', type: 'text' },
      { header: tr ? 'Şehir' : 'City', key: 'city', type: 'text' },
      { header: tr ? 'Vergi No' : 'Tax No', key: 'taxNumber', type: 'text' },
      { header: tr ? 'Vergi Dairesi' : 'Tax Office', key: 'taxOffice', type: 'text' },
      { header: tr ? 'Ödeme Vadesi (Gün)' : 'Payment Terms', key: 'paymentTermDays', type: 'text' },
      { header: tr ? 'Para Birimi' : 'Currency', key: 'currency', type: 'text' },
      { header: tr ? 'Banka Adı' : 'Bank', key: 'bankName', type: 'text' },
      { header: tr ? 'IBAN' : 'IBAN', key: 'iban', type: 'text' },
      { header: tr ? 'Durum' : 'Status', key: 'status', type: 'text' },
    ];

    const rows = filteredSuppliers.map((s) => ({
      name: s.name,
      shortCode: s.shortCode || '—',
      type: s.type || '—',
      contactPerson: s.contactPerson || '—',
      phone: s.phone || '—',
      email: s.email || '—',
      city: s.city || '—',
      taxNumber: s.taxNumber || '—',
      taxOffice: s.taxOffice || '—',
      paymentTermDays: s.paymentTermDays ?? (tr ? 'Peşin' : 'Cash'),
      currency: s.currency || 'TRY',
      bankName: s.bankName || '—',
      iban: s.iban || '—',
      status: s.status,
    }));

    void downloadExcel(
      `tedarikci_listesi_${new Date().toISOString().slice(0, 10)}`,
      rows,
      cols,
      'Tedarikciler'
    );
    toast.success(tr ? 'Tedarikçi listesi Excel olarak indirildi.' : 'Suppliers exported as Excel.');
  };

  return (
    <div className="flex flex-1 flex-col h-full overflow-hidden bg-[var(--bg)] text-[var(--fg)]">
      {/* ── Sub Tab Navigation ── */}
      <ProcurementSubTabBar />

      {/* ── Main Scrollable Area ── */}
      <div className="flex flex-1 flex-col overflow-y-auto p-5 gap-5">
        
        {/* KPI Metrics Strip */}
        <div data-tour="suppliers-kpi" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3.5 shadow-xs">
            <div className="text-[11px] font-semibold text-[var(--fg-muted)]">{tr ? 'Toplam Tedarikçi' : 'Total Suppliers'}</div>
            <div className="mt-1 font-mono text-lg font-bold tabular-nums text-[var(--fg)]">{stats.total}</div>
          </div>
          <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3.5 shadow-xs">
            <div className="text-[11px] font-semibold text-[var(--fg-muted)]">{tr ? 'Aktif Çalışılan' : 'Active'}</div>
            <div className="mt-1 font-mono text-lg font-bold tabular-nums text-[var(--fg)]">{stats.active}</div>
          </div>
          <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3.5 shadow-xs">
            <div className="text-[11px] font-semibold text-[var(--fg-muted)]">{tr ? 'Aday Tedarikçiler' : 'Candidates'}</div>
            <div className="mt-1 font-mono text-lg font-bold tabular-nums text-[var(--fg-muted)]">{stats.candidate}</div>
          </div>
          <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3.5 shadow-xs">
            <div className="text-[11px] font-semibold text-[var(--fg-muted)]">{tr ? 'Ürün Tedarikçisi' : 'Product Suppliers'}</div>
            <div className="mt-1 font-mono text-lg font-bold tabular-nums text-[var(--fg)]">{stats.productSuppliers}</div>
          </div>
          <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3.5 shadow-xs">
            <div className="text-[11px] font-semibold text-[var(--fg-muted)]">{tr ? 'Hammadde Tedarikçisi' : 'Raw Material Suppliers'}</div>
            <div className="mt-1 font-mono text-lg font-bold tabular-nums text-[var(--fg)]">{stats.rawMaterialSuppliers}</div>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3 shadow-xs">
          {/* Status Tabs */}
          <div data-tour="suppliers-status-tabs" className="flex items-center gap-1 overflow-x-auto">
            {['All', 'Active', 'Candidate', 'Inactive', 'Blacklisted'].map((st) => {
              const active = statusFilter === st;
              const label =
                st === 'All'
                  ? tr ? 'Tümü' : 'All'
                  : tr ? STATUS_CONFIG[st as Supplier['status']]?.tr || st : STATUS_CONFIG[st as Supplier['status']]?.en || st;
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`inline-flex h-7.5 items-center justify-center rounded-[3px] px-3 text-xs font-semibold transition cursor-pointer ${
                    active
                      ? 'border border-slate-300 dark:border-slate-700 bg-slate-800 text-slate-100 dark:bg-slate-700 dark:text-slate-100 shadow-xs'
                      : 'text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)]'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Search & Actions */}
          <div data-tour="suppliers-actions" className="flex items-center gap-2">
            <div data-tour="suppliers-search" className="relative w-56 sm:w-64">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={tr ? 'Firma Adı / Kod Ara...' : 'Search supplier name / code...'}
                className="h-8 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] pl-8 pr-3 text-xs text-[var(--fg)] placeholder-[var(--fg-muted)] outline-none focus:border-[var(--fg)]"
              />
            </div>

            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void importExcel.mutateAsync(file);
                e.target.value = '';
              }}
            />

            <button
              type="button"
              onClick={handleExportExcel}
              disabled={filteredSuppliers.length === 0}
              title={tr ? 'Excel Dışa Aktar' : 'Export Excel'}
              className="inline-flex h-8 items-center gap-1.5 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-semibold text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer disabled:opacity-50"
            >
              <FileDown size={13} />
              <span className="hidden sm:inline">{tr ? 'Excel İndir' : 'Export'}</span>
            </button>

            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={importExcel.isPending}
              title={tr ? 'Excel ile İçe Aktar' : 'Import Excel'}
              className="inline-flex h-8 items-center gap-1.5 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-semibold text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer disabled:opacity-50"
            >
              <Upload size={13} />
              <span className="hidden sm:inline">{importExcel.isPending ? (tr ? 'Yükleniyor...' : 'Importing...') : (tr ? 'Excel Yükle' : 'Import Excel')}</span>
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
              onClick={() => setDialogSupplier('new')}
              className="inline-flex h-8 items-center gap-1.5 rounded-[4px] bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 px-3 text-xs font-semibold text-slate-100 shadow-xs transition cursor-pointer"
            >
              <Plus size={13} />
              <span>{tr ? 'Yeni Tedarikçi' : 'New Supplier'}</span>
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div data-tour="suppliers-table" className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="border-b border-[var(--border-soft)] bg-[var(--bg-subtle)]/50 text-[10.5px] font-bold uppercase tracking-wider text-[var(--fg-muted)]">
                <tr>
                  <th className="px-4 py-3">{tr ? 'FİRMA ADI & KOD' : 'SUPPLIER NAME'}</th>
                  <th className="px-4 py-3">{tr ? 'TÜR & SEKTÖR' : 'TYPE / INDUSTRY'}</th>
                  <th className="px-4 py-3">{tr ? 'İLETİŞİM BİLGİLERİ' : 'CONTACT'}</th>
                  <th className="px-4 py-3">{tr ? 'ŞEHİR / ÜLKE' : 'LOCATION'}</th>
                  <th className="px-4 py-3">{tr ? 'VERGİ NO (VKN)' : 'TAX NO'}</th>
                  <th className="px-4 py-3">{tr ? 'ÖDEME VADESİ' : 'PAYMENT TERM'}</th>
                  <th className="px-4 py-3">{tr ? 'DURUM' : 'STATUS'}</th>
                  <th className="px-4 py-3 text-right">{tr ? 'İŞLEMLER' : 'ACTIONS'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-soft)]">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-xs text-[var(--fg-muted)]">
                      {tr ? 'Tedarikçiler yükleniyor...' : 'Loading suppliers...'}
                    </td>
                  </tr>
                ) : filteredSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-xs text-[var(--fg-muted)]">
                      {tr ? 'Görüntülenecek tedarikçi kaydı bulunamadı.' : 'No suppliers found.'}
                    </td>
                  </tr>
                ) : (
                  filteredSuppliers.map((s) => {
                    const cfg = STATUS_CONFIG[s.status] || STATUS_CONFIG.Active;
                    return (
                      <tr
                        key={s.id}
                        onClick={() => setDialogSupplier(s)}
                        className="hover:bg-[var(--bg-subtle)]/40 transition cursor-pointer"
                      >
                        {/* Company Name & Code */}
                        <td className="px-4 py-3">
                          <div className="font-bold text-[var(--fg)]">{s.name}</div>
                          {s.shortCode && (
                            <div className="font-mono text-[10.5px] text-[var(--fg-muted)]">{s.shortCode}</div>
                          )}
                        </td>

                        {/* Type & Industry */}
                        <td className="px-4 py-3">
                          <div className="font-medium text-[var(--fg)]">
                            {s.type === 'Product'
                              ? tr ? 'Ürün Tedarikçisi' : 'Product'
                              : s.type === 'RawMaterial'
                              ? tr ? 'Hammadde' : 'Raw Material'
                              : s.type === 'Service'
                              ? tr ? 'Hizmet' : 'Service'
                              : '—'}
                          </div>
                          {s.industry && (
                            <div className="text-[10.5px] text-[var(--fg-muted)]">{s.industry}</div>
                          )}
                        </td>

                        {/* Contact */}
                        <td className="px-4 py-3">
                          {s.contactPerson && <div className="font-medium text-[var(--fg)]">{s.contactPerson}</div>}
                          <div className="text-[10.5px] text-[var(--fg-muted)]">
                            {[s.phone, s.email].filter(Boolean).join(' • ') || '—'}
                          </div>
                        </td>

                        {/* Location */}
                        <td className="px-4 py-3 text-[var(--fg-muted)]">
                          {[s.district, s.city, s.country].filter(Boolean).join(', ') || '—'}
                        </td>

                        {/* Tax Number */}
                        <td className="px-4 py-3 font-mono text-[var(--fg-muted)]">
                          {s.taxNumber ? (
                            <div>
                              <span>{s.taxNumber}</span>
                              {s.taxOffice && <div className="text-[10px]">{s.taxOffice}</div>}
                            </div>
                          ) : (
                            '—'
                          )}
                        </td>

                        {/* Payment Term */}
                        <td className="px-4 py-3 font-medium text-[var(--fg)]">
                          {s.paymentTermDays ? `${s.paymentTermDays} ${tr ? 'gün' : 'days'}` : (tr ? 'Peşin' : 'Cash')} ({s.currency})
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 rounded-[3px] border px-2 py-0.5 text-[10.5px] font-medium ${cfg.badge}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                            {tr ? cfg.tr : cfg.en}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setDialogSupplier(s)}
                              title={tr ? 'Düzenle' : 'Edit'}
                              className="flex h-7 w-7 items-center justify-center rounded-[3px] border border-[var(--border)] bg-[var(--card)] text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer"
                            >
                              <Pencil size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(s)}
                              title={tr ? 'Sil' : 'Delete'}
                              className="flex h-7 w-7 items-center justify-center rounded-[3px] border border-rose-500/20 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition cursor-pointer"
                            >
                              <Trash2 size={12} />
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

      {/* Supplier Create/Edit Modal */}
      {dialogSupplier && (
        <SupplierFormDialog
          supplier={dialogSupplier === 'new' ? null : dialogSupplier}
          onClose={() => setDialogSupplier(null)}
          onSaved={invalidate}
        />
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <ConfirmDialog
          open
          title={tr ? 'Tedarikçi Kartını Sil' : 'Delete Supplier'}
          description={
            tr
              ? `"${deleteTarget.name}" tedarikçisini silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`
              : `Are you sure you want to delete supplier "${deleteTarget.name}"?`
          }
          confirmLabel={tr ? 'Evet, Sil' : 'Yes, Delete'}
          cancelLabel={tr ? 'Vazgeç' : 'Cancel'}
          destructive
          onConfirm={() => remove.mutate(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
