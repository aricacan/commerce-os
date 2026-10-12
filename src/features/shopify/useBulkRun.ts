'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ShopifyBulkResultDto } from '../../lib/api/shopify-bulk';
import { useFeedback } from '../shared/Feedback';
import { appliedIds, bulkSummaryText } from './bulkRules';
import { explorerErrorText } from './explorerRules';
import type { BulkSelection } from './useBulkSelection';

// Toplu çağrının ortak akışı: çağır → özeti bildir → uygulananları seçimden düş (başarısızlar seçili kalır,
// tekrar denenebilir) → listeyi yenile. Sonuç, kayıt bazlı gösterim için saklanır.
export function useBulkRun(selection: BulkSelection, refreshKey: readonly unknown[]) {
  const queryClient = useQueryClient();
  const { notify } = useFeedback();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ShopifyBulkResultDto | null>(null);

  const run = async (action: () => Promise<ShopifyBulkResultDto>): Promise<boolean> => {
    setBusy(true);
    try {
      const outcome = await action();
      setResult(outcome);
      if (outcome.succeeded === 0) notify.error(bulkSummaryText(outcome));
      else notify.success(bulkSummaryText(outcome));
      selection.remove(appliedIds(outcome));
      await queryClient.invalidateQueries({ queryKey: refreshKey });
      return outcome.failed === 0;
    } catch (e) {
      notify.error(explorerErrorText(e));
      return false;
    } finally {
      setBusy(false);
    }
  };

  return { busy, result, run, dismiss: () => setResult(null) };
}
