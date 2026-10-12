'use client';

import { useState } from 'react';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, ScanSearch } from 'lucide-react';
import { SHOPIFY_CATALOG_AUTHORITY } from '../../lib/api/shopify';
import { shopifyExplorerApi, type ShopifyProductFilters } from '../../lib/api/shopify-explorer';
import { EMPTY_PRODUCT_FILTERS, explorerErrorText, hasActiveFilters } from './explorerRules';
import { ExplorerState } from './ExplorerState';
import { BulkProductBar } from './BulkProductBar';
import { PagerBar } from './PagerBar';
import { ProductEditorView } from './ProductEditorView';
import { ProductFilters } from './ProductFilters';
import { ProductList } from './ProductList';
import { SkuDiagnosisPanel } from './SkuDiagnosisPanel';
import { ghostButtonClass } from './styles';
import { useBulkSelection } from './useBulkSelection';
import { useCursorPaging } from './useCursorPaging';
import { useProductRemoval } from './useProductRemoval';
import { useShopifyStores } from './useShopifyStores';

interface Props {
  storeId: number;
}

const LIST_STALE_MS = 30_000;

// null = düzenleyici kapalı, 'new' = yeni ürün, sayı = o ürünü düzenle.
type EditorTarget = 'new' | number | null;

// Ürünler: canlı sayfalı liste + ürün oluştur/düzenle + "SKU tanısı" (kullanıcı düğmeye basınca taranır; üst sınırlı).
export function ProductsTab({ storeId }: Props) {
  const queryClient = useQueryClient();
  const stores = useShopifyStores();
  const authority = stores.data?.find((s) => s.id === storeId)?.catalogAuthority ?? SHOPIFY_CATALOG_AUTHORITY.Shopify;
  const [editor, setEditor] = useState<EditorTarget>(null);
  const [filters, setFilters] = useState<ShopifyProductFilters>(EMPTY_PRODUCT_FILTERS);
  const [diagnosisRequested, setDiagnosisRequested] = useState(false);
  const paging = useCursorPaging();
  const selection = useBulkSelection();

  const list = useQuery({
    queryKey: ['shopify', 'products', storeId, filters, paging.after],
    queryFn: () => shopifyExplorerApi.products(storeId, filters, paging.after),
    placeholderData: keepPreviousData,
    staleTime: LIST_STALE_MS,
  });
  const diagnosis = useQuery({
    queryKey: ['shopify', 'sku-diagnosis', storeId],
    queryFn: () => shopifyExplorerApi.skuDiagnosis(storeId),
    enabled: diagnosisRequested,
    staleTime: Infinity,
    retry: false,
  });

  const applyFilters = (next: ShopifyProductFilters) => {
    paging.reset();
    setFilters(next);
  };

  const refreshList = () => queryClient.invalidateQueries({ queryKey: ['shopify', 'products', storeId] });
  const removal = useProductRemoval(storeId, refreshList);

  const products = list.data?.items ?? [];
  const filtered = hasActiveFilters({ ...filters });

  if (editor !== null) {
    return (
      <ProductEditorView
        storeId={storeId} productId={editor === 'new' ? null : editor} authority={authority}
        onClose={() => setEditor(null)} onChanged={refreshList} onCreated={setEditor}
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <button type="button" className={ghostButtonClass} onClick={() => setEditor('new')}>
          <Plus size={14} aria-hidden /> Yeni ürün
        </button>
      </div>
      <section className="flex flex-col gap-2" aria-label="SKU tanısı">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button" className={ghostButtonClass} disabled={diagnosis.isFetching}
            onClick={() => (diagnosisRequested ? void diagnosis.refetch() : setDiagnosisRequested(true))}
          >
            <ScanSearch size={14} aria-hidden /> {diagnosis.isFetching ? 'Taranıyor…' : 'SKU tanısı çalıştır'}
          </button>
          <span className="text-ui-2xs text-fg-muted">Mağaza SKU&apos;larını panel kataloğuyla karşılaştırır (çift / eşleşmeyen).</span>
        </div>
        {diagnosis.error && <p role="alert" className="m-0 text-ui-xs text-danger">SKU tanısı çalışmadı: {explorerErrorText(diagnosis.error)}</p>}
        {diagnosis.data && <SkuDiagnosisPanel diagnosis={diagnosis.data} />}
      </section>

      <ProductFilters applied={filters} onApply={applyFilters} />
      <ExplorerState
        loading={list.isLoading} error={list.error} isEmpty={products.length === 0}
        emptyTitle={filtered ? 'Süzgece uyan ürün yok' : 'Mağazada ürün yok'}
        emptyDescription={filtered ? 'Süzgeçleri gevşetip tekrar deneyin.' : undefined}
        onRetry={() => void list.refetch()}
      >
        <BulkProductBar storeId={storeId} pageIds={products.map((product) => product.id)} selection={selection} />
        <ProductList
          products={products} onEdit={setEditor} selection={selection} busy={removal.busy}
          onArchive={(product) => void removal.archive(product.id, product.title)}
          onDelete={(product) => void removal.remove(product.id, product.title)}
        />
        <PagerBar
          pageNumber={paging.pageNumber} hasPrevious={paging.hasPrevious} hasNext={Boolean(list.data?.hasNextPage)}
          busy={list.isFetching} total={list.data?.total} onPrevious={paging.previous}
          onNext={() => list.data?.endCursor && paging.next(list.data.endCursor)}
        />
      </ExplorerState>
    </div>
  );
}
