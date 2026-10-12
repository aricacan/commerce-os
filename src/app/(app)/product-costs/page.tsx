'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productCostApi, excelReportApi, settingsApi } from '../../../lib/api';
import {
  Search, Check, X,
  Sparkles, ChevronRight, RotateCcw, Save, RefreshCw, Upload, Lock, Unlock,
} from 'lucide-react';
import { ExportMenu } from '../../../components/ui/ExportMenu';
import { CostSourceStrip } from '../../../components/products/CostSourceStrip';
import type { ExportColumn } from '../../../lib/export';
import { useProductCostsStore, type Step } from '../../../stores/product-costs';
import { useI18n } from '../../../lib/i18n';
import { useMobile } from '../../../hooks/useMobile';
import { useSearchParams } from 'next/navigation';
import { formatDate } from '../../../lib/format';
import { pushAlert, clearAlerts } from '../../../stores/alert-stack';
import { applyOptimistic, rollbackOptimistic } from '../../../lib/optimistic';
import { describeError } from '../../../lib/errors';
import { toast } from '../../../lib/toast';
import type { TranslationKey } from '../../../lib/translations/tr';

const PRODUCT_COST_COLS: ExportColumn[] = [
  { key: 'productName', header: 'Ürün Adı', type: 'text' },
  { key: 'supplierSku', header: 'Tedarikçi SKU', type: 'text' },
  { key: 'barcode', header: 'Barkod', type: 'text' },
  { key: 'category', header: 'Kategori', type: 'text' },
  { key: 'basePrice', header: 'Liste Fiyatı (TL)', type: 'money', currency: 'TRY' },
  { key: 'modelYear', header: 'Model Yılı', type: 'text' },
  { key: 'buyingPrice', header: 'Alış Fiyatı (TL)', type: 'money', currency: 'TRY' },
  { key: 'boxPrice', header: 'Kutu Maliyeti (TL)', type: 'money', currency: 'TRY' },
  { key: 'boxCode', header: 'Kutu Kodu', type: 'text' },
  { key: 'updatedAt', header: 'Güncelleme', type: 'date' },
];

type StepStatus = Step['status'];
type TFunc = (key: TranslationKey) => string;
type ProductCostList = Awaited<ReturnType<typeof productCostApi.list>>;
type CostTableItem = ProductCostList['items'][number];

