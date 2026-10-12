'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, ChevronLeft, ChevronRight, Inbox as InboxIcon } from 'lucide-react';
import {
  siteHubApi, REQUEST_TYPE, REQUEST_STATUS,
  type SiteRequestType, type SiteRequestStatus, type SiteConnectionDto,
} from '../../lib/api/sitehub';
import { ErrorState, StatusBadge, TypeBadge, formatDateTime } from './shared';
import { RequestDetailPanel } from './RequestDetailPanel';
import { FilterSelect } from '../../components/ui/FilterSelect';

const PAGE_SIZE = 30;
const EMPTY_SITES: SiteConnectionDto[] = [];

const TYPE_FILTERS: { value: SiteRequestType | 'all'; label: string }[] = [
  { value: 'all', label: 'Tüm Tipler' },
  { value: REQUEST_TYPE.Offer, label: 'Teklif Talebi' },
  { value: REQUEST_TYPE.Message, label: 'İletişim Mesajı' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'Tüm Durumlar' },
  { value: String(REQUEST_STATUS.New), label: 'Yeni' },
  { value: String(REQUEST_STATUS.InProgress), label: 'İnceleniyor' },
  { value: String(REQUEST_STATUS.Quoted), label: 'Teklif Verildi' },
  { value: String(REQUEST_STATUS.Won), label: 'Kazanıldı' },
  { value: String(REQUEST_STATUS.Lost), label: 'Kaybedildi' },
  { value: String(REQUEST_STATUS.Closed), label: 'Kapatıldı' },
];

