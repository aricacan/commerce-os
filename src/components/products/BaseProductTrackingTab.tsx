'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, ChevronLeft, ChevronRight, Package } from 'lucide-react';
import { baseProductTrackingApi } from '../../lib/api';
import { ExportMenu, type ExportRow } from '../ui/ExportMenu';
import { MultiSelect } from '../ui/MultiSelect';
import type { ExportColumn } from '../../lib/export';
import { useMobile } from '../../hooks/useMobile';
import { useI18n } from '../../lib/i18n';
import { useBaseCurrency } from '../../hooks/useBaseCurrency';
import type { BaseProductTrackingItem } from '../../types/api';

const PAGE_SIZE = 60;

// Pazaryeri rozetleri — soluk/pastel ve göz yormayan renk tonları
const MARKETPLACE_STYLES: Record<string, { color: string; bg: string; border: string }> = {
  Amazon: { color: '#d97706', bg: 'rgba(217, 119, 6, 0.08)', border: 'rgba(217, 119, 6, 0.22)' },
  'eBay StoreB': { color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.08)', border: 'rgba(59, 130, 246, 0.22)' },
  'eBay StoreA': { color: '#6366f1', bg: 'rgba(99, 102, 241, 0.08)', border: 'rgba(99, 102, 241, 0.22)' },
  Shopify: { color: '#10b981', bg: 'rgba(16, 185, 129, 0.08)', border: 'rgba(16, 185, 129, 0.22)' },
  'Temu UK': { color: '#a855f7', bg: 'rgba(168, 85, 247, 0.08)', border: 'rgba(168, 85, 247, 0.22)' },
  'B&Q UK': { color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.08)', border: 'rgba(6, 182, 212, 0.22)' },
  Manuel: { color: '#64748b', bg: 'rgba(100, 116, 139, 0.08)', border: 'rgba(100, 116, 139, 0.22)' },
  İade: { color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.08)', border: 'rgba(148, 163, 184, 0.22)' },
};

function getMarketplaceStyle(name: string) {
  if (MARKETPLACE_STYLES[name]) return MARKETPLACE_STYLES[name];
  const lower = name.toLowerCase();
  if (lower.includes('amazon')) return MARKETPLACE_STYLES.Amazon;
  if (lower.includes('ebay')) return MARKETPLACE_STYLES['eBay StoreB'];
  if (lower.includes('shopify')) return MARKETPLACE_STYLES.Shopify;
  if (lower.includes('temu')) return MARKETPLACE_STYLES['Temu UK'];
  return { color: 'var(--fg-muted)', bg: 'var(--bg-subtle)', border: 'var(--border-soft)' };
}

