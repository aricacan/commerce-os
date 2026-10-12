'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { claimsApi } from '../../lib/api/claims';
import { ErrorState } from '../../components/ui/ErrorState';
import { ExportMenu } from '../../components/ui/ExportMenu';
import type { ExportColumn } from '../../lib/export';
import { formatDateTime } from '../../lib/format';
import { formatOrderNumber } from '../../utils/orderNumber';

const EXPORT_COLUMNS: ExportColumn[] = [
  { key: 'claimDate', header: 'Tarih' },
  { key: 'platformOrderNumber', header: 'Sipariş No' },
  { key: 'sku', header: 'SKU' },
  { key: 'reason', header: 'Sebep' },
  { key: 'status', header: 'Durum' },
  { key: 'refundAmount', header: 'İade Tutarı', type: 'money' },
  { key: 'storeName', header: 'Mağaza' },
];

function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-[4px] border border-border-soft bg-card px-3.5 py-2.5 shadow-xs">
      <span className="font-mono text-ui-xl font-bold tabular-nums text-fg">{value}</span>
      <span className="text-ui-xs font-medium text-fg-muted">{label}</span>
      {hint && <span className="text-ui-2xs text-fg-subtle">{hint}</span>}
    </div>
  );
}

export function ReturnsView({
  search = '',
  showInfo = false,
  onCloseInfo,
  onExportReady,
}: {
  search?: string;
  showInfo?: boolean;
  onCloseInfo?: () => void;
  onExportReady?: (el: React.ReactNode) => void;
} = {}) {
  const query = useQuery({
    queryKey: ['claims', search],
    queryFn: () => claimsApi.list({ search: search || undefined, limit: 500 }),
    staleTime: 60_000,
  });

  const report = query.data;

  useEffect(() => {
    if (!onExportReady) return;
    if (report && report.items.length > 0) {
      onExportReady(
        <ExportMenu
          filename="iadeler"
          columns={EXPORT_COLUMNS}
          className="[&>.export-menu-trigger]:!h-8 [&>.export-menu-trigger]:!rounded-[4px] [&>.export-menu-trigger]:!px-2.5 [&>.export-menu-trigger]:!text-[12px]"
          getData={() =>
            report.items.map((r) => ({
              claimDate: r.claimDate.slice(0, 10),
              platformOrderNumber: formatOrderNumber(r.platformOrderNumber),
              sku: r.sku,
              reason: r.reason,
              status: r.status,
              refundAmount: r.refundAmount ?? 0,
              storeName: r.storeName,
            }))
          }
        />
      );
    } else {
      onExportReady(null);
    }
  }, [report, onExportReady]);

  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />;

  return (
    <div className="flex min-h-full flex-col gap-3 p-4 sm:p-5">
      {/* Tıklanınca açılan bilgi paneli */}
      {showInfo && (
        <div className="relative shrink-0 rounded-[4px] border border-border-soft bg-bg-subtle/70 p-3 pr-8 text-ui-xs leading-relaxed text-fg-muted transition-all">
          <button
            type="button"
            onClick={onCloseInfo}
            className="absolute right-2 top-2 rounded-[4px] p-1 text-fg-subtle hover:text-fg cursor-pointer"
          >
            <X size={13} />
          </button>
          <p className="m-0">
            <strong className="font-semibold text-fg">Kapsam:</strong> Yalnızca Sentos (Türkiye) üzerinden 3 saatte bir çekilen iade taleplerini içerir. Base/BaseLinker (eBay, Amazon, Temu) iadeleri henüz bu listede yer almamaktadır.
          </p>
          {report?.neverSynced && (
            <p className="m-0 mt-1 text-warning">
              Henüz senkronize edilmiş kayıt bulunmuyor (Hangfire: sentos-claim-sync).
            </p>
          )}
        </div>
      )}

      {/* KPI Kartları */}
      <div className="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-4">
        <StatCard label="Toplam Talep" value={report?.totalCount ?? '…'} />
        <StatCard
          label="Toplam İade Tutarı"
          value={report ? `₺${report.totalRefund.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}` : '…'}
        />
        <StatCard label="Farklı Sebep" value={report?.byReason.length ?? '…'} />
        <StatCard
          label="Son Senkron"
          value={report?.lastSyncedAt ? formatDateTime(report.lastSyncedAt) : '—'}
          hint={report?.neverSynced ? 'Henüz veri yazılmadı' : undefined}
        />
      </div>

      {/* Sebep Kırılımı */}
      {report && report.byReason.length > 0 && (
        <div className="flex shrink-0 flex-wrap gap-1.5">
          {report.byReason.slice(0, 12).map((r) => (
            <div
              key={r.reason}
              className="flex items-center gap-1.5 rounded-[4px] border border-border-soft bg-card px-2 py-0.5 text-ui-xs text-fg-muted"
            >
              <span className="font-medium text-fg">{r.reason || 'Belirtilmemiş'}</span>
              <span className="text-fg-subtle">·</span>
              <span>{r.count}</span>
            </div>
          ))}
        </div>
      )}

      {/* Tablo - min-h ve overflow-x-auto ile responsive yatay kaydırma */}
      <div className="min-h-[360px] flex-1 overflow-x-auto rounded-[4px] border border-border-soft bg-card shadow-xs">
        <table className="w-full min-w-[700px] border-collapse text-ui-sm">
          <thead className="sticky top-0 z-10 bg-bg-subtle/80 backdrop-blur-xs">
            <tr className="border-b border-border-soft text-left text-ui-xs font-semibold text-fg-muted">
              <th className="px-3 py-2.5">Tarih</th>
              <th className="px-3 py-2.5">Sipariş</th>
              <th className="px-3 py-2.5">SKU</th>
              <th className="px-3 py-2.5">Sebep</th>
              <th className="px-3 py-2.5">Durum</th>
              <th className="px-3 py-2.5 text-right">İade Tutarı</th>
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
            {!query.isLoading && report?.items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-ui-xs text-fg-muted">
                  Gösterilecek iade talebi bulunamadı.
                </td>
              </tr>
            )}
            {report?.items.map((r) => (
              <tr key={r.id} className="transition-colors hover:bg-card-hover/60">
                <td className="whitespace-nowrap px-3 py-2 font-mono text-ui-xs text-fg-muted">
                  {r.claimDate.slice(0, 10)}
                </td>
                <td title={r.platformOrderNumber} className="max-w-[160px] truncate px-3 py-2 font-medium text-fg">{formatOrderNumber(r.platformOrderNumber)}</td>
                <td className="px-3 py-2 font-mono text-ui-xs text-fg-muted">{r.sku}</td>
                <td className="px-3 py-2 text-fg-muted">{r.reason || '—'}</td>
                <td className="px-3 py-2 text-fg-muted">
                  <span className="inline-block rounded-[2px] px-1.5 py-0.5 text-ui-2xs font-medium bg-bg-subtle text-fg-muted">
                    {r.status || '—'}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right font-mono text-ui-xs text-fg">
                  {r.refundAmount != null
                    ? `${r.refundAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ${r.currency}`
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
