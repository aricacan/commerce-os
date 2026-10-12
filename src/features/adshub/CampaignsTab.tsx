'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Search, ImageOff, ChevronRight as BreadcrumbChevron } from 'lucide-react';
import {
  adsHubApi, AD_LEVEL, type AdLevel, type AdEntityRowDto, type AdPlatform,
} from '../../lib/api/adshub';
import type { ErpSourceCode } from '../../stores/store-selector';
import {
  PlatformBadge, EntityStatusBadge, OutOfStockWarningBadge,
  formatTry, formatMoney, formatCount, formatPercent, ErrorState,
} from './shared';

interface Props {
  onOpenAccount: (accountId: number) => void;
  erpSources: ErpSourceCode[];
  platforms: AdPlatform[];
  from: string;
  to: string;
}

const PAGE_SIZE = 25;

interface DrillLevel {
  level: AdLevel;
  parentId: number | null;
  parentName: string | null;
}

const ROOT: DrillLevel = { level: AD_LEVEL.Campaign, parentId: null, parentName: null };

const LEVEL_LABEL: Record<AdLevel, string> = {
  [AD_LEVEL.Account]: 'Hesap',
  [AD_LEVEL.Campaign]: 'Kampanya',
  [AD_LEVEL.AdGroup]: 'Reklam Seti',
  [AD_LEVEL.Ad]: 'Reklam',
};

const LEVEL_TABS: AdLevel[] = [AD_LEVEL.Campaign, AD_LEVEL.AdGroup, AD_LEVEL.Ad];

function childLevel(level: AdLevel): AdLevel | null {
  if (level === AD_LEVEL.Campaign) return AD_LEVEL.AdGroup;
  if (level === AD_LEVEL.AdGroup) return AD_LEVEL.Ad;
  return null;
}

