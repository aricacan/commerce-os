'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ScanSearch } from 'lucide-react';
import {
  shopifyContentApi,
  type SaveShopifyContentBody,
  type ShopifyContentIssueDto,
  type ShopifyContentSuggestionDto,
} from '../../lib/api/shopify-content';
import { useFeedback } from '../shared/Feedback';
import { ContentIssueList } from './ContentIssueList';
import { ContentSuggestionPanel } from './ContentSuggestionPanel';
import { ImageAltSuggestionPanel } from './ImageAltSuggestionPanel';
import { PROBLEM_META, problemSummaryText } from './contentRules';
import { explorerErrorText, writeFailure } from './explorerRules';
import { StatusBadge } from './StatusBadge';
import { ghostButtonClass } from './styles';

interface Props {
  storeId: number;
}

interface OpenSuggestion {
  product: ShopifyContentIssueDto;
  suggestion: ShopifyContentSuggestionDto;
}

// İçerik kalitesi: kullanıcı düğmeye basınca etkin ürünler taranır (üst sınırlı); sorunlu üründe AI önerisi istenir,
// fark gösterilir, onaylanan alanlar yazılır. Tarama ve öneri hiçbir şey yazmaz.
export function ContentQualityTab({ storeId }: Props) {
  const { notify } = useFeedback();
  const [scanRequested, setScanRequested] = useState(false);
  const [open, setOpen] = useState<OpenSuggestion | null>(null);
  const [altProduct, setAltProduct] = useState<ShopifyContentIssueDto | null>(null);

  const scan = useQuery({
    queryKey: ['shopify', 'content-quality', storeId],
    queryFn: () => shopifyContentApi.scan(storeId),
    enabled: scanRequested,
    staleTime: Infinity,
    retry: false,
  });

  const suggest = useMutation({
    mutationFn: (product: ShopifyContentIssueDto) => shopifyContentApi.suggest(storeId, product.id),
    onSuccess: (suggestion, product) => setOpen({ product, suggestion }),
    onError: (error) => notify.error(explorerErrorText(error)),
  });

  const apply = useMutation({
    mutationFn: (body: SaveShopifyContentBody) => {
      if (!open) throw new Error('Açık öneri yok.');
      return shopifyContentApi.apply(storeId, open.product.id, body);
    },
  });

  // Dönen true: yazıldı (panel kapanır, tarama yenilenir).
  const applyBody = async (body: SaveShopifyContentBody): Promise<boolean> => {
    try {
      const failure = writeFailure(await apply.mutateAsync(body));
      if (failure) {
        notify.error(failure);
        return false;
      }
      notify.success('İçerik Shopify\'a yazıldı.');
      await scan.refetch();
      return true;
    } catch (error) {
      notify.error(explorerErrorText(error));
      return false;
    }
  };

  const data = scan.data;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button" className={ghostButtonClass} disabled={scan.isFetching}
          onClick={() => (scanRequested ? void scan.refetch() : setScanRequested(true))}
        >
          <ScanSearch size={14} aria-hidden /> {scan.isFetching ? 'Taranıyor…' : 'İçerik kalitesini tara'}
        </button>
        <span className="text-ui-2xs text-fg-muted">
          SEO başlığı/açıklaması, ürün açıklaması ve görselleri kontrol eder. AI önerisi hiçbir şeyi kendiliğinden yazmaz.
        </span>
      </div>

      {scan.error && <p role="alert" className="m-0 text-ui-xs text-danger">Tarama çalışmadı: {explorerErrorText(scan.error)}</p>}

      {open && (
        <ContentSuggestionPanel
          key={open.product.id} suggestion={open.suggestion} productTitle={open.product.title}
          busy={apply.isPending} onApply={applyBody} onClose={() => setOpen(null)}
        />
      )}

      {altProduct && (
        <ImageAltSuggestionPanel
          key={altProduct.id} storeId={storeId} productId={altProduct.id} productTitle={altProduct.title}
          onApplied={async () => void (await scan.refetch())} onClose={() => setAltProduct(null)}
        />
      )}

      {data && (
        <>
          <p className="m-0 text-ui-xs text-fg">
            {problemSummaryText(data.productsScanned, data.products.length)}
            {data.truncated && ' Tarama üst sınıra ulaştı; kalan ürünler taranmadı.'}
          </p>
          <div className="flex flex-wrap gap-1">
            {data.summary.map(({ problem, count }) => (
              <StatusBadge key={problem} label={`${PROBLEM_META[problem].label}: ${count}`} tone={PROBLEM_META[problem].tone} />
            ))}
          </div>
          <ContentIssueList
            products={data.products} suggestingId={suggest.isPending ? suggest.variables.id : null}
            onSuggest={(product) => suggest.mutate(product)} onSuggestAlt={setAltProduct}
          />
        </>
      )}
    </div>
  );
}
