'use client';

import { useState, useRef, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileSpreadsheet, Search, Check, X, Car, Trash2,
  ChevronRight, Palette, Plus, RefreshCw, Package, Copy,
} from 'lucide-react';
import {
  fitmentApi,
  type FitmentRow, type FitmentBatch, type FitmentProduct,
  type UpdateFitmentRowBody,
  type BulkCopyFitmentsResult,
} from '../../../lib/api';
import { ExportMenu } from '../../../components/ui/ExportMenu';
import type { ExportColumn } from '../../../lib/export';
import { useI18n } from '../../../lib/i18n';
import { useMobile } from '../../../hooks/useMobile';
import { pushAlert, clearAlerts } from '../../../stores/alert-stack';
import { useUrlState } from '../../../hooks/useUrlState';
import { SwipeableRow } from '../../../components/ui/SwipeableRow';
import { useFitmentData } from '../../../hooks/fitment/useFitmentData';
import { queryKeys } from '../../../lib/query-keys';
import { invalidateQueryFamilies } from '../../../lib/query-policy';
import { FitmentRowDetailModal } from '../../../components/fitment/FitmentRowDetailModal';
import { FitmentIconButton, formatVehicle } from '../../../components/fitment/FitmentUi';
import { FilterSelect, type FilterSelectOption } from '../../../components/ui/FilterSelect';

const FITMENT_PRODUCT_COLS: ExportColumn[] = [
  { key: 'sku',          header: 'SKU',           type: 'text' },
  { key: 'name',         header: 'Ürün Adı',      type: 'text' },
  { key: 'category',     header: 'Kategori',       type: 'text' },
  { key: 'barcode',      header: 'Barkod',         type: 'text' },
  { key: 'fitmentCount', header: 'Uyumlu Araç',    type: 'int' },
  { key: 'colorCount',   header: 'Renk Seçeneği',  type: 'int' },
];

const FITMENT_ROW_COLS: ExportColumn[] = [
  { key: 'sku',                header: 'SKU',            type: 'text' },
  { key: 'category',           header: 'Kategori',        type: 'text' },
  { key: 'status',             header: 'Durum',           type: 'text' },
  { key: 'matchedProductName', header: 'Eşlenen Ürün',   type: 'text' },
  { key: 'vehicleCount',       header: 'Araç Sayısı',    type: 'int' },
  { key: 'brand',              header: 'Marka',           type: 'text' },
  { key: 'model',              header: 'Model',           type: 'text' },
  { key: 'year',               header: 'Yıl',             type: 'text' },
  { key: 'description',        header: 'Açıklama',        type: 'text' },
];

type StatusFilter = 'all' | 'Unmatched' | 'Matched' | 'Approved' | 'Rejected';
type PanelTab = 'import' | 'products' | 'categoryMaps';

// ── Tek bir import satırı ──
function RowLine({
  row,
  isMobile,
  onViewDetails,
  onQuickApprove,
  isApproving,
}: {
  row: FitmentRow;
  isMobile: boolean;
  onViewDetails: () => void;
  onQuickApprove: () => void;
  isApproving: boolean;
}) {
  const { t, lang } = useI18n();
  const resolvedCount = row.vehicles.filter((v) => v.resolvedProductId).length;
  const vehicleLabel = [row.brand, row.model, row.year].filter(Boolean).join(' ');
  const displayName = row.matchedProductName || row.description?.trim() || vehicleLabel || row.barcode || null;
  const isMatched = !!row.matchedProductId;
  const canQuickApprove = row.rowStatus === 'Matched';
  const vehicleText = row.vehicles.length > 0
    ? (lang === 'tr' ? `${resolvedCount}/${row.vehicles.length} uyumlu araç` : `${resolvedCount}/${row.vehicles.length} matched`)
    : '';

  if (isMobile) {
    return (
      <div
        onClick={onViewDetails}
        className="flex cursor-pointer flex-col gap-1.5 border-b border-[var(--border-soft)] p-3 transition hover:bg-[var(--bg-subtle)]"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-xs font-bold text-[var(--fg)]">{row.sku}</span>
          <span className="text-[10px] font-semibold text-[var(--fg-muted)]">{row.category ?? t('fitment_uncategorized')}</span>
        </div>
        {displayName ? (
          <p className={`m-0 truncate text-xs font-medium ${isMatched ? 'text-[var(--fg)]' : 'text-[var(--fg-muted)]'}`}>
            {displayName}
          </p>
        ) : (
          <p className="m-0 text-xs text-[var(--fg-muted)]">{t('fitment_no_product_name')}</p>
        )}
        <div className="flex items-center justify-between gap-2 pt-0.5">
          <span className="text-[10.5px] font-semibold text-[var(--fg-muted)]">{vehicleText}</span>
          {canQuickApprove && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onQuickApprove(); }}
              disabled={isApproving}
              className="inline-flex h-6 items-center gap-1 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-2 text-[10.5px] font-bold text-[var(--fg)] transition hover:bg-[var(--bg-subtle)] disabled:opacity-50"
            >
              <Check size={11} /> {lang === 'tr' ? 'Onayla' : 'Approve'}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onViewDetails}
      className="flex cursor-pointer items-center gap-3 border-b border-[var(--border-soft)] px-4 py-2.5 transition hover:bg-[var(--bg-subtle)]"
    >
      {/* Kategori - genişletildi */}
      <span className="w-44 shrink-0 truncate text-xs font-medium text-[var(--fg-muted)]" title={row.category ?? t('fitment_uncategorized')}>
        {row.category ?? t('fitment_uncategorized')}
      </span>

      {/* SKU - genişletildi */}
      <span className="w-44 shrink-0 truncate font-mono text-xs font-bold text-[var(--fg)]" title={row.sku}>
        {row.sku}
      </span>

      {/* Ürün Adı / Açıklama */}
      <div className="min-w-0 flex-1">
        {displayName ? (
          <p className={`m-0 truncate text-xs font-semibold ${isMatched ? 'text-[var(--fg)]' : 'text-[var(--fg-muted)]'}`} title={displayName}>
            {displayName}
          </p>
        ) : (
          <p className="m-0 text-xs text-[var(--fg-muted)]">{t('fitment_no_product_name')}</p>
        )}
        {!isMatched && (
          <p className="m-0 text-[10.5px] text-[var(--fg-muted)]">
            {lang === 'tr' ? 'Onaylanınca yeni ürün olarak oluşturulacak' : 'Will be created as new product'}
          </p>
        )}
      </div>

      {/* Araç Sayısı */}
      <span className="w-36 shrink-0 text-right text-[11px] font-semibold text-[var(--fg-muted)]">
        {vehicleText}
      </span>

      {/* Aksiyon */}
      <div className="w-24 shrink-0 text-right">
        {canQuickApprove && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onQuickApprove(); }}
            disabled={isApproving}
            title={lang === 'tr' ? 'Hemen onayla' : 'Approve'}
            className="inline-flex h-7 items-center gap-1 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-2.5 text-[11px] font-bold text-[var(--fg)] transition hover:bg-[var(--bg-subtle)] disabled:opacity-50"
          >
            <Check size={11} /> {lang === 'tr' ? 'Onayla' : 'Approve'}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Onaylı Ürün Satırı ──
