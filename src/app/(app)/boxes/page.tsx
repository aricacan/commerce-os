'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { packagingApi, type BoxInfo, type ProductLookupResult } from '../../../lib/api';
import { useAuthStore } from '../../../stores/auth';
import { useI18n } from '../../../lib/i18n';
import { ExportMenu, type ExportRow } from '../../../components/ui/ExportMenu';
import { downloadExcel, type ExportColumn } from '../../../lib/export';
import { pushAlert, clearAlerts } from '../../../stores/alert-stack';
import { Plus, Edit2, Trash2, Check, X, Search, Upload, Loader2, FileDown } from 'lucide-react';
import { useMobile } from '../../../hooks/useMobile';
import { useUrlState } from '../../../hooks/useUrlState';

function fmtDesi(n: number | null | undefined) {
  if (n == null) return '—';
  const decimals = n > 0 && n < 0.01 ? 4 : 2;
  return n.toLocaleString('tr-TR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

interface BoxForm {
  boxCode: string;
  name: string;
  width: string;
  length: string;
  height: string;
  manualDesi: string;
  price: string;
}

const EMPTY_FORM: BoxForm = { boxCode: '', name: '', width: '', length: '', height: '', manualDesi: '', price: '' };

function formToRequest(f: BoxForm) {
  return {
    boxCode: f.boxCode.trim().toUpperCase(),
    name: f.name.trim() || f.boxCode.trim().toUpperCase(),
    width: f.width ? parseInt(f.width) : undefined,
    length: f.length ? parseInt(f.length) : undefined,
    height: f.height ? parseInt(f.height) : undefined,
    manualDesi: f.manualDesi ? parseFloat(f.manualDesi) : undefined,
    price: f.price ? parseFloat(f.price) : undefined,
  };
}

// ─── Kutu Ekle / Düzenle Modalı ─────────────────────────────────────────────

function BoxModal({
  initialForm,
  isEdit,
  onClose,
  onSave,
  saving,
  error,
}: {
  initialForm: BoxForm;
  isEdit: boolean;
  onClose: () => void;
  onSave: (f: BoxForm) => void;
  saving: boolean;
  error: string | null;
}) {
  const { t, lang } = useI18n();
  const isTr = lang === 'tr';
  const [form, setForm] = useState<BoxForm>(initialForm);

  function field(key: keyof BoxForm, label: string, placeholder: string, type = 'text') {
    return (
      <div className="flex flex-col gap-1">
        <label className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--fg-muted)]">
          {label}
        </label>
        <input
          type={type}
          placeholder={placeholder}
          value={form[key]}
          onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
          disabled={isEdit && key === 'boxCode'}
          className={`h-9 w-full rounded-[6px] border border-[var(--border)] px-3 text-xs text-[var(--fg)] outline-none transition focus:border-[var(--fg)] ${
            isEdit && key === 'boxCode' ? 'bg-[var(--bg-subtle)] opacity-70' : 'bg-[var(--card)]'
          }`}
        />
      </div>
    );
  }

  const hasDim = form.width || form.length || form.height;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[420px] rounded-[6px] border border-[var(--border)] bg-[var(--card)] p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between border-b border-[var(--border-soft)] pb-3">
          <h2 className="text-sm font-bold text-[var(--fg)]">
            {isEdit ? t('warehouse_edit_box_title') : t('warehouse_add_box_title')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-6 w-6 items-center justify-center rounded-[4px] text-[var(--fg-muted)] hover:text-[var(--fg)]"
          >
            <X size={15} />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {!isEdit && field('boxCode', t('warehouse_field_box_code'), 'KTU-001')}
          {field('name', t('warehouse_field_box_name'), t('warehouse_placeholder_box_name'))}
          {field('price', t('warehouse_field_box_price'), '45.50', 'number')}

          <div>
            <p className="mb-1.5 text-[10.5px] font-bold uppercase tracking-wider text-[var(--fg-muted)]">
              {t('warehouse_dimensions_hint')}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {field('width', t('warehouse_field_width'), '300', 'number')}
              {field('length', t('warehouse_field_length'), '400', 'number')}
              {field('height', t('warehouse_field_height'), '200', 'number')}
            </div>
          </div>

          {!hasDim && field('manualDesi', t('warehouse_field_manual_desi'), '3.20', 'number')}
        </div>

        {error && (
          <div className="mt-3 rounded-[4px] border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-500">
            {error}
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2 border-t border-[var(--border-soft)] pt-3">
          <button
            type="button"
            onClick={onClose}
            className="h-8 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-semibold text-[var(--fg)] hover:bg-[var(--bg-subtle)]"
          >
            {t('warehouse_modal_cancel')}
          </button>
          <button
            type="button"
            onClick={() => onSave(form)}
            disabled={saving}
            className="inline-flex h-8 items-center gap-1.5 rounded-[4px] bg-[var(--fg)] px-3 text-xs font-bold text-[var(--card)] hover:opacity-90 disabled:opacity-50"
          >
            <Check size={13} />
            <span>{saving ? t('warehouse_saving') : isEdit ? t('warehouse_update') : (isTr ? 'Kutu Ekle' : 'Add Box')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── SKU Sorgulama Modalı ───────────────────────────────────────────────────

function SkuLookupModal({
  skuInput,
  setSkuInput,
  onLookup,
  loading,
  result,
  error,
  onClose,
}: {
  skuInput: string;
  setSkuInput: (v: string) => void;
  onLookup: () => void;
  loading: boolean;
  result: ProductLookupResult | null;
  error: string | null;
  onClose: () => void;
}) {
  const { t, lang } = useI18n();
  const isTr = lang === 'tr';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[420px] rounded-[6px] border border-[var(--border)] bg-[var(--card)] p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between border-b border-[var(--border-soft)] pb-3">
          <h2 className="text-sm font-bold text-[var(--fg)]">
            {t('warehouse_sku_lookup_title')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-6 w-6 items-center justify-center rounded-[4px] text-[var(--fg-muted)] hover:text-[var(--fg)]"
          >
            <X size={15} />
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--fg-muted)]">
            {t('warehouse_product_stock_code_label')}
          </label>
          <div className="flex gap-2">
            <input
              autoFocus
              value={skuInput}
              onChange={(e) => setSkuInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onLookup()}
              placeholder={t('warehouse_sku_placeholder')}
              className="h-9 flex-1 rounded-[6px] border border-[var(--border)] bg-[var(--card)] px-3 text-xs text-[var(--fg)] outline-none focus:border-[var(--fg)]"
            />
            <button
              type="button"
              onClick={onLookup}
              disabled={loading || !skuInput.trim()}
              className="inline-flex h-9 items-center gap-1.5 rounded-[6px] bg-[var(--fg)] px-3 text-xs font-bold text-[var(--card)] transition hover:opacity-90 disabled:opacity-40"
            >
              {loading ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
              <span>{isTr ? 'Sorgula' : 'Find'}</span>
            </button>
          </div>
        </div>

        {error && (
          <p className="mt-3 text-xs text-red-500">{error}</p>
        )}

        {result && (
          <div className="mt-4 rounded-[6px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] p-3.5">
            <p className="font-semibold text-xs text-[var(--fg)]">{result.name}</p>
            <p className="font-mono text-[11px] text-[var(--fg-muted)]">{result.supplierSKU}</p>
            {result.hasBox ? (
              <div className="mt-3 grid grid-cols-2 gap-2">
                {[
                  { label: t('warehouse_box_code_label'), value: result.boxCode ?? '—' },
                  { label: t('warehouse_box_price_label'), value: result.boxPrice != null ? `${result.boxPrice.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL` : '—' },
                  { label: t('warehouse_desi_label'), value: fmtDesi(result.desi) },
                  { label: t('warehouse_dimensions_label'), value: result.width ? `${result.width}×${result.length}×${result.height} mm` : '—' },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--fg-muted)]">{label}</p>
                    <p className="mt-0.5 text-xs font-bold text-[var(--fg)]">{value}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-xs font-medium text-amber-500">{t('warehouse_no_box_assigned')}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Ana Sayfa ──────────────────────────────────────────────────────────────

const WAREHOUSE_FILTER_DEFAULTS = { q: '', sort: 'boxCode' };

export default function WarehousePage() {
  const { t, lang } = useI18n();
  const isTr = lang === 'tr';
  const isMobile = useMobile();
  const roles = useAuthStore((s) => s.user?.roles ?? []);
  const canEdit = roles.some((r) => r === 'SuperAdmin' || r === 'Admin');

  const { state: urlState, setState: setUrlState } = useUrlState(WAREHOUSE_FILTER_DEFAULTS);
  const boxSearch = urlState.q;
  const sortField = urlState.sort;
  const [boxes, setBoxes] = useState<BoxInfo[]>([]);
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  function handleSort(field: string) {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setUrlState({ sort: field });
      setSortAsc(true);
    }
  }

  const [boxesLoading, setBoxesLoading] = useState(true);
  const [boxesError, setBoxesError] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBox, setEditingBox] = useState<BoxInfo | null>(null);
  const [modalSaving, setModalSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<{ text: string; error: boolean } | null>(null);

  const [skuInput, setSkuInput] = useState('');
  const [lookupResult, setLookupResult] = useState<ProductLookupResult | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupModalOpen, setLookupModalOpen] = useState(false);

  const { data: unmatchedData } = useQuery({
    queryKey: ['packaging-unmatched'],
    queryFn: packagingApi.unmatchedCount,
    staleTime: 60_000,
  });

  async function loadBoxes() {
    setBoxesLoading(true);
    try {
      const data = await packagingApi.boxes();
      setBoxes(data);
    } catch {
      setBoxesError(true);
    } finally {
      setBoxesLoading(false);
    }
  }

  useEffect(() => { void loadBoxes(); }, []);

  const filteredBoxes = boxes.filter((b) => {
    if (!boxSearch) return true;
    const s = boxSearch.toLowerCase();
    return b.boxCode.toLowerCase().includes(s) || b.name.toLowerCase().includes(s);
  });

  const sortedBoxes = [...filteredBoxes].sort((a, b) => {
    let valA: string | number;
    let valB: string | number;

    switch (sortField) {
      case 'name':
        valA = a.name;
        valB = b.name;
        break;
      case 'dimensions':
        valA = (a.width || 0) * (a.length || 0) * (a.height || 0);
        valB = (b.width || 0) * (b.length || 0) * (b.height || 0);
        break;
      case 'desi':
        valA = a.desi ?? 0;
        valB = b.desi ?? 0;
        break;
      case 'price':
        valA = a.price ?? 0;
        valB = b.price ?? 0;
        break;
      case 'productCount':
        valA = a.productCount;
        valB = b.productCount;
        break;
      case 'boxCode':
      default:
        valA = a.boxCode;
        valB = b.boxCode;
        break;
    }

    if (typeof valA === 'string' && typeof valB === 'string') {
      return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    if (typeof valA === 'number' && typeof valB === 'number') {
      return sortAsc ? valA - valB : valB - valA;
    }
    return 0;
  });

  const boxesExportColumns: ExportColumn[] = [
    { key: 'code', header: t('warehouse_box_code_label'), type: 'text' },
    { key: 'name', header: t('warehouse_col_name'), type: 'text' },
    { key: 'width', header: t('warehouse_field_width'), type: 'decimal' },
    { key: 'length', header: t('warehouse_field_length'), type: 'decimal' },
    { key: 'height', header: t('warehouse_field_height'), type: 'decimal' },
    { key: 'desi', header: t('warehouse_desi_label'), type: 'decimal' },
    { key: 'price', header: `${t('warehouse_box_price_label')} (TL)`, type: 'money', currency: 'TRY' },
    { key: 'productCount', header: t('warehouse_col_product'), type: 'int' },
  ];

  const boxImportTemplateColumns: ExportColumn[] = [
    { key: 'sku', header: isTr ? 'Stok Ürün Kodu' : 'Product SKU', type: 'text' },
    { key: 'boxCode', header: isTr ? 'Kutu Kodu' : 'Box Code', type: 'text' },
    { key: 'boxName', header: isTr ? 'Kutu Adı' : 'Box Name', type: 'text' },
    { key: 'dimensions', header: isTr ? 'Ölçüler (En*Boy*Yükseklik)' : 'Dimensions (W*L*H)', type: 'text' },
    { key: 'price', header: isTr ? 'Kutu Fiyatı' : 'Box Price', type: 'decimal' },
  ];

  function boxesToExportRows(): ExportRow[] {
    return sortedBoxes.map((b) => ({
      code: b.boxCode,
      name: b.name,
      width: b.width || '',
      length: b.length || '',
      height: b.height || '',
      desi: b.desi ?? '',
      price: b.price ?? '',
      productCount: b.productCount,
    }));
  }

  async function handleDownloadTemplate() {
    try {
      await downloadExcel(
        'kutu-yukleme-sablonu.xlsx',
        [],
        boxImportTemplateColumns,
        isTr ? 'Kutular' : 'Boxes',
      );
    } catch (err: unknown) {
      pushAlert(
        (isTr ? 'Şablon indirilemedi: ' : 'Template could not be downloaded: ') + (err instanceof Error ? err.message : String(err)),
        'error',
        7000,
      );
    }
  }

  async function handleSave(form: BoxForm) {
    setModalSaving(true);
    setModalError(null);
    try {
      const req = formToRequest(form);
      if (editingBox) {
        await packagingApi.updateBox(editingBox.boxCode, req);
      } else {
        if (!req.boxCode) { setModalError(t('warehouse_box_code_required')); setModalSaving(false); return; }
        await packagingApi.createBox(req);
      }
      setModalOpen(false);
      setEditingBox(null);
      await loadBoxes();
    } catch (error: unknown) {
      setModalError(error instanceof Error ? error.message : t('warehouse_save_failed'));
    } finally {
      setModalSaving(false);
    }
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImporting(true);
    setImportMsg(null);
    clearAlerts();
    pushAlert(
      isTr
        ? `"${file.name}" kutu Excel dosyası yükleniyor...`
        : `Uploading "${file.name}" boxes Excel...`,
      'info'
    );
    try {
      const res = await packagingApi.importBoxes(file);
      setImportMsg({ text: res.message, error: false });
      pushAlert(
        isTr
          ? `Kutular başarıyla yüklendi: ${res.boxesUpserted} kutu güncellendi.`
          : `Boxes successfully uploaded: ${res.boxesUpserted} boxes upserted.`,
        'success'
      );
      await loadBoxes();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : t('warehouse_import_error');
      setImportMsg({ text: errMsg, error: true });
      pushAlert(errMsg, 'error', 7000);
    } finally {
      setImporting(false);
    }
  }

  async function handleDelete(boxCode: string) {
    try {
      await packagingApi.deleteBox(boxCode);
      setDeleteConfirm(null);
      await loadBoxes();
    } catch (error: unknown) {
      alert(t('warehouse_delete_failed_prefix') + (error instanceof Error ? error.message : ''));
    }
  }

  async function handleLookup() {
    const sku = skuInput.trim();
    if (!sku) return;
    setLookupLoading(true);
    setLookupError(null);
    setLookupResult(null);
    try {
      const r = await packagingApi.lookup(sku);
      setLookupResult(r);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '';
      setLookupError(msg.includes('404') || msg.includes('not found')
        ? (isTr ? `"${sku}" kodu ile ürün bulunamadı.` : `No product found with code "${sku}".`)
        : t('warehouse_lookup_failed_prefix') + msg);
    } finally {
      setLookupLoading(false);
    }
  }

  const matchRate = unmatchedData && unmatchedData.totalProducts > 0
    ? Math.round(((unmatchedData.totalProducts - unmatchedData.unmatchedCount) / unmatchedData.totalProducts) * 100)
    : 0;

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-transparent p-4 md:p-5">
      {/* ── Toolbar: özet + arama + aksiyonlar ── */}
      <div className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-[6px] border border-[var(--border-soft)] bg-[var(--card)] p-3">
        {/* KPI Kutuları */}
        <div data-tour="boxes-kpi" className="flex flex-wrap items-center gap-2">
          {[
            { value: sortedBoxes.length.toLocaleString('tr-TR'), label: t('warehouse_total_boxes') },
            ...(unmatchedData ? [
              { value: unmatchedData.totalProducts.toLocaleString('tr-TR'), label: t('warehouse_total_products') },
              { value: unmatchedData.unmatchedCount.toLocaleString('tr-TR'), label: t('warehouse_unassigned_box') },
              { value: `%${matchRate}`, label: t('warehouse_match_rate') },
            ] : []),
          ].map(({ value, label }) => (
            <div
              key={label}
              className="inline-flex h-8 items-center gap-1.5 rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] px-2.5"
            >
              <span className="font-mono text-xs font-bold tabular-nums text-[var(--fg)]">{value}</span>
              <span className="text-[11px] text-[var(--fg-muted)]">{label}</span>
            </div>
          ))}
        </div>

        {/* Aksiyon Grubu */}
        <div className="flex flex-wrap items-center gap-2">
          <div data-tour="boxes-search" className="relative">
            <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]" />
            <input
              value={boxSearch}
              onChange={(e) => setUrlState({ q: e.target.value })}
              placeholder={t('warehouse_search_placeholder')}
              className="h-8 w-44 rounded-[4px] border border-[var(--border)] bg-[var(--card)] pl-8 pr-2.5 text-xs text-[var(--fg)] outline-none transition focus:border-[var(--fg)]"
            />
          </div>

          <button
            type="button"
            data-tour="boxes-lookup"
            onClick={() => { setLookupModalOpen(true); setLookupError(null); }}
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-semibold text-[var(--fg)] shadow-xs transition hover:bg-[var(--bg-subtle)] hover:border-[var(--fg-muted)] cursor-pointer"
          >
            <Search size={13} />
            <span>{isTr ? 'Kutu Sorgula' : 'Lookup'}</span>
          </button>

          <div data-tour="boxes-actions" className="flex items-center gap-2">
            <ExportMenu
              filename="kutular"
              getData={boxesToExportRows}
              columns={boxesExportColumns}
              label={isMobile ? t('export_menu_label') : undefined}
              className="[&>.export-menu-trigger]:!h-8 [&>.export-menu-trigger]:!rounded-[4px] [&>.export-menu-trigger]:!border-[var(--border)] [&>.export-menu-trigger]:!bg-[var(--card)] [&>.export-menu-trigger]:hover:!bg-[var(--bg-subtle)] [&>.export-menu-trigger]:!px-3 [&>.export-menu-trigger]:!text-xs [&>.export-menu-trigger]:!font-semibold [&>.export-menu-trigger]:!shadow-xs [&>.export-menu-trigger]:!gap-1.5"
            />

            {canEdit && (
              <>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="inline-flex h-8 items-center justify-center gap-1.5 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-semibold text-[var(--fg)] shadow-xs transition hover:bg-[var(--bg-subtle)] hover:border-[var(--fg-muted)] cursor-pointer"
                  title={isTr ? 'Kutu Excel şablonunu indir' : 'Download box template'}
                >
                  <FileDown size={13} />
                  <span>{isTr ? 'Şablon' : 'Template'}</span>
                </button>

                <label
                  className="inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-semibold text-[var(--fg)] shadow-xs transition hover:bg-[var(--bg-subtle)] hover:border-[var(--fg-muted)]"
                  title={t('warehouse_upload_excel')}
                >
                  {importing ? <Loader2 className="animate-spin" size={13} /> : <Upload size={13} />}
                  <span>{importing ? t('warehouse_processing') : (isTr ? 'Excel Yükle' : 'Import')}</span>
                  <input type="file" accept=".xlsx" onChange={handleImportFile} disabled={importing} className="hidden" />
                </label>
              </>
            )}
          </div>

          {canEdit && (
            <button
              type="button"
              data-tour="boxes-add"
              onClick={() => { setEditingBox(null); setModalError(null); setModalOpen(true); }}
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-[4px] bg-slate-800 hover:bg-slate-700 text-slate-100 dark:bg-slate-700 dark:hover:bg-slate-600 px-3 text-xs font-semibold transition-colors shadow-xs cursor-pointer"
            >
              <Plus size={13} />
              <span>{isTr ? 'Yeni Kutu' : 'New Box'}</span>
            </button>
          )}
        </div>
      </div>

      {importMsg && (
        <div className={`mb-3 shrink-0 rounded-[4px] border p-2.5 text-xs ${
          importMsg.error
            ? 'border-red-500/30 bg-red-500/10 text-red-500'
            : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600'
        }`}>
          {importMsg.text}
        </div>
      )}

      {/* ── Kutu Tablosu Kartı ── */}
      <main data-tour="boxes-table" className="flex shrink-0 flex-col rounded-[6px] border border-[var(--border-soft)] bg-[var(--card)] shadow-xs mb-6">
        <div className="overflow-x-auto">
          {boxesLoading ? (
            <div className="flex h-48 items-center justify-center text-xs text-[var(--fg-muted)]">
              {t('loading')}
            </div>
          ) : boxesError ? (
            <div className="flex h-48 items-center justify-center text-xs text-red-500">
              {t('warehouse_load_error')}
            </div>
          ) : sortedBoxes.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-xs text-[var(--fg-muted)]">
              {boxSearch
                ? (isTr ? `"${boxSearch}" ile eşleşen kutu bulunamadı.` : `No box found matching "${boxSearch}".`)
                : t('warehouse_no_boxes_yet')}
            </div>
          ) : (
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="sticky top-0 z-[1] border-b border-[var(--border-soft)] bg-[var(--bg-subtle)]">
                  <th
                    onClick={() => handleSort('boxCode')}
                    className="cursor-pointer px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-wider text-[var(--fg-muted)] hover:text-[var(--fg)] select-none"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{t('warehouse_box_code_label')}</span>
                      <span className="text-[10px] opacity-60">{sortField === 'boxCode' ? (sortAsc ? '▲' : '▼') : ''}</span>
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('name')}
                    className="cursor-pointer px-3 py-2.5 text-[10.5px] font-bold uppercase tracking-wider text-[var(--fg-muted)] hover:text-[var(--fg)] select-none"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{t('warehouse_col_name')}</span>
                      <span className="text-[10px] opacity-60">{sortField === 'name' ? (sortAsc ? '▲' : '▼') : ''}</span>
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('dimensions')}
                    className="cursor-pointer px-3 py-2.5 text-[10.5px] font-bold uppercase tracking-wider text-[var(--fg-muted)] hover:text-[var(--fg)] select-none"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{t('warehouse_col_dimensions')}</span>
                      <span className="text-[10px] opacity-60">{sortField === 'dimensions' ? (sortAsc ? '▲' : '▼') : ''}</span>
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('desi')}
                    className="cursor-pointer px-3 py-2.5 text-[10.5px] font-bold uppercase tracking-wider text-[var(--fg-muted)] hover:text-[var(--fg)] select-none"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{t('warehouse_desi_label')}</span>
                      <span className="text-[10px] opacity-60">{sortField === 'desi' ? (sortAsc ? '▲' : '▼') : ''}</span>
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('price')}
                    className="cursor-pointer px-3 py-2.5 text-right text-[10.5px] font-bold uppercase tracking-wider text-[var(--fg-muted)] hover:text-[var(--fg)] select-none"
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>{t('warehouse_box_price_label')}</span>
                      <span className="text-[10px] opacity-60">{sortField === 'price' ? (sortAsc ? '▲' : '▼') : ''}</span>
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('productCount')}
                    className="cursor-pointer px-3 py-2.5 text-center text-[10.5px] font-bold uppercase tracking-wider text-[var(--fg-muted)] hover:text-[var(--fg)] select-none"
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span>{t('warehouse_col_product')}</span>
                      <span className="text-[10px] opacity-60">{sortField === 'productCount' ? (sortAsc ? '▲' : '▼') : ''}</span>
                    </div>
                  </th>
                  {canEdit && <th className="w-20 px-3 py-2.5"></th>}
                </tr>
              </thead>
              <tbody>
                {sortedBoxes.map((b) => {
                  const hasDim = b.width > 0 && b.length > 0 && b.height > 0;
                  return (
                    <tr
                      key={b.boxCode}
                      className="border-b border-[var(--border-soft)] transition hover:bg-[var(--bg-subtle)] last:border-b-0"
                    >
                      <td className="px-4 py-2.5 font-mono text-xs font-bold text-[var(--fg)]">
                        {b.boxCode}
                      </td>
                      <td className="px-3 py-2.5 font-medium text-[var(--fg)]">{b.name}</td>
                      <td className="px-3 py-2.5 font-mono tabular-nums text-[11px] text-[var(--fg-muted)]">
                        {hasDim ? `${b.width} × ${b.length} × ${b.height}` : '—'}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`font-mono tabular-nums font-semibold ${b.desi != null ? 'text-[var(--fg)]' : 'text-[var(--fg-muted)]'}`}>
                          {fmtDesi(b.desi)}
                        </span>
                        {!hasDim && b.manualDesi != null && (
                          <span className="ml-1.5 rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] px-1 py-0.5 text-[9.5px] text-[var(--fg-muted)]">
                            {t('warehouse_manual_tag')}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono tabular-nums font-semibold text-[var(--fg)]">
                        {b.price != null
                          ? `₺${b.price.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-center font-mono tabular-nums font-bold text-[var(--fg)]">
                        {b.productCount}
                      </td>
                      {canEdit && (
                        <td className="px-3 py-2 text-right">
                          {deleteConfirm === b.boxCode ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                className="inline-flex h-6 w-6 items-center justify-center rounded-[4px] text-red-500 hover:bg-red-500/10"
                                onClick={() => handleDelete(b.boxCode)}
                                title={t('warehouse_confirm_delete_yes')}
                              >
                                <Check size={13} />
                              </button>
                              <button
                                type="button"
                                className="inline-flex h-6 w-6 items-center justify-center rounded-[4px] text-[var(--fg-muted)] hover:bg-[var(--bg-subtle)]"
                                onClick={() => setDeleteConfirm(null)}
                                title={t('cancel')}
                              >
                                <X size={13} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                className="inline-flex h-6 w-6 items-center justify-center rounded-[4px] text-[var(--fg-muted)] transition hover:text-[var(--fg)]"
                                title={t('warehouse_edit')}
                                onClick={() => { setEditingBox(b); setModalError(null); setModalOpen(true); }}
                              >
                                <Edit2 size={12} />
                              </button>
                              <button
                                type="button"
                                className="inline-flex h-6 w-6 items-center justify-center rounded-[4px] text-[var(--fg-muted)] transition hover:text-red-500"
                                title={t('delete')}
                                onClick={() => setDeleteConfirm(b.boxCode)}
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {/* ── Modallar ── */}
      {modalOpen && (
        <BoxModal
          initialForm={editingBox
            ? {
                boxCode: editingBox.boxCode,
                name: editingBox.name,
                width: editingBox.width ? String(editingBox.width) : '',
                length: editingBox.length ? String(editingBox.length) : '',
                height: editingBox.height ? String(editingBox.height) : '',
                manualDesi: editingBox.manualDesi != null ? String(editingBox.manualDesi) : '',
                price: editingBox.price != null ? String(editingBox.price) : '',
              }
            : EMPTY_FORM}
          isEdit={!!editingBox}
          onClose={() => { setModalOpen(false); setEditingBox(null); }}
          onSave={handleSave}
          saving={modalSaving}
          error={modalError}
        />
      )}

      {lookupModalOpen && (
        <SkuLookupModal
          skuInput={skuInput}
          setSkuInput={setSkuInput}
          onLookup={handleLookup}
          loading={lookupLoading}
          result={lookupResult}
          error={lookupError}
          onClose={() => { setLookupModalOpen(false); setLookupResult(null); setLookupError(null); setSkuInput(''); }}
        />
      )}
    </div>
  );
}
