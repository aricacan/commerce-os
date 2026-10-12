'use client';

import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Trash2, FlaskConical, FileDown, Save } from 'lucide-react';
import { productApi } from '../../../lib/api/products';
import { rawMaterialApi } from '../../../lib/api/raw-material';
import { bomApi, type BomLineInput } from '../../../lib/api/bom';
import type { ProductGridItem } from '../../../types/api';
import { ProcurementSubTabBar } from '../../../components/layout/ProcurementSubTabBar';
import { FilterSelect } from '../../../components/ui/FilterSelect';
import { downloadExcel, type ExportColumn } from '../../../lib/export';
import { toast } from '../../../lib/toast';
import { describeError } from '../../../lib/errors';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import { useI18n } from '../../../lib/i18n';

export default function BomManagementPage() {
  const { lang } = useI18n();
  const tr = lang === 'tr';
  const qc = useQueryClient();

  const [productSearch, setProductSearch] = useState('');
  const debouncedSearch = useDebouncedValue(productSearch);
  const [selectedProduct, setSelectedProduct] = useState<ProductGridItem | null>(null);

  // Products Query
  const productsQuery = useQuery({
    queryKey: ['products-for-bom', debouncedSearch],
    queryFn: () => productApi.list({ search: debouncedSearch || undefined, pageSize: 20 }),
    staleTime: 30_000,
  });

  // Materials Query
  const materialsQuery = useQuery({
    queryKey: ['raw-materials', ''],
    queryFn: () => rawMaterialApi.list(),
    staleTime: 60_000,
  });
  const materials = useMemo(() => materialsQuery.data ?? [], [materialsQuery]);

  // Selected Product BOM Query
  const bomQuery = useQuery({
    queryKey: ['product-bom', selectedProduct?.productId],
    queryFn: () => (selectedProduct ? bomApi.getByProductId(selectedProduct.productId) : null),
    enabled: selectedProduct !== null,
  });

  const [draftLines, setDraftLines] = useState<Array<{ key: string; rawMaterialId: number; quantity: number; notes: string }>>([]);
  const [draftNotes, setDraftNotes] = useState('');

  // BOM verisi gelince taslak satirlari eslestir.
  //
  // useMemo DEGIL useEffect: useMemo render SIRASINDA calisir, icinde setState cagirmak
  // React'in "render sirasinda durum guncelleme" kuralini kirar (react-hooks/set-state-in-render).
  // React 19'da bu ekstra render turlarina ve StrictMode'da tutarsiz davranisa yol acar.
  useEffect(() => {
    if (bomQuery.data) {
      setDraftLines(
        bomQuery.data.lines.map((l) => ({
          key: String(l.id || crypto.randomUUID()),
          rawMaterialId: l.rawMaterialId,
          quantity: l.quantity,
          notes: l.notes || '',
        }))
      );
      setDraftNotes(bomQuery.data.notes || '');
    } else if (bomQuery.isFetched && !bomQuery.data) {
      setDraftLines([]);
      setDraftNotes('');
    }
  }, [bomQuery.data, bomQuery.isFetched]);

  function addIngredient() {
    if (materials.length === 0) {
      toast.error(tr ? 'Önce hammadde eklemelisiniz.' : 'Please add raw materials first.');
      return;
    }
    setDraftLines((prev) => [
      ...prev,
      {
        key: crypto.randomUUID(),
        rawMaterialId: materials[0].id,
        quantity: 1,
        notes: '',
      },
    ]);
  }

  function updateDraft(key: string, patch: Partial<{ rawMaterialId: number; quantity: number; notes: string }>) {
    setDraftLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function removeDraft(key: string) {
    setDraftLines((prev) => prev.filter((l) => l.key !== key));
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedProduct) return;
      const linesInput: BomLineInput[] = draftLines.map((l) => ({
        rawMaterialId: l.rawMaterialId,
        quantity: Number(l.quantity) || 1,
        notes: l.notes || undefined,
      }));
      return bomApi.upsert(selectedProduct.productId, draftNotes || null, linesInput);
    },
    onSuccess: () => {
      toast.success(tr ? 'Ürün reçetesi başarıyla kaydedildi.' : 'Recipe saved successfully.');
      void qc.invalidateQueries({ queryKey: ['product-bom', selectedProduct?.productId] });
    },
    onError: (e) => toast.error(describeError(e)),
  });

  const removeBomMutation = useMutation({
    mutationFn: async () => {
      if (!selectedProduct) return;
      return bomApi.remove(selectedProduct.productId);
    },
    onSuccess: () => {
      toast.success(tr ? 'Ürün reçetesi silindi.' : 'BOM deleted.');
      setDraftLines([]);
      setDraftNotes('');
      void qc.invalidateQueries({ queryKey: ['product-bom', selectedProduct?.productId] });
    },
    onError: (e) => toast.error(describeError(e)),
  });

  // Calculate live recipe cost in TRY
  const calculatedTotalCost = useMemo(() => {
    return draftLines.reduce((acc, line) => {
      const mat = materials.find((m) => m.id === line.rawMaterialId);
      const unitCost = mat?.unitCost ?? 0;
      return acc + (Number(line.quantity) || 0) * unitCost;
    }, 0);
  }, [draftLines, materials]);

  // Margin calculation simulation
  const salePrice = selectedProduct?.price ?? 0;
  const estimatedGrossMargin = salePrice > 0 ? ((salePrice - calculatedTotalCost) / salePrice) * 100 : 0;

  // Excel Export for BOM
  const handleExportBomExcel = () => {
    if (!selectedProduct || draftLines.length === 0) {
      toast.error(tr ? 'Dışa aktarılacak reçete satırı yok.' : 'No BOM lines to export.');
      return;
    }
    const cols: ExportColumn[] = [
      { header: tr ? 'Hammadde / Parça' : 'Raw Material', key: 'name', type: 'text' },
      { header: tr ? 'Stok Kodu' : 'SKU Code', key: 'code', type: 'text' },
      { header: tr ? 'Birim' : 'Unit', key: 'unit', type: 'text' },
      { header: tr ? 'Kullanım Miktarı' : 'Quantity', key: 'qty', type: 'decimal' },
      { header: tr ? 'Birim Maliyet' : 'Unit Cost', key: 'cost', type: 'money' },
      { header: tr ? 'Para Birimi' : 'Currency', key: 'currency', type: 'text' },
      { header: tr ? 'Toplam Maliyet (TRY)' : 'Total (TRY)', key: 'total', type: 'money' },
      { header: tr ? 'Notlar' : 'Notes', key: 'notes', type: 'text' },
    ];

    const rows = draftLines.map((l) => {
      const mat = materials.find((m) => m.id === l.rawMaterialId);
      const lineCost = (Number(l.quantity) || 0) * (mat?.unitCost ?? 0);
      return {
        name: mat?.name || '—',
        code: mat?.code || '—',
        unit: mat?.unit || 'Adet',
        qty: l.quantity,
        cost: mat?.unitCost ?? 0,
        currency: mat?.currency || 'TRY',
        total: lineCost,
        notes: l.notes || '',
      };
    });

    void downloadExcel(
      `recete_${selectedProduct.supplierSKU || selectedProduct.productId}_${new Date().toISOString().slice(0, 10)}`,
      rows,
      cols,
      'BOM_Recete'
    );
    toast.success(tr ? 'Reçete dökümü Excel olarak indirildi.' : 'BOM exported as Excel.');
  };

  return (
    <div className="flex flex-1 flex-col h-full overflow-hidden bg-[var(--bg)] text-[var(--fg)]">
      {/* ── Top Shared Procurement Bar ── */}
      <ProcurementSubTabBar />

      {/* ── Main Scrollable Area ── */}
      <div className="flex flex-1 flex-col overflow-y-auto p-5 gap-5">
        
        {/* KPI Metrics */}
        <div data-tour="bom-kpi" className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3.5 shadow-xs">
            <div className="text-[11px] font-semibold text-[var(--fg-muted)]">{tr ? 'Ürün Sayısı' : 'Products'}</div>
            <div className="mt-1 text-lg font-bold text-[var(--fg)]">{productsQuery.data?.totalCount ?? 0}</div>
          </div>
          <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3.5 shadow-xs">
            <div className="text-[11px] font-semibold text-[var(--fg-muted)]">{tr ? 'Kayıtlı Hammadde' : 'Raw Materials'}</div>
            <div className="mt-1 text-lg font-bold text-emerald-500">{materials.length}</div>
          </div>
          <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3.5 shadow-xs">
            <div className="text-[11px] font-semibold text-[var(--fg-muted)]">{tr ? 'Seçili Ürün Malzeme Maliyeti' : 'Active BOM Cost'}</div>
            <div className="mt-1 text-lg font-mono font-bold text-[var(--fg)]">
              {calculatedTotalCost.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TRY
            </div>
          </div>
          <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3.5 shadow-xs">
            <div className="text-[11px] font-semibold text-[var(--fg-muted)]">{tr ? 'Hammadde Brüt Kâr Marjı' : 'Est. Material Margin'}</div>
            <div className={`mt-1 text-lg font-mono font-bold ${estimatedGrossMargin >= 40 ? 'text-emerald-500' : 'text-amber-500'}`}>
              %{estimatedGrossMargin.toFixed(1)}
            </div>
          </div>
        </div>

        {/* Workspace Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 min-h-[500px]">
          
          {/* Sol Panel: Ürün Seçici */}
          <div data-tour="bom-product-search" className="lg:col-span-4 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-4 shadow-xs flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--fg)]">{tr ? 'Ürün Seçimi' : 'Select Product'}</span>
              <span className="text-[11px] text-[var(--fg-muted)]">
                {productsQuery.data?.totalCount ?? 0} {tr ? 'ürün' : 'products'}
              </span>
            </div>

            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]" />
              <input
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder={tr ? 'Ürün Adı / SKU Ara...' : 'Search product / SKU...'}
                className="h-8 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] pl-8 pr-3 text-xs text-[var(--fg)] placeholder-[var(--fg-muted)] outline-none focus:border-[var(--fg)]"
              />
            </div>

            <div className="flex-1 overflow-y-auto max-h-[560px] space-y-1 divide-y divide-[var(--border-soft)]/40">
              {(productsQuery.data?.items ?? []).map((p) => {
                const isSelected = selectedProduct?.productId === p.productId;
                return (
                  <button
                    key={p.productId}
                    type="button"
                    onClick={() => setSelectedProduct(p)}
                    className={`w-full text-left p-2.5 rounded-[3px] transition flex flex-col gap-0.5 cursor-pointer ${
                      isSelected
                        ? 'border border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--fg)] font-bold shadow-xs'
                        : 'hover:bg-[var(--bg-subtle)]/40 text-[var(--fg)]'
                    }`}
                  >
                    <div className="text-xs truncate font-semibold">{p.productName}</div>
                    <div className="flex items-center justify-between text-[10.5px] text-[var(--fg-muted)]">
                      <span className="font-mono">SKU: {p.supplierSKU || `#${p.productId}`}</span>
                      <span className="font-mono font-medium text-[var(--fg)]">
                        {p.price?.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TRY
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sağ Panel: Reçete Oluşturucu Canvas */}
          <div data-tour="bom-editor" className="lg:col-span-8 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-5 shadow-xs flex flex-col gap-4">
            {!selectedProduct ? (
              <div className="flex flex-col items-center justify-center py-28 text-center gap-2.5 text-[var(--fg-muted)]">
                <FlaskConical size={36} strokeWidth={1.5} />
                <h4 className="text-sm font-bold text-[var(--fg)]">{tr ? 'Reçete Düzenlemek İçin Ürün Seçin' : 'Select Product for BOM'}</h4>
                <p className="text-xs max-w-sm">
                  {tr
                    ? 'Sol paneldeki arama alanını kullanarak bir mamul ürün seçin ve bileşen hammaddelerini ekleyin.'
                    : 'Search and pick a manufactured product from the left to manage recipe components and costs.'}
                </p>
              </div>
            ) : (
              <>
                {/* Header of Selected Product */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-soft)] pb-3.5">
                  <div>
                    <h3 className="text-sm font-bold text-[var(--fg)]">{selectedProduct.productName}</h3>
                    <div className="text-[11px] text-[var(--fg-muted)] mt-0.5">
                      SKU: <span className="font-mono">{selectedProduct.supplierSKU || `#${selectedProduct.productId}`}</span> • {tr ? 'Satış Fiyatı:' : 'Price:'}{' '}
                      <span className="font-mono font-bold text-[var(--fg)]">
                        {selectedProduct.price?.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TRY
                      </span>
                    </div>
                  </div>

                  <div data-tour="bom-actions" className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleExportBomExcel}
                      disabled={draftLines.length === 0}
                      title={tr ? 'Excel Dışa Aktar' : 'Export Excel'}
                      className="inline-flex h-8 items-center gap-1.5 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-semibold text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer disabled:opacity-50"
                    >
                      <FileDown size={13} />
                      <span className="hidden sm:inline">{tr ? 'Excel İndir' : 'Excel Export'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={addIngredient}
                      disabled={materials.length === 0}
                      className="inline-flex h-8 items-center gap-1.5 rounded-[4px] border border-[var(--border)] bg-[var(--bg-subtle)] px-3 text-xs font-semibold text-[var(--fg)] hover:bg-[var(--card)] transition cursor-pointer disabled:opacity-50"
                    >
                      <Plus size={12} />
                      <span>{tr ? '+ Hammadde Ekle' : '+ Add Ingredient'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => saveMutation.mutate()}
                      disabled={saveMutation.isPending}
                      className="inline-flex h-8 items-center gap-1.5 rounded-[4px] bg-[var(--fg)] px-4 text-xs font-bold text-[var(--bg)] shadow-xs hover:opacity-90 transition cursor-pointer disabled:opacity-50"
                    >
                      <Save size={12} />
                      <span>{saveMutation.isPending ? (tr ? 'Kaydediliyor...' : 'Saving...') : (tr ? 'Reçeteyi Kaydet' : 'Save BOM')}</span>
                    </button>
                  </div>
                </div>

                {/* Ingredients Table */}
                {draftLines.length === 0 ? (
                  <div className="rounded-[4px] border border-dashed border-[var(--border)] py-16 text-center text-xs text-[var(--fg-muted)]">
                    {tr ? 'Bu ürün için henüz reçete kalemi tanımlanmadı. "+ Hammadde Ekle" butonuna basarak başlayın.' : 'No BOM ingredients defined. Click "+ Add Ingredient" to start.'}
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-[4px] border border-[var(--border-soft)]">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead className="border-b border-[var(--border-soft)] bg-[var(--bg-subtle)]/50 text-[10.5px] font-bold uppercase tracking-wider text-[var(--fg-muted)]">
                        <tr>
                          <th className="px-3.5 py-2.5">{tr ? 'HAMMADDE / BİLEŞEN' : 'RAW MATERIAL'}</th>
                          <th className="px-3.5 py-2.5 w-28">{tr ? 'MİKTAR' : 'QUANTITY'}</th>
                          <th className="px-3.5 py-2.5 w-20">{tr ? 'BİRİM' : 'UNIT'}</th>
                          <th className="px-3.5 py-2.5 w-28">{tr ? 'BİRİM MALİYET' : 'UNIT COST'}</th>
                          <th className="px-3.5 py-2.5 text-right w-28">{tr ? 'TOPLAM (TRY)' : 'TOTAL'}</th>
                          <th className="px-3.5 py-2.5 text-right w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-soft)]">
                        {draftLines.map((line) => {
                          const mat = materials.find((m) => m.id === line.rawMaterialId);
                          const unitCost = mat?.unitCost ?? 0;
                          const lineTotal = (Number(line.quantity) || 0) * unitCost;

                          return (
                            <tr key={line.key} className="hover:bg-[var(--bg-subtle)]/30">
                              <td className="px-3.5 py-2.5">
                                <FilterSelect
                                  value={String(line.rawMaterialId)}
                                  onChange={(v) => updateDraft(line.key, { rawMaterialId: Number(v) })}
                                  placeholder={tr ? 'Hammadde seçin' : 'Select material'}
                                  searchable={true}
                                  height="h-8"
                                  options={materials.map((m) => ({
                                    value: String(m.id),
                                    label: `${m.name} ${m.code ? `(${m.code})` : ''}`,
                                    sublabel: `${m.unitCost} ${m.currency}`,
                                  }))}
                                />
                              </td>
                              <td className="px-3.5 py-2.5">
                                <input
                                  type="number"
                                  step="0.001"
                                  min="0.001"
                                  value={line.quantity}
                                  onChange={(e) => updateDraft(line.key, { quantity: Number(e.target.value) })}
                                  className="h-8 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] font-mono outline-none focus:border-[var(--fg)]"
                                />
                              </td>
                              <td className="px-3.5 py-2.5 text-[var(--fg-muted)]">
                                <span className="rounded-[3px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] px-2 py-0.5 text-[10.5px]">
                                  {mat?.unit || (tr ? 'Adet' : 'Pcs')}
                                </span>
                              </td>
                              <td className="px-3.5 py-2.5 font-mono text-[var(--fg-muted)]">
                                {unitCost.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} {mat?.currency}
                              </td>
                              <td className="px-3.5 py-2.5 text-right font-mono font-bold text-[var(--fg)]">
                                {lineTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TRY
                              </td>
                              <td className="px-3.5 py-2.5 text-right">
                                <button
                                  type="button"
                                  onClick={() => removeDraft(line.key)}
                                  className="flex h-7 w-7 items-center justify-center rounded-[3px] text-[var(--fg-muted)] hover:text-rose-500 hover:bg-rose-500/10 transition cursor-pointer ml-auto"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Total Cost & Profitability Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)]/40 px-4 py-3 text-xs mt-auto">
                  <div className="flex-1 min-w-[280px]">
                    <span className="text-[11px] font-semibold text-[var(--fg-muted)]">{tr ? 'Reçete Açıklaması / Üretim Notu:' : 'Recipe Notes:'}</span>
                    <input
                      value={draftNotes}
                      onChange={(e) => setDraftNotes(e.target.value)}
                      placeholder={tr ? 'Örn: Montaj süresi 5 dk, paketleme talimatı...' : 'Recipe notes...'}
                      className="mt-1 h-8 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-3 text-xs text-[var(--fg)] outline-none focus:border-[var(--fg)]"
                    />
                  </div>

                  <div className="flex items-center gap-6 text-right">
                    {bomQuery.data && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(tr ? 'Bu ürün reçetesini tamamen silmek istediğinize emin misiniz?' : 'Are you sure you want to delete this BOM?')) {
                            removeBomMutation.mutate();
                          }
                        }}
                        disabled={removeBomMutation.isPending}
                        className="text-xs font-semibold text-rose-500 hover:underline cursor-pointer"
                      >
                        {tr ? 'Reçeteyi Sil' : 'Delete BOM'}
                      </button>
                    )}

                    <div>
                      <div className="text-[11px] font-semibold text-[var(--fg-muted)]">{tr ? 'Hesaplanan Reçete Maliyeti' : 'Calculated BOM Cost'}</div>
                      <div className="text-base font-mono font-black text-[var(--fg)]">
                        {calculatedTotalCost.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TRY
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
