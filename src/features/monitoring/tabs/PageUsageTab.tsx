'use client';

import { useState } from 'react';
import { MousePointerClick } from 'lucide-react';
import { useI18n } from '../../../lib/i18n';
import type { PageUsageDto } from '../../../lib/api';
import { usePageUsage } from '../../../hooks/monitoring/useMonitoringUsers';
import { formatDurationMs, formatRelative } from '../format';
import { resolveNavPage } from '../page-map';
import { DaysSelector, Panel, QueryStatus, TD_CLASS, TH_CLASS, useNow } from '../ui';

const DEFAULT_DAYS = 7;
const COLUMNS = ['Sayfa', 'Açılma', 'Kişi', 'Ort. süre', 'Son açılma'];

// "Hangi sayfalar kullanılıyor, kim, ne kadar." Sunucu yolu sol paneldeki ada çevrilir;
// panelde karşılığı olmayan yol (ör. /login) ham hâliyle gösterilir.
export function PageUsageTab() {
  const now = useNow();
  const [days, setDays] = useState(DEFAULT_DAYS);
  const usage = usePageUsage(days);

  const rows = [...(usage.data ?? [])].filter((row) => row.views > 0).sort((a, b) => b.views - a.views);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-[var(--fg-muted)]">
          {usage.data ? `${rows.length} sayfa açıldı` : 'Sayfa kullanımı'}
        </p>
        <DaysSelector value={days} onChange={setDays} />
      </div>

      <Panel>
        <QueryStatus
          isLoading={usage.isLoading}
          isError={usage.isError}
          isEmpty={rows.length === 0}
          onRetry={() => usage.refetch()}
          emptyIcon={MousePointerClick}
          emptyTitle="Bu dönemde sayfa açılmadı"
          emptyDescription="Kullanıcılar panelde gezindikçe sayfa açılışları burada birikir."
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] border-collapse">
              <thead>
                <tr className="bg-[var(--bg-subtle)]">
                  {COLUMNS.map((column) => <th key={column} className={TH_CLASS}>{column}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => <UsageRow key={row.path} row={row} now={now} />)}
              </tbody>
            </table>
          </div>
        </QueryStatus>
      </Panel>
    </div>
  );
}

function UsageRow({ row, now }: { row: PageUsageDto; now: number }) {
  const { t } = useI18n();
  const page = resolveNavPage(row.path);

  return (
    <tr className="hover:bg-[var(--bg-subtle)]">
      <td className={TD_CLASS}>
        <div className="flex flex-col">
          <span className="font-semibold">{page ? t(page.labelKey) : row.path}</span>
          <span className="font-mono text-ui-2xs text-[var(--fg-muted)]">
            {page?.groupKey ? `${t(page.groupKey)} · ` : ''}{row.path}
          </span>
        </div>
      </td>
      <td className={`${TD_CLASS} font-semibold`}>{row.views.toLocaleString('tr-TR')}</td>
      <td className={TD_CLASS}>{row.uniqueUsers}</td>
      <td className={TD_CLASS}>{formatDurationMs(row.avgDurationMs)}</td>
      <td className={`${TD_CLASS} text-[var(--fg-muted)]`}>{formatRelative(row.lastViewedAt, now)}</td>
    </tr>
  );
}