function ProductLine({
  p,
  expanded,
  onToggle,
  detail,
  onDeleteFitment,
  newColorText,
  onNewColorText,
  onAddColor,
  onDeleteColor,
  isAddingColor,
  selected,
  onToggleSelect,
  canCopy,
  onCopyFromHere,
  isCopying,
}: {
  p: FitmentProduct;
  expanded: boolean;
  onToggle: () => void;
  detail?: { fitments: { id: number; vehicleMake: string; vehicleModel: string | null; startYear: number | null; endYear: number | null; resolvedSku: string | null; resolvedName: string | null }[]; colors: { id: number; color: string }[] };
  onDeleteFitment: (id: number) => void;
  newColorText: string;
  onNewColorText: (v: string) => void;
  onAddColor: () => void;
  onDeleteColor: (id: number) => void;
  isAddingColor: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  canCopy: boolean;
  onCopyFromHere: () => void;
  isCopying: boolean;
}) {
  const { t, lang } = useI18n();
  return (
    <div className="flex flex-col border-b border-[var(--border-soft)]">
      <div className="flex items-center gap-3 px-4 py-2.5">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          title={lang === 'tr' ? 'Toplu kopyalama için işaretle' : 'Mark for bulk copy'}
          className="h-4 w-4 shrink-0 cursor-pointer rounded-[4px] accent-[var(--fg)]"
        />
        <div onClick={onToggle} className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
          <Package size={14} className="shrink-0 text-[var(--fg-muted)]" />
          <div className="min-w-0 flex-1">
            <p className="m-0 truncate text-xs font-bold text-[var(--fg)]">{p.name}</p>
            <p className="m-0 font-mono text-[10.5px] text-[var(--fg-muted)]">
              {p.sku}{p.barcode ? ` · ${p.barcode}` : ''}{p.category ? ` · ${p.category}` : ''}
            </p>
          </div>
          <div className="flex w-36 shrink-0 items-center justify-end gap-3 text-[11px] font-semibold text-[var(--fg-muted)]">
            <span className="inline-flex items-center gap-1"><Car size={12} /> {p.fitmentCount}</span>
            <span className="inline-flex items-center gap-1"><Palette size={12} /> {p.colorCount}</span>
          </div>
        </div>
        {p.fitmentCount > 0 && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onCopyFromHere(); }}
            disabled={!canCopy || isCopying}
            title={canCopy
              ? (lang === 'tr' ? 'Bu ürünün araç listesini işaretli ürünlere kopyala' : 'Copy vehicle list to checked products')
              : (lang === 'tr' ? 'Önce hedef ürünleri işaretleyin' : 'Check target products first')}
            className={`inline-flex h-7 shrink-0 items-center gap-1 rounded-[4px] border px-2.5 text-[10.5px] font-bold transition ${
              canCopy
                ? 'border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--fg)] hover:bg-[var(--card)] cursor-pointer'
                : 'border-transparent text-[var(--fg-muted)] opacity-50 cursor-not-allowed'
            }`}
          >
            <Copy size={11} /> {lang === 'tr' ? 'Kopyala' : 'Copy'}
          </button>
        )}
      </div>

      {expanded && (
        <div className="flex flex-col gap-3 bg-[var(--bg-subtle)] p-3.5 pl-10 border-t border-[var(--border-soft)]">
          <div>
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--fg-muted)]">
              {t('fitment_vehicles_to_sku_title')}
            </p>
            <div className="flex flex-col gap-1">
              {detail?.fitments.map((f) => (
                <div key={f.id} className="flex items-center justify-between gap-2 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-semibold text-[var(--fg)]">{formatVehicle(f)}</span>
                    {f.resolvedSku && (
                      <span className="font-mono text-[10px] text-[var(--fg-muted)]">({f.resolvedSku})</span>
                    )}
                  </div>
                  <FitmentIconButton
                    icon={<X size={11} />}
                    color="var(--danger)"
                    onClick={() => onDeleteFitment(f.id)}
                    title={t('delete')}
                  />
                </div>
              ))}
              {detail?.fitments.length === 0 && (
                <span className="text-xs text-[var(--fg-muted)]">{t('fitment_no_vehicles_yet')}</span>
              )}
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--fg-muted)]">
              {t('fitment_color_options_title')}
            </p>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {detail?.colors.map((c) => (
                <span key={c.id} className="inline-flex items-center gap-1.5 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] px-2 py-1 text-[11px] text-[var(--fg)]">
                  {c.color}
                  <button type="button" onClick={() => onDeleteColor(c.id)} className="text-[var(--fg-muted)] hover:text-red-500">
                    <X size={11} />
                  </button>
                </span>
              ))}
              {detail?.colors.length === 0 && (
                <span className="text-xs text-[var(--fg-muted)]">{t('fitment_no_colors_yet')}</span>
              )}
            </div>
            <div className="flex max-w-sm gap-1.5">
              <input
                placeholder={t('fitment_color_placeholder')}
                value={newColorText}
                onChange={(e) => onNewColorText(e.target.value)}
                className="h-8 flex-1 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-2.5 text-xs text-[var(--fg)] outline-none focus:border-[var(--fg)]"
              />
              <button
                type="button"
                onClick={onAddColor}
                disabled={isAddingColor}
                className="inline-flex h-8 items-center justify-center rounded-[4px] bg-slate-800 hover:bg-slate-700 text-slate-100 dark:bg-slate-700 dark:hover:bg-slate-600 px-3 text-xs font-semibold shadow-xs transition hover:opacity-90 disabled:opacity-50"
              >
                <Plus size={13} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const FITMENT_FILTER_DEFAULTS = { tab: 'import', status: 'all', q: '', page: 1 };

