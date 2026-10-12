'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Search, X } from 'lucide-react';
import {
  customerEmailApi,
  type CustomerEmailKind,
} from '../../lib/api/customer-emails';
import { ErrorState } from '../../components/ui/ErrorState';
import { ExportMenu } from '../../components/ui/ExportMenu';
import { FilterSelect } from '../../components/ui/FilterSelect';
import type { ExportColumn } from '../../lib/export';
import { formatOrderNumber } from '../../utils/orderNumber';

type Filter = 'all' | CustomerEmailKind;

const EXPORT_COLUMNS: ExportColumn[] = [
  { key: 'orderDate', header: 'Tarih' },
  { key: 'platformOrderNumber', header: 'Sipariş No' },
  { key: 'storeName', header: 'Mağaza' },
  { key: 'platformName', header: 'Platform' },
  { key: 'customerName', header: 'Müşteri' },
  { key: 'customerEmail', header: 'E-posta' },
  { key: 'kind', header: 'Adres Türü' },
];

function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="flex flex-col justify-between gap-0.5 rounded-[4px] border border-border-soft bg-card px-3 py-2 shadow-xs">
      <span className="font-mono text-base font-bold tabular-nums text-fg">{value}</span>
      <span className="text-[11px] font-medium text-fg-muted">{label}</span>
      {hint && <span className="text-[10px] text-fg-subtle truncate">{hint}</span>}
    </div>
  );
}

interface CustomerEmailsViewProps {
  showInfo?: boolean;
  setShowInfo?: (show: boolean) => void;
  onExportReady?: (node: React.ReactNode) => void;
}

