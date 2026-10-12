'use client';

import { localDateStr } from '../../utils/date';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createPortal } from 'react-dom';
import { X, Plus, Trash2, Search, ShoppingBag, Upload, FileDown } from 'lucide-react';
import { supplierApi } from '../../lib/api/supplier';
import { rawMaterialApi } from '../../lib/api/raw-material';
import { productApi } from '../../lib/api/products';
import { purchaseOrderApi, type CreatePurchaseOrderLineBody } from '../../lib/api/purchase-order';
import { FilterSelect } from '../../components/ui/FilterSelect';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useI18n } from '../../lib/i18n';
import { downloadExcel, type ExportColumn } from '../../lib/export';

// Excel şablonundaki sütun başlıkları — PurchaseOrderLineExcelParser'ın tanıdığı KANONİK
// adlarla BİREBİR aynı olmalı (bkz. backend PurchaseOrderLineExcelParser.CodeHeaders/...),
// aksi halde kullanıcı indirdiği şablonu doldurup geri yüklediğinde eşleşme kaçar.
const TEMPLATE_COLUMNS: ExportColumn[] = [
  { key: 'kod', header: 'Kod', type: 'text' },
  { key: 'miktar', header: 'Miktar', type: 'int' },
  { key: 'birimFiyat', header: 'Birim Fiyat', type: 'decimal' },
  { key: 'paraBirimi', header: 'Para Birimi', type: 'text' },
];

interface Props {
  onClose: () => void;
  onSaved: () => void;
}

interface DraftLine extends CreatePurchaseOrderLineBody {
  key: string;
  itemLabel: string;
}

