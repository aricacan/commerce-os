'use client';

import { useMemo } from 'react';
import { useI18n } from '../../lib/i18n';
import type { ChartDataPoint } from '../../types/api';

export function WidgetDataSummary({ data, limit }: { data: ChartDataPoint[] | undefined; limit: string }) {
  const { t } = useI18n();
  const stats = useMemo(() => {
    if (!data?.length) return null;
    const limitValue = limit === 'all' ? null : Number(limit);
    const visibleData = limitValue ? data.slice(0, limitValue) : data;
    const values = visibleData.map((item) => item.value);
    const maximum = Math.max(...values);
    return {
      count: visibleData.length,
      total: values.reduce((sum, value) => sum + value, 0),
      maximum,
      maximumLabel: visibleData[values.indexOf(maximum)]?.label ?? '',
      minimum: Math.min(...values),
    };
  }, [data, limit]);

  if (!stats) return null;
  const formatValue = (value: number) => value >= 1000 ? `${(value / 1000).toFixed(1)}K` : value.toLocaleString('tr-TR');
  const cells = [
    { label: t('customize_data_count'), value: String(stats.count) },
    { label: t('widget_total_label'), value: formatValue(stats.total) },
    { label: t('widget_maximum_label'), value: `${formatValue(stats.maximum)} (${stats.maximumLabel})` },
    { label: t('customize_lowest'), value: formatValue(stats.minimum) },
  ];

  return (
    <div className="grid shrink-0 grid-cols-4 border-t border-[var(--border)]">
      {cells.map(({ label, value }) => (
        <div key={label} className="border-r border-[var(--border)] px-3 py-2">
          <p className="mb-0.5 text-[9.5px] font-medium text-[var(--fg-muted)]">{label}</p>
          <p className="truncate whitespace-nowrap text-[12.5px] font-bold text-[var(--fg)]">{value}</p>
        </div>
      ))}
    </div>
  );
}
