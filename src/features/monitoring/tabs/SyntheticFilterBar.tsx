'use client';

import { SegmentedControl } from '../../../components/ui/SegmentedControl';
import { FilterSelect } from '../../../components/ui/FilterSelect';
import type { SyntheticCheckStatus, SyntheticLayer } from '../../../lib/api';
import { ALL, type LayerFilter, type StatusFilter, type SyntheticFilters } from '../synthetic-groups';
import { LAYER_LABELS, LAYER_ORDER, STATUS_META } from '../synthetic';

const STATUS_ORDER: readonly SyntheticCheckStatus[] = ['failed', 'slow', 'skipped', 'passed'];

const LAYER_OPTIONS: { value: LayerFilter; label: string }[] = [
  { value: ALL, label: 'Tümü' },
  ...LAYER_ORDER.map((layer: SyntheticLayer) => ({ value: layer, label: LAYER_LABELS[layer] })),
];

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: ALL, label: 'Tümü' },
  ...STATUS_ORDER.map((status) => ({ value: status, label: STATUS_META[status].label })),
];

// Katman, durum ve modül süzgeci. Telefonda satırlar alta kayar; segmentler yatay kaydırılır
// ki sayfa yana taşmasın.
export function SyntheticFilterBar({ filters, moduleOptions, onChange }: {
  filters: SyntheticFilters;
  moduleOptions: { value: string; label: string }[];
  onChange: (filters: SyntheticFilters) => void;
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <div className="max-w-full overflow-x-auto">
        <SegmentedControl size="sm" value={filters.layer} options={LAYER_OPTIONS}
          onChange={(layer) => onChange({ ...filters, layer })} />
      </div>
      <div className="max-w-full overflow-x-auto">
        <SegmentedControl size="sm" value={filters.status} options={STATUS_OPTIONS}
          onChange={(status) => onChange({ ...filters, status })} />
      </div>
      <FilterSelect
        value={filters.group === ALL ? '' : filters.group}
        options={moduleOptions}
        placeholder="Tüm modüller"
        searchable
        onChange={(group) => onChange({ ...filters, group: group || ALL })}
      />
    </div>
  );
}