export default function FitmentPage() {
  const { t, lang } = useI18n();
  const isTr = lang === 'tr';
  const isMobile = useMobile();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { state: urlState, setState: setUrlState } = useUrlState(FITMENT_FILTER_DEFAULTS);
  const tab = (urlState.tab as PanelTab) || 'import';
  const status = (urlState.status as StatusFilter) || 'all';
  const search = urlState.q;
  const page = urlState.page;

  // ── Import tab ──
  const [batchId, setBatchId] = useState<number | null>(null);
  const [editRowId, setEditRowId] = useState<number | null>(null);
  const [editVals, setEditVals] = useState<UpdateFitmentRowBody>({});
  const [selectedRowId, setSelectedRowId] = useState<number | null>(null);
  const [excelUploadOpen, setExcelUploadOpen] = useState(false);

  // ── Products tab ──
  const [productSearch, setProductSearch] = useState('');
  const [productPage, setProductPage] = useState(1);
  const [expandedProductId, setExpandedProductId] = useState<number | null>(null);
  const [newColorText, setNewColorText] = useState('');
  const [selectedProductIds, setSelectedProductIds] = useState<Set<number>>(new Set());
  const [copySourceId, setCopySourceId] = useState<number | null>(null);

  // ── Category map tab ──
  const [mapSupplier, setMapSupplier] = useState('');
  const [mapCategoryId, setMapCategoryId] = useState<number | ''>('');
  const [mapSearch, setMapSearch] = useState('');

  const PAGE_SIZE = 30;

  const fitmentData = useFitmentData({
    tab, batchId, status, search, page, productSearch, productPage, expandedProductId, pageSize: PAGE_SIZE,
  });
  const { data: batches } = fitmentData.batchesQuery;
  const { data: rowsData, isLoading: rowsLoading } = fitmentData.rowsQuery;
  const { data: productsData, isLoading: productsLoading } = fitmentData.productsQuery;
  const { data: productDetail } = fitmentData.productDetailQuery;
  const { data: categoryMaps } = fitmentData.categoryMapsQuery;
  const { data: masterCategories } = fitmentData.categoriesQuery;

  const selectedRow = rowsData?.items.find((r) => r.id === selectedRowId) || null;

  const invalidateImport = () => {
    void invalidateQueryFamilies(qc, [queryKeys.fitment.rowsAll, queryKeys.fitment.batches]);
  };

  const uploadMutation = useMutation({
    meta: { silentError: true } as const,
    mutationFn: (file: File) => fitmentApi.upload(file),
    onSuccess: (batch: FitmentBatch) => {
      setBatchId(batch.id);
      setUrlState({ status: 'all', page: 1 });
      invalidateImport();
      pushAlert(
        isTr
          ? `Uyum Excel dosyası başarıyla yüklendi: ${batch.fileName}`
          : `Fitment Excel uploaded: ${batch.fileName}`,
        'success',
        8000
      );
    },
    onError: (err: unknown) => {
      const errorMsg = t('fitment_upload_failed_prefix') + (err instanceof Error ? err.message : String(err));
      pushAlert(errorMsg, 'error', 8000);
    },
  });

  const approveMutation = useMutation({
    meta: { silentError: true } as const,
    mutationFn: ({ id, name }: { id: number; name?: string }) => fitmentApi.approveRow(id, name),
    onSuccess: () => { invalidateImport(); qc.invalidateQueries({ queryKey: queryKeys.fitment.productsAll }); },
    onError: (err: unknown) => alert(t('fitment_approve_failed_prefix') + (err instanceof Error ? err.message : String(err))),
  });

  const rejectMutation = useMutation({
    meta: { successMessage: 'Satır reddedildi' } as const,
    mutationFn: (id: number) => fitmentApi.rejectRow(id),
    onSuccess: invalidateImport,
  });

  const deleteRowMutation = useMutation({
    meta: { successMessage: 'Satır silindi' } as const,
    mutationFn: (id: number) => fitmentApi.deleteRow(id),
    onSuccess: invalidateImport,
  });

  const resolveRowMutation = useMutation({
    meta: { successMessage: 'Satır eşleştirildi' } as const,
    mutationFn: (id: number) => fitmentApi.resolveRow(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.fitment.rowsAll }),
  });

  const resolveBatchMutation = useMutation({
    meta: { successMessage: 'Parti eşleştirildi' } as const,
    mutationFn: (id: number) => fitmentApi.resolveBatch(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.fitment.rowsAll }),
  });

  const approveMatchedMutation = useMutation({
    meta: { silentError: true } as const,
    mutationFn: (id: number) => fitmentApi.approveMatchedBatch(id),
    onSuccess: (result) => {
      invalidateImport();
      qc.invalidateQueries({ queryKey: queryKeys.fitment.productsAll });
      pushAlert(
        isTr
          ? `${result.approvedCount} satır onaylandı${result.failedCount > 0 ? `, ${result.failedCount} başarısız` : ''}.`
          : `${result.approvedCount} approved${result.failedCount > 0 ? `, ${result.failedCount} failed` : ''}.`,
        result.failedCount > 0 ? 'error' : 'success',
        5000
      );
    },
    onError: (err: unknown) => alert(t('fitment_approve_failed_prefix') + (err instanceof Error ? err.message : String(err))),
  });

  const updateVehicleMutation = useMutation({
    meta: { silentError: true } as const,
    mutationFn: ({ vehicleId, body }: { vehicleId: number; body: { resolvedProductId?: number | null; clear?: boolean } }) => fitmentApi.updateVehicle(vehicleId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.fitment.rowsAll }),
    onError: (err: unknown) => alert(t('fitment_update_failed_prefix') + (err instanceof Error ? err.message : String(err))),
  });

  const updateRowMutation = useMutation({
    meta: { successMessage: 'Satır güncellendi' } as const,
    mutationFn: ({ id, body }: { id: number; body: UpdateFitmentRowBody }) => fitmentApi.updateRow(id, body),
    onSuccess: () => { setEditRowId(null); qc.invalidateQueries({ queryKey: queryKeys.fitment.rowsAll }); },
  });

  const deleteBatchMutation = useMutation({
    meta: { successMessage: 'Parti silindi' } as const,
    mutationFn: (id: number) => fitmentApi.deleteBatch(id),
    onSuccess: (_v, id) => { if (batchId === id) setBatchId(null); invalidateImport(); },
  });

  const deleteFitmentMutation = useMutation({
    meta: { successMessage: 'Uyumluluk kaydı silindi' } as const,
    mutationFn: (id: number) => fitmentApi.deleteFitment(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.fitment.productDetails }); qc.invalidateQueries({ queryKey: queryKeys.fitment.productsAll }); },
  });

  const bulkCopyFitmentsMutation = useMutation({
    meta: { silentError: true } as const,
    mutationFn: ({ sourceProductId, targetProductIds }: { sourceProductId: number; targetProductIds: number[] }) =>
      fitmentApi.bulkCopyFitments(sourceProductId, targetProductIds),
    onSuccess: (results: BulkCopyFitmentsResult[]) => {
      const totalAdded = results.reduce((sum, r) => sum + r.added, 0);
      const totalSkipped = results.reduce((sum, r) => sum + r.skippedDuplicates, 0);
      pushAlert(
        isTr
          ? `${results.length} ürüne toplam ${totalAdded} araç uyumu eklendi${totalSkipped > 0 ? `, ${totalSkipped} zaten vardı` : ''}.`
          : `${totalAdded} fitment(s) added to ${results.length} product(s).`,
        'success', 6000
      );
      setSelectedProductIds(new Set());
      setCopySourceId(null);
      qc.invalidateQueries({ queryKey: queryKeys.fitment.productsAll });
      qc.invalidateQueries({ queryKey: queryKeys.fitment.productDetails });
    },
    onError: (err: unknown) => pushAlert(t('fitment_add_failed_prefix') + (err instanceof Error ? err.message : String(err)), 'error', 8000),
  });

  const addColorMutation = useMutation({
    meta: { silentError: true } as const,
    mutationFn: (productId: number) => fitmentApi.addColor(productId, newColorText.trim()),
    onSuccess: () => { setNewColorText(''); qc.invalidateQueries({ queryKey: queryKeys.fitment.productDetails }); qc.invalidateQueries({ queryKey: queryKeys.fitment.productsAll }); },
    onError: (err: unknown) => alert(t('fitment_add_failed_prefix') + (err instanceof Error ? err.message : String(err))),
  });

  const deleteColorMutation = useMutation({
    meta: { successMessage: 'Renk silindi' } as const,
    mutationFn: (id: number) => fitmentApi.deleteColor(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.fitment.productDetails }); qc.invalidateQueries({ queryKey: queryKeys.fitment.productsAll }); },
  });

  const addMapMutation = useMutation({
    meta: { silentError: true } as const,
    mutationFn: () => fitmentApi.upsertCategoryMap(mapSupplier.trim(), Number(mapCategoryId)),
    onSuccess: () => { setMapSupplier(''); setMapCategoryId(''); qc.invalidateQueries({ queryKey: queryKeys.fitment.categoryMaps }); },
    onError: (err: unknown) => alert(t('fitment_add_failed_prefix') + (err instanceof Error ? err.message : String(err))),
  });

  const deleteMapMutation = useMutation({
    meta: { successMessage: 'Kategori eşlemesi silindi' } as const,
    mutationFn: (id: number) => fitmentApi.deleteCategoryMap(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.fitment.categoryMaps }),
  });

  async function handleFiles(files: FileList | File[]) {
    const fileArray = Array.from(files).filter(f => f.name.endsWith('.xlsx'));
    if (fileArray.length === 0) {
      pushAlert(t('fitment_select_xlsx_file'), 'error');
      return;
    }
    clearAlerts();

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      try {
        await uploadMutation.mutateAsync(file);
      } catch {
        // mutation handles alerts
      }
    }
  }

  function handleBulkCopy(sourceProductId: number, sourceVehicleCount: number, sourceName: string) {
    const targetIds = Array.from(selectedProductIds).filter((id) => id !== sourceProductId);
    if (targetIds.length === 0) {
      pushAlert(
        isTr ? 'Önce hedef ürünleri işaretleyin.' : 'Select target products first.',
        'error'
      );
      return;
    }
    const confirmed = window.confirm(
      isTr
        ? `"${sourceName}" ürününün ${sourceVehicleCount} araç uyumu, ${targetIds.length} ürüne kopyalanacak. Onaylıyor musunuz?`
        : `Copy ${sourceVehicleCount} vehicle fitments to ${targetIds.length} products?`
    );
    if (!confirmed) return;
    setCopySourceId(sourceProductId);
    bulkCopyFitmentsMutation.mutate({ sourceProductId, targetProductIds: targetIds });
  }

  function toggleProductSelection(productId: number) {
    setSelectedProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId); else next.add(productId);
      return next;
    });
  }

  function handleApprove(row: FitmentRow) {
    if (row.matchedProductId) { approveMutation.mutate({ id: row.id }); return; }
    const name = window.prompt(
      isTr
        ? `"${row.sku}" sistemde yok. Yeni ürün olarak eklenecek — ürün adını onaylayın:`
        : `"${row.sku}" not found in system. Confirm product name:`,
      row.description || row.sku
    );
    if (name === null) return;
    approveMutation.mutate({ id: row.id, name });
  }

  function startEdit(row: FitmentRow) {
    setEditRowId(row.id);
    setEditVals({
      category: row.category, barcode: row.barcode, brand: row.brand, model: row.model, year: row.year,
      sourceStatus: row.sourceStatus, type: row.type, description: row.description, pieceOfOrder: row.pieceOfOrder,
      suitableModelsRaw: row.suitableModelsRaw, colorOptionRaw: row.colorOptionRaw,
    });
  }

  const totalPages = rowsData ? Math.ceil(rowsData.totalCount / PAGE_SIZE) : 1;
  const productTotalPages = productsData ? Math.ceil(productsData.totalCount / PAGE_SIZE) : 1;

  const filteredCategoryMaps = (categoryMaps ?? []).filter((m) => {
    if (!mapSearch.trim()) return true;
    const q = mapSearch.trim().toLowerCase();
    return m.supplierCategory.toLowerCase().includes(q) || m.internalCategoryName.toLowerCase().includes(q);
  });

  const TABS: Array<{ key: PanelTab; label: string }> = [
    { key: 'import', label: isTr ? 'İçe Aktarma & Onay' : 'Import & Approval' },
    { key: 'products', label: isTr ? 'Onaylı Kayıtlar' : 'Approved Records' },
    { key: 'categoryMaps', label: isTr ? 'Kategori Eşleme' : 'Category Mapping' },
  ];

  const searchValue = tab === 'import' ? search : tab === 'products' ? productSearch : mapSearch;
  const searchPlaceholder = tab === 'import'
    ? (isTr ? 'Kategori, SKU veya ürün ara…' : 'Search category, SKU, product…')
    : tab === 'products'
      ? (isTr ? 'Onaylı ürünlerde ara…' : 'Search approved products…')
      : (isTr ? 'Tedarikçi veya bizim kategoride ara…' : 'Search category…');

  function handleSearchChange(v: string) {
    if (tab === 'import') setUrlState({ q: v, page: 1 });
    else if (tab === 'products') { setProductSearch(v); setProductPage(1); }
    else setMapSearch(v);
  }

  const statusOptions: FilterSelectOption[] = useMemo(() => [
    { value: 'Unmatched', label: t('fitment_status_unmatched') },
    { value: 'Matched', label: t('fitment_status_matched') },
    { value: 'Approved', label: t('fitment_status_approved') },
    { value: 'Rejected', label: t('fitment_status_rejected') },
  ], [t]);

  const batchOptions: FilterSelectOption[] = useMemo(() => (
    (batches ?? []).map((b) => ({
      value: String(b.id),
      label: `${b.fileName} (${b.matchedRows}/${b.totalRows})`,
    }))
  ), [batches]);

  const masterCategoryOptions: FilterSelectOption[] = useMemo(() => (
    (masterCategories ?? []).map((c) => ({
      value: String(c.id),
      label: c.name,
    }))
  ), [masterCategories]);

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-transparent">
      {/* ── Üst Alt Sekmeler & Araç Çubuğu ── */}
      <div className="sticky top-0 z-10 flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[var(--border-soft)] bg-[var(--card)] px-4 py-2">
        {/* Sekmeler */}
        <div data-tour="fitment-tabs" className="flex items-center gap-1.5">
          {TABS.map((tItem) => {
            const active = tab === tItem.key;
            return (
              <button
                key={tItem.key}
                type="button"
                onClick={() => setUrlState({ tab: tItem.key })}
                className={`flex shrink-0 items-center gap-1.5 rounded-[4px] px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                  active
                    ? 'bg-[var(--card)] text-[var(--fg)] shadow-xs border border-[var(--border)]'
                    : 'border border-transparent text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)]'
                }`}
              >
                {tItem.label}
              </button>
            );
          })}
        </div>

        {/* Arama & Dışa Aktar */}
        <div className="flex flex-wrap items-center gap-2">
          <div data-tour="fitment-search" className="relative">
            <Search size={12} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]" />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-8 w-52 rounded-[4px] border border-[var(--border)] bg-[var(--card)] pl-7 pr-2.5 text-xs text-[var(--fg)] outline-none transition focus:border-[var(--fg)]"
            />
          </div>

          <div data-tour="fitment-export" className="flex items-center gap-2">
            {tab === 'import' && (
              <ExportMenu
                filename="fitment-satirlar"
                columns={FITMENT_ROW_COLS}
                totalHint={rowsData?.totalCount}
                className="[&>.export-menu-trigger]:!h-8 [&>.export-menu-trigger]:!rounded-[4px] [&>.export-menu-trigger]:!border-[var(--border)] [&>.export-menu-trigger]:!bg-[var(--card)] [&>.export-menu-trigger]:hover:!bg-[var(--bg-subtle)] [&>.export-menu-trigger]:!px-3 [&>.export-menu-trigger]:!text-xs [&>.export-menu-trigger]:!font-semibold [&>.export-menu-trigger]:!shadow-xs [&>.export-menu-trigger]:!gap-1.5"
                getDataAsync={async (opts) => {
                  const res = await fitmentApi.rows({
                    batchId: batchId ?? undefined,
                    status: status === 'all' ? undefined : status,
                    search: search || undefined,
                    page: 1,
                    pageSize: opts?.limit ?? 100000,
                  });
                  return res.items.map((r: FitmentRow) => ({
                    sku: r.sku,
                    category: r.category ?? '',
                    status: r.rowStatus,
                    matchedProductName: r.matchedProductName ?? '',
                    vehicleCount: r.vehicles?.length ?? 0,
                    brand: r.brand ?? '',
                    model: r.model ?? '',
                    year: r.year ?? '',
                    description: r.description ?? '',
                  }));
                }}
              />
            )}

            {tab === 'products' && (
              <ExportMenu
                filename="fitment-urunler"
                columns={FITMENT_PRODUCT_COLS}
                totalHint={productsData?.totalCount}
                className="[&>.export-menu-trigger]:!h-8 [&>.export-menu-trigger]:!rounded-[4px] [&>.export-menu-trigger]:!border-[var(--border)] [&>.export-menu-trigger]:!bg-[var(--card)] [&>.export-menu-trigger]:hover:!bg-[var(--bg-subtle)] [&>.export-menu-trigger]:!px-3 [&>.export-menu-trigger]:!text-xs [&>.export-menu-trigger]:!font-semibold [&>.export-menu-trigger]:!shadow-xs [&>.export-menu-trigger]:!gap-1.5"
                getDataAsync={async (opts) => {
                  const res = await fitmentApi.products({ search: productSearch || undefined, page: 1, pageSize: opts?.limit ?? 100000 });
                  return res.items.map((p: FitmentProduct) => ({
                    sku: p.sku,
                    name: p.name,
                    category: p.category ?? '',
                    barcode: p.barcode ?? '',
                    fitmentCount: p.fitmentCount,
                    colorCount: p.colorCount,
                  }));
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* ── Ana İçerik Alanı ── */}
      <div className="flex flex-col p-4 md:p-5">
        <div data-tour="fitment-table" className="mb-8 flex flex-col rounded-[6px] border border-[var(--border-soft)] bg-[var(--card)] shadow-xs">

        {/* ── İkinci Bağlamsal Araç Çubuğu (Import / Products / CategoryMaps) ── */}
        {tab === 'import' && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-soft)] bg-[var(--bg-subtle)]/50 p-2.5 px-3">
            <div className="flex flex-wrap items-center gap-2">
              <FilterSelect
                value={status === 'all' ? '' : status}
                options={statusOptions}
                placeholder={t('fitment_status_all')}
                onChange={(val) => setUrlState({ status: (val || 'all') as StatusFilter, page: 1 })}
                minWidth={130}
              />

              {batches && batches.length > 0 && (
                <FilterSelect
                  value={batchId ? String(batchId) : ''}
                  options={batchOptions}
                  placeholder={`${t('fitment_all_uploads')} (${batches.length})`}
                  onChange={(val) => { setBatchId(val ? Number(val) : null); setUrlState({ page: 1 }); }}
                  minWidth={200}
                />
              )}

              <button
                type="button"
                onClick={() => setExcelUploadOpen((o) => !o)}
                className={`inline-flex h-8 items-center gap-1.5 rounded-[4px] border px-3 text-xs font-semibold shadow-xs transition ${
                  excelUploadOpen
                    ? 'border-slate-800 bg-slate-800 text-slate-100 dark:border-slate-700 dark:bg-slate-700'
                    : 'border-[var(--border)] bg-[var(--card)] text-[var(--fg)] hover:bg-[var(--bg-subtle)]'
                }`}
              >
                <FileSpreadsheet size={13} />
                <span>{excelUploadOpen ? (isTr ? 'Yüklemeyi Kapat' : 'Close Upload') : (isTr ? 'Excel Yükle' : 'Upload Excel')}</span>
              </button>

              {batchId && (
                <>
                  <button
                    type="button"
                    onClick={() => resolveBatchMutation.mutate(batchId)}
                    disabled={resolveBatchMutation.isPending}
                    title={t('fitment_resolve_batch_title')}
                    className="inline-flex h-8 items-center gap-1.5 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-semibold text-[var(--fg)] shadow-xs transition hover:bg-[var(--bg-subtle)]"
                  >
                    <RefreshCw size={12} />
                    <span>{t('fitment_reresolve')}</span>
                  </button>

                  {(() => {
                    const selectedBatch = batches?.find((b) => b.id === batchId);
                    const unapproved = Math.max(0, (selectedBatch?.matchedRows ?? 0) - (selectedBatch?.approvedRows ?? 0));
                    if (unapproved === 0) return null;
                    return (
                      <button
                        type="button"
                        onClick={() => approveMatchedMutation.mutate(batchId)}
                        disabled={approveMatchedMutation.isPending}
                        className="inline-flex h-8 items-center gap-1.5 rounded-[4px] border border-emerald-500/30 bg-emerald-500/10 px-3 text-xs font-semibold text-emerald-600 shadow-xs transition hover:bg-emerald-500/20"
                      >
                        <Check size={12} />
                        <span>{isTr ? `${unapproved} Eşleşmişi Onayla` : `Approve ${unapproved}`}</span>
                      </button>
                    );
                  })()}

                  <button
                    type="button"
                    onClick={() => { if (window.confirm(isTr ? 'Bu yükleme ve tüm satırları silinsin mi?' : 'Delete upload?')) deleteBatchMutation.mutate(batchId); }}
                    title={t('delete')}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-[4px] border border-[var(--border)] bg-[var(--card)] text-red-500 transition hover:border-red-500"
                  >
                    <Trash2 size={13} />
                  </button>
                </>
              )}
            </div>

            {rowsData && (
              <span className="text-[11px] font-semibold text-[var(--fg-muted)]">
                {rowsData.totalCount} {t('fitment_rows_suffix')}
              </span>
            )}
          </div>
        )}

        {tab === 'products' && productsData && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-soft)] bg-[var(--bg-subtle)]/50 p-2.5 px-3">
            <div className="flex items-center gap-3">
              <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-[var(--fg)]">
                <input
                  type="checkbox"
                  checked={productsData.items.length > 0 && productsData.items.every((p) => selectedProductIds.has(p.productId))}
                  onChange={(e) => {
                    setSelectedProductIds((prev) => {
                      const next = new Set(prev);
                      for (const p of productsData.items) {
                        if (e.target.checked) next.add(p.productId); else next.delete(p.productId);
                      }
                      return next;
                    });
                  }}
                  className="h-4 w-4 rounded-[4px] accent-[var(--fg)]"
                />
                <span>{isTr ? 'Tümünü Seç' : 'Select All'}</span>
              </label>

              {selectedProductIds.size > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[var(--fg)]">
                    {isTr ? `${selectedProductIds.size} ürün seçili` : `${selectedProductIds.size} selected`}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedProductIds(new Set())}
                    className="text-[11px] font-semibold text-[var(--fg-muted)] hover:text-[var(--fg)]"
                  >
                    {isTr ? 'Temizle' : 'Clear'}
                  </button>
                </div>
              )}
            </div>

            <span className="text-[11px] font-semibold text-[var(--fg-muted)]">
              {productsData.totalCount} {t('fitment_products_suffix')}
            </span>
          </div>
        )}

        {tab === 'categoryMaps' && (
          <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border-soft)] bg-[var(--bg-subtle)]/50 p-2.5 px-3">
            <input
              placeholder={t('fitment_supplier_category_placeholder')}
              value={mapSupplier}
              onChange={(e) => setMapSupplier(e.target.value)}
              className="h-8 flex-1 min-w-[180px] rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-2.5 text-xs text-[var(--fg)] outline-none focus:border-[var(--fg)]"
            />
            <FilterSelect
              value={mapCategoryId ? String(mapCategoryId) : ''}
              options={masterCategoryOptions}
              placeholder={t('fitment_select_our_category')}
              onChange={(val) => setMapCategoryId(val ? Number(val) : '')}
              minWidth={180}
            />
            <button
              type="button"
              onClick={() => { if (mapSupplier.trim() && mapCategoryId) addMapMutation.mutate(); }}
              disabled={addMapMutation.isPending || !mapSupplier.trim() || !mapCategoryId}
              className="inline-flex h-8 items-center gap-1.5 rounded-[4px] bg-slate-800 hover:bg-slate-700 text-slate-100 dark:bg-slate-700 dark:hover:bg-slate-600 px-3.5 text-xs font-semibold shadow-xs transition hover:opacity-90 disabled:opacity-50"
            >
              <Plus size={13} />
              <span>{t('fitment_add')}</span>
            </button>
          </div>
        )}

        {/* ── Collapsible Excel Yükleme Alanı ── */}
        {tab === 'import' && excelUploadOpen && (
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); const files = e.dataTransfer.files; if (files && files.length > 0) handleFiles(files); }}
            onClick={() => fileRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center gap-2 border-b border-dashed border-[var(--border)] p-6 transition ${
              isDragging ? 'bg-[var(--bg-subtle)]' : 'bg-transparent hover:bg-[var(--bg-subtle)]/50'
            }`}
          >
            <input ref={fileRef} type="file" accept=".xlsx" multiple className="hidden" onChange={(e) => { if (e.target.files) handleFiles(e.target.files); e.target.value = ''; }} />
            <FileSpreadsheet size={22} className="text-[var(--fg-muted)]" />
            <p className="m-0 text-xs font-bold text-[var(--fg)]">
              {uploadMutation.isPending ? t('fitment_uploading_parsing') : t('fitment_upload_supplier_excel')}
            </p>
            <p className="m-0 text-[11px] text-[var(--fg-muted)]">{t('fitment_drag_drop_hint')}</p>
          </div>
        )}

        {/* ── Tablo Başlıkları (Import Sekmesi İçin) ── */}
        {tab === 'import' && !rowsLoading && (rowsData?.items.length ?? 0) > 0 && !isMobile && (
          <div className="flex items-center gap-3 border-b border-[var(--border-soft)] bg-[var(--bg-subtle)] px-4 py-2 text-[10.5px] font-bold uppercase tracking-wider text-[var(--fg-muted)]">
            <span className="w-44 shrink-0">{isTr ? 'Kategori' : 'Category'}</span>
            <span className="w-44 shrink-0">SKU</span>
            <span className="min-w-0 flex-1">{isTr ? 'Ürün / Açıklama' : 'Product / Description'}</span>
            <span className="w-36 shrink-0 text-right">{isTr ? 'Araç Sayısı' : 'Vehicles'}</span>
            <span className="w-24 shrink-0 text-right">{isTr ? 'Onay' : 'Action'}</span>
          </div>
        )}

        {/* ── İçerik Listeleri ── */}
        <div className="w-full overflow-x-auto">
          {tab === 'import' && (
            rowsLoading ? (
              <div className="p-12 text-center text-xs text-[var(--fg-muted)]">{t('loading')}</div>
            ) : rowsData?.items.length === 0 ? (
              <div className="p-12 text-center text-xs text-[var(--fg-muted)]">{t('fitment_no_rows_empty_state')}</div>
            ) : (
              <div>
                {rowsData?.items.map((row) => (
                  <SwipeableRow
                    key={row.id}
                    left={{ label: isTr ? 'Onayla' : 'Approve', Icon: Check, onAction: () => handleApprove(row) }}
                    right={{ label: isTr ? 'Reddet' : 'Reject', Icon: X, onAction: () => rejectMutation.mutate(row.id), destructive: true }}
                  >
                    <RowLine
                      row={row}
                      isMobile={isMobile}
                      onViewDetails={() => setSelectedRowId(row.id)}
                      onQuickApprove={() => handleApprove(row)}
                      isApproving={approveMutation.isPending && approveMutation.variables?.id === row.id}
                    />
                  </SwipeableRow>
                ))}
              </div>
            )
          )}

          {tab === 'products' && (
            productsLoading ? (
              <div className="p-12 text-center text-xs text-[var(--fg-muted)]">{t('loading')}</div>
            ) : productsData?.items.length === 0 ? (
              <div className="p-12 text-center text-xs text-[var(--fg-muted)]">{t('fitment_no_products_empty_state')}</div>
            ) : (
              <div>
                {productsData?.items.map((p: FitmentProduct) => (
                  <ProductLine
                    key={p.productId}
                    p={p}
                    expanded={expandedProductId === p.productId}
                    onToggle={() => setExpandedProductId(expandedProductId === p.productId ? null : p.productId)}
                    detail={expandedProductId === p.productId ? productDetail : undefined}
                    onDeleteFitment={(id) => deleteFitmentMutation.mutate(id)}
                    newColorText={newColorText}
                    onNewColorText={setNewColorText}
                    onAddColor={() => { if (newColorText.trim()) addColorMutation.mutate(p.productId); }}
                    onDeleteColor={(id) => deleteColorMutation.mutate(id)}
                    isAddingColor={addColorMutation.isPending}
                    selected={selectedProductIds.has(p.productId)}
                    onToggleSelect={() => toggleProductSelection(p.productId)}
                    canCopy={Array.from(selectedProductIds).some((id) => id !== p.productId)}
                    onCopyFromHere={() => handleBulkCopy(p.productId, p.fitmentCount, p.name)}
                    isCopying={bulkCopyFitmentsMutation.isPending && copySourceId === p.productId}
                  />
                ))}
              </div>
            )
          )}

          {tab === 'categoryMaps' && (
            filteredCategoryMaps.length === 0 ? (
              <div className="p-12 text-center text-xs text-[var(--fg-muted)]">{t('fitment_no_mappings_yet')}</div>
            ) : (
              <div>
                {filteredCategoryMaps.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 border-b border-[var(--border-soft)] px-4 py-2.5 transition hover:bg-[var(--bg-subtle)]">
                    <span className="w-52 shrink-0 font-mono text-xs font-bold text-[var(--fg)]">{m.supplierCategory}</span>
                    <ChevronRight size={13} className="shrink-0 text-[var(--fg-muted)]" />
                    <span className="min-w-0 flex-1 text-xs font-semibold text-[var(--fg)]">{m.internalCategoryName}</span>
                    {m.isAutoLearned && (
                      <span className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] px-1.5 py-0.5 text-[9.5px] font-semibold text-[var(--fg-muted)]">
                        {t('fitment_auto_tag')}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => deleteMapMutation.mutate(m.id)}
                      title={t('delete')}
                      className="inline-flex h-6 w-6 items-center justify-center rounded-[4px] text-[var(--fg-muted)] hover:text-red-500"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )
          )}
        </div>

        {/* ── Alt Sayfalama ── */}
        {tab === 'import' && totalPages > 1 && (
          <div className="flex shrink-0 items-center justify-between border-t border-[var(--border-soft)] px-4 py-2.5">
            <span className="text-[11px] text-[var(--fg-muted)]">
              {t('fitment_page_label')} {page} / {totalPages}
            </span>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setUrlState({ page: Math.max(1, page - 1) })}
                disabled={page === 1}
                className="h-8 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-semibold text-[var(--fg)] shadow-xs transition hover:bg-[var(--bg-subtle)] disabled:opacity-40"
              >
                {isTr ? 'Önceki' : 'Prev'}
              </button>
              <button
                type="button"
                onClick={() => setUrlState({ page: Math.min(totalPages, page + 1) })}
                disabled={page === totalPages}
                className="h-8 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-semibold text-[var(--fg)] shadow-xs transition hover:bg-[var(--bg-subtle)] disabled:opacity-40"
              >
                {isTr ? 'Sonraki' : 'Next'}
              </button>
            </div>
          </div>
        )}

        {tab === 'products' && productTotalPages > 1 && (
          <div className="flex shrink-0 items-center justify-between border-t border-[var(--border-soft)] px-4 py-2.5">
            <span className="text-[11px] text-[var(--fg-muted)]">
              {t('fitment_page_label')} {productPage} / {productTotalPages}
            </span>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setProductPage((p) => Math.max(1, p - 1))}
                disabled={productPage === 1}
                className="h-8 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-semibold text-[var(--fg)] shadow-xs transition hover:bg-[var(--bg-subtle)] disabled:opacity-40"
              >
                {isTr ? 'Önceki' : 'Prev'}
              </button>
              <button
                type="button"
                onClick={() => setProductPage((p) => Math.min(productTotalPages, p + 1))}
                disabled={productPage === productTotalPages}
                className="h-8 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-semibold text-[var(--fg)] shadow-xs transition hover:bg-[var(--bg-subtle)] disabled:opacity-40"
              >
                {isTr ? 'Sonraki' : 'Next'}
              </button>
            </div>
          </div>
        )}
        </div>
      </div>

      {selectedRow && (
        <FitmentRowDetailModal
          row={selectedRow}
          onClose={() => setSelectedRowId(null)}
          onApprove={() => handleApprove(selectedRow)}
          onResolve={() => resolveRowMutation.mutate(selectedRow.id)}
          onReject={() => rejectMutation.mutate(selectedRow.id)}
          onDelete={() => { if (window.confirm(isTr ? `"${selectedRow.sku}" silinsin mi?` : `Delete "${selectedRow.sku}"?`)) deleteRowMutation.mutate(selectedRow.id); }}
          onUpdateVehicle={(vehicleId, body) => updateVehicleMutation.mutate({ vehicleId, body })}
          isEditing={editRowId === selectedRow.id}
          editVals={editVals}
          onStartEdit={() => (editRowId === selectedRow.id ? setEditRowId(null) : startEdit(selectedRow))}
          onCancelEdit={() => setEditRowId(null)}
          onChangeEdit={setEditVals}
          onSaveEdit={() => updateRowMutation.mutate({ id: selectedRow.id, body: editVals })}
          isSaving={updateRowMutation.isPending}
        />
      )}
    </div>
  );
}
