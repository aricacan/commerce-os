import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ShopifyWriteResultDto } from '../../lib/api/shopify-explorer';
import { useFeedback } from '../shared/Feedback';
import { explorerErrorText, writeFailure } from './explorerRules';

// Yazma akışı (liste anahtarını yeniler): çağır → Shopify reddini / hatayı göster → başarıda bildir, listeleri yenile. true = uygulandı.
export function useInvalidatingWrite(invalidateKey: readonly unknown[]) {
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
      await queryClient.invalidateQueries({ queryKey: invalidateKey });
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