export function CampaignsTab({ onOpenAccount, erpSources, platforms, from, to }: Props) {
  const [stack, setStack] = useState<DrillLevel[]>([ROOT]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const current = stack[stack.length - 1];

  const { data, isLoading, isError } = useQuery({
    queryKey: ['adshub', 'entities', current.level, current.parentId, from, to, page, search, erpSources, platforms],
    queryFn: () => {
      const params = {
        from, to,
        erpSourceCodes: erpSources.length > 0 ? erpSources.join(',') : undefined,
        platforms: platforms.length > 0 ? platforms.join(',') : undefined,
        parentId: current.parentId ?? undefined,
        search: search || undefined,
        page, pageSize: PAGE_SIZE,
      };
      if (current.level === AD_LEVEL.AdGroup) return adsHubApi.getAdGroups(params);
      if (current.level === AD_LEVEL.Ad) return adsHubApi.getAds(params);
      return adsHubApi.getCampaigns(params);
    },
    staleTime: 60_000,
  });

  const drillInto = (row: AdEntityRowDto) => {
    const next = childLevel(current.level);
    if (!next) return;
    setStack((s) => [...s, { level: next, parentId: row.id, parentName: row.name }]);
    setPage(1);
    setSearch('');
  };

  const popTo = (index: number) => {
    setStack((s) => s.slice(0, index + 1));
    setPage(1);
    setSearch('');
  };

  const canDrill = childLevel(current.level) !== null;
  const totalPages = data ? Math.max(1, Math.ceil(data.totalCount / PAGE_SIZE)) : 1;

  const goToLevel = (level: AdLevel) => {
    setStack([{ level, parentId: null, parentName: null }]);
    setPage(1);
    setSearch('');
  };

  return (
    <div className="w-full flex-1 p-4 sm:p-5 flex flex-col gap-3.5 text-xs">
      {/* Level Tabs & Breadcrumb Header */}
      <div data-tour="adshub-campaigns-levels" className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          {LEVEL_TABS.map((level) => {
            const active = stack[0].level === level;
            return (
              <button
                key={level}
                type="button"
                onClick={() => goToLevel(level)}
                className={`h-7.5 px-3 rounded-[3px] text-xs font-bold transition cursor-pointer ${
                  active
                    ? 'bg-[var(--fg)] text-[var(--bg)] shadow-xs'
                    : 'border border-[var(--border)] bg-[var(--card)] text-[var(--fg-muted)] hover:text-[var(--fg)]'
                }`}
              >
                {LEVEL_LABEL[level]}{level !== AD_LEVEL.Campaign ? ' (tümü)' : ''}
              </button>
            );
          })}
        </div>

        {/* Quick Search */}
        <div className="relative w-64">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder={`${LEVEL_LABEL[current.level]} ara...`}
            className="h-8 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] pl-8 pr-3 text-xs text-[var(--fg)] placeholder-[var(--fg-muted)] outline-none focus:border-[var(--fg)]"
          />
        </div>
      </div>

      {/* Breadcrumb Path */}
      {stack.length > 1 && (
        <div className="flex items-center gap-1.5 py-1 text-xs">
          {stack.map((level, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <BreadcrumbChevron size={12} className="text-[var(--fg-muted)]" />}
              <button
                type="button"
                onClick={() => popTo(i)}
                disabled={i === stack.length - 1}
                className={`font-semibold cursor-pointer ${
                  i === stack.length - 1
                    ? 'text-[var(--fg)] font-bold cursor-default'
                    : 'text-[var(--fg-muted)] hover:text-[var(--fg)] underline'
                }`}
              >
                {i === 0 ? `${LEVEL_LABEL[level.level]} (tümü)` : level.parentName}
              </button>
            </span>
          ))}
        </div>
      )}

      {isError && <ErrorState />}

      {!isError && (
        <div data-tour="adshub-campaigns-table" className="flex-1 min-h-0 flex flex-col rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] shadow-xs overflow-hidden">
          <div className="overflow-x-auto flex-1">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="border-b border-[var(--border-soft)] bg-[var(--bg-subtle)]/50 text-[10.5px] font-bold uppercase tracking-wider text-[var(--fg-muted)]">
                <tr>
                  <th className="px-3.5 py-2.5">{LEVEL_LABEL[current.level]}</th>
                  <th className="px-3 py-2.5">Hesap</th>
                  <th className="px-3 py-2.5">Durum</th>
                  <th className="px-3 py-2.5 text-right">Harcama</th>
                  <th className="px-3 py-2.5 text-right">Gösterim</th>
                  <th className="px-3 py-2.5 text-right">Tıklama</th>
                  <th className="px-3 py-2.5 text-right">TO</th>
                  <th className="px-3 py-2.5 text-right">TBM</th>
                  <th
                    className="px-3 py-2.5 text-right"
                    title="Platformun KENDİ raporladığı dönüşüm sayısı. Gerçek satış değildir: Google ve Meta aynı satışı ikisi de kendi hanesine yazabilir."
                  >
                    Satın Alma (Platform)
                  </th>
                  {/* Bu sütun kampanyaya değil HESABIN bağlı olduğu ERP kaynağına aittir;
                      aynı hesabın tüm kampanyalarında aynı sayı görünür. Başlık bunu
                      söylemediği için kampanya bazlı bir atıf sanılıyordu. */}
                  <th
                    className="px-3 py-2.5 text-right"
                    title="Hesabın bağlı olduğu mağazanın seçili tarih aralığındaki TOPLAM ERP sipariş sayısı. Kampanyaya atfedilmiş değildir — aynı hesabın her kampanyasında aynı sayı görünür, referans amaçlıdır."
                  >
                    Mağaza Siparişi (ERP)
                  </th>
                  <th
                    className="px-3 py-2.5 text-right"
                    title="URL etiketlemesiyle yakalanıp ERP siparişine birebir eşleştirilen gerçek sipariş sayısı. Boşsa: etiketleme kurulu değil ya da bu varlıktan gelen eşleşen sipariş yok."
                  >
                    Atıflı Sipariş
                  </th>
                  <th
                    className="px-3 py-2.5 text-right"
                    title="Reklamın yönlendirdiği ÜRÜNÜN brüt marjı: satış fiyatından yalnızca alış ve paketleme maliyeti çıkarılır (KDV/komisyon/kargo/reklam dahil değil). Yalnızca REKLAM seviyesindeki, tek bir ürün sayfasına giden aktif satırlarda hesaplanır."
                  >
                    Brüt Marj
                  </th>
                  <th className="px-3.5 py-2.5 text-right">ROAS</th>
                  <th
                    className="px-3.5 py-2.5 text-right"
                    title="Platform ACOS: harcamanın, platformun kendine mal ettiği ciroya oranı (ROAS'ın yüzde cinsinden tersi). Platform raporuna dayanır, gerçek ERP satışına değil."
                  >
                    ACOS
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-soft)]">
                {isLoading && (
                  <tr>
                    <td colSpan={14} className="px-4 py-8 text-center text-xs text-[var(--fg-muted)]">
                      Yükleniyor…
                    </td>
                  </tr>
                )}
                {!isLoading && (data?.rows.length ?? 0) === 0 && (
                  <tr>
                    <td colSpan={14} className="px-4 py-8 text-center text-xs text-[var(--fg-muted)]">
                      Bu filtre ve tarih aralığında kayıt bulunamadı.
                    </td>
                  </tr>
                )}
                {data?.rows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => canDrill && drillInto(row)}
                    className={`hover:bg-[var(--bg-subtle)]/30 ${canDrill ? 'cursor-pointer' : ''}`}
                  >
                    <td className="px-3.5 py-2.5">
                      <div className="flex items-center gap-2.5">
                        {current.level === AD_LEVEL.Ad && (
                          row.thumbnailUrl ? (
                            <Image
                              unoptimized
                              src={row.thumbnailUrl}
                              alt=""
                              width={26}
                              height={26}
                              className="rounded-[3px] object-cover shrink-0"
                            />
                          ) : (
                            <div className="w-6.5 h-6.5 rounded-[3px] bg-[var(--bg-subtle)] flex items-center justify-center shrink-0 text-[var(--fg-muted)]">
                              <ImageOff size={12} />
                            </div>
                          )
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-[var(--fg)] truncate max-w-[240px] block">
                              {row.name}
                            </span>
                            {row.isDeletedOnPlatform && (
                              <span className="text-[10px] text-[var(--fg-muted)]">(silindi)</span>
                            )}
                            {current.level === AD_LEVEL.Ad && row.isLandingProductOutOfStock === true && (
                              <OutOfStockWarningBadge />
                            )}
                          </div>
                          {current.level === AD_LEVEL.Ad && (row.creativeTitle || row.creativeBody) && (
                            <div className="text-[10.5px] text-[var(--fg-muted)] truncate max-w-[260px]">
                              {row.creativeTitle} {row.creativeTitle && row.creativeBody ? '—' : ''} {row.creativeBody}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-3 py-2.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenAccount(row.adAccountId);
                        }}
                        className="cursor-pointer"
                      >
                        <PlatformBadge platform={row.platform} />
                      </button>
                    </td>

                    <td className="px-3 py-2.5">
                      <EntityStatusBadge status={row.status} />
                    </td>

                    <td className="px-3 py-2.5 text-right font-mono font-bold text-[var(--fg)]">
                      <div>{formatMoney(row.spend, row.currencyCode)}</div>
                      {row.spendTry != null && row.currencyCode !== 'TRY' && (
                        <div className="text-[10px] text-[var(--fg-muted)] font-normal">
                          {formatTry(row.spendTry)}
                        </div>
                      )}
                    </td>

                    <td className="px-3 py-2.5 text-right font-mono text-[var(--fg-muted)]">
                      {formatCount(row.impressions)}
                    </td>

                    <td className="px-3 py-2.5 text-right font-mono text-[var(--fg-muted)]">
                      {formatCount(row.clicks)}
                    </td>

                    <td className="px-3 py-2.5 text-right font-mono text-[var(--fg-muted)]">
                      {formatPercent(row.ctr)}
                    </td>

                    <td className="px-3 py-2.5 text-right font-mono text-[var(--fg-muted)]">
                      {formatMoney(row.cpc, row.currencyCode)}
                    </td>

                    <td className="px-3 py-2.5 text-right font-mono text-[var(--fg-muted)]">
                      {row.platformConversions != null ? formatCount(row.platformConversions) : '—'}
                    </td>

                    <td
                      className="px-3 py-2.5 text-right font-mono text-[var(--fg-muted)]"
                      title={row.erpOrderCount != null
                        ? 'Mağaza toplamı — bu kampanyaya atfedilmiş sipariş değil.'
                        : 'Bu reklam hesabına bir ERP kaynağı atanmamış (Hesaplar sekmesinden atanır).'}
                    >
                      {row.erpOrderCount != null ? formatCount(row.erpOrderCount) : '—'}
                    </td>

                    <td className="px-3 py-2.5 text-right font-mono text-[var(--fg)]">
                      {row.realAttributedOrderCount != null ? (
                        <>
                          <div className="font-bold">{formatCount(row.realAttributedOrderCount)}</div>
                          {row.realAttributedRevenueTry != null && (
                            <div className="text-[10px] text-[var(--fg-muted)] font-normal">
                              {formatTry(row.realAttributedRevenueTry)}
                            </div>
                          )}
                        </>
                      ) : (
                        <span
                          className="text-[var(--fg-muted)]"
                          title="Bu varlık için eşleşen sipariş yok. URL etiketlemesi kurulu değilse bu sütun hep boş kalır."
                        >
                          —
                        </span>
                      )}
                    </td>

                    <td className="px-3 py-2.5 text-right font-mono text-[var(--fg-muted)]">
                      {row.landingProductGrossMarginPercent != null ? (
                        <span title={row.landingProductName ?? undefined}>
                          {formatPercent(row.landingProductGrossMarginPercent, 0)}
                        </span>
                      ) : (
                        <span title={current.level === AD_LEVEL.Ad
                          ? 'Bu reklamın iniş sayfası tek bir ürüne çözülemedi (kategori/koleksiyon veya dış link) ya da ürünün alış maliyeti girilmemiş.'
                          : 'Brüt marj yalnızca REKLAM seviyesinde hesaplanır — kampanya/reklam seti birden çok ürüne yönlendirdiği için tek bir marj yoktur. Satıra tıklayıp reklam seviyesine inin.'}>
                          —
                        </span>
                      )}
                    </td>

                    <td className="px-3.5 py-2.5 text-right font-mono font-bold text-[var(--fg)]">
                      {row.platformRoas != null ? `${row.platformRoas.toFixed(2)}x` : '—'}
                    </td>

                    {/* Dönüşüm değeri yoksa ACOS hesaplanamaz — "%0" yazmak
                        "reklam bedavaya sattı" gibi okunurdu, bu yüzden "—". */}
                    <td className="px-3.5 py-2.5 text-right font-mono text-[var(--fg)]">
                      {formatPercent(row.platformAcosPercent, 1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {data && data.totalCount > 0 && (
            <div className="flex items-center justify-between border-t border-[var(--border-soft)] bg-[var(--bg-subtle)]/30 px-4 py-2.5 text-xs text-[var(--fg-muted)]">
              <div>
                Toplam <span className="font-bold text-[var(--fg)]">{data.totalCount}</span> kayıt • Toplam Harcama:{' '}
                <span className="font-mono font-bold text-[var(--fg)]">
                  {data.nativeCurrencyCode && data.nativeCurrencyCode !== 'TRY'
                    ? formatMoney(data.totalSpendNative, data.nativeCurrencyCode)
                    : formatTry(data.totalSpendTry)}
                </span>
                {data.unconvertedRowCount > 0 && (
                  <span className="ml-2 text-[var(--warning)]">
                    ({data.unconvertedRowCount} satır kur bulunamadığı için TL toplamına dahil değil)
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="flex h-7 w-7 items-center justify-center rounded-[3px] border border-[var(--border)] bg-[var(--card)] text-[var(--fg)] disabled:opacity-40 transition cursor-pointer"
                >
                  <ChevronLeft size={13} />
                </button>
                <span className="font-mono font-semibold">
                  {page} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="flex h-7 w-7 items-center justify-center rounded-[3px] border border-[var(--border)] bg-[var(--card)] text-[var(--fg)] disabled:opacity-40 transition cursor-pointer"
                >
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
