'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  X,
  ScanBarcode,
  Plus,
  Download,
  Loader2,
} from 'lucide-react';
import { productApi, categoryApi } from '../../../lib/api';
import { ExportMenu, type ExportRow } from '../../../components/ui/ExportMenu';
import { FilterSelect } from '../../../components/ui/FilterSelect';
import type { ExportColumn } from '../../../lib/export';
import { useMobile } from '../../../hooks/useMobile';
import { useI18n } from '../../../lib/i18n';
import { useBaseCurrency } from '../../../hooks/useBaseCurrency';
import { useUrlState } from '../../../hooks/useUrlState';
import { ListViewBar } from '@/features/listviews/ListViewBar';
import { CustomCheckbox } from '../../../components/ui/CustomCheckbox';
import { queryKeys } from '../../../lib/query-keys';
import { QUERY_STALE_TIME } from '../../../lib/query-policy';
import { useProductsQuery } from '../../../hooks/products/useProductsQuery';
import { ProductResults } from '../../../components/products/ProductResults';
import { FullScreenPanel } from '../../../components/ui/FullScreenPanel';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { useUnsavedChangesGuard } from '../../../hooks/useUnsavedChangesGuard';
import { ProductEntryWorkspace } from '../../../features/product-entry/ProductEntryWorkspace';

const BarcodeScannerModal = dynamic(() => import('../../../components/barcode/BarcodeScannerModal')
  .then((module) => module.BarcodeScannerModal));
const ProductSkuDetailSheet = dynamic(() => import('../../../components/barcode/ProductSkuDetailSheet')
  .then((module) => module.ProductSkuDetailSheet));

// Backend'deki IProductImageExportService.MaxBulkSkus ile AYNI sınır — burada sadece
// kullanıcıya erken/net bir uyarı göstermek için tekrarlanır, gerçek zorlama backend'de.
const MAX_BULK_IMAGE_ZIP_SKUS = 50;

// Veri gelmeden önceki boş liste — sabit referans. Her render'da yeni bir [] üretmek
// ürün listesine bağlı useMemo'ları her seferinde yeniden hesaplatıyordu.
const NO_PRODUCTS: never[] = [];

