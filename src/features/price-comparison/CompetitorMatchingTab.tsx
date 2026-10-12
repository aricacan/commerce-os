'use client';

import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Download, ExternalLink, RefreshCw, Trash2, Upload, X, Search } from 'lucide-react';
import Image from 'next/image';
import { competitorProductsApi, type CompetitorListing, type CompetitorMatch } from '../../lib/api';
import { PriceComparisonPageShell } from './PriceComparisonPageShell';
import { FilterSelect, type FilterSelectOption } from '../../components/ui/FilterSelect';

const STATUS_OPTIONS: FilterSelectOption[] = [
  { value: 'all', label: 'Tüm Durumlar' },
  { value: 'Suggested', label: 'Önerilen' },
  { value: 'Review', label: 'Kontrol Gerekli' },
  { value: 'Approved', label: 'Onaylanan' },
  { value: 'Rejected', label: 'Reddedilen' },
  { value: 'Unmatched', label: 'Eşleşmedi' },
];

const SOURCE_OPTIONS: FilterSelectOption[] = [
  { value: 'manual', label: 'Manuel / Diğer' },
  { value: 'ebay-export', label: 'eBay Dışa Aktarımı' },
  { value: 'supplier', label: 'Tedarikçi Listesi' },
];

export function CompetitorMatchingTab() {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [source, setSource] = useState('manual');
  const [message, setMessage] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['competitor-products', status, search, page],
    queryFn: () => competitorProductsApi.list(status, search, page),
    staleTime: 15_000,
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['competitor-products'] });

  const upload = useMutation({
    mutationFn: (file: File) => competitorProductsApi.importFile(file, source),
    onSuccess: (result) => {
      setMessage(
        `${result.parsed} satır işlendi: ${result.suggested} öneri, ${result.needsReview} kontrol, ${result.unmatched} eşleşmedi.`
      );
      refresh();
      if (fileRef.current) fileRef.current.value = '';
    },
  });
  const rematch = useMutation({ mutationFn: competitorProductsApi.rematch, onSuccess: refresh });
  const resolve = useMutation({
    mutationFn: ({ id, decision }: { id: number; decision: 'Approved' | 'Rejected' }) =>
      competitorProductsApi.resolve(id, decision),
    onSuccess: refresh,
  });
  const remove = useMutation({ mutationFn: competitorProductsApi.remove, onSuccess: refresh });

  const data = query.data;
  const summary = data?.summary;
  const error = [query.error, upload.error, rematch.error, resolve.error, remove.error].find(
    Boolean
  ) as Error | undefined;

  return (
    <PriceComparisonPageShell
      toolbar={
        <>
          <div className="flex flex-wrap items-center gap-2">
            <FilterSelect
              value={source}
              options={SOURCE_OPTIONS}
              placeholder="Kaynak"
              onChange={(val) => setSource(val || 'manual')}
              minWidth={140}
            />

            <FilterSelect
              value={status}
              options={STATUS_OPTIONS}
              placeholder="Durum Filtresi"
              onChange={(val) => {
                setStatus(val || 'all');
                setPage(1);
              }}
              minWidth={140}
            />

            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx"
              disabled={upload.isPending}
              onChange={(e) => e.target.files?.[0] && upload.mutate(e.target.files[0])}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={upload.isPending}
              className="inline-flex h-8 items-center gap-1.5 rounded-[4px] border border-[var(--border)] bg-[var(--bg-subtle)] px-3 text-xs font-semibold text-[var(--fg)] hover:bg-[var(--card)] disabled:opacity-50"
            >
              <Upload size={12} />
              <span>{upload.isPending ? 'İşleniyor…' : 'Dosya Yükle'}</span>
            </button>
            <button
              type="button"
              onClick={() => competitorProductsApi.downloadTemplate()}
              className="inline-flex h-8 items-center gap-1.5 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-semibold text-[var(--fg)] hover:bg-[var(--bg-subtle)]"
            >
              <Download size={12} />
              <span>Şablon</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex h-8 w-60 items-center gap-2 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-2.5 text-xs text-[var(--fg)] focus-within:border-[var(--fg)]">
              <Search size={13} className="text-[var(--fg-muted)] shrink-0" />
              <input
                value={search}
                placeholder="Başlık, marka veya model ara"
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full bg-transparent text-xs text-[var(--fg)] placeholder-[var(--fg-muted)] outline-none"
              />
            </div>

            <button
              type="button"
              onClick={() => rematch.mutate()}
              disabled={rematch.isPending}
              className="inline-flex h-8 items-center gap-1.5 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-semibold text-[var(--fg)] hover:bg-[var(--bg-subtle)] disabled:opacity-50"
            >
              <RefreshCw size={12} className={rematch.isPending ? 'animate-spin' : ''} />
              <span>Yeniden Eşleştir</span>
            </button>
          </div>
        </>
      }
    >
      {message && (
        <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] p-2.5 text-xs text-[var(--fg)]">
          {message}
        </div>
      )}
      {error && (
        <div className="rounded-[4px] border border-rose-500/20 bg-rose-500/5 p-2.5 text-xs font-semibold text-rose-500/90">
          {error.message}
        </div>
      )}

      {/* Özet Rozetler */}
      {summary && (
        <div className="flex flex-wrap gap-1.5">
          {[
            ['Toplam', summary.listingCount],
            ['Öneri', summary.suggestedCount],
            ['Kontrol', summary.reviewCount],
            ['Onaylı', summary.approvedCount],
            ['Reddedilen', summary.rejectedCount],
            ['Eşleşmedi', summary.unmatchedCount],
          ].map(([label, value]) => (
            <div
              key={String(label)}
              className="inline-flex items-center gap-1.5 rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)]/60 px-2.5 py-1 text-xs"
            >
              <b className="font-bold text-[var(--fg)]">{value}</b>
              <span className="text-[11px] text-[var(--fg-muted)]">{label}</span>
            </div>
          ))}
        </div>
      )}

      {query.isLoading && <div className="p-8 text-center text-xs text-[var(--fg-muted)]">Yükleniyor…</div>}

      {/* İlan Kartları Listesi */}
      <div className="flex flex-col gap-2.5">
        {data?.items.map((listing) => (
          <ListingCard
            key={listing.id}
            listing={listing}
            onResolve={(id, decision) => resolve.mutate({ id, decision })}
            onDelete={() => {
              if (window.confirm('Bu rakip ilanını ve eşleşmelerini silmek istiyor musunuz?')) {
                remove.mutate(listing.id);
              }
            }}
          />
        ))}
        {data && data.items.length === 0 && (
          <div className="rounded-[4px] border border-dashed border-[var(--border-soft)] p-8 text-center text-xs text-[var(--fg-muted)]">
            Bu filtrede rakip ilanı bulunamadı.
          </div>
        )}
      </div>

      {/* Sayfalama */}
      {data && data.total > data.pageSize && (
        <div className="flex items-center justify-between gap-2.5 pt-2 text-xs text-[var(--fg-muted)]">
          <span>
            Toplam {data.total} kayıt · Sayfa {page} / {Math.ceil(data.total / data.pageSize)}
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => setPage((v) => v - 1)}
              className="inline-flex h-7 items-center rounded-[3px] border border-[var(--border)] bg-[var(--card)] px-2.5 text-xs font-semibold text-[var(--fg)] hover:bg-[var(--bg-subtle)] disabled:opacity-40"
            >
              Önceki
            </button>
            <button
              type="button"
              disabled={page >= Math.ceil(data.total / data.pageSize)}
              onClick={() => setPage((v) => v + 1)}
              className="inline-flex h-7 items-center rounded-[3px] border border-[var(--border)] bg-[var(--card)] px-2.5 text-xs font-semibold text-[var(--fg)] hover:bg-[var(--bg-subtle)] disabled:opacity-40"
            >
              Sonraki
            </button>
          </div>
        </div>
      )}
    </PriceComparisonPageShell>
  );
}