function fmt(n: number) {
  return '₺' + n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ERP'den gelen maliyet ERP'nin kendi para birimindedir (Base: GBP) — ₺ diye gösterilmemeli.
const CURRENCY_SYMBOLS: Record<string, string> = { TRY: '₺', GBP: '£', EUR: '€', USD: '$' };
function fmtCost(item: CostTableItem) {
  const symbol = CURRENCY_SYMBOLS[item.costCurrency ?? 'TRY'] ?? `${item.costCurrency} `;
  return symbol + (item.buyingPrice ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const COST_SOURCE_LABELS: Record<string, string> = { Erp: 'ERP', Excel: 'Excel', Manual: 'Elle' };

function CostSourceBadge({ item }: { item: CostTableItem }) {
  if (!item.costSource) return null;
  return (
    <span className="ml-1.5 inline-flex items-center gap-0.5 rounded-[3px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] px-1 py-px align-middle text-[9px] font-bold uppercase text-[var(--fg-muted)]">
      {COST_SOURCE_LABELS[item.costSource] ?? item.costSource}
      {item.isLocked && <Lock size={8} aria-label="Kilitli — ERP senkronu ezmez" />}
    </span>
  );
}

function StepIcon({ status }: { status: StepStatus }) {
  if (status === 'done') return <Check size={14} className="text-emerald-500" />;
  if (status === 'error') return <X size={14} className="text-red-500" />;
  if (status === 'active') return <RefreshCw size={14} className="animate-spin text-[var(--fg)]" />;
  return <span className="inline-block h-2 w-2 rounded-full bg-[var(--border-soft)]" />;
}

function ProgressSteps({ steps, t }: { steps: Step[]; t: TFunc }) {
  return (
    <div className="flex flex-col divide-y divide-[var(--border-soft)]">
      {steps.map((step, i) => (
        <div
          key={step.id}
          className={`flex items-start gap-3 p-3 text-xs transition ${
            step.status === 'active'
              ? 'bg-[var(--bg-subtle)]/70'
              : step.status === 'done'
              ? 'bg-emerald-500/5'
              : ''
          }`}
        >
          <div className="mt-0.5 shrink-0">
            <StepIcon status={step.status} />
          </div>
          <div className="min-w-0 flex-1">
            <p
              className={`m-0 font-bold ${
                step.status === 'done'
                  ? 'text-[var(--fg-muted)]'
                  : step.status === 'active'
                  ? 'text-[var(--fg)]'
                  : step.status === 'error'
                  ? 'text-red-500'
                  : 'text-[var(--fg-muted)]'
              }`}
            >
              {step.label}
            </p>
            {step.detail && <p className="m-0 mt-0.5 text-[11px] text-[var(--fg-muted)]">{step.detail}</p>}
          </div>
          {step.status === 'active' && i < steps.length - 1 && (
            <span className="font-mono text-[11px] font-bold text-[var(--fg)]">
              {t('product_costs_processing_label')}
            </span>
          )}
          {step.status === 'done' && (
            <span className="font-mono text-[11px] font-bold text-emerald-500">✓</span>
          )}
        </div>
      ))}
    </div>
  );
}

export default function ProductCostsPage() {
  const { t, lang } = useI18n();
  const isTr = lang === 'tr';
  const isMobile = useMobile();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  // Kaynak kartına tıklanınca liste yalnızca o ERP kaynağının ürünlerini gösterir.
  const [selectedSourceId, setSelectedSourceId] = useState<number | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [editVals, setEditVals] = useState({ buyingPrice: '0', buyingGbp: '', modelYear: '' });
  const [isDragging, setIsDragging] = useState(false);
  const [appliedId, setAppliedId] = useState<number | null>(null);
  const [excelUploadOpen, setExcelUploadOpen] = useState(false);
  const [expandedCostId, setExpandedCostId] = useState<number | null>(null);

  const searchParams = useSearchParams();
  const [onlyMissing, setOnlyMissing] = useState(() => searchParams.get('onlyMissing') === 'true');
  useEffect(() => {
    if (searchParams.get('onlyMissing') === 'true') setOnlyMissing(true);
  }, [searchParams]);

  const {
    phase, setPhase,
    costItems, setCostItems,
    previewResult, setPreviewResult,
    matchState, setMatchState,
    steps, setSteps, updateStep,
    reset: storeReset,
  } = useProductCostsStore();
  const [commitError, setCommitError] = useState<string | null>(null);

  const [isDownloadingWizardTemplate, setIsDownloadingWizardTemplate] = useState(false);
  const handleDownloadWizardTemplate = async () => {
    setIsDownloadingWizardTemplate(true);
    try {
      await excelReportApi.downloadTemplate('ProductCost');
    } catch (err: unknown) {
      alert((isTr ? 'Şablon indirilirken hata oluştu: ' : 'Error downloading template: ') + describeError(err));
    } finally {
      setIsDownloadingWizardTemplate(false);
    }
  };

  const PAGE_SIZE = 30;

  const listKey = ['product-costs', search, page, selectedSourceId] as const;
  const { data, isLoading, isError } = useQuery({
    queryKey: listKey,
    queryFn: () => productCostApi.list({ page, pageSize: PAGE_SIZE, search: search || undefined, sourceId: selectedSourceId ?? undefined }),
    staleTime: 30_000,
  });

  const { data: fx } = useQuery({
    queryKey: ['base-fx'],
    queryFn: () => settingsApi.getBaseFx(),
    staleTime: 5 * 60_000,
  });
  const gbpRate = fx?.gbpToTryRate ?? 0;

  const updateMutation = useMutation({
    meta: { silentError: true, successMessage: 'Alış fiyatı güncellendi' } as const,
    mutationFn: ({ id, buying, modelYear }: { id: number; buying: number; modelYear?: string | null }) =>
      productCostApi.update(id, { buyingPrice: buying, modelYear }),
    onMutate: ({ id, buying, modelYear }) =>
      applyOptimistic<ProductCostList>(qc, listKey, (old) => {
        if (!old || !old.items) return old;
        return {
          ...old,
          items: old.items.map((item) =>
            item.productId === id ? { ...item, buyingPrice: buying, modelYear: modelYear ?? null, updatedAt: new Date().toISOString() } : item
          ),
        };
      }),
    onError: (err, _vars, context) => {
      rollbackOptimistic(qc, context);
      toast.error(describeError(err));
    },
    onSuccess: () => {
      setEditId(null);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['product-costs'] });
    },
  });

  const lockMutation = useMutation({
    mutationFn: (item: CostTableItem) => productCostApi.setLock(item.productId, !item.isLocked),
    onError: (err) => toast.error(describeError(err)),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['product-costs'] });
      qc.invalidateQueries({ queryKey: ['cost-sources'] });
    },
  });

  const applyMutation = useMutation({
    meta: { silentError: true, successMessage: 'Alış fiyatı güncellendi' } as const,
    mutationFn: (item: CostTableItem) =>
      productCostApi.update(item.productId, {
        buyingPrice: item.buyingPrice ?? 0,
        modelYear: item.modelYear,
      }),
    onMutate: (item) =>
      applyOptimistic<ProductCostList>(qc, listKey, (old) => {
        if (!old || !old.items) return old;
        return {
          ...old,
          items: old.items.map((it) =>
            it.productId === item.productId
              ? { ...it, buyingPrice: item.buyingPrice ?? 0, modelYear: item.modelYear, updatedAt: new Date().toISOString() }
              : it
          ),
        };
      }),
    onError: (err, _vars, context) => {
      rollbackOptimistic(qc, context);
      toast.error(describeError(err));
    },
    onSuccess: (_void, item) => {
      setAppliedId(item.productId);
      setTimeout(() => setAppliedId((cur) => (cur === item.productId ? null : cur)), 2000);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['product-costs'] });
    },
  });

  const resetMutation = useMutation({
    meta: { silentError: true, successMessage: 'Alış fiyatı güncellendi' } as const,
    mutationFn: (id: number) => productCostApi.update(id, { buyingPrice: 0, modelYear: null }),
    onMutate: (id) =>
      applyOptimistic<ProductCostList>(qc, listKey, (old) => {
        if (!old || !old.items) return old;
        return {
          ...old,
          items: old.items.map((it) =>
            it.productId === id ? { ...it, buyingPrice: 0, modelYear: null, updatedAt: new Date().toISOString() } : it
          ),
        };
      }),
    onError: (err, _vars, context) => {
      rollbackOptimistic(qc, context);
      toast.error(describeError(err));
    },
    onSuccess: (_void, id) => {
      setEditId(id);
      setEditVals({ buyingPrice: '0', buyingGbp: '', modelYear: '' });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['product-costs'] });
    },
  });

  function requestReset(item: CostTableItem) {
    const confirmMsg = isTr
      ? `"${item.productName}" için mevcut alış fiyatı kaydı tamamen silinip sıfırdan girilecek. Emin misiniz?`
      : `The existing buying price record for "${item.productName}" will be fully reset and re-entered from scratch. Are you sure?`;
    if (window.confirm(confirmMsg)) {
      resetMutation.mutate(item.productId);
    }
  }

  async function handleFile(file: File) {
    if (!file.name.endsWith('.xlsx')) {
      alert(t('product_costs_invalid_file_type'));
      return;
    }

    setCostItems([]);
    setMatchState(null);
    storeReset();
    setPhase('idle');
    clearAlerts();

    const initialSteps: Step[] = [
      { id: 'read', label: t('product_costs_step_read'), status: 'active' },
      { id: 'parse', label: t('product_costs_step_parse'), status: 'pending' },
      { id: 'match', label: t('product_costs_step_match'), status: 'pending' },
      { id: 'save', label: t('product_costs_step_save'), status: 'pending' },
      { id: 'done', label: t('product_costs_step_done'), status: 'pending' },
    ];
    setSteps(initialSteps);

    try {
      updateStep('read', { status: 'active', detail: file.name });
      updateStep('parse', { status: 'active' });

      const result = await productCostApi.parseExcel(file);

      if (!result.items || result.items.length === 0) {
        updateStep('parse', { status: 'error', detail: t('product_costs_no_pairs_found') });
        return;
      }

      updateStep('read', { status: 'done', detail: `${file.name}` });
      updateStep('parse', {
        status: 'done',
        detail: isTr ? `${result.items.length} alış kalemi çıkarıldı` : `${result.items.length} buying items extracted`,
      });

      setCostItems(result.items);
      setPhase('parsed');
      pushAlert(`${file.name} okundu — ${result.items.length} kalem bulundu`, 'success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      updateStep('parse', { status: 'error', detail: message });
      pushAlert(message, 'error', 7000);
    }
  }

  const startPreview = useCallback(async () => {
    if (costItems.length === 0) return;

    setCommitError(null);
    setPhase('matching');
    updateStep('match', { status: 'active', detail: `${t('product_costs_step_match')}...` });

    try {
      const result = await productCostApi.matchPreview(costItems);

      updateStep('match', {
        status: 'done',
        detail: isTr
          ? `${result.matchedCount}/${result.totalProducts} ürün eşleşti · ${result.autoApplied} otomatik uygulanacak${result.unmatchedCount > 0 ? ` · ${result.unmatchedCount} eşleşmedi` : ''}`
          : `${result.matchedCount}/${result.totalProducts} products matched · ${result.autoApplied} to be auto-applied${result.unmatchedCount > 0 ? ` · ${result.unmatchedCount} unmatched` : ''}`,
      });

      setPreviewResult(result);
      setPhase('preview');
    } catch (err: unknown) {
      updateStep('match', { status: 'error', detail: err instanceof Error ? err.message : String(err) });
      setPhase('done');
    }
  }, [costItems, isTr, setPhase, setPreviewResult, t, updateStep]);

  const confirmCommit = useCallback(async () => {
    if (!previewResult || previewResult.matches.length === 0) return;

    setCommitError(null);
    setPhase('committing');
    updateStep('save', { status: 'active', detail: t('product_costs_writing_db') });

    try {
      const commitResult = await productCostApi.matchCommit(previewResult.matches);

      updateStep('save', { status: 'done', detail: t('product_costs_save_complete') });
      updateStep('done', {
        status: 'done',
        detail:
          previewResult.pendingModeration.length > 0
            ? isTr
              ? `${commitResult.autoApplied} otomatik · ${previewResult.pendingModeration.length} moderasyon bekliyor`
              : `${commitResult.autoApplied} automatic · ${previewResult.pendingModeration.length} awaiting moderation`
            : isTr
            ? `${commitResult.autoApplied} ürüne başarıyla fiyat atandı`
            : `${commitResult.autoApplied} products successfully priced`,
      });

      setMatchState({
        allModeration: previewResult.pendingModeration,
        totalAutoApplied: commitResult.autoApplied,
        totalProducts: previewResult.totalProducts,
        matchedCount: previewResult.matchedCount,
        unmatched: previewResult.unmatched,
      });

      qc.invalidateQueries({ queryKey: ['product-costs'] });
      setPhase('done');
    } catch (err: unknown) {
      const message = describeError(err);
      setCommitError(message);
      updateStep('save', { status: 'error', detail: message });
      setPhase('done');
    }
  }, [isTr, previewResult, qc, setMatchState, setPhase, t, updateStep]);

  function reset() {
    storeReset();
    setCostItems([]);
    setMatchState(null);
    setPhase('idle');
    setCommitError(null);
    setExcelUploadOpen(false);
  }

  function startEdit(item: CostTableItem) {
    setEditId(item.productId);
    const buying = item.buyingPrice ?? 0;
    const gbp = gbpRate > 0 && buying > 0 ? (buying / gbpRate).toFixed(2) : '';
    setEditVals({
      buyingPrice: buying > 0 ? String(buying) : '',
      buyingGbp: gbp,
      modelYear: item.modelYear ?? '',
    });
  }

  function handleGbpChange(value: string) {
    const gbp = parseFloat(value.replace(',', '.'));
    const converted = !isNaN(gbp) && gbp >= 0 && gbpRate > 0 ? (gbp * gbpRate).toFixed(2) : editVals.buyingPrice;
    setEditVals((v) => ({ ...v, buyingGbp: value, buyingPrice: converted }));
  }

  function handleTlChange(value: string) {
    setEditVals((v) => ({ ...v, buyingPrice: value, buyingGbp: '' }));
  }

  function saveEdit(productId: number) {
    const buying = parseFloat(editVals.buyingPrice.replace(',', '.'));
    if (isNaN(buying) || buying < 0) {
      alert(t('product_costs_invalid_price'));
      return;
    }
    const modelYear = editVals.modelYear.trim() || null;
    updateMutation.mutate({ id: productId, buying, modelYear });
  }

  function saveAndNext(currentId: number) {
    const buying = parseFloat(editVals.buyingPrice.replace(',', '.'));
    if (isNaN(buying) || buying < 0) {
      alert(t('product_costs_invalid_price'));
      return;
    }
    const modelYear = editVals.modelYear.trim() || null;
    updateMutation.mutate({ id: currentId, buying, modelYear });
    const idx = displayItems.findIndex((it) => it.productId === currentId);
    if (idx >= 0 && idx < displayItems.length - 1) {
      const next = displayItems[idx + 1];
      startEdit(next);
    } else {
      setEditId(null);
    }
  }

  const displayItems = (data?.items ?? []).filter((item) =>
    onlyMissing ? item.buyingPrice === null || item.buyingPrice === 0 : true
  );
  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1;
  const filledCount = data?.overallFilled ?? 0;
  const overallTotal = data?.overallTotal ?? 0;
  const showProgress = steps.length > 0;

  return (
    <div className="flex h-full w-full flex-col gap-3 overflow-y-auto bg-transparent p-4 md:p-5">
      {/* ── ERP kaynağı başına maliyet politikası ve kapsama ── */}
      <CostSourceStrip
        selectedSourceId={selectedSourceId}
        onSelect={(id) => { setSelectedSourceId(id); setPage(1); }}
      />

      {/* ── TEK BİRLEŞİK MASTER KART ── */}
      <div className="flex min-h-0 flex-1 flex-col rounded-[6px] border border-[var(--border-soft)] bg-[var(--card)] overflow-hidden">
        
        {/* ── Üst Çubuk: Arama + Eksikler + Sayım + Excel + Dışa Aktar ── */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[var(--border-soft)] p-3">
          
          {/* Sol: Arama, Filtre Butonu & Sayım Rozeti */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Arama Input & Sadece Eksikler */}
            <div data-tour="costs-search" className="flex items-center gap-2">
              <div className="flex h-8 w-56 items-center gap-2 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-2.5 text-xs text-[var(--fg)] focus-within:border-[var(--fg)]">
                <Search size={13} className="text-[var(--fg-muted)] shrink-0" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder={t('product_costs_search_placeholder')}
                  className="w-full bg-transparent text-xs text-[var(--fg)] placeholder-[var(--fg-muted)] outline-none"
                />
              </div>

              {/* Sadece Eksikler Toggle Butonu */}
              <button
                type="button"
                onClick={() => setOnlyMissing((o) => !o)}
                className={`inline-flex h-8 items-center gap-1.5 rounded-[4px] px-3 text-xs font-bold transition ${
                  onlyMissing
                    ? 'border border-rose-500/20 bg-rose-500/5 text-rose-500/90 dark:text-rose-400'
                    : 'border border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--fg-muted)] hover:text-[var(--fg)]'
                }`}
              >
                <span>{onlyMissing ? (isTr ? 'Tümünü Göster' : 'Show All') : (isTr ? 'Sadece Eksikler' : 'Only Missing')}</span>
              </button>
            </div>

            {/* Doluluk Rozeti */}
            {data && (
              <div data-tour="costs-kpi" className="inline-flex h-8 items-center gap-1.5 rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] px-2.5 font-mono text-xs font-bold text-[var(--fg)]">
                <span>{filledCount} / {overallTotal}</span>
                <span className="text-[10px] text-[var(--fg-muted)] uppercase">
                  {filledCount === overallTotal ? '✓' : (isTr ? 'Dolu' : 'Filled')}
                </span>
              </div>
            )}
          </div>

          {/* Sağ: Excel Yükleme / Şablon / Dışa Aktarma / Rehber */}
          <div data-tour="costs-actions" className="flex flex-wrap items-center gap-2">
            {/* Excel Yükle / Şablon İndir İkili Buton */}
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => setExcelUploadOpen((o) => !o)}
                className={`inline-flex h-8 items-center gap-1.5 rounded-l-[4px] border px-2.5 text-xs font-bold transition ${
                  excelUploadOpen
                    ? 'border border-[var(--fg)]/40 bg-[var(--bg-subtle)] text-[var(--fg)] shadow-xs'
                    : 'border border-[var(--border)] bg-[var(--card)] text-[var(--fg)] hover:bg-[var(--bg-subtle)]'
                }`}
              >
                <Upload size={12} />
                <span>{excelUploadOpen ? (isTr ? 'Kapat' : 'Close') : (isTr ? 'Excel Yükle' : 'Upload Excel')}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadWizardTemplate}
                disabled={isDownloadingWizardTemplate}
                title={isTr ? 'Örnek Excel Şablonunu İndir' : 'Download Sample Excel Template'}
                className="inline-flex h-8 items-center rounded-r-[4px] border border-l-0 border-[var(--border)] bg-[var(--card)] px-2 text-xs font-semibold text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)] disabled:opacity-50"
              >
                <span>{isTr ? 'Şablon' : 'Template'}</span>
              </button>
            </div>

            {showProgress && (
              <button
                type="button"
                onClick={reset}
                className="inline-flex h-8 items-center gap-1 rounded-[4px] border border-[var(--border)] bg-[var(--bg-subtle)] px-2.5 text-xs font-semibold text-[var(--fg-muted)] hover:text-[var(--fg)]"
              >
                <RotateCcw size={12} />
                <span>{t('product_costs_new_upload')}</span>
              </button>
            )}

            {/* Dışa Aktarma Menüsü */}
            <ExportMenu
              filename="alis-fiyatlari"
              columns={PRODUCT_COST_COLS}
              totalHint={data?.overallTotal}
              backgroundExport={{ start: () => productCostApi.startExportExcel() }}
              getDataAsync={async (opts) => {
                const res = await productCostApi.list({
                  page: 1,
                  pageSize: opts?.limit ?? 100000,
                  search: search || undefined,
                  sourceId: selectedSourceId ?? undefined,
                });
                return res.items.map((item) => ({
                  productName: item.productName,
                  supplierSku: item.supplierSku ?? '',
                  barcode: item.barcode ?? '',
                  category: item.category ?? '',
                  basePrice: item.basePrice ?? 0,
                  modelYear: item.modelYear ?? '',
                  buyingPrice: item.buyingPrice ?? 0,
                  boxPrice: item.boxPrice ?? 0,
                  boxCode: item.boxCode ?? '',
                  updatedAt: item.updatedAt ?? '',
                }));
              }}
            />
          </div>
        </div>

        {/* ── Excel Sihirbazı & İlerleme Paneli (Açıkken Üstte Yer Alır) ── */}
        {(excelUploadOpen || showProgress) && (
          <div className="border-b border-[var(--border-soft)] bg-[var(--bg-subtle)]/40 p-4">
            
            {/* Upload Zone */}
            {!showProgress && (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  const f = e.dataTransfer.files[0];
                  if (f) handleFile(f);
                }}
                onClick={() => {
                  fileRef.current?.click();
                }}
                className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[4px] border-2 border-dashed p-6 transition ${
                  isDragging ? 'border-[var(--fg)] bg-[var(--card)]' : 'border-[var(--border)] hover:border-[var(--fg-muted)]'
                }`}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                    e.target.value = '';
                  }}
                />
                <Upload size={20} className="text-[var(--fg-muted)]" />
                <p className="m-0 text-xs font-bold text-[var(--fg)]">{t('product_costs_upload_title')}</p>
                <p className="m-0 text-[11px] text-[var(--fg-muted)]">{t('product_costs_upload_hint')}</p>
              </div>
            )}

            {/* Adım İlerlemesi */}
            {showProgress && <ProgressSteps steps={steps} t={t} />}

            {/* Parsed Durum / Eşleştir Butonu */}
            {phase === 'parsed' && costItems.length > 0 && (
              <div className="mt-3 flex items-center justify-between border-t border-[var(--border-soft)] pt-3">
                <span className="text-xs text-[var(--fg-muted)]">
                  <strong className="text-[var(--fg)]">{costItems.length} {t('product_costs_items_label')}</strong> bulundu
                </span>
                <button
                  type="button"
                  onClick={startPreview}
                  className="inline-flex h-8 items-center gap-1.5 rounded-[4px] bg-[var(--fg)] px-3 text-xs font-bold text-[var(--card)] hover:opacity-90"
                >
                  <Sparkles size={12} />
                  <span>{t('product_costs_match_button')}</span>
                  <ChevronRight size={12} />
                </button>
              </div>
            )}

            {/* Önizleme & Onay */}
            {(phase === 'preview' || phase === 'committing') && previewResult && (
              <div className="mt-3 flex flex-col gap-3 border-t border-[var(--border-soft)] pt-3">
                <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
                  <span className="text-emerald-500 font-bold">
                    {previewResult.autoApplied} {isTr ? 'otomatik güncellenecek' : 'auto updated'}
                  </span>
                  <span className="text-amber-500 font-bold">
                    {previewResult.pendingModeration.length} {isTr ? 'manuel onaya düşecek' : 'pending moderation'}
                  </span>
                  {previewResult.unmatchedCount > 0 && (
                    <span className="text-red-500 font-bold">
                      {previewResult.unmatchedCount} {isTr ? 'eşleşmedi' : 'unmatched'}
                    </span>
                  )}
                </div>

                {commitError && <p className="m-0 text-xs font-bold text-red-500">{commitError}</p>}

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={reset}
                    disabled={phase === 'committing'}
                    className="inline-flex h-8 items-center rounded-[4px] border border-[var(--border)] px-3 text-xs font-semibold text-[var(--fg-muted)] hover:text-[var(--fg)]"
                  >
                    {isTr ? 'Vazgeç' : 'Cancel'}
                  </button>
                  <button
                    type="button"
                    onClick={confirmCommit}
                    disabled={phase === 'committing'}
                    className="inline-flex h-8 items-center gap-1.5 rounded-[4px] bg-[var(--fg)] px-3 text-xs font-bold text-[var(--card)] hover:opacity-90 disabled:opacity-50"
                  >
                    {phase === 'committing' ? (
                      <RefreshCw size={12} className="animate-spin" />
                    ) : (
                      <Check size={12} />
                    )}
                    <span>
                      {phase === 'committing'
                        ? isTr ? 'Uygulanıyor…' : 'Applying…'
                        : isTr ? 'Onayla ve Uygula' : 'Confirm & Apply'}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Tamamlandı Özeti (Done Phase) ── */}
        {phase === 'done' && matchState && (
          <div className="border-b border-[var(--border-soft)] bg-emerald-500/5 p-3 px-4 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-500">
                {matchState.totalAutoApplied} {isTr ? 'ürüne alış fiyatı atandı.' : 'products updated.'}
              </span>
              {matchState.allModeration.length > 0 && (
                <Link
                  href="/monitoring/approvals"
                  className="font-semibold text-amber-500 hover:underline"
                >
                  {matchState.allModeration.length} {isTr ? 'kalem onay bekliyor →' : 'items awaiting approval →'}
                </Link>
              )}
            </div>
          </div>
        )}

        {/* ── Tablo Gövdesi (Tam Dikey Esnek) ── */}
        <div data-tour="costs-table" className="min-h-0 flex-1 overflow-auto">
          {isLoading ? (
            <div className="p-16 text-center text-xs text-[var(--fg-muted)]">
              {t('loading')}
            </div>
          ) : isError ? (
            <div className="p-16 text-center text-xs text-red-500">
              {t('product_costs_load_error')}
            </div>
          ) : displayItems.length === 0 ? (
            <div className="p-16 text-center text-xs text-[var(--fg-muted)]">
              {t('campaign_no_results')}
            </div>
          ) : isMobile ? (
            /* ── Mobil Görünüm ── */
            <div className="flex flex-col divide-y divide-[var(--border-soft)]">
              {displayItems.map((item) => {
                const isEditing = editId === item.productId;
                const hasPrice = item.buyingPrice !== null && item.buyingPrice > 0;
                const isExpanded = expandedCostId === item.productId;

                return (
                  <div key={item.productId} className="p-3 bg-[var(--card)]">
                    <div
                      className="flex cursor-pointer items-start justify-between gap-2"
                      onClick={() => setExpandedCostId(isExpanded ? null : item.productId)}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="m-0 truncate text-xs font-bold text-[var(--fg)]">{item.productName}</p>
                        <p className="m-0 mt-0.5 font-mono text-[10.5px] text-[var(--fg-muted)]">{item.supplierSku}</p>
                      </div>
                      <div className="flex items-center gap-1.5 font-mono text-xs font-bold">
                        <span className={hasPrice ? 'text-emerald-500' : 'text-red-500'}>
                          {hasPrice ? fmtCost(item) : t('product_costs_not_entered')}
                        </span>
                        <ChevronRight size={13} className={`text-[var(--fg-muted)] transition ${isExpanded ? 'rotate-90' : ''}`} />
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-3 flex flex-col gap-2 border-t border-[var(--border-soft)] pt-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-[var(--fg-muted)]">{t('product_costs_col_category')}:</span>
                          <span className="font-semibold text-[var(--fg)]">{item.category}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[var(--fg-muted)]">{t('campaign_col_list_price')}:</span>
                          <span className="font-mono font-bold text-[var(--fg)]">{fmt(item.basePrice)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[var(--fg-muted)]">{t('campaign_buying_price')}:</span>
                          {isEditing ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={editVals.buyingPrice}
                                onChange={(e) => handleTlChange(e.target.value)}
                                className="h-7 w-20 rounded-[3px] border border-[var(--fg)] bg-[var(--card)] px-2 font-mono text-xs font-bold text-[var(--fg)] outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => saveEdit(item.productId)}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-[3px] bg-[var(--fg)] text-[var(--card)]"
                              >
                                <Check size={12} />
                              </button>
                            </div>
                          ) : (
                            <span
                              onClick={() => startEdit(item)}
                              className={`cursor-pointer font-mono font-bold ${hasPrice ? 'text-emerald-500' : 'text-red-500'}`}
                            >
                              {hasPrice ? fmtCost(item) : t('product_costs_not_entered')}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* ── Masaüstü Tablo ── */
            <table className="w-full border-collapse text-left text-xs">
              <thead className="sticky top-0 z-10 border-b border-[var(--border-soft)] bg-[var(--bg-subtle)] text-[10.5px] font-bold uppercase tracking-wider text-[var(--fg-muted)]">
                <tr>
                  <th className="px-3.5 py-2.5">{t('campaign_col_product')}</th>
                  <th className="px-3.5 py-2.5">{t('product_costs_col_category')}</th>
                  <th className="px-3.5 py-2.5 text-right">{t('campaign_col_list_price')}</th>
                  <th className="px-3.5 py-2.5">{t('product_costs_col_model_year')}</th>
                  <th className="px-3.5 py-2.5 text-right">{t('campaign_buying_price')}</th>
                  <th className="px-3.5 py-2.5 text-right">{t('campaign_box_cost')}</th>
                  <th className="px-3.5 py-2.5">{t('product_costs_col_updated')}</th>
                  <th className="px-3.5 py-2.5 text-right">{isTr ? 'İşlem' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-soft)]">
                {displayItems.map((item) => {
                  const isEditing = editId === item.productId;
                  const hasPrice = item.buyingPrice !== null && item.buyingPrice > 0;

                  return (
                    <tr
                      key={item.productId}
                      className={`transition ${
                        isEditing ? 'bg-[var(--bg-subtle)]/70' : 'hover:bg-[var(--bg-subtle)]/40'
                      }`}
                    >
                      {/* Ürün & SKU */}
                      <td className="max-w-[280px] px-3.5 py-2.5">
                        <p className="m-0 truncate font-semibold text-[var(--fg)]" title={item.productName}>
                          {item.productName}
                        </p>
                        <p className="m-0 mt-0.5 font-mono text-[10.5px] text-[var(--fg-muted)]">
                          {item.supplierSku}
                          {item.barcode ? ` · ${item.barcode}` : ''}
                        </p>
                      </td>

                      {/* Kategori */}
                      <td className="px-3.5 py-2.5 text-[var(--fg-muted)]">{item.category}</td>

                      {/* Liste Fiyatı */}
                      <td className="px-3.5 py-2.5 text-right font-mono font-semibold text-[var(--fg)]">
                        {item.basePrice > 0 ? fmt(item.basePrice) : '—'}
                      </td>

                      {/* Model Yılı */}
                      <td className="px-3.5 py-2.5">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editVals.modelYear}
                            onChange={(e) => setEditVals((v) => ({ ...v, modelYear: e.target.value }))}
                            placeholder="2020-2023"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                saveEdit(item.productId);
                              }
                              if (e.key === 'Escape') setEditId(null);
                            }}
                            className="h-7 w-24 rounded-[3px] border border-[var(--fg)] bg-[var(--card)] px-2 font-mono text-xs text-[var(--fg)] outline-none"
                          />
                        ) : (
                          <span className="font-mono text-[var(--fg-muted)]">{item.modelYear ?? '—'}</span>
                        )}
                      </td>

                      {/* Alış Fiyatı (Hızlı Düzenleme) */}
                      <td className="px-3.5 py-2.5 text-right">
                        {isEditing ? (
                          <div className="inline-flex flex-col items-end gap-1">
                            <input
                              type="text"
                              value={editVals.buyingPrice}
                              onChange={(e) => handleTlChange(e.target.value)}
                              autoFocus
                              placeholder="₺ TL"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  if (e.shiftKey) saveAndNext(item.productId);
                                  else saveEdit(item.productId);
                                }
                                if (e.key === 'Escape') setEditId(null);
                              }}
                              className="h-7 w-24 rounded-[3px] border border-[var(--fg)] bg-[var(--card)] px-2 text-right font-mono text-xs font-bold text-[var(--fg)] outline-none"
                            />
                            {gbpRate > 0 && (
                              <input
                                type="text"
                                value={editVals.buyingGbp}
                                onChange={(e) => handleGbpChange(e.target.value)}
                                placeholder="£ GBP"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    if (e.shiftKey) saveAndNext(item.productId);
                                    else saveEdit(item.productId);
                                  }
                                  if (e.key === 'Escape') setEditId(null);
                                }}
                                className="h-6 w-24 rounded-[3px] border border-[var(--border)] bg-[var(--bg-subtle)] px-2 text-right font-mono text-[10.5px] text-[var(--fg-muted)] outline-none"
                              />
                            )}
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => startEdit(item)}
                            title="Düzenlemek için tıkla"
                            className={`rounded-[3px] px-1.5 py-0.5 font-mono font-bold transition hover:bg-[var(--bg-subtle)] ${
                              hasPrice ? 'text-emerald-500' : 'text-red-500'
                            }`}
                          >
                            {hasPrice ? fmtCost(item) : t('product_costs_not_entered')}
                          </button>
                        )}
                        {!isEditing && hasPrice && (
                          <CostSourceBadge item={item} />
                        )}
                      </td>

                      {/* Kutu Maliyeti */}
                      <td className="px-3.5 py-2.5 text-right font-mono text-[var(--fg-muted)]">
                        {item.boxPrice !== null ? fmt(item.boxPrice) : '—'}
                      </td>

                      {/* Güncelleme */}
                      <td className="px-3.5 py-2.5 font-mono text-[11px] text-[var(--fg-muted)]">
                        {item.updatedAt ? formatDate(item.updatedAt, lang) : '—'}
                      </td>

                      {/* İşlemler */}
                      <td className="px-3.5 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {isEditing ? (
                            <>
                              <button
                                type="button"
                                onClick={() => saveEdit(item.productId)}
                                disabled={updateMutation.isPending}
                                title="Kaydet (Enter)"
                                className="flex h-6 w-6 items-center justify-center rounded-[3px] bg-[var(--fg)] text-[var(--card)] hover:opacity-90"
                              >
                                <Check size={11} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditId(null)}
                                title="İptal (Escape)"
                                className="flex h-6 w-6 items-center justify-center rounded-[3px] border border-[var(--border)] bg-[var(--card)] text-[var(--fg-muted)] hover:text-[var(--fg)]"
                              >
                                <X size={11} />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => startEdit(item)}
                                className="inline-flex h-6 items-center rounded-[3px] border border-[var(--border)] bg-[var(--card)] px-2 text-[11px] font-semibold text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)]"
                              >
                                {t('product_costs_edit')}
                              </button>
                              {item.costSource && (
                                <button
                                  type="button"
                                  onClick={() => lockMutation.mutate(item)}
                                  disabled={lockMutation.isPending}
                                  title={item.isLocked ? 'Kilidi aç — ERP senkronu bu fiyatı güncelleyebilir' : 'Kilitle — ERP senkronu bu fiyatı ezmesin'}
                                  className={`flex h-6 w-6 items-center justify-center rounded-[3px] border border-[var(--border)] bg-[var(--card)] transition ${
                                    item.isLocked ? 'text-amber-500' : 'text-[var(--fg-muted)] hover:text-[var(--fg)]'
                                  }`}
                                >
                                  {item.isLocked ? <Lock size={11} /> : <Unlock size={11} />}
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => applyMutation.mutate(item)}
                                // TL dışı (ERP'den gelen £) maliyeti "uygula" TL olarak geri yazardı.
                                disabled={applyMutation.isPending || (item.costCurrency ?? 'TRY') !== 'TRY'}
                                title={t('product_costs_apply_tooltip')}
                                className={`flex h-6 w-6 items-center justify-center rounded-[3px] border border-[var(--border)] transition ${
                                  appliedId === item.productId
                                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                                    : 'bg-[var(--card)] text-[var(--fg-muted)] hover:text-[var(--fg)]'
                                }`}
                              >
                                {appliedId === item.productId ? <Check size={11} /> : <Save size={11} />}
                              </button>
                              <button
                                type="button"
                                onClick={() => requestReset(item)}
                                disabled={resetMutation.isPending}
                                title={t('product_costs_replace_tooltip')}
                                className="flex h-6 w-6 items-center justify-center rounded-[3px] border border-[var(--border)] bg-[var(--card)] text-[var(--fg-muted)] transition hover:text-red-500"
                              >
                                <RefreshCw size={11} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Alt Bar (Sayfalama & Kayıt Bilgisi) ── */}
        <div className="flex h-10 shrink-0 items-center justify-between border-t border-[var(--border-soft)] px-4 text-xs text-[var(--fg-muted)]">
          <span>
            {isTr ? 'Toplam Ürün:' : 'Total Products:'} <b className="text-[var(--fg)]">{data?.total ?? 0}</b>
          </span>

          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="inline-flex h-7 items-center rounded-[3px] border border-[var(--border)] bg-[var(--card)] px-2.5 font-mono text-xs font-semibold text-[var(--fg)] hover:bg-[var(--bg-subtle)] disabled:opacity-40"
              >
                ←
              </button>
              <span className="font-mono text-xs">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="inline-flex h-7 items-center rounded-[3px] border border-[var(--border)] bg-[var(--card)] px-2.5 font-mono text-xs font-semibold text-[var(--fg)] hover:bg-[var(--bg-subtle)] disabled:opacity-40"
              >
                →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
