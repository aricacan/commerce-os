'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { shopifyApi } from '../../lib/api/shopify';
import { shopifyExplorerApi } from '../../lib/api/shopify-explorer';
import { useFeedback } from '../shared/Feedback';
import { explorerErrorText } from './explorerRules';
import { ExplorerState } from './ExplorerState';
import { shopifyBulkApi } from '../../lib/api/shopify-bulk';
import { PaymentGatewayCard } from './PaymentGatewayCard';
import { ShopSummaryCard } from './ShopSummaryCard';
import { StockAlertsCard } from './StockAlertsCard';
import { SHOPIFY_STORES_KEY } from './useShopifyStores';

interface Props {
  storeId: number;
}

const SUMMARY_STALE_MS = 30_000;

// Genel Bakış: mağaza özeti + ödeme yöntemi tanısı. "Bağlantıyı test et" sonrası özet ve mağaza listesi tazelenir.
export function OverviewTab({ storeId }: Props) {
  const queryClient = useQueryClient();
  const { notify } = useFeedback();
  const [verifying, setVerifying] = useState(false);

  const summary = useQuery({
    queryKey: ['shopify', 'summary', storeId],
    queryFn: () => shopifyExplorerApi.summary(storeId),
    staleTime: SUMMARY_STALE_MS,
  });
  const gateways = useQuery({
    queryKey: ['shopify', 'payment-gateways', storeId],
    queryFn: () => shopifyExplorerApi.paymentGateways(storeId),
    staleTime: SUMMARY_STALE_MS,
    retry: false,
  });

  const stock = useQuery({
    queryKey: ['shopify', 'stock-alerts', storeId],
    queryFn: () => shopifyBulkApi.stockAlerts(storeId),
    staleTime: SUMMARY_STALE_MS,
    retry: false,
  });

  const verify = async () => {
    setVerifying(true);
    try {
      const result = await shopifyApi.verify(storeId);
      if (result.success) notify.success(`${result.shopName ?? result.store.name} bağlantısı çalışıyor.`);
      else notify.error(result.error ?? 'Bağlantı başarısız.');
      await queryClient.invalidateQueries({ queryKey: ['shopify', 'summary', storeId] });
      await queryClient.invalidateQueries({ queryKey: SHOPIFY_STORES_KEY });
    } catch (e) {
      notify.error(explorerErrorText(e));
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <ExplorerState
        loading={summary.isLoading} error={summary.error} isEmpty={!summary.data}
        emptyTitle="Mağaza özeti yok" onRetry={() => void summary.refetch()}
      >
        {summary.data && <ShopSummaryCard summary={summary.data} verifying={verifying} onVerify={verify} />}
      </ExplorerState>

      <ExplorerState
        loading={stock.isLoading} error={stock.error} isEmpty={!stock.data}
        emptyTitle="Stok uyarısı yok" onRetry={() => void stock.refetch()}
      >
        {stock.data && summary.data && <StockAlertsCard alerts={stock.data} shopDomain={summary.data.store.shopDomain} />}
      </ExplorerState>

      <ExplorerState
        loading={gateways.isLoading} error={gateways.error} isEmpty={!gateways.data}
        emptyTitle="Ödeme tanısı yok" onRetry={() => void gateways.refetch()}
      >
        {gateways.data && <PaymentGatewayCard diagnosis={gateways.data} />}
      </ExplorerState>
    </div>
  );
}
