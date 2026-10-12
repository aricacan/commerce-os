'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Package, ScanBarcode, Search, ShoppingCart } from 'lucide-react';
import { searchApi } from '../../lib/api';
import { useI18n } from '../../lib/i18n';
import { formatOrderNumberWithHash } from '../../utils/orderNumber';
import { NAV, isGroup } from '../../lib/nav-groups';
import { queryKeys } from '../../lib/query-keys';
import { QUERY_STALE_TIME } from '../../lib/query-policy';
import { useCommandPalette } from '../../stores/command-palette';

export function TopbarSearch({
  isMobile,
  onScan,
  onNavigate,
}: {
  isMobile: boolean;
  onScan?: () => void;
  onNavigate?: () => void;
}) {
  const { t, lang } = useI18n();
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search.trim()), 450);
    return () => window.clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    const closeOutside = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', closeOutside);
    return () => document.removeEventListener('mousedown', closeOutside);
  }, []);

  const { data: result } = useQuery({
    queryKey: queryKeys.search.global(debouncedSearch),
    queryFn: ({ signal }) => searchApi.query(debouncedSearch, signal),
    enabled: debouncedSearch.length >= 2,
    staleTime: QUERY_STALE_TIME.live,
  });

  const matchedPages = useMemo(() => debouncedSearch.length < 2 ? [] : NAV
    .flatMap((entry) => (isGroup(entry) ? entry.children : [entry]))
    .filter((item) => t(item.key).toLocaleLowerCase().includes(debouncedSearch.toLocaleLowerCase()))
    .slice(0, 5), [debouncedSearch, t]);

  const navigate = (href: string) => {
    setOpen(false);
    setSearch('');
    onNavigate?.();
    router.push(href);
  };
  const hasResults = matchedPages.length > 0 || Boolean(result?.products.length || result?.orders.length);

  return (
    <div className={`flex min-w-0 flex-1 ${isMobile ? 'w-full px-1' : 'max-w-[320px] px-1'}`}>
      <div ref={rootRef} className="relative w-full">
        <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]" />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 z-[1]">
          {onScan && (
            <button
              type="button"
              onClick={onScan}
              title="Barkod Tara"
              className="cursor-pointer border-0 bg-transparent p-0.5 text-[var(--fg-muted)] hover:text-[var(--fg)]"
            >
              <ScanBarcode size={13} />
            </button>
          )}
          {!isMobile && (
            <button
              type="button"
              onClick={() => useCommandPalette.getState().setOpen(true)}
              className="hidden xl:inline-flex items-center text-ui-2xs font-mono text-[var(--fg-muted)] border border-[var(--border-soft)] rounded-[3px] px-1.5 py-0.5 hover:border-[var(--border)] hover:text-[var(--fg)] transition-colors cursor-pointer"
              title="Hızlı Komut Paleti (Ctrl+K)"
            >
              Ctrl K
            </button>
          )}
        </div>
        <input
          type="search"
          placeholder={lang === 'tr' ? 'Ara…' : 'Search…'}
          value={search}
          onChange={(event) => { setSearch(event.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          className={`w-full rounded-full border border-[var(--border-soft)] bg-[var(--card)] pl-8 ${
            onScan ? 'pr-8 xl:pr-16' : 'pr-4 xl:pr-14'
          } text-ui-sm text-[var(--fg)] shadow-xs outline-none transition focus:border-[var(--fg-muted)] ${
            isMobile ? 'h-[30px]' : 'h-[32px]'
          }`}
        />
        {open && debouncedSearch.length >= 2 && (
          <div className={`animate-fade-in absolute left-0 top-[calc(100%+6px)] z-30 max-h-[380px] overflow-y-auto rounded-[8px] border border-[var(--border-soft)] bg-[var(--card)] p-1.5 shadow-md ${
            isMobile ? 'right-0 w-full' : 'w-72 sm:w-80 max-w-[calc(100vw-32px)]'
          }`}>
            {!hasResults && <div className="px-2.5 py-4 text-center text-ui-sm text-[var(--fg-muted)]">{t('topbar_search_no_results')}</div>}
            {matchedPages.length > 0 && <ResultGroup title={t('topbar_search_pages')}>{matchedPages.map((item) => <ResultButton key={item.href} onClick={() => navigate(item.href)} icon={<item.Icon size={14} />}>{t(item.key)}</ResultButton>)}</ResultGroup>}
            {result?.products.length ? <ResultGroup title={t('topbar_search_products')}>{result.products.map((product) => <ResultButton key={product.id} onClick={() => navigate(`/products?q=${encodeURIComponent(debouncedSearch)}`)} icon={<Package size={14} />} suffix={product.supplierSKU}>{product.name}</ResultButton>)}</ResultGroup> : null}
            {result?.orders.length ? <ResultGroup title={t('topbar_search_orders')}>{result.orders.map((order) => <ResultButton key={order.id} onClick={() => navigate(`/orders?q=${encodeURIComponent(debouncedSearch)}`)} icon={<ShoppingCart size={14} />} suffix={order.storeName}>{formatOrderNumberWithHash(order.platformOrderNumber)}</ResultButton>)}</ResultGroup> : null}
          </div>
        )}
      </div>
    </div>
  );
}

function ResultGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="mb-1"><p className="px-2 py-1 text-ui-2xs font-extrabold uppercase tracking-[0.4px] text-[var(--fg-muted)]">{title}</p>{children}</div>;
}

function ResultButton({ children, icon, suffix, onClick }: { children: React.ReactNode; icon: React.ReactNode; suffix?: string; onClick: () => void }) {
  return <button onClick={onClick} className="flex w-full cursor-pointer items-center gap-2 rounded-[var(--radius-sm)] border-0 bg-transparent px-2 py-1.5 text-left text-ui-md text-[var(--fg)] hover:bg-[var(--card-hover)]"><span className="shrink-0 text-[var(--fg-muted)]">{icon}</span><span className="truncate">{children}</span>{suffix && <span className="ml-auto shrink-0 text-ui-xs text-[var(--fg-muted)]">{suffix}</span>}</button>;
}