function ProductPicker({ onPick }: { onPick: (id: number, name: string) => void }) {
  const [search, setSearch] = useState('');
  const debounced = useDebouncedValue(search);
  const { lang } = useI18n();
  const tr = lang === 'tr';

  const query = useQuery({
    queryKey: ['products-search-po', debounced],
    queryFn: () => productApi.list({ search: debounced, pageSize: 8 }),
    enabled: debounced.trim().length >= 2,
  });

  return (
    <div className="relative w-full">
      <div className="relative">
        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={tr ? 'Ürün ara (en az 2 karakter)...' : 'Search product...'}
          className="h-8 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] pl-8 pr-3 text-xs text-[var(--fg)] placeholder-[var(--fg-muted)] outline-none focus:border-[var(--fg)] transition"
        />
      </div>
      {debounced.trim().length >= 2 && (
        <div className="absolute top-full left-0 right-0 z-30 mt-1 max-h-48 overflow-y-auto rounded-[4px] border border-[var(--border)] bg-[var(--card)] p-1 shadow-lg">
          {(query.data?.items ?? []).map((p) => (
            <button
              key={p.productId}
              type="button"
              onClick={() => {
                onPick(p.productId, p.productName);
                setSearch('');
              }}
              className="flex w-full items-center justify-between rounded-[3px] px-2.5 py-1.5 text-left text-xs text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer"
            >
              <span className="font-medium truncate">{p.productName}</span>
              <span className="ml-2 text-[10.5px] text-[var(--fg-muted)] shrink-0 font-mono">#{p.productId}</span>
            </button>
          ))}
          {query.data?.items.length === 0 && (
            <div className="px-3 py-2 text-center text-xs text-[var(--fg-muted)]">
              {tr ? 'Eşleşen ürün bulunamadı.' : 'No matching product.'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function PurchaseOrderFormDialog({ onClose, onSaved }: Props) {
  const { lang } = useI18n();
  const tr = lang === 'tr';

  const [supplierId, setSupplierId] = useState<number | ''>('');
  const [orderDate, setOrderDate] = useState(() => localDateStr());
  const [expectedDate, setExpectedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importingExcel, setImportingExcel] = useState(false);
  const [excelWarnings, setExcelWarnings] = useState<string[]>([]);

  const suppliersQuery = useQuery({ queryKey: ['suppliers', ''], queryFn: () => supplierApi.list(), staleTime: 60_000 });
  const materialsQuery = useQuery({ queryKey: ['raw-materials', ''], queryFn: () => rawMaterialApi.list(), staleTime: 60_000 });
  const suppliers = suppliersQuery.data ?? [];
  const materials = materialsQuery.data ?? [];

  function addProductLine(id: number, name: string) {
    setLines((prev) => [
      ...prev,
      {
        key: crypto.randomUUID(),
        itemType: 'Product',
        productId: id,
        quantity: 1,
        unitPrice: 0,
        currency: 'TRY',
        itemLabel: name,
      },
    ]);
  }

  function addRawMaterialLine() {
    if (materials.length === 0) return;
    const first = materials[0];
    setLines((prev) => [
      ...prev,
      {
        key: crypto.randomUUID(),
        itemType: 'RawMaterial',
        rawMaterialId: first.id,
        quantity: 1,
        unitPrice: first.unitCost,
        currency: first.currency || 'TRY',
        itemLabel: first.name,
      },
    ]);
  }

  function updateLine(key: string, patch: Partial<DraftLine>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function removeLine(key: string) {
    setLines((prev) => prev.filter((l) => l.key !== key));
  }

  function handleTemplateDownload() {
    void downloadExcel('satin_alma_siparisi_sablonu', [], TEMPLATE_COLUMNS, 'Şablon');
  }

  async function handleImportExcel(file: File) {
    setImportingExcel(true);
    setExcelWarnings([]);
    setError(null);
    try {
      const result = await purchaseOrderApi.parseLineExcel(file);
      if (result.lines.length > 0) {
        setLines((prev) => [
          ...prev,
          ...result.lines.map((l) => ({
            key: crypto.randomUUID(),
            itemType: l.itemType,
            productId: l.productId ?? undefined,
            rawMaterialId: l.rawMaterialId ?? undefined,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            currency: l.currency,
            itemLabel: l.itemLabel,
          })),
        ]);
      }
      setExcelWarnings(result.warnings.map((w) => `Satır ${w.rowNumber}: ${w.message}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : (tr ? 'Excel okunamadı.' : 'Could not read Excel file.'));
    } finally {
      setImportingExcel(false);
    }
  }

  const grandTotal = lines.reduce((acc, l) => acc + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0), 0);

  async function handleSave() {
    if (!supplierId) {
      setError(tr ? 'Lütfen bir tedarikçi seçin.' : 'Please select a supplier.');
      return;
    }
    if (lines.length === 0) {
      setError(tr ? 'En az bir sipariş satırı eklemelisiniz.' : 'Please add at least one line.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await purchaseOrderApi.create({
        supplierId: Number(supplierId),
        orderDate,
        expectedDate: expectedDate || undefined,
        notes: notes.trim() || undefined,
        lines: lines.map((l) => ({
          itemType: l.itemType,
          productId: l.productId,
          rawMaterialId: l.rawMaterialId,
          quantity: Number(l.quantity) || 1,
          unitPrice: Number(l.unitPrice) || 0,
          currency: l.currency || 'TRY',
          notes: l.notes,
        })),
      });
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kayıt sırasında bir hata oluştu.');
    } finally {
      setSaving(false);
    }
  }

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl rounded-[4px] border border-[var(--border)] bg-[var(--card)] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-[var(--fg)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-soft)] bg-[var(--bg-subtle)]/40 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <ShoppingBag size={16} className="text-[var(--fg-muted)]" />
            <div>
              <h2 className="text-sm font-bold text-[var(--fg)]">
                {tr ? 'Yeni Satın Alma Siparişi' : 'New Purchase Order'}
              </h2>
              <p className="text-[11px] text-[var(--fg-muted)]">
                {tr ? 'Tedarikçiye iletilecek ürün ve hammadde kalemlerini belirleyin.' : 'Define items and details for supplier purchase order.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-[3px] text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {error && (
            <div className="rounded-[4px] border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-600 dark:text-rose-400">
              {error}
            </div>
          )}

          {/* Form Top Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[var(--fg-muted)]">
                {tr ? 'Tedarikçi *' : 'Supplier *'}
              </label>
              <FilterSelect
                value={supplierId ? String(supplierId) : ''}
                onChange={(v) => setSupplierId(v ? Number(v) : '')}
                placeholder={tr ? 'Tedarikçi seçiniz...' : 'Select supplier...'}
                searchable={true}
                height="h-8.5"
                options={suppliers.map((s) => ({
                  value: String(s.id),
                  label: s.name,
                  sublabel: s.shortCode || undefined,
                }))}
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[var(--fg-muted)]">
                {tr ? 'Sipariş Tarihi' : 'Order Date'}
              </label>
              <input
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                className="h-8.5 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] outline-none focus:border-[var(--fg)]"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[var(--fg-muted)]">
                {tr ? 'Beklenen Teslimat' : 'Expected Delivery'}
              </label>
              <input
                type="date"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
                className="h-8.5 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] outline-none focus:border-[var(--fg)]"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[var(--fg-muted)]">
              {tr ? 'Notlar / Sipariş Açıklaması' : 'Notes / Description'}
            </label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={tr ? 'Sipariş notu, sevk talimatı...' : 'Order notes, delivery instructions...'}
              className="h-8.5 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-3 text-xs text-[var(--fg)] outline-none focus:border-[var(--fg)]"
            />
          </div>

          {/* Lines Table */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--fg)]">
                {tr ? 'Sipariş Kalemleri' : 'Order Items'} ({lines.length})
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleTemplateDownload}
                  title={tr ? 'Boş Excel şablonu indir' : 'Download blank Excel template'}
                  className="inline-flex h-7 items-center gap-1 rounded-[3px] border border-[var(--border)] bg-[var(--bg-subtle)] px-2.5 text-[11px] font-medium text-[var(--fg)] hover:bg-[var(--card)] transition cursor-pointer"
                >
                  <FileDown size={11} /> {tr ? 'Şablon İndir' : 'Download Template'}
                </button>
                <label className="inline-flex h-7 items-center gap-1 rounded-[3px] border border-[var(--border)] bg-[var(--bg-subtle)] px-2.5 text-[11px] font-medium text-[var(--fg)] hover:bg-[var(--card)] transition cursor-pointer">
                  <Upload size={11} />
                  <span>{importingExcel ? (tr ? 'Okunuyor...' : 'Reading...') : (tr ? "Excel'den Yükle" : 'Import Excel')}</span>
                  <input
                    type="file"
                    accept=".xlsx"
                    className="hidden"
                    disabled={importingExcel}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = '';
                      if (file) void handleImportExcel(file);
                    }}
                  />
                </label>
                <button
                  type="button"
                  onClick={addRawMaterialLine}
                  disabled={materials.length === 0}
                  className="inline-flex h-7 items-center gap-1 rounded-[3px] border border-[var(--border)] bg-[var(--bg-subtle)] px-2.5 text-[11px] font-medium text-[var(--fg)] hover:bg-[var(--card)] transition cursor-pointer disabled:opacity-50"
                >
                  <Plus size={11} /> {tr ? '+ Hammadde Ekle' : '+ Add Raw Material'}
                </button>
              </div>
            </div>

            {excelWarnings.length > 0 && (
              <div className="rounded-[4px] border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-700 dark:text-amber-400 space-y-0.5">
                {excelWarnings.map((w, i) => (
                  <div key={i}>{w}</div>
                ))}
              </div>
            )}

            {/* Product Quick Search Adder */}
            <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)]/30 p-2.5">
              <ProductPicker onPick={addProductLine} />
            </div>

            {/* Table */}
            {lines.length === 0 ? (
              <div className="rounded-[4px] border border-dashed border-[var(--border)] py-8 text-center text-xs text-[var(--fg-muted)]">
                {tr ? 'Henüz ürün veya hammadde kalemi eklenmedi.' : 'No items added yet.'}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-[4px] border border-[var(--border-soft)]">
                <table className="w-full border-collapse text-left text-xs">
                  <thead className="border-b border-[var(--border-soft)] bg-[var(--bg-subtle)]/50 text-[10.5px] font-bold uppercase tracking-wider text-[var(--fg-muted)]">
                    <tr>
                      <th className="px-3 py-2">{tr ? 'TÜR' : 'TYPE'}</th>
                      <th className="px-3 py-2">{tr ? 'KALEM ADI' : 'ITEM'}</th>
                      <th className="px-3 py-2 w-24">{tr ? 'MİKTAR' : 'QTY'}</th>
                      <th className="px-3 py-2 w-28">{tr ? 'BİRİM FİYAT' : 'UNIT PRICE'}</th>
                      <th className="px-3 py-2 w-24">{tr ? 'PARA BİRİMİ' : 'CURRENCY'}</th>
                      <th className="px-3 py-2 text-right w-24">{tr ? 'TUTAR' : 'TOTAL'}</th>
                      <th className="px-3 py-2 text-right w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-soft)]">
                    {lines.map((l) => {
                      const lineTotal = (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0);
                      return (
                        <tr key={l.key} className="hover:bg-[var(--bg-subtle)]/30">
                          <td className="px-3 py-2 font-mono text-[10px] text-[var(--fg-muted)]">
                            {l.itemType === 'Product' ? 'ÜRÜN' : 'HAMMADDE'}
                          </td>
                          <td className="px-3 py-2 font-semibold text-[var(--fg)]">
                            {l.itemType === 'RawMaterial' ? (
                              <FilterSelect
                                value={l.rawMaterialId ? String(l.rawMaterialId) : ''}
                                onChange={(v) => {
                                  const sel = materials.find((m) => m.id === Number(v));
                                  if (sel) {
                                    updateLine(l.key, {
                                      rawMaterialId: sel.id,
                                      itemLabel: sel.name,
                                      unitPrice: sel.unitCost,
                                      currency: sel.currency || 'TRY',
                                    });
                                  }
                                }}
                                placeholder={tr ? 'Hammadde seçin' : 'Select material'}
                                height="h-7"
                                options={materials.map((m) => ({
                                  value: String(m.id),
                                  label: m.name,
                                  sublabel: m.code || undefined,
                                }))}
                              />
                            ) : (
                              <span className="truncate block max-w-[200px]">{l.itemLabel}</span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min="1"
                              value={l.quantity}
                              onChange={(e) => updateLine(l.key, { quantity: Number(e.target.value) })}
                              className="h-7 w-full rounded-[3px] border border-[var(--border)] bg-[var(--bg)] px-2 text-xs text-[var(--fg)]"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              step="0.01"
                              value={l.unitPrice}
                              onChange={(e) => updateLine(l.key, { unitPrice: Number(e.target.value) })}
                              className="h-7 w-full rounded-[3px] border border-[var(--border)] bg-[var(--bg)] px-2 text-xs text-[var(--fg)] font-mono"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <FilterSelect
                              value={l.currency || 'TRY'}
                              onChange={(v) => updateLine(l.key, { currency: v || 'TRY' })}
                              placeholder="TRY"
                              height="h-7"
                              options={[
                                { value: 'TRY', label: 'TRY' },
                                { value: 'USD', label: 'USD' },
                                { value: 'EUR', label: 'EUR' },
                                { value: 'GBP', label: 'GBP' },
                              ]}
                            />
                          </td>
                          <td className="px-3 py-2 text-right font-mono font-bold text-[var(--fg)]">
                            {lineTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <button
                              type="button"
                              onClick={() => removeLine(l.key)}
                              className="flex h-6 w-6 items-center justify-center rounded-[3px] text-[var(--fg-muted)] hover:text-rose-500 hover:bg-rose-500/10 transition cursor-pointer ml-auto"
                            >
                              <Trash2 size={12} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Grand Total Bar */}
            {lines.length > 0 && (
              <div className="flex items-center justify-between rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)]/40 px-4 py-2.5 text-xs">
                <span className="font-semibold text-[var(--fg-muted)]">{tr ? 'Tahmini Genel Toplam:' : 'Estimated Grand Total:'}</span>
                <span className="font-mono text-sm font-black text-[var(--fg)]">
                  {grandTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-[var(--border-soft)] bg-[var(--bg-subtle)]/30 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="inline-flex h-8 items-center rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-semibold text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer"
          >
            {tr ? 'İptal' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex h-8 items-center rounded-[4px] bg-[var(--fg)] px-4 text-xs font-bold text-[var(--bg)] shadow-xs hover:opacity-90 transition cursor-pointer disabled:opacity-50"
          >
            {saving ? (tr ? 'Kaydediliyor...' : 'Saving...') : (tr ? 'Siparişi Oluştur' : 'Create Order')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
