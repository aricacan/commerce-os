'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { catalogReadinessApi, type CatalogReadinessProduct } from '../../lib/api';
import { ErpSourceFilter, useErpSourceFilter } from './ErpSourceFilter';
import { PriceComparisonPageShell } from './PriceComparisonPageShell';
import { FilterSelect, type FilterSelectOption } from '../../components/ui/FilterSelect';

const ISSUE_OPTIONS: FilterSelectOption[] = [
  { value: 'all', label: 'Tüm Durumlar' },
  { value: 'missing-brand', label: 'Markasız' },
  { value: 'missing-model', label: 'Modelsiz' },
  { value: 'missing-model-year', label: 'Yılsız' },
  { value: 'missing-category', label: 'Kategorisiz' },
  { value: 'missing-fitment', label: 'Uyumluluk yok' },
  { value: 'missing-image', label: 'Görselsiz' },
  { value: 'missing-cost', label: 'Maliyetsiz' },
  { value: 'missing-thickness', label: 'Kalınlık belirtilmemiş' },
  { value: 'conflicting-data', label: 'Çelişkili' },
];

const ISSUE_LABELS: Record<string, string> = {
  'missing-brand': 'Marka eksik',
  'missing-model': 'Model eksik',
  'missing-model-year': 'Yıl eksik',
  'missing-category': 'Kategori eksik',
  'missing-fitment': 'Araç uyumluluğu eksik',
  'missing-image': 'Görsel eksik',
  'missing-cost': 'Maliyet eksik',
  'missing-thickness': 'Kalınlık belirtilmemiş',
  'conflicting-data': 'Kaynaklar çelişiyor',
};

