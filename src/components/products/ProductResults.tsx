'use client';

import type React from 'react';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Package, Maximize2 } from 'lucide-react';
import { EmptyState } from '../ui/EmptyState';
import { ErrorState } from '../ui/ErrorState';
import { Skeleton } from '../ui/Skeleton';
import { RenderBudgetBoundary } from '../performance/RenderBudgetBoundary';
import { ArrivalInfo, StoreBadges, brandModelLabel } from './ProductListPresenters';
import type { ProductGridItem } from '../../types/api';

const ImageLightbox = dynamic(() => import('../ui/ImageLightbox').then((module) => module.ImageLightbox), { ssr: false });
const ProductErpSummary = dynamic(() => import('./ProductErpSummary').then((module) => module.ProductErpSummary));

// <img onError> ile kırık/erişilemez görsel linkini (404 vb.) yakalar ve "imageUrl hiç
// yok" durumuyla AYNI placeholder'a düşer — eskiden sadece imageUrl boşsa placeholder
// gösteriliyordu, dolu ama ölü bir link tarayıcının varsayılan kırık-resim ikonunu
// gösteriyordu. Her çağıran kendi placeholder JSX'ini verir (grid/liste görünümü farklı
// boyut/stil kullanıyor), sadece hata YAKALAMA mantığı paylaşılır.
function ProductImage({ src, alt, className, style, fallback, onClick, title }: {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  fallback: React.ReactNode;
  onClick?: (event: React.MouseEvent<HTMLImageElement>) => void;
  title?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return <>{fallback}</>;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img className={className} src={src} alt={alt} style={style} title={title} onClick={onClick} onError={() => setFailed(true)} />
  );
}

// Kart/satır görselinin galeri kaynağı: backend imageUrls'i doldurmadıysa (eski senkron)
// tek elemanlı imageUrl'e düşer, o da yoksa galeri hiç açılmaz.
function galleryImages(p: ProductGridItem): string[] {
  if (p.imageUrls?.length) return p.imageUrls;
  return p.imageUrl ? [p.imageUrl] : [];
}

// "K-03 · Orta Kutu · 4,2 desi" — kutu atanmamışsa ürünün kendi desisi yine gösterilir.
function boxLabel(p: ProductGridItem, lang: string): string {
  const desi = p.boxDesi ?? (p.productDesi > 0 ? p.productDesi : null);
  const desiText = desi != null
    ? `${desi.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} ${lang === 'tr' ? 'desi' : 'desi'}`
    : null;
  return [p.boxCode, p.boxName, desiText].filter(Boolean).join(' · ') || '—';
}

function StockBadge({ quantity }: { quantity: number }) {
  if (quantity <= 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-[3px] bg-rose-50/70 dark:bg-rose-950/20 px-1.5 py-0.5 text-[10px] font-mono tabular-nums text-rose-500/80 dark:text-rose-400/80 border border-rose-200/60 dark:border-rose-900/30">
        <span className="h-1.5 w-1.5 rounded-full bg-rose-400/70" />
        Tükendi
      </span>
    );
  }
  if (quantity <= 5) {
    return (
      <span className="inline-flex items-center gap-1 rounded-[3px] bg-amber-50/70 dark:bg-amber-950/20 px-1.5 py-0.5 text-[10px] font-mono tabular-nums text-amber-600/80 dark:text-amber-400/80 border border-amber-200/60 dark:border-amber-900/30">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400/80" />
        {quantity} Kritik
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-[3px] bg-emerald-50/70 dark:bg-emerald-950/20 px-1.5 py-0.5 text-[10px] font-mono tabular-nums text-emerald-600/80 dark:text-emerald-400/80 border border-emerald-200/60 dark:border-emerald-900/30">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/80" />
      {quantity.toLocaleString('tr-TR')} Stok
    </span>
  );
}


interface ProductResultsProps {
  products: ProductGridItem[];
  isMobile: boolean;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
  lang: string;
  clearFilters: () => void;
  viewMode: 'grid' | 'list';
  openProduct: (sku: string | null) => void;
  visibleCols: string[];
  renderSortableHeader: (label: string, field: string) => React.ReactNode;
  formatPrice: (price: number, sourceType?: string | null) => string;
  // Toplu görsel .zip indirme seçimi — bu tabloda önceden hiçbir toplu-seçim mekanizması
  // yoktu, bu özellik için sıfırdan eklendi (bkz. products/page.tsx sticky alt bar).
  selectedSkus: Set<string>;
  onToggleSelect: (sku: string) => void;
}