function gbp(n: number | null): string {
  if (n == null) return '—';
  return '£' + n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function MarketplaceBadges({ items }: { items: BaseProductTrackingItem['marketplaces'] }) {
  const { lang } = useI18n();
  if (items.length === 0) {
    return <span style={{ fontSize: 11.5, color: 'var(--fg-subtle)' }}>{lang === 'tr' ? 'Satış yok' : 'No sales'}</span>;
  }
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      {items.map((m) => {
        const st = getMarketplaceStyle(m.name);
        return (
          <span
            key={m.name}
            title={`${m.orderCount} ${lang === 'tr' ? 'sipariş' : 'orders'}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 7px',
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 600,
              color: st.color,
              background: st.bg,
              border: `1px solid ${st.border}`,
            }}
          >
            {m.name}
            {m.orderCount > 1 && <span style={{ opacity: 0.75, fontWeight: 500 }}>· {m.orderCount}</span>}
          </span>
        );
      })}
    </div>
  );
}

type SortKey = 'name' | 'marketplace' | 'cost' | 'stock' | 'price' | 'newest';

const SORT_VALUE: Record<SortKey, { asc?: string; desc: string }> = {
  name: { asc: 'name_asc', desc: 'name_desc' },
  marketplace: { asc: 'marketplace_asc', desc: 'marketplace_desc' },
  cost: { asc: 'cost_asc', desc: 'cost_desc' },
  stock: { asc: 'stock_asc', desc: 'stock_desc' },
  price: { asc: 'price_asc', desc: 'price_desc' },
  newest: { desc: 'newest' },
};

function nextSortValue(key: SortKey, current: string): string {
  const pair = SORT_VALUE[key];
  if (!pair.asc) return pair.desc;
  return current === pair.desc ? pair.asc : pair.desc;
}

function sortState(key: SortKey, current: string): 'asc' | 'desc' | null {
  const pair = SORT_VALUE[key];
  if (pair.asc && current === pair.asc) return 'asc';
  if (current === pair.desc) return 'desc';
  return null;
}

function SortHeader({
  label,
  sortKey,
  sortBy,
  onSort,
  align = 'left',
}: {
  label: string;
  sortKey: SortKey;
  sortBy: string;
  onSort: (sort: string) => void;
  align?: 'left' | 'right' | 'center';
}) {
  const state = sortState(sortKey, sortBy);

  return (
    <button
      type="button"
      onClick={() => onSort(nextSortValue(sortKey, sortBy))}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: align === 'right' ? 'flex-end' : align === 'center' ? 'center' : 'flex-start',
        gap: 4,
        width: '100%',
        border: 'none',
        background: 'transparent',
        padding: 0,
        color: state ? 'var(--fg)' : 'var(--fg-muted)',
        cursor: 'pointer',
        fontSize: 11,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.02em',
        userSelect: 'none',
      }}
    >
      <span>{label}</span>
      {state ? (
        <span style={{ fontSize: 10, color: 'var(--fg)' }}>
          {state === 'asc' ? '▲' : '▼'}
        </span>
      ) : (
        <span style={{ fontSize: 10, color: 'var(--fg-muted)', opacity: 0.3 }}>
          ▲
        </span>
      )}
    </button>
  );
}

export function BaseProductTrackingTab() {
  const isMobile = useMobile();
  const { lang } = useI18n();
  const { toGbp } = useBaseCurrency();

  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('name_asc');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedMarketplaces, setSelectedMarketplaces] = useState<(string | number)[]>([]);
  const [matchMode, setMatchMode] = useState<'contains' | 'excludes'>('contains');

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchInput]);

  const { data: marketplaceOptions } = useQuery({
    queryKey: ['base-product-tracking-marketplaces'],
    queryFn: () => baseProductTrackingApi.marketplaces(),
    staleTime: 5 * 60_000,
  });

  const marketplaceFilterValue = selectedMarketplaces.map(String);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['base-product-tracking', debouncedSearch, marketplaceFilterValue, matchMode, sortBy, page],
    queryFn: () => baseProductTrackingApi.list({
      search: debouncedSearch || undefined,
      marketplaces: marketplaceFilterValue.length > 0 ? marketplaceFilterValue : undefined,
      matchMode,
      sortBy,
      page,
      pageSize: PAGE_SIZE,
    }),
    staleTime: 30_000,
  });

  const items = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      {/* ── Araç Çubuğu ─────────────────────────────────────────────────── */}
      <div style={{
        padding: isMobile ? '12px 16px' : '14px 20px',
        borderBottom: '1px solid var(--border-soft)',
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: isMobile ? 'stretch' : 'center',
        justifyContent: 'space-between',
        gap: 10,
        flexWrap: 'wrap',
      }}>
        {/* Arama Kutusu */}
        <div data-tour="base-tracking-search" style={{ position: 'relative', width: isMobile ? '100%' : 260 }}>
          <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-muted)' }} />
          <input
            type="text"
            placeholder={lang === 'tr' ? 'İsim, SKU, ID, EAN veya ASIN ara...' : 'Search name, SKU, ID, EAN or ASIN...'}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            style={{
              width: '100%',
              height: 36,
              padding: '0 12px 0 32px',
              borderRadius: 6,
              border: '1px solid var(--border)',
              background: 'var(--card)',
              color: 'var(--fg)',
              fontSize: 12.5,
              outline: 'none',
              transition: 'all 0.15s',
            }}
          />
        </div>

        <div data-tour="base-tracking-filters" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* İçerir / İçermez segmenti */}
          <div style={{
            display: 'flex', gap: 2, background: 'var(--card)',
            border: '1px solid var(--border)', borderRadius: 6, padding: 2, height: 36,
          }}>
            {([
              { key: 'contains' as const, label: lang === 'tr' ? 'İçerir' : 'Contains' },
              { key: 'excludes' as const, label: lang === 'tr' ? 'İçermez' : 'Excludes' },
            ]).map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => { setMatchMode(opt.key); setPage(1); }}
                style={{
                  padding: '0 10px', borderRadius: 4, border: 'none', cursor: 'pointer',
                  fontSize: 12, fontWeight: 600,
                  background: matchMode === opt.key ? 'var(--card-hover)' : 'transparent',
                  color: matchMode === opt.key ? 'var(--fg)' : 'var(--fg-muted)',
                  boxShadow: matchMode === opt.key ? 'var(--shadow-xs)' : 'none',
                  transition: 'all 0.15s',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <MultiSelect
            label={lang === 'tr' ? 'Pazaryeri' : 'Marketplace'}
            allLabel={lang === 'tr' ? 'Tüm Pazaryerleri' : 'All Marketplaces'}
            options={(marketplaceOptions ?? []).map((name) => ({
              value: name,
              label: name,
              color: getMarketplaceStyle(name).color,
            }))}
            selected={selectedMarketplaces}
            onChange={(next) => { setSelectedMarketplaces(next); setPage(1); }}
            emptyLabel={lang === 'tr' ? 'Pazaryeri bulunamadı' : 'No marketplaces found'}
          />

          <div data-tour="base-tracking-export">
            <ExportMenu
              filename="uk-pazaryeri"
              columns={[
                { key: 'bId', header: 'b_id', type: 'text' },
                { key: 'name', header: lang === 'tr' ? 'Ürün Adı' : 'Product Name', type: 'text' },
                { key: 'sku', header: 'SKU', type: 'text' },
                { key: 'ean', header: 'EAN', type: 'text' },
                { key: 'asin', header: 'ASIN', type: 'text' },
                { key: 'cost', header: 'Cost (GBP)', type: 'money', currency: 'GBP' },
                { key: 'stock', header: lang === 'tr' ? 'Stok' : 'Stock', type: 'int' },
                { key: 'price', header: 'Price (GBP)', type: 'money', currency: 'GBP' },
                { key: 'marketplaces', header: lang === 'tr' ? 'Pazaryerleri' : 'Marketplaces', type: 'text' },
              ] satisfies ExportColumn[]}
              totalHint={totalCount}
              getDataAsync={async (opts) => {
                const all = await baseProductTrackingApi.list({
                  search: debouncedSearch || undefined,
                  marketplaces: marketplaceFilterValue.length > 0 ? marketplaceFilterValue : undefined,
                  matchMode,
                  sortBy,
                  page: 1,
                  pageSize: opts?.limit ?? 100000,
                });
                return (all?.items ?? []).map((p): ExportRow => ({
                  bId: p.erpId ?? '',
                  name: p.name,
                  sku: p.sku,
                  ean: p.ean ?? '',
                  asin: p.asin ?? '',
                  cost: p.cost ?? 0,
                  stock: p.stock,
                  price: toGbp(p.priceTry) ?? 0,
                  marketplaces: p.marketplaces.map((m) => m.name).join(', '),
                }));
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Liste ───────────────────────────────────────────────────────── */}
      <div data-tour="base-tracking-table" style={{ padding: isMobile ? '12px 16px 20px' : '16px 20px 20px' }}>
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 64, borderRadius: 6 }} />
            ))}
          </div>
        ) : isError ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: 48 }}>
            <p style={{ color: 'var(--fg)', fontSize: 13, fontWeight: 600 }}>
              {lang === 'tr' ? 'Ürünler yüklenirken bir hata oluştu.' : 'An error occurred while loading products.'}
            </p>
            <button
              onClick={() => refetch()}
              style={{
                padding: '6px 14px', borderRadius: 6, background: 'var(--card)',
                color: 'var(--fg)', border: '1px solid var(--border)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer'
              }}
            >
              {lang === 'tr' ? 'Tekrar Dene' : 'Try Again'}
            </button>
          </div>
        ) : items.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: 48 }}>
            <p style={{ color: 'var(--fg-muted)', fontSize: 13 }}>
              {lang === 'tr' ? 'Arama kriterlerine uygun ürün bulunamadı.' : 'No products found matching search criteria.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {!isMobile && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: '40px minmax(340px, 2.2fr) 0.8fr 0.7fr 0.8fr 1.4fr',
                alignItems: 'center',
                gap: 12,
                padding: '0 12px 8px',
                borderBottom: '1px solid var(--border-soft)',
              }}>
                <span />
                <SortHeader label={lang === 'tr' ? 'Ürün' : 'Product'} sortKey="name" sortBy={sortBy} onSort={(v) => { setSortBy(v); setPage(1); }} />
                <SortHeader label={lang === 'tr' ? 'Maliyet' : 'Cost'} sortKey="cost" sortBy={sortBy} onSort={(v) => { setSortBy(v); setPage(1); }} align="right" />
                <SortHeader label={lang === 'tr' ? 'Stok' : 'Stock'} sortKey="stock" sortBy={sortBy} onSort={(v) => { setSortBy(v); setPage(1); }} align="right" />
                <SortHeader label={lang === 'tr' ? 'Fiyat' : 'Price'} sortKey="price" sortBy={sortBy} onSort={(v) => { setSortBy(v); setPage(1); }} align="right" />
                <SortHeader label={lang === 'tr' ? 'Pazaryeri' : 'Marketplace'} sortKey="marketplace" sortBy={sortBy} onSort={(v) => { setSortBy(v); setPage(1); }} />
              </div>
            )}
            {items.map((p) => (
              <div
                key={p.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '40px 1fr' : '40px minmax(340px, 2.2fr) 0.8fr 0.7fr 0.8fr 1.4fr',
                  alignItems: 'center',
                  gap: isMobile ? 10 : 12,
                  padding: '8px 12px',
                  background: 'var(--card)',
                  border: '1px solid var(--border-soft)',
                  borderRadius: 6,
                  transition: 'background 0.12s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--card-hover)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--card)'; }}
              >
                {p.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.imageUrl}
                    alt={p.name}
                    style={{ width: 40, height: 40, objectFit: 'contain', borderRadius: 4, border: '1px solid var(--border-soft)', background: '#fff', padding: 2 }}
                  />
                ) : (
                  <div style={{ width: 40, height: 40, borderRadius: 4, background: 'var(--bg-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-muted)' }}>
                    <Package size={16} />
                  </div>
                )}

                <div style={{ minWidth: 0 }}>
                  <div style={{
                    fontWeight: 600, fontSize: 13, color: 'var(--fg)', marginBottom: 4, lineHeight: 1.3,
                    whiteSpace: 'normal',
                  }}>
                    {p.name}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 8px', fontSize: 11, color: 'var(--fg-muted)' }}>
                    <span>b_id: <strong className="font-mono" style={{ color: 'var(--fg)', fontWeight: 600 }}>{p.erpId ?? '—'}</strong></span>
                    <span>SKU: <strong className="font-mono" style={{ color: 'var(--fg)', fontWeight: 600 }}>{p.sku}</strong></span>
                    {p.ean && <span>EAN: <strong className="font-mono" style={{ color: 'var(--fg)', fontWeight: 600 }}>{p.ean}</strong></span>}
                    {p.asin && <span>ASIN: <strong className="font-mono" style={{ color: 'var(--fg)', fontWeight: 600 }}>{p.asin}</strong></span>}
                  </div>
                </div>

                {!isMobile && (
                  <div style={{ fontSize: 12.5, color: p.cost ? 'var(--fg)' : 'var(--fg-subtle)', fontWeight: p.cost ? 600 : 400, textAlign: 'right' }}>
                    {gbp(p.cost)}
                  </div>
                )}

                {!isMobile && (
                  // EKSİ STOK BİR HATA DEĞİL: BaseLinker stoğun eksiye düşmesine izin veriyor
                  // (fazla satış) ve senkron değeri olduğu gibi taşıyor. Çıplak "-1" bozuk veri
                  // gibi göründüğü için ayrıca işaretleniyor — sayıyı gizlemek gerçeği saklardı.
                  <div style={{
                    fontSize: 12.5,
                    color: p.stock < 0 ? 'var(--danger, #f43f5e)' : 'var(--fg-muted)',
                    fontWeight: p.stock < 0 ? 700 : 600,
                    textAlign: 'right',
                  }}>
                    {p.stock.toLocaleString('tr-TR')}
                    {p.stock < 0 && (
                      <span
                        title={lang === 'tr'
                          ? 'BaseLinker stoğu eksiye düşmüş (fazla satış). Değer ERP’den olduğu gibi alınıyor.'
                          : 'BaseLinker stock is negative (oversold). Value is taken from the ERP as-is.'}
                        style={{ marginLeft: 4, fontSize: 10, fontWeight: 700 }}
                      >
                        ⚠
                      </span>
                    )}
                  </div>
                )}

                {!isMobile && (
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--fg)', textAlign: 'right' }}>
                    {gbp(toGbp(p.priceTry))}
                  </div>
                )}

                <div style={{ gridColumn: isMobile ? '1 / -1' : undefined }}>
                  {isMobile && (
                    <div style={{ display: 'flex', gap: 12, fontSize: 12.5, color: 'var(--fg-muted)', marginBottom: 6 }}>
                      <span>{gbp(p.cost)}</span>
                      <span>{p.stock} {lang === 'tr' ? 'adet' : 'pcs'}</span>
                      <span style={{ fontWeight: 700, color: 'var(--fg)' }}>{gbp(toGbp(p.priceTry))}</span>
                    </div>
                  )}
                  <MarketplaceBadges items={p.marketplaces} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Sayfalama ───────────────────────────────────────────────────── */}
      {!isLoading && !isError && items.length > 0 && (
        <div data-tour="base-tracking-pagination" style={{
          padding: isMobile ? '12px 16px' : '14px 20px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10,
        }}>
          <span style={{ fontSize: 12.5, color: 'var(--fg-muted)' }}>
            {lang === 'tr' ? (
              <>Toplam <strong>{totalCount}</strong> üründen <strong>{(page - 1) * PAGE_SIZE + 1} - {Math.min(page * PAGE_SIZE, totalCount)}</strong> arası</>
            ) : (
              <>Showing <strong>{(page - 1) * PAGE_SIZE + 1} - {Math.min(page * PAGE_SIZE, totalCount)}</strong> of <strong>{totalCount}</strong></>
            )}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page === 1}
              style={{
                height: 32, padding: '0 10px', borderRadius: 4, border: '1px solid var(--border)',
                background: 'var(--card)', color: 'var(--fg)', cursor: page === 1 ? 'not-allowed' : 'pointer',
                opacity: page === 1 ? 0.4 : 1, display: 'flex', alignItems: 'center',
              }}
            >
              <ChevronLeft size={14} />
            </button>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--fg)', minWidth: 50, textAlign: 'center' }}>
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page === totalPages}
              style={{
                height: 32, padding: '0 10px', borderRadius: 4, border: '1px solid var(--border)',
                background: 'var(--card)', color: 'var(--fg)', cursor: page === totalPages ? 'not-allowed' : 'pointer',
                opacity: page === totalPages ? 0.4 : 1, display: 'flex', alignItems: 'center',
              }}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
