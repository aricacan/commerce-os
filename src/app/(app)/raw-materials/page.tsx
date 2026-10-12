'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Pencil, Trash2, RefreshCw, FileDown } from 'lucide-react';
import { rawMaterialApi, type RawMaterial } from '../../../lib/api/raw-material';
import { RawMaterialFormDialog } from '../../../features/raw-materials/RawMaterialFormDialog';
import { ProcurementSubTabBar } from '../../../components/layout/ProcurementSubTabBar';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { downloadExcel, type ExportColumn } from '../../../lib/export';
import { toast } from '../../../lib/toast';
import { describeError } from '../../../lib/errors';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import { useI18n } from '../../../lib/i18n';

export default function RawMaterialsPage() {
  const { lang } = useI18n();
  const tr = lang === 'tr';
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [dialogMaterial, setDialogMaterial] = useState<RawMaterial | 'new' | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RawMaterial | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['raw-materials', debouncedSearch],
    queryFn: () => rawMaterialApi.list(debouncedSearch || undefined),
    staleTime: 30_000,
  });

  const invalidate = () => void qc.invalidateQueries({ queryKey: ['raw-materials'] });

  const remove = useMutation({
    mutationFn: (id: number) => rawMaterialApi.remove(id),
    onSuccess: () => {
      toast.success(tr ? 'Hammadde silindi.' : 'Raw material deleted.');
      invalidate();
      setDeleteTarget(null);
    },
    onError: (e) => toast.error(describeError(e)),
  });

  const materials = useMemo(() => data ?? [], [data]);

  // KPI Calculations
  const stats = useMemo(() => {
    const total = materials.length;
    const withSupplier = materials.filter((m) => m.supplierId !== null).length;
    const avgCost = total > 0 ? materials.reduce((acc, m) => acc + m.unitCost, 0) / total : 0;
    const uniqueUnits = new Set(materials.map((m) => m.unit).filter(Boolean)).size;
    return { total, withSupplier, avgCost, uniqueUnits };
  }, [materials]);

  // Excel Export
  const handleExportExcel = () => {
    if (materials.length === 0) {
      toast.error(tr ? 'Dışa aktarılacak hammadde yok.' : 'No materials to export.');
      return;
    }
    const cols: ExportColumn[] = [
      { header: tr ? 'Hammadde Adı' : 'Material Name', key: 'name', type: 'text' },
      { header: tr ? 'Stok Kodu' : 'Code', key: 'code', type: 'text' },
      { header: tr ? 'Ölçü Birimi' : 'Unit', key: 'unit', type: 'text' },
      { header: tr ? 'Birim Maliyet' : 'Unit Cost', key: 'unitCost', type: 'money' },
      { header: tr ? 'Para Birimi' : 'Currency', key: 'currency', type: 'text' },
      { header: tr ? 'Ana Tedarikçi' : 'Supplier', key: 'supplierName', type: 'text' },
      { header: tr ? 'Notlar' : 'Notes', key: 'notes', type: 'text' },
    ];

    const rows = materials.map((m) => ({
      name: m.name,
      code: m.code || '—',
      unit: m.unit || 'Adet',
      unitCost: m.unitCost,
      currency: m.currency || 'TRY',
      supplierName: m.supplierName || '—',
      notes: m.notes || '',
    }));

    void downloadExcel(
      `hammadde_listesi_${new Date().toISOString().slice(0, 10)}`,
      rows,
      cols,
      'Hammaddeler'
    );
    toast.success(tr ? 'Hammadde listesi Excel olarak indirildi.' : 'Materials exported as Excel.');
  };

  return (
    <div className="flex flex-1 flex-col h-full overflow-hidden bg-[var(--bg)] text-[var(--fg)]">
      {/* ── Top Shared Procurement Bar ── */}
      <ProcurementSubTabBar />

      {/* ── Main Scrollable Area ── */}
      <div className="flex flex-1 flex-col overflow-y-auto p-5 gap-5">
        
        {/* KPI Metrics */}
        <div data-tour="raw-materials-kpi" className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3.5 shadow-xs">
            <div className="text-[11px] font-semibold text-[var(--fg-muted)]">{tr ? 'Toplam Hammadde' : 'Total Materials'}</div>
            <div className="mt-1 text-lg font-bold text-[var(--fg)]">{stats.total}</div>
          </div>
          <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3.5 shadow-xs">
            <div className="text-[11px] font-semibold text-[var(--fg-muted)]">{tr ? 'Tedarikçisi Tanımlı' : 'With Supplier'}</div>
            <div className="mt-1 text-lg font-bold text-emerald-500">{stats.withSupplier}</div>
          </div>
          <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3.5 shadow-xs">
            <div className="text-[11px] font-semibold text-[var(--fg-muted)]">{tr ? 'Ortalama Birim Maliyet' : 'Average Unit Cost'}</div>
            <div className="mt-1 text-lg font-mono font-bold text-[var(--fg)]">
              {stats.avgCost.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TRY
            </div>
          </div>
          <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3.5 shadow-xs">
            <div className="text-[11px] font-semibold text-[var(--fg-muted)]">{tr ? 'Birim Çeşitliliği' : 'Unit Types'}</div>
            <div className="mt-1 text-lg font-bold text-[var(--fg)]">{stats.uniqueUnits} {tr ? 'farklı birim' : 'units'}</div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3 shadow-xs">
          <div data-tour="raw-materials-search" className="relative w-64 sm:w-80">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={tr ? 'Hammadde Adı veya Stok Kodu Ara...' : 'Search material name or code...'}
              className="h-8 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] pl-8 pr-3 text-xs text-[var(--fg)] placeholder-[var(--fg-muted)] outline-none focus:border-[var(--fg)]"
            />
          </div>

          <div data-tour="raw-materials-actions" className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={materials.length === 0}
              title={tr ? 'Excel İndir' : 'Export Excel'}
              className="inline-flex h-8 items-center gap-1.5 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-semibold text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer disabled:opacity-50"
            >
              <FileDown size={13} />
              <span className="hidden sm:inline">{tr ? 'Excel İndir' : 'Excel Export'}</span>
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
              onClick={() => setDialogMaterial('new')}
              className="inline-flex h-8 items-center gap-1.5 rounded-[4px] bg-[var(--fg)] px-3 text-xs font-bold text-[var(--bg)] shadow-xs hover:opacity-90 transition cursor-pointer"
            >
              <Plus size={13} />
              <span>{tr ? 'Yeni Hammadde' : 'New Material'}</span>
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div data-tour="raw-materials-table" className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="border-b border-[var(--border-soft)] bg-[var(--bg-subtle)]/50 text-[10.5px] font-bold uppercase tracking-wider text-[var(--fg-muted)]">
                <tr>
                  <th className="px-4 py-3">{tr ? 'HAMMADDE ADI' : 'MATERIAL NAME'}</th>
                  <th className="px-4 py-3">{tr ? 'STOK KODU' : 'CODE'}</th>
                  <th className="px-4 py-3">{tr ? 'ÖLÇÜ BİRİMİ' : 'UNIT'}</th>
                  <th className="px-4 py-3">{tr ? 'BİRİM MALİYET' : 'UNIT COST'}</th>
                  <th className="px-4 py-3">{tr ? 'ANA TEDARİKÇİ' : 'SUPPLIER'}</th>
                  <th className="px-4 py-3">{tr ? 'NOTLAR' : 'NOTES'}</th>
                  <th className="px-4 py-3 text-right">{tr ? 'İŞLEMLER' : 'ACTIONS'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-soft)]">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-xs text-[var(--fg-muted)]">
                      {tr ? 'Hammaddeler yükleniyor...' : 'Loading materials...'}
                    </td>
                  </tr>
                ) : materials.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-xs text-[var(--fg-muted)]">
                      {tr ? 'Görüntülenecek hammadde bulunamadı.' : 'No materials found.'}
                    </td>
                  </tr>
                ) : (
                  materials.map((m) => (
                    <tr
                      key={m.id}
                      onClick={() => setDialogMaterial(m)}
                      className="hover:bg-[var(--bg-subtle)]/40 transition cursor-pointer"
                    >
                      <td className="px-4 py-3 font-bold text-[var(--fg)]">
                        {m.name}
                      </td>
                      <td className="px-4 py-3 font-mono text-[var(--fg-muted)]">
                        {m.code || '—'}
                      </td>
                      <td className="px-4 py-3 font-medium text-[var(--fg)]">
                        <span className="rounded-[3px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] px-2 py-0.5 text-[11px]">
                          {m.unit || (tr ? 'Adet' : 'Pcs')}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-[var(--fg)]">
                        {m.unitCost.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}{' '}
                        {m.currency || 'TRY'}
                      </td>
                      <td className="px-4 py-3 text-[var(--fg)]">
                        {m.supplierName || <span className="text-[var(--fg-muted)]">—</span>}
                      </td>
                      <td className="px-4 py-3 text-[var(--fg-muted)] max-w-xs truncate">
                        {m.notes || '—'}
                      </td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setDialogMaterial(m)}
                            title={tr ? 'Düzenle' : 'Edit'}
                            className="flex h-7 w-7 items-center justify-center rounded-[3px] border border-[var(--border)] bg-[var(--card)] text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(m)}
                            title={tr ? 'Sil' : 'Delete'}
                            className="flex h-7 w-7 items-center justify-center rounded-[3px] border border-rose-500/20 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition cursor-pointer"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Material Modal */}
      {dialogMaterial && (
        <RawMaterialFormDialog
          material={dialogMaterial === 'new' ? null : dialogMaterial}
          onClose={() => setDialogMaterial(null)}
          onSaved={invalidate}
        />
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <ConfirmDialog
          open
          title={tr ? 'Hammadde Kartını Sil' : 'Delete Raw Material'}
          description={
            tr
              ? `"${deleteTarget.name}" hammaddesini silmek istediğinizden emin misiniz?`
              : `Are you sure you want to delete "${deleteTarget.name}"?`
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
