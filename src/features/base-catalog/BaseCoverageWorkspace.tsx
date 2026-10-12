'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { baseCatalogApi, type BaseCoverageCategory, type BaseCoverageRow } from '../../lib/api/base-catalog';
import { filterCoverageRows } from './base-catalog-view';
import { CoverageMatrix } from './CoverageMatrix';
import { CoverageCellPanel } from './CoverageCellPanel';
import { ExportMenu } from '../../components/ui/ExportMenu';
import { buildCoverageExportColumns, toCoverageExportRows } from './base-catalog-export';

interface SelectedCell {
  row: BaseCoverageRow;
  category: BaseCoverageCategory;
}

export function BaseCoverageWorkspace() {
  const [search, setSearch] = useState('');
  const [onlyGaps, setOnlyGaps] = useState(false);
  const [selected, setSelected] = useState<SelectedCell | null>(null);

  const coverageQuery = useQuery({
    queryKey: ['base-catalog', 'coverage'],
    queryFn: () => baseCatalogApi.coverage(),
    staleTime: 5 * 60_000,
  });

  const categories = useMemo(() => coverageQuery.data?.categories ?? [], [coverageQuery.data]);
  const rows = useMemo(
    () => filterCoverageRows(coverageQuery.data?.rows ?? [], { search, onlyGaps, categories }),
    [coverageQuery.data, search, onlyGaps, categories],
  );

  // Matrisin ekrandaki hali birebir aktarılır: arama ve "sadece boşluğu olanlar"
  // filtreleri uygulanmış satırlar, sütunlar da o anki kategori listesi.
  const exportColumns = useMemo(() => buildCoverageExportColumns(categories), [categories]);
  const exportRows = () => toCoverageExportRows(rows, categories);

  if (coverageQuery.isError) {
    return <p className="p-4 text-sm text-[var(--fg-muted)]">Kapsam verisi yüklenemedi. Sayfayı yenile.</p>;
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-4">
      <div data-tour="base-coverage-filters" className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--fg-subtle)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Marka veya model ara"
            className="w-56 rounded-[4px] border border-[var(--border)] bg-[var(--bg-subtle)] py-1.5 pl-7 pr-2 text-sm text-[var(--fg)] outline-none focus:border-[var(--fg-muted)]"
          />
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--fg-muted)]">
          <input
            type="checkbox"
            checked={onlyGaps}
            onChange={(e) => setOnlyGaps(e.target.checked)}
            className="cursor-pointer"
          />
          Sadece boşluğu olanlar
        </label>

        <span className="text-xs text-[var(--fg-subtle)]">
          {rows.length} satır · {categories.length} kategori
        </span>

        <div data-tour="base-coverage-export" className="ml-auto">
          <ExportMenu
            filename="base-kategori-kapsami"
            label="Dışarı Aktar"
            columns={exportColumns}
            getData={exportRows}
          />
        </div>
      </div>

      <div data-tour="base-coverage-matrix" className="flex min-h-0 flex-1 gap-3">
        {coverageQuery.isLoading ? (
          <p className="px-2 py-4 text-sm text-[var(--fg-muted)]">Yükleniyor…</p>
        ) : (
          <CoverageMatrix
            categories={categories}
            rows={rows}
            onCellClick={(row, category) => setSelected({ row, category })}
          />
        )}

        {selected && (
          <CoverageCellPanel
            row={selected.row}
            category={selected.category}
            onClose={() => setSelected(null)}
          />
        )}
      </div>
    </div>
  );
}
