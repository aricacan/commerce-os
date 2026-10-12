'use client';

import { Wrench } from 'lucide-react';
import type { MonitoringInsightDto } from '../../../lib/api';
import { categoryCounts, CATEGORY_LABELS, fixableEvidence, type InsightFilter } from '../insights';

const CHIP_CLASS = 'flex h-7 items-center gap-1 rounded-full border px-3 text-xs font-semibold transition-colors';
const CHIP_ON = 'border-[var(--fg)] bg-[var(--fg)] text-[var(--bg)]';
const CHIP_OFF = 'border-[var(--border)] bg-[var(--card)] text-[var(--fg-muted)] hover:text-[var(--fg)]';

interface Props {
  insights: readonly MonitoringInsightDto[];
  filter: InsightFilter;
  onChange: (filter: InsightFilter) => void;
}

// Öneri süzgeci: kategori, "yalnız düzeltilebilir" ve kapatılanları göster. Yalnız öneri olan
// kategoriler sayılarıyla çıkar; mobilde satır kırılır (yatay kaydırma yok).
export function InsightFilterBar({ insights, filter, onChange }: Props) {
  const open = insights.filter((insight) => insight.status === 'new');
  const fixableCount = open.filter((insight) => fixableEvidence(insight).length > 0).length;
  const closedCount = insights.length - open.length;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        className={`${CHIP_CLASS} ${filter.category === 'all' ? CHIP_ON : CHIP_OFF}`}
        onClick={() => onChange({ ...filter, category: 'all' })}
      >
        Tümü
      </button>
      {categoryCounts(insights).map(({ category, count }) => (
        <button
          key={category}
          type="button"
          className={`${CHIP_CLASS} ${filter.category === category ? CHIP_ON : CHIP_OFF}`}
          onClick={() => onChange({ ...filter, category })}
        >
          {CATEGORY_LABELS[category]} · {count}
        </button>
      ))}
      {fixableCount > 0 ? (
        <button
          type="button"
          className={`${CHIP_CLASS} ${filter.onlyFixable ? CHIP_ON : CHIP_OFF}`}
          onClick={() => onChange({ ...filter, onlyFixable: !filter.onlyFixable })}
        >
          <Wrench size={12} /> Düzeltilebilir · {fixableCount}
        </button>
      ) : null}
      {closedCount > 0 ? (
        <label className="ml-auto flex min-h-8 items-center gap-1.5 text-xs text-[var(--fg-muted)]">
          <input
            type="checkbox"
            checked={filter.showClosed}
            onChange={(event) => onChange({ ...filter, showClosed: event.target.checked })}
          />
          Kapatılanları göster ({closedCount})
        </label>
      ) : null}
    </div>
  );
}