export function CatalogReadinessTab() {
  const { sources, isLoading: sourcesLoading } = useErpSourceFilter();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [issue, setIssue] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const activeSourceId = selectedId ?? sources[0]?.id ?? null;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const report = useQuery({
    queryKey: ['catalog-readiness', activeSourceId, issue, search, page],
    queryFn: () =>
      catalogReadinessApi.report({
        dataSourceId: activeSourceId ?? undefined,
        issue,
        search,
        page,
        pageSize: 40,
      }),
    enabled: activeSourceId != null,
    staleTime: 30_000,
  });

  const totalPages = Math.max(1, Math.ceil((report.data?.total ?? 0) / 40));
  const topCategories = useMemo(() => report.data?.categories.slice(0, 8) ?? [], [report.data]);

  if (sourcesLoading) return <StateText>Kaynaklar yükleniyor…</StateText>;
  if (sources.length === 0) return <StateText>Aktif ERP kaynağı bulunamadı.</StateText>;

  return (
    <PriceComparisonPageShell
      toolbar={
        <>
          <div className="flex flex-wrap items-center gap-2">
            <ErpSourceFilter
              sources={sources}
              selectedId={activeSourceId}
              onChange={(id) => {
                setSelectedId(id);
                setPage(1);
              }}
              minWidth={170}
            />

            <FilterSelect
              value={issue}
              options={ISSUE_OPTIONS}
              placeholder="Durum Filtresi"
              onChange={(val) => {
                setIssue(val || 'all');
                setPage(1);
              }}
              minWidth={170}
            />
          </div>

          <div className="flex h-8 w-60 items-center gap-2 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-2.5 text-xs text-[var(--fg)] focus-within:border-[var(--fg)]">
            <Search size={13} className="text-[var(--fg-muted)] shrink-0" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Ürün, SKU veya model ara"
              className="w-full bg-transparent text-xs text-[var(--fg)] placeholder-[var(--fg-muted)] outline-none"
            />
          </div>
        </>
      }
    >
      {report.isLoading && <StateText>Ürün verileri kontrol ediliyor…</StateText>}
      {report.isError && <StateText danger>Veri hazırlık raporu alınamadı.</StateText>}

      {report.data && (
        <>
          {/* Özet Sayaç Şeridi */}
          <div className="flex flex-wrap gap-1.5">
            <StatPill label="Genel hazırlık" value={`%${report.data.summary.readinessPercent}`} highlight />
            <StatPill label="Farklı ürün" value={report.data.summary.totalProducts} />
            <StatPill label="Hazır" value={report.data.summary.readyForMatching} />
            <StatPill label="Kontrol" value={report.data.summary.needsReview} />
            <StatPill label="Uyumluluk eksik" value={report.data.summary.missingFitment} />
            <StatPill label="Maliyet eksik" value={report.data.summary.missingCost} />
            <StatPill label="Çelişkili" value={report.data.summary.conflictingData} />
          </div>

          {/* Yoğun Kategoriler */}
          {topCategories.length > 0 && (
            <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)]/30 p-3">
              <div className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--fg-muted)]">
                En Yoğun Ürün Grupları
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {topCategories.map((category) => {
                  const pct =
                    category.productCount === 0
                      ? 0
                      : Math.round((category.readyCount * 100) / category.productCount);
                  return (
                    <div
                      key={`${category.categoryId}-${category.categoryName}`}
                      className="rounded-[3px] border border-[var(--border-soft)] bg-[var(--card)] p-2.5"
                    >
                      <div className="flex justify-between gap-2 text-xs">
                        <strong className="truncate text-[var(--fg)]">{category.categoryName}</strong>
                        <span className="font-bold text-[var(--fg)]">%{pct}</span>
                      </div>
                      <div className="mt-1.5 h-1 overflow-hidden rounded-[2px] bg-[var(--border-soft)]">
                        <div style={{ width: `${pct}%` }} className="h-full bg-[var(--fg-muted)]" />
                      </div>
                      <div className="mt-1 text-[10.5px] text-[var(--fg-muted)]">
                        {category.readyCount}/{category.productCount} ürün hazır
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Ürün Listesi */}
          <div className="flex flex-col divide-y divide-[var(--border-soft)] border border-[var(--border-soft)] rounded-[4px] overflow-hidden">
            {report.data.items.map((product) => (
              <ProductReadinessCard key={product.productId} product={product} />
            ))}
            {report.data.items.length === 0 && <StateText>Bu filtreye uygun ürün bulunamadı.</StateText>}
          </div>

          {/* Sayfalama */}
          <div className="flex items-center justify-between gap-2.5 pt-2 text-xs text-[var(--fg-muted)]">
            <span>
              {report.data.total} sonuç · Sayfa {page} / {totalPages}
            </span>
            <div className="flex gap-1">
              <PageButton disabled={page <= 1} onClick={() => setPage((v) => v - 1)}>
                Önceki
              </PageButton>
              <PageButton disabled={page >= totalPages} onClick={() => setPage((v) => v + 1)}>
                Sonraki
              </PageButton>
            </div>
          </div>
        </>
      )}
    </PriceComparisonPageShell>
  );
}

function ProductReadinessCard({ product }: { product: CatalogReadinessProduct }) {
  const isReady = product.readyForMatching;
  return (
    <div className="grid grid-cols-1 items-center gap-3 bg-[var(--card)] p-3 hover:bg-[var(--bg-subtle)]/40 transition sm:grid-cols-[minmax(220px,1.6fr)_minmax(180px,1fr)_auto]">
      <div className="min-w-0">
        <div className="truncate text-xs font-bold text-[var(--fg)]">{product.name}</div>
        <div className="mt-0.5 text-[11px] text-[var(--fg-muted)]">
          <span className="font-medium text-[var(--fg-muted)]">{product.sku}</span> · {[product.brand, product.model, product.modelYear].filter(Boolean).join(' · ') || 'Araç bilgisi yok'}
        </div>
      </div>
      <div className="flex flex-wrap gap-1">
        {product.issues.length === 0 ? (
          <Tag>Temel bilgiler tamam</Tag>
        ) : (
          product.issues.slice(0, 4).map((item) => <Tag key={item}>{ISSUE_LABELS[item] ?? item}</Tag>)
        )}
        {product.issues.length > 4 && <Tag>+{product.issues.length - 4}</Tag>}
      </div>
      <div className="min-w-[80px] text-left sm:text-right">
        <div className={`text-xs font-bold ${isReady ? 'text-emerald-600/80 dark:text-emerald-400/80' : 'text-amber-600/80 dark:text-amber-400/80'}`}>
          %{product.readinessScore}
        </div>
        <div className="mt-0.5 text-[11px] font-normal text-[var(--fg-muted)]">
          {isReady ? 'Hazır' : 'Kontrol gerekli'}
        </div>
      </div>
    </div>
  );
}

function StatPill({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className={`inline-flex items-center gap-1.5 rounded-[4px] border px-2.5 py-1 text-xs ${
      highlight ? 'border-[var(--border)] bg-[var(--bg-subtle)] font-bold text-[var(--fg)] shadow-xs' : 'border-[var(--border-soft)] bg-[var(--card)] text-[var(--fg-muted)]'
    }`}>
      <b className="font-bold text-[var(--fg)]">{value}</b>
      <span className="text-[11px] text-[var(--fg-muted)]">{label}</span>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-[2px] border border-[var(--border-soft)] bg-[var(--bg-subtle)]/60 px-1.5 py-0.5 text-[11px] font-medium text-[var(--fg-muted)]">
      {children}
    </span>
  );
}

function StateText({ children, danger }: { children: React.ReactNode; danger?: boolean }) {
  return <div className={`p-8 text-center text-xs ${danger ? 'text-rose-500/85 font-bold' : 'text-[var(--fg-muted)]'}`}>{children}</div>;
}

function PageButton({ children, disabled, onClick }: { children: React.ReactNode; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-7 items-center rounded-[3px] border border-[var(--border)] bg-[var(--card)] px-2.5 text-xs font-semibold text-[var(--fg)] hover:bg-[var(--bg-subtle)] disabled:opacity-40"
    >
      {children}
    </button>
  );
}