function ListingCard({
  listing,
  onResolve,
  onDelete,
}: {
  listing: CompetitorListing;
  onResolve: (id: number, decision: 'Approved' | 'Rejected') => void;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3">
      <div className="flex gap-3">
        {listing.imageUrl && (
          <Image
            unoptimized
            src={listing.imageUrl}
            alt=""
            width={68}
            height={68}
            className="h-[68px] w-[68px] rounded-[3px] border border-[var(--border-soft)] object-cover"
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-xs font-bold text-[var(--fg)]">{listing.title}</div>
              <div className="mt-0.5 text-[11px] text-[var(--fg-muted)]">
                {listing.source} · {listing.externalId}
              </div>
            </div>
            <button
              type="button"
              aria-label="Sil"
              onClick={onDelete}
              className="flex h-6 w-6 items-center justify-center rounded-[3px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] text-[var(--fg-muted)] transition hover:text-rose-500"
            >
              <Trash2 size={12} />
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {[listing.brand, listing.model, listing.modelYear, listing.category, listing.thickness]
              .filter(Boolean)
              .map((value) => (
                <span
                  key={value}
                  className="rounded-[2px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] px-1.5 py-0.2 text-[11px] text-[var(--fg-muted)]"
                >
                  {value}
                </span>
              ))}
            {listing.price != null && (
              <span className="rounded-[2px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] px-1.5 py-0.2 text-[11px] font-bold text-[var(--fg)]">
                {listing.price.toLocaleString('tr-TR')} {listing.currency}
              </span>
            )}
            {listing.externalUrl && (
              <a
                href={listing.externalUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-0.5 rounded-[2px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] px-1.5 py-0.2 text-[11px] font-bold text-[var(--fg)] hover:underline"
              >
                <span>İlan</span>
                <ExternalLink size={9} />
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-1.5 border-t border-[var(--border-soft)] pt-2.5">
        {listing.matches.map((match) => (
          <MatchRow key={match.id} match={match} onResolve={onResolve} />
        ))}
        {listing.matches.length === 0 && (
          <div className="p-2 text-center text-[11px] text-[var(--fg-muted)]">
            Güvenilir bir ürün adayı bulunamadı.
          </div>
        )}
      </div>
    </div>
  );
}

function MatchRow({
  match,
  onResolve,
}: {
  match: CompetitorMatch;
  onResolve: (id: number, decision: 'Approved' | 'Rejected') => void;
}) {
  const approved = match.status === 'Approved';
  const rejected = match.status === 'Rejected';

  return (
    <div className="flex items-center gap-2 rounded-[3px] border border-[var(--border-soft)] bg-[var(--bg-subtle)]/40 p-2 text-xs">
      <div className="flex h-7 w-9 shrink-0 items-center justify-center rounded-[2px] bg-[var(--card)] text-[11px] font-bold text-[var(--fg)]">
        %{match.score}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate font-bold text-[var(--fg)]">
          <span className="font-semibold text-[var(--fg-muted)]">{match.sku}</span> · {match.productName}
        </div>
        <div className="truncate text-[10.5px] text-[var(--fg-muted)]">
          {match.reasons.join(' · ') || 'Yeterli ortak alan yok'}
        </div>
      </div>
      {!approved && !rejected && (
        <div className="flex gap-1">
          <button
            type="button"
            title="Onayla"
            onClick={() => onResolve(match.id, 'Approved')}
            className="flex h-6 w-6 items-center justify-center rounded-[2px] bg-emerald-500/10 text-emerald-600/85 hover:bg-emerald-500 hover:text-white"
          >
            <Check size={12} />
          </button>
          <button
            type="button"
            title="Reddet"
            onClick={() => onResolve(match.id, 'Rejected')}
            className="flex h-6 w-6 items-center justify-center rounded-[2px] bg-rose-500/10 text-rose-500/85 hover:bg-rose-500 hover:text-white"
          >
            <X size={12} />
          </button>
        </div>
      )}
      {(approved || rejected) && (
        <span
          className={`rounded-[2px] px-1.5 py-0.5 text-[11px] font-bold ${
            approved ? 'bg-emerald-500/10 text-emerald-600/85' : 'bg-rose-500/10 text-rose-500/85'
          }`}
        >
          {approved ? 'Onaylandı' : 'Reddedildi'}
        </span>
      )}
    </div>
  );
}