export function CustomerEmailsView({
  showInfo: externalShowInfo,
  setShowInfo: externalSetShowInfo,
  onExportReady,
}: CustomerEmailsViewProps = {}) {
  const [internalShowInfo, setInternalShowInfo] = useState(false);
  const showInfo = externalShowInfo !== undefined ? externalShowInfo : internalShowInfo;
  const setShowInfo = externalSetShowInfo || setInternalShowInfo;

  const [filter, setFilter] = useState<Filter>('all');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [search, setSearch] = useState('');

  const query = useQuery({
    queryKey: ['customer-emails', filter],
    queryFn: () => customerEmailApi.list(filter, 500),
    staleTime: 60_000,
  });

  const report = query.data;
  const summary = report?.summary;

  const exportMenuNode = useMemo(() => {
    if (!report || report.items.length === 0) return null;
    return (
      <ExportMenu
        filename="alici-epostalari"
        columns={EXPORT_COLUMNS}
        className="[&>.export-menu-trigger]:!h-8 [&>.export-menu-trigger]:!rounded-[4px] [&>.export-menu-trigger]:!px-2.5 [&>.export-menu-trigger]:!text-[12px]"
        getData={() =>
          report.items.map((r) => ({
            orderDate: r.orderDate.slice(0, 10),
            platformOrderNumber: formatOrderNumber(r.platformOrderNumber),
            storeName: r.storeName,
            platformName: r.platformName,
            customerName: r.customerName ?? '',
            customerEmail: r.customerEmail,
            kind: r.kind === 'Direct' ? 'Gerçek adres' : 'Pazaryeri adresi',
          }))
        }
      />
    );
  }, [report]);

  useEffect(() => {
    if (onExportReady) {
      onExportReady(exportMenuNode);
    }
  }, [exportMenuNode, onExportReady]);

  const reportItems = report?.items;
  const filteredItems = useMemo(() => {
    if (!reportItems) return [];
    let items = reportItems;
    if (selectedPlatform !== 'all') {
      items = items.filter((r) => r.platformName === selectedPlatform);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      items = items.filter(
        (r) =>
          r.platformOrderNumber.toLowerCase().includes(q) ||
          r.customerEmail.toLowerCase().includes(q) ||
          (r.customerName && r.customerName.toLowerCase().includes(q)) ||
          r.storeName.toLowerCase().includes(q)
      );
    }
    return items;
  }, [reportItems, selectedPlatform, search]);

  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />;

  return (
    <div className="flex min-h-full flex-col gap-3 p-4 sm:p-5">
      {/* Tıklanınca açılan sade bilgi kutusu */}
      {showInfo && (
        <div className="relative shrink-0 rounded-[4px] border border-border-soft bg-bg-subtle/70 p-3 pr-8 text-ui-xs leading-relaxed text-fg-muted transition-all">
          <button
            type="button"
            onClick={() => setShowInfo(false)}
            className="absolute right-2 top-2 rounded-[2px] p-1 text-fg-subtle hover:text-fg"
          >
            <X size={13} />
          </button>
          <p className="m-0">
            <strong className="font-semibold text-fg">Pazaryeri adresi</strong> (eBay, Amazon, Temu) maskeli bir yönlendirme adresidir. Yalnızca siparişle ilgili işlemsel mesajlara izin verir; kampanya/pazarlama e-postası hesaba yaptırım getirebilir. Türkiye pazaryerlerinde (Trendyol, Hepsiburada, N11, Çiçeksepeti) e-posta satıcıyla paylaşılmaz.
          </p>
        </div>
      )}

      {/* KPI Kartları - Keskin & Minimal */}
      <div className="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-5">
        <StatCard label="Toplam Sipariş" value={summary?.totalOrders ?? '…'} />
        <StatCard label="Adresi Olan Sipariş" value={summary?.withEmail ?? '…'} />
        <StatCard
          label="Gerçek Adres"
          value={summary?.direct ?? '…'}
          hint="Pazarlama yapılabilir"
        />
        <StatCard
          label="Pazaryeri Adresi"
          value={summary?.marketplaceProxy ?? '…'}
          hint="Yalnızca işlemsel"
        />
        <StatCard
          label="Benzersiz Gerçek Adres"
          value={summary?.uniqueDirectAddresses ?? '…'}
          hint="Ulaşılabilir tekil kişi"
        />
      </div>

      {/* Filtre ve Arama Çubuğu */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border-soft pb-2.5">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
          <FilterSelect
            value={filter}
            options={[
              { value: 'all', label: 'Tüm Adres Türleri' },
              { value: 'Direct', label: 'Gerçek Adres (Pazarlanabilir)' },
              { value: 'MarketplaceProxy', label: 'Pazaryeri Adresi (İşlemsel)' },
            ]}
            placeholder="Adres Türü"
            onChange={(val) => setFilter(val as Filter)}
            showAllOption={false}
            height="h-8"
            minWidth={180}
          />

          <FilterSelect
            value={selectedPlatform}
            options={[
              { value: 'all', label: 'Tüm Platformlar' },
              ...(report?.byPlatform ?? []).map((p) => ({
                value: p.platform,
                label: `${p.platform} (${p.direct + p.marketplaceProxy})`,
              })),
            ]}
            placeholder="Platform"
            onChange={(val) => setSelectedPlatform(val)}
            showAllOption={false}
            height="h-8"
            minWidth={150}
          />

          <div className="relative min-w-[180px] flex-1 sm:flex-none sm:w-60">
            <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Müşteri, e-posta veya sipariş ara…"
              className="h-8 w-full rounded-[4px] border border-border-soft bg-card pl-8 pr-2.5 text-xs text-fg outline-none transition focus:border-border"
            />
          </div>
        </div>

        {!onExportReady && exportMenuNode}
      </div>

      {/* Tablo - Yalnızca tablo alanı taşma halinde kayar */}
      <div className="min-h-[400px] flex-1 overflow-auto rounded-[4px] border border-border-soft bg-card shadow-xs">
        <table className="w-full border-collapse text-ui-sm">
          <thead className="sticky top-0 z-10 bg-bg-subtle">
            <tr className="border-b border-border-soft text-left text-ui-xs font-semibold text-fg-muted">
              <th className="px-3 py-2.5">Tarih</th>
              <th className="px-3 py-2.5">Sipariş</th>
              <th className="px-3 py-2.5">Müşteri</th>
              <th className="px-3 py-2.5">E-posta</th>
              <th className="px-3 py-2.5">Tür</th>
              <th className="px-3 py-2.5">Platform</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-soft/60">
            {query.isLoading && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-ui-xs text-fg-muted">
                  Yükleniyor…
                </td>
              </tr>
            )}
            {!query.isLoading && filteredItems.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-ui-xs text-fg-muted">
                  Bu filtrede kayıt bulunamadı.
                </td>
              </tr>
            )}
            {filteredItems.map((r) => (
              <tr key={r.id} className="transition-colors hover:bg-card-hover/60">
                <td className="whitespace-nowrap px-3 py-2 font-mono text-ui-xs text-fg-muted">
                  {r.orderDate.slice(0, 10)}
                </td>
                <td className="px-3 py-2">
                  <Link
                    href={`/orders/${r.id}`}
                    title={r.platformOrderNumber}
                    className="block max-w-[160px] truncate font-medium text-fg underline-offset-2 hover:underline"
                  >
                    {formatOrderNumber(r.platformOrderNumber)}
                  </Link>
                </td>
                <td className="px-3 py-2 text-fg-muted">{r.customerName ?? '—'}</td>
                <td className="px-3 py-2 font-mono text-ui-xs text-fg">{r.customerEmail}</td>
                <td className="px-3 py-2">
                  <span className="inline-block rounded px-1.5 py-0.5 text-ui-2xs font-medium bg-bg-subtle text-fg-muted">
                    {r.kind === 'Direct' ? 'Gerçek' : 'Pazaryeri'}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-ui-xs text-fg-muted">
                  {r.platformName} · {r.storeName}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {report && report.matchingCount > report.returnedCount && (
        <p className="m-0 text-ui-2xs text-fg-subtle">
          {report.matchingCount} kayıttan ilk {report.returnedCount} tanesi gösteriliyor.
        </p>
      )}
    </div>
  );
}
