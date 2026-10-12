'use client';

import { FilterSelect, type FilterSelectOption } from '../../components/ui/FilterSelect';
import type { OutboundEmailKind, OutboundEmailStatus } from '../../lib/api/omnichannel-email-outbound';
import { compactInputClass } from './formClasses';
import {
  DATE_RANGE, OUTBOUND_KIND_OPTIONS, OUTBOUND_RANGE_OPTIONS, OUTBOUND_STATUS_OPTIONS,
  type DateRange, type OutboundEmailFilters,
} from './outboundEmailRules';

interface Props {
  filters: OutboundEmailFilters;
  channelOptions: FilterSelectOption[];
  onChange: (filters: OutboundEmailFilters) => void;
}

const asRange = (value: string): DateRange => (value === '' ? DATE_RANGE.All : (value as DateRange));

// Tür / durum / kanal / tarih aralığı. Boş seçim "hepsi" demektir.
export function OutboundEmailFilterBar({ filters, channelOptions, onChange }: Props) {
  const patch = (change: Partial<OutboundEmailFilters>) => onChange({ ...filters, ...change });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <FilterSelect value={filters.kind ?? ''} options={OUTBOUND_KIND_OPTIONS} placeholder="Tüm türler" ariaLabel="Tür"
        minWidth={130} onChange={(v) => patch({ kind: v === '' ? null : (v as OutboundEmailKind) })} />
      <FilterSelect value={filters.status ?? ''} options={OUTBOUND_STATUS_OPTIONS} placeholder="Tüm durumlar" ariaLabel="Durum"
        minWidth={130} onChange={(v) => patch({ status: v === '' ? null : (v as OutboundEmailStatus) })} />
      <FilterSelect value={filters.channelId === null ? '' : String(filters.channelId)} options={channelOptions}
        placeholder="Tüm kanallar" ariaLabel="Kanal" minWidth={150}
        onChange={(v) => patch({ channelId: v === '' ? null : Number(v) })} />
      <FilterSelect value={filters.range === DATE_RANGE.All ? '' : filters.range} options={OUTBOUND_RANGE_OPTIONS}
        placeholder="Tüm zamanlar" ariaLabel="Tarih aralığı" minWidth={140} onChange={(v) => patch({ range: asRange(v) })} />
      {filters.range === DATE_RANGE.Custom && (
        <div className="flex items-center gap-2">
          <input type="date" aria-label="Başlangıç tarihi" value={filters.customFrom}
            onChange={(e) => patch({ customFrom: e.target.value })} className={`${compactInputClass} w-auto`} />
          <span className="text-[var(--fg-muted)]">–</span>
          <input type="date" aria-label="Bitiş tarihi" value={filters.customTo}
            onChange={(e) => patch({ customTo: e.target.value })} className={`${compactInputClass} w-auto`} />
        </div>
      )}
    </div>
  );
}
