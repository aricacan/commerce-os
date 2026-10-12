'use client';

import { useQuery } from '@tanstack/react-query';
import { erpSourcesApi } from '../../lib/api';
import type { ErpSourceInfo } from '../../lib/api';
import { FilterSelect, type FilterSelectOption } from '../../components/ui/FilterSelect';

interface Props {
  selectedId: number | null;
  onChange: (id: number) => void;
  minWidth?: number | string;
}

export function useErpSourceFilter() {
  const { data: sources, isLoading } = useQuery({
    queryKey: ['erp-sources'],
    queryFn: () => erpSourcesApi.list(),
    staleTime: 5 * 60_000,
  });
  return { sources: sources ?? [], isLoading };
}

export function ErpSourceFilter({
  sources,
  selectedId,
  onChange,
  minWidth = 180,
}: Props & { sources: ErpSourceInfo[] }) {
  const options: FilterSelectOption[] = sources.map((s) => ({
    value: String(s.id),
    label: `${s.displayName} (${s.erp})`,
  }));

  return (
    <FilterSelect
      value={selectedId != null ? String(selectedId) : ''}
      options={options}
      placeholder="ERP Kaynağı"
      onChange={(val) => {
        const num = parseInt(val, 10);
        if (!isNaN(num)) onChange(num);
      }}
      minWidth={minWidth}
    />
  );
}