function fmt(n: number) {
  return '₺' + n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ProductsCatalogPage() {
  const isMobile = useMobile();
  const { lang } = useI18n();
  const { toGbp, isBaseSourceType } = useBaseCurrency();

  // Base (BaseLinker) ERP'sinden gelen ürünlerde TRY'nin yanında GBP karşılığı da
  // gösterilir — StoreName artık marka anlamına geldiği için (bkz. useBaseCurrency)
  // ürünün kendi sourceType'ına göre karar verilir.
  function fmtPrice(n: number, sourceType?: string | null) {
    const tryStr = fmt(n);
    if (!isBaseSourceType(sourceType)) return tryStr;
    const gbp = toGbp(n);
    // Base kaynaklı ürünlerde £ baskın, ₺ parantezde arka planda kalır (dashboard/siparişlerdeki
    // aynı kuralla tutarlı — bkz. KpiBar/StaticWidgets/orders fmtCurrency).
    const gbpStr = gbp != null ? `£${gbp.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : null;
    return gbpStr != null ? `${gbpStr} (${tryStr})` : tryStr;
  }

  const SORT_OPTIONS = [
    { value: 'name_asc',   label: lang === 'tr' ? 'İsim (A-Z)' : 'Name (A-Z)' },
    { value: 'newest',     label: lang === 'tr' ? 'En Yeni' : 'Newest' },
    { value: 'price_desc', label: lang === 'tr' ? 'Fiyat: Pahalıdan Ucuza' : 'Price: High to Low' },
    { value: 'price_asc',  label: lang === 'tr' ? 'Fiyat: Ucuzdan Pahalıya' : 'Price: Low to High' },
    { value: 'sales_desc', label: lang === 'tr' ? 'En Çok Satanlar' : 'Best Sellers' },
    { value: 'stock_desc', label: lang === 'tr' ? 'Stok Miktarı' : 'Stock Quantity' },
    // Bu ikisi teknik olarak FILTRE (backend satir eliyor), ama kullanici icin
    // "sunlari goster" bir gorunum secimi — ayni menude durmasi dogal.
    { value: 'missing_cost', label: lang === 'tr' ? 'Maliyeti Eksik Ürünler' : 'Products Missing Cost' },
    { value: 'missing_image', label: lang === 'tr' ? 'Görseli Eksik Ürünler' : 'Products Missing Image' },
  ];

  const PRODUCT_FILTER_DEFAULTS = { page: 1, sort: 'name_asc', q: '', cat: '', brand: '', model: '' };
  const { state: urlState, setState: setUrlState, reset: resetUrlFilters } = useUrlState(PRODUCT_FILTER_DEFAULTS);
  const page = urlState.page;
  const sortBy = urlState.sort;
  const debouncedSearch = urlState.q;
  const categoryId = urlState.cat ? Number(urlState.cat) : undefined;
  const brand = urlState.brand || undefined;
  const model = urlState.model || undefined;

  const [searchInput, setSearchInput] = useState(debouncedSearch);
  const [scanOpen, setScanOpen]       = useState(false);
  // Manuel urun girisi paneli — URL degistirmeden listenin ustunde acilir.
  const [productEntryOpen, setProductEntryOpen] = useState(false);
  const [scannedSku, setScannedSku]   = useState<string | null>(null);
  // Varsayilan LISTE: kart gorunumu ekrana 3-4 urun sigdiriyordu, liste ise SKU/stok/fiyat
  // kolonlariyla tek ekranda ~20 satir gosteriyor. Gunluk kullanim liste uzerinden yuruyor.
  const [viewMode, setViewMode]       = useState<'grid' | 'list'>('list');
  // Toplu görsel indirme seçimi — bu sayfada başka bir toplu-seçim mekanizması yoktu,
  // görsel .zip indirme özelliği için buradan sıfırdan eklendi (bkz. ProductResults checkbox'ları).
  const [selectedSkus, setSelectedSkus] = useState<Set<string>>(new Set());
  const [bulkZipDownloading, setBulkZipDownloading] = useState(false);

  function toggleSkuSelection(sku: string) {
    setSelectedSkus(prev => {
      const next = new Set(prev);
      if (next.has(sku)) next.delete(sku); else next.add(sku);
      return next;
    });
  }

  async function handleBulkDownloadZip() {
    if (selectedSkus.size === 0 || bulkZipDownloading) return;
    setBulkZipDownloading(true);
    try {
      await productApi.downloadImagesZipBulk(Array.from(selectedSkus));
    } catch {
      // Sessizce yut — kullanıcı butonu tekrar deneyebilir (bu sayfada toast altyapısı yok,
      // ExportMenu'nün de aynı sessiz-hata deseni var).
    } finally {
      setBulkZipDownloading(false);
    }
  }
  const [visibleCols, setVisibleCols] = useState<string[]>(() => {
    if (typeof window === 'undefined') return ['name', 'brand', 'store', 'platform', 'price', 'stock', 'sales', 'box'];
    try {
      const saved = localStorage.getItem('products_visible_cols');
      return saved ? JSON.parse(saved) : ['name', 'brand', 'store', 'platform', 'price', 'stock', 'sales', 'box'];
    } catch {
      return ['name', 'brand', 'store', 'platform', 'price', 'stock', 'sales', 'box'];
    }
  });
  // Kayitli gorunum kolon tasiyorsa uygulanir; localStorage'a da yazilir ki gorunum
  // uygulandiktan sonra sayfa yenilense bile ayni kolonlar kalsin.
  const applyVisibleCols = (next: string[]) => {
    setVisibleCols(next);
    try { localStorage.setItem('products_visible_cols', JSON.stringify(next)); } catch {}
  };

  useEffect(() => {
    const syncTimer = window.setTimeout(() => setSearchInput(debouncedSearch), 0);
    return () => window.clearTimeout(syncTimer);
  }, [debouncedSearch]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchInput !== debouncedSearch) {
        setUrlState({ q: searchInput, page: 1 });
      }
    }, 450);
    return () => clearTimeout(handler);
  }, [searchInput, debouncedSearch, setUrlState]);

  // Boş sonuç ekranındaki çıkış yolu — görünüm tercihi (grid/list) korunur,
  // yalnızca sonucu daraltan filtreler sıfırlanır.
  function clearFilters() {
    setSearchInput('');
    resetUrlFilters();
  }

  const handleSortToggle = (field: string) => {
    let nextSort = 'name_asc';
    if (field === 'name') {
      nextSort = sortBy === 'name_asc' ? 'name_desc' : 'name_asc';
    } else if (field === 'price') {
      nextSort = sortBy === 'price_asc' ? 'price_desc' : 'price_asc';
    } else if (field === 'stock') {
      nextSort = sortBy === 'stock_desc' ? 'stock_asc' : 'stock_desc';
    } else if (field === 'sales') {
      nextSort = sortBy === 'sales_desc' ? 'sales_asc' : 'sales_desc';
    }
    setUrlState({ sort: nextSort, page: 1 });
  };

  const renderSortableHeader = (label: string, field: string) => {
    const isSorted = sortBy.startsWith(field);
    const isAsc = sortBy.endsWith('_asc');
    return (
      <th
        onClick={() => handleSortToggle(field)}
        style={{
          textAlign: 'left',
          padding: '10px 16px',
          fontSize: 11,
          fontWeight: 700,
          color: isSorted ? 'var(--fg)' : 'var(--fg-muted)',
          textTransform: 'uppercase',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span>{label}</span>
          {isSorted ? (
            <span style={{ fontSize: 10, color: 'var(--fg)' }}>
              {isAsc ? '▲' : '▼'}
            </span>
          ) : (
            <span style={{ fontSize: 10, color: 'var(--fg-muted)', opacity: 0.3 }}>
              ▲
            </span>
          )}
        </div>
      </th>
    );
  };

  // Kategori Listesini Yükle
  const { data: categoriesData } = useQuery({
    queryKey: queryKeys.reference.categories,
    queryFn: () => categoryApi.master(),
    staleTime: QUERY_STALE_TIME.reference,
  });

  // Marka listesi — Universal/Marka Dışı placeholder'lar backend'de zaten filtrelenip geliyor.
  const { data: brandsData } = useQuery({
    queryKey: queryKeys.products.brands,
    queryFn: () => productApi.brands(),
    staleTime: QUERY_STALE_TIME.reference,
  });

  // Model listesi marka seçimine kaskad — marka yoksa boş.
  const { data: modelsData } = useQuery({
    queryKey: queryKeys.products.models(brand ?? ''),
    queryFn: () => productApi.models(brand!),
    enabled: !!brand,
    staleTime: QUERY_STALE_TIME.reference,
  });


  const PAGE_SIZE = 50;

  const productFilters = useMemo(() => ({
      search: debouncedSearch || undefined,
      sortBy,
      categoryId,
      brand,
      model,
      page,
      pageSize: PAGE_SIZE,
  }), [debouncedSearch, sortBy, categoryId, brand, model, page]);
  const { data, isLoading, isError, refetch } = useProductsQuery(productFilters);

  // Manuel urun girisi paneli kapanisi: form kirliyse once onay sorulur.
  // Kaydettikten sonra alttaki urun listesi tazelenir.
  const closeProductEntry = useCallback(() => setProductEntryOpen(false), []);
  const productEntryGuard = useUnsavedChangesGuard(closeProductEntry);
  const handleProductEntrySaved = useCallback(() => { void refetch(); }, [refetch]);

  // "Maliyeti/görseli eksik" filtreleri artık BACKEND'de uygulanıyor. Eskiden burada
  // istemci tarafında yapılıyordu ve yalnızca AÇIK OLAN SAYFAYI eliyordu: toplam sayı
  // filtresiz kalıyor, çoğu sayfa bomboş görünüyordu.
  const products = data?.items ?? NO_PRODUCTS;
  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;

  const allSelected = useMemo(() => {
    if (!products || products.length === 0) return false;
    return products.every((p) => p.supplierSKU && selectedSkus.has(p.supplierSKU));
  }, [products, selectedSkus]);

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedSkus(new Set());
    } else {
      const next = new Set<string>();
      products.forEach((p) => {
        if (p.supplierSKU) next.add(p.supplierSKU);
      });
      setSelectedSkus(next);
    }
  };



  const PRODUCT_EXPORT_COLUMNS: ExportColumn[] = [
    { key: 'product', header: lang === 'tr' ? 'Ürün' : 'Product', type: 'text' },
    { key: 'sku', header: 'SKU', type: 'text' },
    { key: 'store', header: lang === 'tr' ? 'Mağaza' : 'Store', type: 'text' },
    { key: 'platform', header: 'Platform', type: 'text' },
    { key: 'category', header: lang === 'tr' ? 'Kategori' : 'Category', type: 'text' },
    { key: 'brand', header: lang === 'tr' ? 'Marka' : 'Brand', type: 'text' },
    { key: 'model', header: 'Model', type: 'text' },
    { key: 'year', header: lang === 'tr' ? 'Yıl' : 'Year', type: 'int' },
    { key: 'price', header: lang === 'tr' ? 'Fiyat (TL)' : 'Price (TL)', type: 'money', currency: 'TRY' },
    { key: 'stock', header: lang === 'tr' ? 'Stok' : 'Stock', type: 'int' },
    { key: 'sales', header: lang === 'tr' ? 'Satış' : 'Sales', type: 'int' },
    { key: 'box', header: lang === 'tr' ? 'Kutu' : 'Box', type: 'text' },
    { key: 'desi', header: 'Desi', type: 'decimal' },
  ];

  const hasActiveFilters = Boolean(debouncedSearch || categoryId || brand || model);

  return (<>
    <FullScreenPanel
      open={productEntryOpen}
      title={lang === 'tr' ? 'Manuel Ürün Girişi' : 'Manual Product Entry'}
      onClose={productEntryGuard.requestClose}
    >
      <ProductEntryWorkspace
        onDirtyChange={productEntryGuard.setDirty}
        onSaved={handleProductEntrySaved}
      />
    </FullScreenPanel>
    <ConfirmDialog
      open={productEntryGuard.confirmOpen}
      title={lang === 'tr' ? 'Kaydedilmemiş değişiklikler' : 'Unsaved changes'}
      description={lang === 'tr'
        ? 'Bu formda kaydedilmemiş değişiklikler var. Paneli kapatırsanız bunlar kaybolur.'
        : 'This form has unsaved changes. Closing the panel will discard them.'}
      confirmLabel={lang === 'tr' ? 'Kapat ve vazgeç' : 'Discard and close'}
      cancelLabel={lang === 'tr' ? 'Düzenlemeye dön' : 'Keep editing'}
      onConfirm={productEntryGuard.confirmDiscard}
      onCancel={productEntryGuard.cancelDiscard}
    />
    <div style={{ height: '100%', overflowY: 'auto', background: 'transparent' }}>
      {/* ── Üst Araç Çubuğu (Kompakt Toolbar) ────────────────────────────── */}
      <div className="flex flex-col gap-2.5 border-b border-border bg-card p-3 sm:px-5 sm:py-3.5 shrink-0">
        {/* Satır 1: Başlık, Seçim, ListViewBar ve Aksiyon Butonları */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div data-tour="products-header" className="flex items-center gap-2.5">
            {!isMobile && (
              <CustomCheckbox checked={allSelected} onChange={toggleSelectAll} style={{ marginRight: 2 }} />
            )}
            <h1 className="m-0 text-base font-extrabold text-fg tracking-tight whitespace-nowrap">
              {lang === 'tr' ? 'Tüm Ürünler' : 'All Products'}
            </h1>
            <span className="rounded-[4px] bg-bg-subtle px-2 py-0.5 text-ui-xs font-mono font-bold text-fg-muted border border-border-soft">
              {totalCount.toLocaleString('tr-TR')}
            </span>
            {!isMobile && (
              <ListViewBar pageKey="products" columns={visibleCols} onApplyColumns={applyVisibleCols} />
            )}
          </div>

          {/* Aksiyon Butonları Grubu */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Görünüm Seçici (Liste / Grid) */}
            <div data-tour="products-viewmode" className="flex items-center rounded-[4px] border border-border-soft bg-bg-subtle p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`flex h-7 w-7 items-center justify-center rounded-[3px] transition-colors cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-card text-fg shadow-xs font-semibold'
                    : 'text-fg-muted hover:text-fg'
                }`}
                title={lang === 'tr' ? 'Liste Görünümü' : 'List View'}
              >
                <List size={14} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`flex h-7 w-7 items-center justify-center rounded-[3px] transition-colors cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-card text-fg shadow-xs font-semibold'
                    : 'text-fg-muted hover:text-fg'
                }`}
                title={lang === 'tr' ? 'Kart / Galeri Görünümü' : 'Grid View'}
              >
                <LayoutGrid size={14} />
              </button>
            </div>

            {/* Sıralama */}
            <div data-tour="products-sort" className="inline-flex">
              <FilterSelect
                value={sortBy}
                placeholder={lang === 'tr' ? 'Sıralama' : 'Sort'}
                options={SORT_OPTIONS}
                onChange={(val) => setUrlState({ sort: val, page: 1 })}
                minWidth={150}
                height="h-8"
              />
            </div>

            {/* Manuel Ürün paneli (Koyu Füme / Slate-800) */}
            <button
              type="button"
              data-tour="products-manual"
              onClick={() => setProductEntryOpen(true)}
              className="inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-[4px] bg-slate-800 hover:bg-slate-700 text-slate-100 dark:bg-slate-700 dark:hover:bg-slate-600 px-3 text-xs font-semibold transition-colors shadow-xs"
            >
              <Plus size={13} />
              <span>{lang === 'tr' ? 'Manuel Ürün' : 'Manual Product'}</span>
            </button>

            {/* Barkod tarama */}
            <button
              type="button"
              data-tour="products-barcode"
              onClick={() => setScanOpen(true)}
              title={lang === 'tr' ? 'Barkod Tara' : 'Scan Barcode'}
              className="inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-[4px] border border-border bg-card px-2.5 text-xs font-semibold text-fg transition hover:bg-bg-subtle"
            >
              <ScanBarcode size={13} />
              <span className="hidden sm:inline">{lang === 'tr' ? 'Barkod Tara' : 'Scan'}</span>
            </button>

            {/* Dışa Aktar */}
            <div data-tour="products-export" className="inline-flex">
              <ExportMenu
                filename={`urun-katalogu-${new Date().toISOString().slice(0, 10)}`}
                columns={PRODUCT_EXPORT_COLUMNS}
                totalHint={totalCount}
                getDataAsync={async (opts) => {
                  const allData = await productApi.list({
                    search: debouncedSearch || undefined,
                    sortBy,
                    categoryId,
                    brand,
                    model,
                    page: 1,
                    pageSize: opts?.limit ?? 100000,
                  });
                  const items = allData?.items ?? [];
                  return items.map((p): ExportRow => ({
                    product: p.productName,
                    sku: p.supplierSKU ?? '',
                    store: p.storeName,
                    platform: p.platformName,
                    category: p.mappedCategoryName,
                    brand: p.brand ?? '',
                    model: p.model ?? '',
                    year: p.modelYear ?? '',
                    price: p.price,
                    stock: p.stockQuantity,
                    sales: p.salesCount,
                    box: [p.boxCode, p.boxName].filter(Boolean).join(' · '),
                    desi: p.boxDesi ?? p.productDesi ?? 0,
                  }));
                }}
              />
            </div>
          </div>
        </div>

        {/* Satır 2: Filtre Seçimleri ve Arama */}
        <div data-tour="products-filters" className="flex flex-wrap items-center gap-2">
          {/* Arama Input */}
          <div data-tour="products-search" className="relative flex-1 sm:flex-initial sm:w-64">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-muted pointer-events-none" />
            <input
              type="text"
              placeholder={lang === 'tr' ? "Ürün adı, barkod veya SKU..." : "Search name, barcode or SKU..."}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="h-8 w-full rounded-[4px] border border-border bg-card pl-8 pr-7 text-xs text-fg placeholder:text-fg-muted focus:border-accent focus:outline-none"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-fg-muted hover:text-fg cursor-pointer"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <FilterSelect
            value={categoryId ? String(categoryId) : ''}
            placeholder={lang === 'tr' ? 'Tüm Kategoriler' : 'All Categories'}
            options={categoriesData?.map(c => ({ value: String(c.id), label: c.name })) ?? []}
            onChange={(val) => setUrlState({ cat: val, page: 1 })}
            minWidth={140}
            height="h-8"
          />

          <FilterSelect
            value={brand ?? ''}
            placeholder={lang === 'tr' ? 'Tüm Markalar' : 'All Brands'}
            options={brandsData?.map(b => ({ value: b, label: b })) ?? []}
            onChange={(val) => setUrlState({ brand: val, model: '', page: 1 })}
            minWidth={130}
            height="h-8"
          />

          {brand && (
            <FilterSelect
              value={model ?? ''}
              placeholder={lang === 'tr' ? 'Tüm Modeller' : 'All Models'}
              options={modelsData?.map(m => ({ value: m, label: m })) ?? []}
              onChange={(val) => setUrlState({ model: val, page: 1 })}
              minWidth={130}
              height="h-8"
            />
          )}

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex h-8 items-center gap-1 rounded-[4px] border border-border bg-card px-2.5 text-xs text-fg-muted hover:text-fg hover:bg-bg-subtle cursor-pointer transition-colors"
            >
              <X size={12} />
              <span>{lang === 'tr' ? 'Filtreleri Temizle' : 'Reset'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Active Filter Chips */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-1.5 px-3 py-2 sm:px-5">
          <span className="text-ui-xs font-bold text-fg-muted">
            {lang === 'tr' ? 'Aktif Filtreler:' : 'Active Filters:'}
          </span>
          {categoryId && (
            <span className="inline-flex items-center gap-1 rounded-[4px] bg-accent-soft px-2 py-0.5 text-ui-xs font-semibold text-accent">
              {lang === 'tr' ? `Kategori #${categoryId}` : `Category #${categoryId}`}
              <button type="button" onClick={() => setUrlState({ cat: '', page: 1 })} className="cursor-pointer hover:opacity-75"><X size={11} /></button>
            </span>
          )}
          {brand && (
            <span className="inline-flex items-center gap-1 rounded-[4px] bg-accent-soft px-2 py-0.5 text-ui-xs font-semibold text-accent">
              {lang === 'tr' ? `Marka: ${brand}` : `Brand: ${brand}`}
              <button type="button" onClick={() => setUrlState({ brand: '', model: '', page: 1 })} className="cursor-pointer hover:opacity-75"><X size={11} /></button>
            </span>
          )}
          {model && (
            <span className="inline-flex items-center gap-1 rounded-[4px] bg-accent-soft px-2 py-0.5 text-ui-xs font-semibold text-accent">
              {lang === 'tr' ? `Model: ${model}` : `Model: ${model}`}
              <button type="button" onClick={() => setUrlState({ model: '', page: 1 })} className="cursor-pointer hover:opacity-75"><X size={11} /></button>
            </span>
          )}
          {debouncedSearch && (
            <span className="inline-flex items-center gap-1 rounded-[4px] bg-accent-soft px-2 py-0.5 text-ui-xs font-semibold text-accent">
              {lang === 'tr' ? `Arama: "${debouncedSearch}"` : `Search: "${debouncedSearch}"`}
              <button type="button" onClick={() => { setSearchInput(''); setUrlState({ q: '', page: 1 }); }} className="cursor-pointer hover:opacity-75"><X size={11} /></button>
            </span>
          )}
          <button
            type="button"
            onClick={clearFilters}
            className="text-ui-xs font-semibold text-fg-muted underline hover:text-fg ml-1 cursor-pointer"
          >
            {lang === 'tr' ? 'Tümünü Sıfırla' : 'Reset All'}
          </button>
        </div>
      )}

      {/* ── Ürünler Listesi ─────────────────────────────────────────────── */}
      <div data-tour="products-table">
        <ProductResults
          products={products}
          isMobile={isMobile}
          isLoading={isLoading}
          isError={isError}
          refetch={() => { void refetch(); }}
          lang={lang}
          clearFilters={clearFilters}
          viewMode={viewMode}
          openProduct={setScannedSku}
          visibleCols={visibleCols}
          renderSortableHeader={renderSortableHeader}
          formatPrice={fmtPrice}
          selectedSkus={selectedSkus}
          onToggleSelect={toggleSkuSelection}
        />
      </div>

      {/* ── Toplu görsel indirme — seçim varken sabit alt bar ────────────── */}
      {selectedSkus.size > 0 && (
        <div className="sticky bottom-0 z-30 flex items-center justify-between gap-3 border-t border-border-soft bg-card/95 backdrop-blur-md px-3 py-2.5 shadow-lg sm:px-5 sm:py-3 transition-all">
          <div className="flex items-center gap-2 sm:gap-3 text-xs text-fg">
            <span className="flex h-6 min-w-[24px] items-center justify-center rounded-full bg-slate-900 dark:bg-slate-100 px-2 text-[11px] font-bold text-white dark:text-slate-900">
              {selectedSkus.size}
            </span>
            <span className="font-medium text-fg-muted">
              {lang === 'tr' ? 'ürün seçildi' : 'products selected'}
            </span>
            {selectedSkus.size > MAX_BULK_IMAGE_ZIP_SKUS && (
              <span className="text-[11px] font-medium text-rose-500">
                {lang === 'tr'
                  ? `(en fazla ${MAX_BULK_IMAGE_ZIP_SKUS} ürün)`
                  : `(max ${MAX_BULK_IMAGE_ZIP_SKUS} products)`}
              </span>
            )}
            <button
              type="button"
              onClick={() => setSelectedSkus(new Set())}
              className="ml-1 cursor-pointer text-[11px] font-medium text-fg-muted underline transition-colors hover:text-fg"
            >
              {lang === 'tr' ? 'Seçimi Temizle' : 'Clear Selection'}
            </button>
          </div>

          <button
            type="button"
            onClick={() => { void handleBulkDownloadZip(); }}
            disabled={bulkZipDownloading || selectedSkus.size > MAX_BULK_IMAGE_ZIP_SKUS}
            className="inline-flex h-8 items-center gap-1.5 rounded-[4px] bg-slate-900 px-3.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 cursor-pointer"
          >
            {bulkZipDownloading ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                <span>{lang === 'tr' ? 'İndiriliyor...' : 'Downloading...'}</span>
              </>
            ) : (
              <>
                <Download size={13} />
                <span>{lang === 'tr' ? 'Görselleri İndir (.zip)' : 'Download Images (.zip)'}</span>
              </>
            )}
          </button>
        </div>
      )}

      {!isLoading && !isError && products.length > 0 && (
        <div className="flex items-center justify-between border-t border-border-soft bg-card/50 px-3 py-2 sm:px-5 sm:py-3 shrink-0">
          <span className="text-xs text-fg-muted">
            {isMobile ? (
              `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, totalCount)} / ${totalCount}`
            ) : lang === 'tr' ? (
              <>Toplam <strong className="text-fg">{totalCount.toLocaleString('tr-TR')}</strong> üründen <strong className="text-fg">{(page - 1) * PAGE_SIZE + 1} - {Math.min(page * PAGE_SIZE, totalCount)}</strong> arası gösteriliyor</>
            ) : (
              <>Showing <strong className="text-fg">{(page - 1) * PAGE_SIZE + 1} - {Math.min(page * PAGE_SIZE, totalCount)}</strong> of <strong className="text-fg">{totalCount.toLocaleString('tr-TR')}</strong> products</>
            )}
          </span>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => setUrlState({ page: Math.max(page - 1, 1) })}
              disabled={page === 1}
              className="flex h-8 w-8 items-center justify-center rounded-[4px] border border-border bg-card text-fg transition hover:bg-bg-subtle disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="min-w-[44px] sm:min-w-[60px] text-center text-xs font-semibold text-fg">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setUrlState({ page: Math.min(page + 1, totalPages) })}
              disabled={page === totalPages}
              className="flex h-8 w-8 items-center justify-center rounded-[4px] border border-border bg-card text-fg transition hover:bg-bg-subtle disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

    </div>

    {/* Barkod tarama modali + SKU detay sheet (desktop) */}
    {scanOpen && (
      <BarcodeScannerModal
        open
        onClose={() => setScanOpen(false)}
        onScan={(sku) => { setScanOpen(false); setScannedSku(sku); }}
      />
    )}
    {scannedSku && (
      <ProductSkuDetailSheet
        sku={scannedSku}
        onClose={() => setScannedSku(null)}
      />
    )}
  </>
);
}