export function ProductResults({
  products, isMobile, isLoading, isError, refetch, lang, clearFilters, viewMode,
  openProduct: setScannedSku, visibleCols, renderSortableHeader, formatPrice: fmtPrice,
  selectedSkus, onToggleSelect,
}: ProductResultsProps) {
  const [gallery, setGallery] = useState<{ images: string[]; title: string } | null>(null);

  function openGallery(event: React.MouseEvent, p: ProductGridItem) {
    const images = galleryImages(p);
    if (images.length === 0) return;
    // Görsele tıklamak satır/kart detayını AÇMAMALI — galeri ayrı bir eylem.
    event.stopPropagation();
    setGallery({ images, title: p.productName });
  }

  return (
    <RenderBudgetBoundary name="products-table">
      <div className={isMobile ? 'p-3' : 'p-5'}>
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-border-soft bg-card overflow-hidden shadow-xs flex flex-col">
                <Skeleton className="aspect-square w-full" />
                <div className="p-3 flex flex-col gap-2">
                  <div className="flex justify-between">
                    <Skeleton height={14} width="35%" />
                    <Skeleton height={14} width="30%" />
                  </div>
                  <Skeleton height={16} width="85%" />
                  <div className="flex justify-between pt-2 border-t border-border-soft mt-auto">
                    <Skeleton height={18} width="40%" />
                    <Skeleton height={14} width="25%" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <ErrorState
            title={lang === 'tr' ? 'Ürünler yüklenirken bir hata oluştu.' : 'An error occurred while loading products.'}
            onRetry={refetch}
            retryLabel={lang === 'tr' ? 'Tekrar Dene' : 'Try Again'}
          />
        ) : products.length === 0 ? (
          <EmptyState
            icon={Package}
            title={lang === 'tr' ? 'Arama kriterlerine uygun ürün bulunamadı.' : 'No products found matching search criteria.'}
            description={lang === 'tr' ? 'Farklı anahtar kelimeler ile aramayı deneyebilirsiniz.' : 'You can try searching with different keywords.'}
            action={{ label: lang === 'tr' ? 'Filtreleri Temizle' : 'Clear Filters', onClick: clearFilters }}
          />
        ) : viewMode === 'grid' ? (
          /* ── Yeni Izgara (Grid) Kart Görünümü ─────────────────────────────────── */
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
            {products.map((p, idx) => {
              const isSelected = selectedSkus.has(p.supplierSKU ?? '');
              return (
                <div
                  key={`${p.productId}-${idx}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => setScannedSku(p.supplierSKU ?? null)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') setScannedSku(p.supplierSKU ?? null);
                  }}
                  className={`group relative flex flex-col rounded-lg border bg-card shadow-xs transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer overflow-hidden ${
                    isSelected
                      ? 'border-primary ring-2 ring-primary/20'
                      : 'border-border-soft hover:border-border'
                  }`}
                  aria-label={`${p.productName} detayını aç`}
                >
                  {/* Görsel Alanı (Kare, Temiz Arka Plan) */}
                  <div className="relative aspect-square w-full overflow-hidden bg-bg-subtle/40 dark:bg-muted/10 flex items-center justify-center p-3 border-b border-border-soft/60">
                    {/* Checkbox (Sol Üst) */}
                    <div
                      className="absolute left-2 top-2 z-10 rounded-md bg-card/90 backdrop-blur-xs p-1 shadow-2xs border border-border-soft/70"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => p.supplierSKU && onToggleSelect(p.supplierSKU)}
                        aria-label={lang === 'tr' ? 'Görsel indirme için seç' : 'Select for image download'}
                        className="h-3.5 w-3.5 cursor-pointer rounded-[3px] accent-primary"
                      />
                    </div>

                    {/* Sağ Üst: Stok Rozeti */}
                    <div className="absolute right-2 top-2 z-10">
                      <StockBadge quantity={p.stockQuantity} />
                    </div>

                    {/* Platform Rozeti (Sol Alt) */}
                    {p.platformName && (
                      <div className="absolute left-2 bottom-2 z-10">
                        <span className="rounded-[4px] bg-card/90 backdrop-blur-xs border border-border-soft px-1.5 py-0.5 text-[9.5px] font-semibold text-fg-muted shadow-2xs">
                          {p.platformName}
                        </span>
                      </div>
                    )}

                    {/* Galeri İkonu (Sağ Alt - Hover'da görünür) */}
                    {galleryImages(p).length > 0 && (
                      <button
                        type="button"
                        onClick={(event) => openGallery(event, p)}
                        title={lang === 'tr' ? 'Görselleri büyüt' : 'View gallery'}
                        className="absolute right-2 bottom-2 z-10 flex h-6 w-6 items-center justify-center rounded-md bg-card/90 backdrop-blur-xs border border-border-soft text-fg-muted hover:text-fg shadow-2xs opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        <Maximize2 size={12} />
                      </button>
                    )}

                    {/* Ürün Görseli */}
                    {p.imageUrl ? (
                      <ProductImage
                        src={p.imageUrl}
                        alt={p.productName}
                        onClick={(event) => openGallery(event, p)}
                        title={lang === 'tr' ? 'Görseli büyüt' : 'Zoom image'}
                        className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
                        fallback={
                          <div className="flex h-full w-full items-center justify-center text-fg-subtle">
                            <Package size={32} />
                          </div>
                        }
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-fg-subtle">
                        <Package size={32} />
                      </div>
                    )}
                  </div>

                  {/* Kart Gövdesi */}
                  <div className="flex flex-1 flex-col p-3 gap-1.5">
                    {/* SKU ve Kategori */}
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="font-mono font-bold text-[10.5px] text-fg-muted bg-bg-subtle px-1.5 py-0.5 rounded-[3px] border border-border-soft shrink-0">
                        {p.supplierSKU}
                      </span>
                      <span className="text-[10.5px] font-medium text-fg-subtle truncate" title={p.mappedCategoryName ?? ''}>
                        {p.mappedCategoryName || (lang === 'tr' ? 'Kategorisiz' : 'Uncategorized')}
                      </span>
                    </div>

                    {/* Ürün İsmi */}
                    <h3 className="text-xs sm:text-[13px] font-semibold text-fg leading-snug line-clamp-2 min-h-[34px] group-hover:text-primary transition-colors m-0">
                      {p.productName}
                    </h3>

                    {/* Marka / Araç Modeli */}
                    {p.brand && (
                      <div className="text-[11px] text-fg-muted font-medium truncate">
                        {brandModelLabel(p, lang)}
                      </div>
                    )}

                    {/* Satış ve Kutu */}
                    <div className="flex items-center justify-between text-[10.5px] text-fg-muted pt-0.5">
                      <span>{lang === 'tr' ? 'Satış' : 'Sales'}: <strong className="text-fg font-semibold">{p.salesCount}</strong></span>
                      {p.boxCode && (
                        <span className="font-mono text-[10px] text-fg-muted bg-bg-subtle px-1 rounded border border-border-soft" title={boxLabel(p, lang)}>
                          {p.boxCode}
                        </span>
                      )}
                    </div>

                    {/* Fiyat ve İncele */}
                    <div className="mt-auto pt-2 border-t border-border-soft flex items-baseline justify-between">
                      <div className="font-mono text-xs sm:text-sm font-extrabold tabular-nums text-fg">
                        {fmtPrice(p.price, p.sourceType)}
                      </div>
                      <span className="text-[10.5px] font-semibold text-fg-muted group-hover:text-primary transition-colors inline-flex items-center gap-0.5">
                        {lang === 'tr' ? 'İncele' : 'View'}
                        <span className="transition-transform group-hover:translate-x-0.5">→</span>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : isMobile ? (
          /* ── Mobilde Liste: Kapsamlı Duyarlı Kart Akışı ─────────────────────────────────── */
          <div className="flex flex-col gap-2.5">
            {products.map((p, idx) => {
              const isSelected = selectedSkus.has(p.supplierSKU ?? '');
              return (
                <div
                  key={`${p.productId}-${idx}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => setScannedSku(p.supplierSKU ?? null)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') setScannedSku(p.supplierSKU ?? null);
                  }}
                  className={`group flex flex-col gap-2.5 rounded-xl border bg-card p-3 shadow-xs transition-all cursor-pointer ${
                    isSelected ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'border-border-soft hover:border-border'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Görsel ve Checkbox */}
                    <div className="relative h-20 w-20 shrink-0 rounded-lg overflow-hidden bg-bg-subtle/40 border border-border-soft flex items-center justify-center p-1.5">
                      <div
                        className="absolute left-1 top-1 z-10 rounded-md bg-card/90 backdrop-blur-xs p-1 shadow-2xs border border-border-soft/60"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => p.supplierSKU && onToggleSelect(p.supplierSKU)}
                          aria-label={lang === 'tr' ? 'Seç' : 'Select'}
                          className="h-3.5 w-3.5 cursor-pointer rounded-[3px] accent-primary"
                        />
                      </div>
                      {p.imageUrl ? (
                        <ProductImage
                          src={p.imageUrl}
                          alt={p.productName}
                          onClick={(e) => openGallery(e, p)}
                          className="h-full w-full object-contain cursor-zoom-in"
                          fallback={<Package size={24} className="text-fg-subtle" />}
                        />
                      ) : (
                        <Package size={24} className="text-fg-subtle" />
                      )}
                    </div>

                    {/* Detaylar */}
                    <div className="flex flex-1 flex-col min-w-0 gap-1">
                      <div className="flex items-center justify-between gap-1.5 flex-wrap">
                        <span className="font-mono text-[10.5px] font-bold text-fg-muted bg-bg-subtle px-1.5 py-0.5 rounded-[3px] border border-border-soft">
                          {p.supplierSKU}
                        </span>
                        <StockBadge quantity={p.stockQuantity} />
                      </div>

                      <h4 className="text-xs sm:text-[13px] font-semibold text-fg line-clamp-2 leading-snug m-0 group-hover:text-primary transition-colors">
                        {p.productName}
                      </h4>

                      {p.brand && (
                        <span className="text-[11px] text-fg-muted font-medium truncate">
                          {brandModelLabel(p, lang)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Alt Bilgi Barı */}
                  <div className="flex items-center justify-between pt-2 border-t border-border-soft/60">
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-mono text-sm font-extrabold tabular-nums text-fg">
                        {fmtPrice(p.price, p.sourceType)}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-fg-muted">
                      <span>{lang === 'tr' ? 'Satış' : 'Sales'}: <strong className="text-fg font-semibold">{p.salesCount}</strong></span>
                      {p.boxCode && (
                        <span className="font-mono text-[10px] text-fg-muted bg-bg-subtle px-1.5 py-0.5 rounded border border-border-soft" title={boxLabel(p, lang)}>
                          {p.boxCode}
                        </span>
                      )}
                      <span className="text-[11px] font-semibold text-primary inline-flex items-center gap-0.5">
                        {lang === 'tr' ? 'İncele' : 'View'} →
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ── Masaüstünde Liste: Kapsamlı Yönetici Tablosu ─────────────────────────────────── */
          <div className="overflow-hidden rounded-xl border border-border-soft bg-card shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead className="sticky top-0 z-10 border-b border-border-soft bg-bg-subtle/85 backdrop-blur-md">
                  <tr className="text-[11px] font-bold uppercase tracking-wider text-fg-muted">
                    <th className="w-9 px-3 py-3" aria-label={lang === 'tr' ? 'Seç' : 'Select'} />
                    <th className="w-14 px-2 py-3 text-center" aria-label={lang === 'tr' ? 'Görsel' : 'Image'}>
                      {lang === 'tr' ? 'Görsel' : 'Img'}
                    </th>
                    {visibleCols.includes('name') && renderSortableHeader(lang === 'tr' ? 'Ürün Adı & SKU' : 'Product & SKU', 'name')}
                    {visibleCols.includes('brand') && <th className="px-3 py-3">{lang === 'tr' ? 'Araç / Marka' : 'Vehicle / Brand'}</th>}
                    {visibleCols.includes('store') && <th className="px-3 py-3">{lang === 'tr' ? 'Mağaza' : 'Store'}</th>}
                    <th className="min-w-[220px] px-3 py-3">ERP Dağılımı</th>
                    {visibleCols.includes('platform') && <th className="px-3 py-3">Platform</th>}
                    {visibleCols.includes('stock') && renderSortableHeader(lang === 'tr' ? 'Stok' : 'Stock', 'stock')}
                    {visibleCols.includes('price') && renderSortableHeader(lang === 'tr' ? 'Fiyat' : 'Price', 'price')}
                    {visibleCols.includes('sales') && renderSortableHeader(lang === 'tr' ? 'Satış' : 'Sales', 'sales')}
                    {visibleCols.includes('box') && <th className="px-3 py-3">{lang === 'tr' ? 'Kutu & Desi' : 'Box & Desi'}</th>}
                    <th className="w-20 px-3 py-3 text-right">{lang === 'tr' ? 'İşlem' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-soft/60">
                  {products.map((p, idx) => {
                    const isSelected = selectedSkus.has(p.supplierSKU ?? '');
                    return (
                      <tr
                        key={`${p.productId}-${idx}`}
                        tabIndex={0}
                        onClick={() => setScannedSku(p.supplierSKU ?? null)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') setScannedSku(p.supplierSKU ?? null);
                        }}
                        className={`group cursor-pointer transition-colors ${
                          isSelected ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-card-hover/60'
                        }`}
                      >
                        {/* Seçim Checkbox */}
                        <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => p.supplierSKU && onToggleSelect(p.supplierSKU)}
                            aria-label={lang === 'tr' ? 'Seç' : 'Select'}
                            className="h-4 w-4 cursor-pointer rounded-[3px] border-border-soft accent-primary"
                          />
                        </td>

                        {/* Küçük Görsel */}
                        <td className="px-2 py-2.5">
                          <div className="relative h-10 w-10 mx-auto rounded-md overflow-hidden bg-bg-subtle/50 border border-border-soft flex items-center justify-center p-0.5 group/thumb">
                            {p.imageUrl ? (
                              <ProductImage
                                src={p.imageUrl}
                                alt={p.productName}
                                onClick={(event) => openGallery(event, p)}
                                title={lang === 'tr' ? 'Büyüt' : 'Zoom'}
                                className="h-full w-full object-contain cursor-zoom-in"
                                fallback={
                                  <div className="flex h-full w-full items-center justify-center text-fg-subtle">
                                    <Package size={16} />
                                  </div>
                                }
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-fg-subtle">
                                <Package size={16} />
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Ürün Adı & SKU */}
                        {visibleCols.includes('name') && (
                          <td className="max-w-[340px] px-3 py-2.5">
                            <div className="flex flex-col gap-0.5">
                              <span className="font-semibold text-fg truncate text-xs sm:text-[13px] leading-tight group-hover:text-primary transition-colors">
                                {p.productName}
                              </span>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="rounded-[3px] border border-border-soft bg-bg-subtle px-1.5 py-0.2 font-mono text-[10px] text-fg-muted font-bold">
                                  {p.supplierSKU}
                                </span>
                                {p.mappedCategoryName && (
                                  <span className="text-[10.5px] text-fg-subtle truncate">
                                    {p.mappedCategoryName}
                                  </span>
                                )}
                                <ArrivalInfo createdAt={p.createdAt} />
                              </div>
                            </div>
                          </td>
                        )}

                        {/* Araç Modeli */}
                        {visibleCols.includes('brand') && (
                          <td className="px-3 py-2.5 text-xs text-fg-muted whitespace-nowrap font-medium">
                            {brandModelLabel(p, lang)}
                          </td>
                        )}

                        {/* Mağaza */}
                        {visibleCols.includes('store') && (
                          <td className="px-3 py-2.5">
                            <StoreBadges tags={p.sourceTags} />
                          </td>
                        )}

                        {/* ERP Özeti */}
                        <td className="min-w-[220px] px-3 py-2.5">
                          <ProductErpSummary variants={p.erpVariants ?? []} />
                        </td>

                        {/* Platform */}
                        {visibleCols.includes('platform') && (
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <span className="rounded-[4px] border border-border-soft bg-bg-subtle px-2 py-0.5 text-[10.5px] font-medium text-fg-muted">
                              {p.platformName || '—'}
                            </span>
                          </td>
                        )}

                        {/* Stok */}
                        {visibleCols.includes('stock') && (
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <StockBadge quantity={p.stockQuantity} />
                          </td>
                        )}

                        {/* Fiyat */}
                        {visibleCols.includes('price') && (
                          <td className="px-3 py-2.5 font-mono font-bold text-fg whitespace-nowrap text-xs sm:text-[13px]">
                            {fmtPrice(p.price, p.sourceType)}
                          </td>
                        )}

                        {/* Satış */}
                        {visibleCols.includes('sales') && (
                          <td className="px-3 py-2.5 whitespace-nowrap font-mono tabular-nums text-fg">
                            <span className="font-bold">{p.salesCount.toLocaleString('tr-TR')}</span>
                            <span className="text-[10px] text-fg-muted ml-0.5">{lang === 'tr' ? 'adet' : 'qty'}</span>
                          </td>
                        )}

                        {/* Kutu & Desi */}
                        {visibleCols.includes('box') && (
                          <td className="px-3 py-2.5 whitespace-nowrap font-mono tabular-nums text-[11px] text-fg-muted">
                            {boxLabel(p, lang)}
                          </td>
                        )}

                        {/* Aksiyon */}
                        <td className="px-3 py-2.5 text-right whitespace-nowrap">
                          <span className="inline-flex h-7 items-center gap-1 rounded-[4px] border border-border-soft bg-card px-2 text-[11px] font-semibold text-fg-muted group-hover:text-fg group-hover:border-border transition-colors">
                            {lang === 'tr' ? 'İncele' : 'View'} →
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

{gallery && (
  <ImageLightbox images={gallery.images} title={gallery.title} onClose={() => setGallery(null)} />
)}
</RenderBudgetBoundary>

  );
}

