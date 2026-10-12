'use client';

import { CUSTOMER_SEGMENTS, type CustomerSegment, type CustomerSummaryDto } from '../../lib/api/customers';
import { focusRing, motionFast } from '../shared/design';
import { HorizontalScroller } from './HorizontalScroller';
import { SEGMENT_META, segmentCount } from './customerSegments';

interface Props {
  value: CustomerSegment;
  summary: CustomerSummaryDto;
  onChange: (segment: CustomerSegment) => void;
}

// Müşteri segment sekmeleri. Telefonda yatay kayar; sayı, KPI şeridiyle aynı kaynaktan gelir.
export function CustomerSegmentNav({ value, summary, onChange }: Props) {
  return (
    <HorizontalScroller ariaLabel="Müşteri segmenti" fadeFromClass="from-[var(--bg)]"
      className="border-b border-[var(--border-soft)]">
      {CUSTOMER_SEGMENTS.map((segment) => {
        const meta = SEGMENT_META[segment];
        const active = segment === value;
        return (
          <button key={segment} type="button" title={meta.hint} aria-pressed={active} onClick={() => onChange(segment)}
            className={`-mb-px flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-2 py-2 text-xs font-semibold ${motionFast} ${focusRing} ${
              active
                ? 'border-[var(--accent)] text-[var(--fg)]'
                : 'border-transparent text-[var(--fg-muted)] hover:text-[var(--fg)]'
            }`}>
            {meta.label}
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${
              active ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'bg-[var(--bg-subtle)]'
            }`}>
              {(segmentCount(summary, segment) ?? 0).toLocaleString('tr-TR')}
            </span>
          </button>
        );
      })}
    </HorizontalScroller>
  );
}
