'use client';

import { useState } from 'react';
import type { ShopifyWriteResultDto } from '../../lib/api/shopify-explorer';
import { useFeedback } from '../shared/Feedback';
import { explorerErrorText, writeFailure } from './explorerRules';

// Shopify yazma çağrısının ortak akışı: çağır → Shopify reddini ya da hatayı göster → başarıda bildir ve `onSuccess` çalıştır.
// Dönüş: yazma uygulandı mı (çağıran, ürün kimliği gibi sonuca ihtiyaç duyarsa `onApplied` ile alır).
export function useWriteAction(onSuccess: () => Promise<void> | void) {
  const { notify } = useFeedback();
  const [busy, setBusy] = useState(false);

  const run = async (
    action: () => Promise<ShopifyWriteResultDto>,
    successText: string,
    onApplied?: (result: ShopifyWriteResultDto) => void,
  ): Promise<boolean> => {
    setBusy(true);
    try {
      const result = await action();
      const failure = writeFailure(result);
      if (failure) {
        notify.error(failure);
        // Kısmi yazma (ör. ürün açıldı ama varyantlar eklenemedi): sonuç kimlik taşır, liste yine de yenilenmeli.
        if (result.id !== null) await onSuccess();
        return false;
      }
      notify.success(successText);
      onApplied?.(result);
      await onSuccess();
      return true;
    } catch (e) {
      notify.error(explorerErrorText(e));
      return false;
    } finally {
      setBusy(false);
    }
  };

  return { busy, run };
}
