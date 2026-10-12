'use client';

import { useState } from 'react';
import { Pencil, Trash2, BarChart3 } from 'lucide-react';
import {
  omnichannelCatalogApi, CATALOG_LINK_MODE, CATALOG_STOCK_MODE,
  type CatalogCoverageDto, type CatalogProfileDto, type CatalogSiteSourceDto, type CatalogSourceDto,
} from '../../lib/api/omnichannel-catalog';
import { describeError } from '../../lib/errors';
import { CountryFlag } from '../../components/ui/CountryFlag';

interface SourceLookups {
  sources: CatalogSourceDto[];
  siteSources: CatalogSiteSourceDto[];
}

/** Profilin ürün/fiyat/stok/link kaynaklarını ve kullanan kanalları listeler (Profiller listesi ve Profil Merkezi ortak). */
export function ProfileFacts({ profile, sources, siteSources }: SourceLookups & { profile: CatalogProfileDto }) {
  const sourceName = (id: number | null | undefined) =>
    id == null ? '—' : sources.find((s) => s.id === id)?.displayName ?? `#${id}`;
  const siteName = (id: number | null | undefined) =>
    id == null ? '—' : `${siteSources.find((s) => s.id === id)?.name ?? `#${id}`} (site)`;

  const product = profile.productSiteSourceId != null
    ? siteName(profile.productSiteSourceId)
    : profile.productSourceIds.map(sourceName).join(', ');
  const price = profile.priceSiteSourceId != null ? siteName(profile.priceSiteSourceId) : sourceName(profile.priceSourceId);
  const stock = profile.stockMode === CATALOG_STOCK_MODE.AlwaysInStock ? 'Hep var'
    : profile.stockMode === CATALOG_STOCK_MODE.Source ? sourceName(profile.stockSourceId)
    : profile.stockMode === CATALOG_STOCK_MODE.SiteSource ? siteName(profile.stockSiteSourceId)
    : 'Ürün kaynaklarından';
  const link = profile.linkMode === CATALOG_LINK_MODE.None ? 'Yok'
    : profile.linkMode === CATALOG_LINK_MODE.Source ? sourceName(profile.linkSourceId)
    : profile.linkMode === CATALOG_LINK_MODE.SiteSource ? siteName(profile.linkSiteSourceId)
    : 'Fiyat kaynağından';

  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[11px]">
      <dt className="text-[var(--fg-muted)]">Ürün</dt>
      <dd className="text-[var(--fg)]">{product}</dd>
      <dt className="text-[var(--fg-muted)]">Fiyat</dt>
      <dd className="text-[var(--fg)]">{price}</dd>
      <dt className="text-[var(--fg-muted)]">Stok</dt>
      <dd className="text-[var(--fg)]">{stock}</dd>
      <dt className="text-[var(--fg-muted)]">Link</dt>
      <dd className="text-[var(--fg)]">{link}</dd>
      <dt className="text-[var(--fg-muted)]">Kanallar</dt>
      <dd className="text-[var(--fg)]">
        {profile.channels.length > 0 ? profile.channels.map((c) => c.displayName).join(', ') : 'Henüz kullanan kanal yok'}
      </dd>
    </dl>
  );
}

interface CardProps extends SourceLookups {
  profile: CatalogProfileDto;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function ProfileCard({ profile, sources, siteSources, onOpen, onEdit, onDelete }: CardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3.5 shadow-xs">
      <div className="flex items-start justify-between gap-2">
        <button type="button" onClick={onOpen} title="Profil Merkezi"
          className="flex min-w-0 cursor-pointer items-center gap-2 text-left font-bold text-[var(--fg)] hover:underline">
          <CountryFlag code={profile.country} size={18} />
          <span className="truncate">{profile.name}</span>
        </button>
        <div className="flex shrink-0 items-center gap-1">
          <button type="button" title="Düzenle" onClick={onEdit}
            className="flex h-6.5 w-6.5 items-center justify-center rounded-[3px] border border-[var(--border)] text-[var(--fg-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--fg)]">
            <Pencil size={12} />
          </button>
          <button type="button" title="Sil" onClick={onDelete}
            className="flex h-6.5 w-6.5 items-center justify-center rounded-[3px] border border-[var(--border)] text-[var(--fg-muted)] hover:bg-rose-500/10 hover:text-rose-500">
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      <ProfileFacts profile={profile} sources={sources} siteSources={siteSources} />
      <CoverageLine profileId={profile.id} />
    </div>
  );
}

// Kapsama sorgusu kaynaktaki tüm ürünleri sayar; kartlar açılır açılmaz değil, istenince çalışır.
export function CoverageLine({ profileId }: { profileId: number }) {
  const [coverage, setCoverage] = useState<CatalogCoverageDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setCoverage(await omnichannelCatalogApi.getCoverage(profileId));
    } catch (e) {
      setError(describeError(e));
    } finally {
      setLoading(false);
    }
  };

  if (error) return <div className="text-[11px] text-rose-500">{error}</div>;

  if (!coverage) {
    return (
      <button type="button" onClick={() => void load()} disabled={loading}
        className="inline-flex h-7 w-fit items-center gap-1.5 rounded-[3px] border border-[var(--border)] px-2.5 text-[11px] font-semibold text-[var(--fg)] hover:bg-[var(--bg-subtle)] disabled:opacity-50">
        <BarChart3 size={12} />
        {loading ? 'Hesaplanıyor…' : 'Kapsamayı göster'}
      </button>
    );
  }

  return (
    <div className="flex flex-wrap gap-3 border-t border-[var(--border-soft)] pt-2 font-mono text-[11px]">
      <span><strong className="text-[var(--fg)]">{coverage.products}</strong> <span className="text-[var(--fg-muted)]">ürün</span></span>
      <span><strong className="text-[var(--fg)]">{coverage.withPrice}</strong> <span className="text-[var(--fg-muted)]">fiyatlı</span></span>
      <span><strong className="text-[var(--fg)]">{coverage.inStock}</strong> <span className="text-[var(--fg-muted)]">stokta</span></span>
      <span><strong className="text-[var(--fg)]">{coverage.withLink}</strong> <span className="text-[var(--fg-muted)]">linkli</span></span>
    </div>
  );
}
