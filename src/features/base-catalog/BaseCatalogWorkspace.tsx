'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react';
import { baseCatalogApi } from '../../lib/api/base-catalog';
import { filterMakes, flattenModelYears, type ModelYearEntry } from './base-catalog-view';
import { MakeList } from './MakeList';
import { ModelYearList } from './ModelYearList';
import { CatalogProductGrid } from './CatalogProductGrid';
import { ExportMenu } from '../../components/ui/ExportMenu';
import { CATALOG_EXPORT_COLUMNS, toCatalogExportRows } from './base-catalog-export';

// Mobilde üç kolon sığmaz: aynı state üzerinde geri butonlu drill-down'a düşülür.
type MobileStep = 'makes' | 'models' | 'products';

export function BaseCatalogWorkspace() {
  const [search, setSearch] = useState('');
  const [selectedMake, setSelectedMake] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<ModelYearEntry | null>(null);
  const [mobileStep, setMobileStep] = useState<MobileStep>('makes');

  const treeQuery = useQuery({
    queryKey: ['base-catalog', 'tree'],
    queryFn: () => baseCatalogApi.tree(),
    staleTime: 5 * 60_000,
  });

  const makes = useMemo(() => filterMakes(treeQuery.data ?? [], search), [treeQuery.data, search]);
  const activeMake = useMemo(
    () => (treeQuery.data ?? []).find((m) => m.make === selectedMake) ?? null,
    [treeQuery.data, selectedMake],
  );
  const entries = useMemo(() => flattenModelYears(activeMake), [activeMake]);

  const productsQuery = useQuery({
    queryKey: ['base-catalog', 'products', selectedMake, selectedEntry?.model, selectedEntry?.year],
    queryFn: () => baseCatalogApi.products({
      make: selectedMake ?? undefined,
      model: selectedEntry?.model,
      year: selectedEntry?.year,
      pageSize: 200,
    }),
    enabled: selectedMake !== null && selectedEntry !== null,
  });

  const handleSelectMake = (make: string) => {
    setSelectedMake(make);
    setSelectedEntry(null);
    setMobileStep('models');
  };

  const handleSelectEntry = (entry: ModelYearEntry) => {
    setSelectedEntry(entry);
    setMobileStep('products');
  };

  if (treeQuery.isError) {
    return <p className="p-4 text-sm text-[var(--fg-muted)]">Katalog yüklenemedi. Sayfayı yenile.</p>;
  }

  const products = productsQuery.data?.items ?? [];
  const productsEmptyMessage = selectedEntry ? 'Bu seçimde ürün yok.' : 'Bir model ve yıl seç.';

  // Seçim varsa onu, yoksa TÜM kataloğu aktar. "Ne görüyorsan onu" kuralı burada işe
  // yaramaz: hiçbir model seçili değilken ekranda ürün yoktur ve dosya boş çıkardı.
  const exportRows = () => baseCatalogApi
    .productsAll({
      make: selectedMake ?? undefined,
      model: selectedEntry?.model,
      year: selectedEntry?.year,
    })
    .then(toCatalogExportRows);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-4">
      {/* Mobil geri şeridi */}
      <button
        type="button"
        onClick={() => setMobileStep(mobileStep === 'products' ? 'models' : 'makes')}
        className={[
          'flex w-fit cursor-pointer items-center gap-1 rounded-[4px] px-2 py-1 text-sm text-[var(--fg-muted)] md:hidden',
          mobileStep === 'makes' ? 'invisible' : 'visible',
        ].join(' ')}
      >
        <ChevronLeft className="h-4 w-4" />
        Geri
      </button>

      <div data-tour="base-catalog-export" className="flex items-center justify-between gap-3">
        <span className="text-xs text-[var(--fg-subtle)]">
          {selectedEntry
            ? `${selectedMake} ${selectedEntry.model} · ${selectedEntry.year}`
            : 'Seçim yok — dışa aktarım tüm kataloğu kapsar'}
        </span>
        <ExportMenu
          filename="base-arac-katalogu"
          label="Dışarı Aktar"
          columns={CATALOG_EXPORT_COLUMNS}
          getDataAsync={exportRows}
        />
      </div>

      <div className="grid min-h-0 flex-1 gap-4 md:grid-cols-[220px_260px_1fr]">
        <section data-tour="base-catalog-makes" className={mobileStep === 'makes' ? 'min-h-0' : 'hidden min-h-0 md:block'}>
          <MakeList
            makes={makes}
            selected={selectedMake}
            search={search}
            onSearchChange={setSearch}
            onSelect={handleSelectMake}
          />
        </section>

        <section data-tour="base-catalog-models" className={mobileStep === 'models' ? 'min-h-0' : 'hidden min-h-0 md:block'}>
          <ModelYearList entries={entries} selected={selectedEntry} onSelect={handleSelectEntry} />
        </section>

        <section data-tour="base-catalog-products" className={mobileStep === 'products' ? 'min-h-0' : 'hidden min-h-0 md:block'}>
          <CatalogProductGrid
            products={products}
            isLoading={productsQuery.isLoading}
            emptyMessage={productsEmptyMessage}
          />
        </section>
      </div>
    </div>
  );
}
