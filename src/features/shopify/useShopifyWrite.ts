'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ShopifyWriteResultDto } from '../../lib/api/shopify-explorer';
import { useFeedback } from '../shared/Feedback';
import { explorerErrorText, writeFailure } from './explorerRules';

// Yazma akışı: çağır → Shopify reddini göster → başarıda bildirim ver ve ilgili listeyi yenile.
// run, işlemin uygulanıp uygulanmadığını döner (form kapatma gibi sonrası çağırana kalır).
export function useShopifyWrite(refreshKey: readonly unknown[]) {
  const queryClient = useQueryClient();
  const { notify } = useFeedback();
  const [writing, setWriting] = useState(false);

  const run = async (action: () => Promise<ShopifyWriteResultDto>, successText: string): Promise<boolean> => {
    setWriting(true);
    try {
      const failure = writeFailure(await action());
      if (failure) {
        notify.error(failure);
        return false;
      }
      notify.success(successText);
      await queryClient.invalidateQueries({ queryKey: refreshKey });
      return true;
    } catch (e) {
      notify.error(explorerErrorText(e));
      return false;
    } finally {
      setWriting(false);
    }
  };

  return { writing, run };
}