export function InboxTab() {
  const [page, setPage] = useState(1);
  const [siteId, setSiteId] = useState<number | 'all'>('all');
  const [type, setType] = useState<SiteRequestType | 'all'>('all');
  const [status, setStatus] = useState<SiteRequestStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const sitesQuery = useQuery({
    queryKey: ['sitehub', 'sites'],
    queryFn: siteHubApi.getSites,
    staleTime: 60_000,
  });
  const sites = sitesQuery.data ?? EMPTY_SITES;

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(timer);
  }, [search]);

  const inboxParams = {
    siteId: siteId === 'all' ? undefined : siteId,
    type: type === 'all' ? undefined : type,
    status: status === 'all' ? undefined : status,
    search: debouncedSearch || undefined,
    page,
    pageSize: PAGE_SIZE,
  };

  const inboxQuery = useQuery({
    queryKey: ['sitehub', 'inbox', inboxParams],
    queryFn: () => siteHubApi.getInbox(inboxParams),
    placeholderData: (previous) => previous,
    staleTime: 15_000,
  });
  const items = inboxQuery.data?.items ?? [];
  const total = inboxQuery.data?.totalCount ?? 0;
  const loading = inboxQuery.isLoading;
  const error = inboxQuery.error instanceof Error ? inboxQuery.error.message : null;

  const resetAndSet = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="flex-1 flex min-h-0 w-full overflow-hidden text-xs">
      {/* Main Request List Container */}
      <div className="flex-1 flex flex-col min-w-0 h-full border-r border-[var(--border-soft)]">
        {/* Header & Filters Row */}
        <div className="p-4 sm:p-5 pb-3 border-b border-[var(--border-soft)] bg-[var(--bg-subtle)]/20 flex flex-col gap-3 shrink-0" data-tour="sitehub-inbox-filters">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <InboxIcon size={16} className="text-[var(--fg-muted)]" />
              <h2 className="text-sm font-bold text-[var(--fg)]">Form & Teklif Talepleri</h2>
            </div>
            <span className="text-[11px] font-mono text-[var(--fg-muted)]">
              Toplam {total.toLocaleString('tr-TR')} talep
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search
                size={13}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]"
              />
              <input
                value={search}
                onChange={(e) => resetAndSet(setSearch)(e.target.value)}
                placeholder="Ad, e-posta, telefon veya konu ara..."
                className="h-8 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] pl-8 pr-2.5 text-xs text-[var(--fg)] outline-none focus:border-[var(--fg)]"
              />
            </div>

            <div className="w-36">
              <FilterSelect
                value={type === 'all' ? 'all' : String(type)}
                onChange={(v) => resetAndSet(setType)(v === 'all' ? 'all' : Number(v) as SiteRequestType)}
                placeholder="Talep Türü"
                height="h-8"
                options={TYPE_FILTERS.map((f) => ({ value: String(f.value), label: f.label }))}
              />
            </div>

            <div className="w-36">
              <FilterSelect
                value={status === 'all' ? 'all' : String(status)}
                onChange={(v) => resetAndSet(setStatus)(v === 'all' ? 'all' : Number(v) as SiteRequestStatus)}
                placeholder="Durum Seçin"
                height="h-8"
                options={STATUS_OPTIONS}
              />
            </div>
          </div>

          {/* Site Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5" data-tour="sitehub-inbox-sites">
            <button
              type="button"
              onClick={() => resetAndSet(setSiteId)('all')}
              className={`h-6 px-2.5 rounded-[3px] font-mono text-[11px] font-semibold border transition cursor-pointer ${
                siteId === 'all'
                  ? 'bg-[var(--fg)] text-[var(--bg)] border-[var(--fg)]'
                  : 'bg-[var(--card)] text-[var(--fg-muted)] border-[var(--border)] hover:text-[var(--fg)]'
              }`}
            >
              Tüm Siteler
            </button>
            {sites.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => resetAndSet(setSiteId)(s.id)}
                className={`h-6 px-2.5 rounded-[3px] font-mono text-[11px] font-semibold border transition cursor-pointer flex items-center gap-1.5 ${
                  siteId === s.id
                    ? 'bg-[var(--fg)] text-[var(--bg)] border-[var(--fg)]'
                    : 'bg-[var(--card)] text-[var(--fg-muted)] border-[var(--border)] hover:text-[var(--fg)]'
                }`}
              >
                <span>{s.displayName}</span>
                {s.pendingRequestCount > 0 && (
                  <span className={`text-[9.5px] px-1 py-0.2 rounded-full font-bold ${
                    siteId === s.id ? 'bg-[var(--bg)] text-[var(--fg)]' : 'bg-[var(--bg-subtle)] text-[var(--fg)]'
                  }`}>
                    {s.pendingRequestCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Request Items Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2" data-tour="sitehub-inbox-list">
          {error && <ErrorState text={error} />}
          {loading && items.length === 0 && (
            <div className="py-12 text-center text-xs text-[var(--fg-muted)]">Talepler yükleniyor...</div>
          )}
          {!loading && items.length === 0 && !error && (
            <div className="py-12 text-center text-xs text-[var(--fg-muted)] border border-dashed border-[var(--border)] rounded-[4px]">
              Seçili filtrelere uygun form talebi bulunamadı.
            </div>
          )}

          {items.map((item) => {
            const active = item.id === selectedId;
            return (
              <div
                key={item.id}
                onClick={() => setSelectedId(item.id)}
                className={`p-3 rounded-[4px] border cursor-pointer transition flex flex-col gap-1.5 ${
                  active
                    ? 'border-[var(--fg)] bg-[var(--bg-subtle)] shadow-xs'
                    : 'border-[var(--border-soft)] bg-[var(--card)] hover:border-[var(--border)]'
                }`}
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10.5px] font-bold px-1.5 py-0.5 rounded-[2px] border border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--fg)]">
                      {item.siteName}
                    </span>
                    <span className="font-bold text-xs text-[var(--fg)]">{item.name}</span>
                    <TypeBadge type={item.sourceType} />
                    <StatusBadge status={item.status} />
                  </div>

                  <span className="text-[10.5px] font-mono text-[var(--fg-muted)]">
                    {formatDateTime(item.receivedAt ?? item.importedAt)}
                  </span>
                </div>

                {item.preview && (
                  <div className="text-[11.5px] text-[var(--fg-muted)] truncate">
                    {item.preview}
                  </div>
                )}

                <div className="flex items-center gap-4 text-[10.5px] text-[var(--fg-muted)] font-mono">
                  {item.email && <span>{item.email}</span>}
                  {item.phone && <span>{item.phone}</span>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-3 px-5 border-t border-[var(--border-soft)] bg-[var(--card)] flex items-center justify-between shrink-0">
            <span className="text-[11px] text-[var(--fg-muted)] font-mono">
              Sayfa {page} / {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="h-7 w-7 flex items-center justify-center rounded-[3px] border border-[var(--border)] text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)] disabled:opacity-30 cursor-pointer"
              >
                <ChevronLeft size={13} />
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="h-7 w-7 flex items-center justify-center rounded-[3px] border border-[var(--border)] text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)] disabled:opacity-30 cursor-pointer"
              >
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Side Request Detail Drawer */}
      {selectedId !== null && (
        <RequestDetailPanel
          requestId={selectedId}
          onClose={() => setSelectedId(null)}
          onSaved={() => inboxQuery.refetch()}
        />
      )}
    </div>
  );
}
