'use client';

import { useSearchParams } from 'next/navigation';

/**
 * Modül çalışma alanının ilk sekmesi adresteki `?tab=` ile seçilebilir — Sistem İzleme >
 * Öneriler'deki "Erpis › Canlı Veri" gibi bağlantılar doğrudan o sekmeyi açar. Yalnız ilk
 * değer içindir; sonrası sekmenin kendi yerel durumu (adres her tıklamada değişmez).
 * Bilinmeyen/eksik değer varsayılana düşer.
 */
export function useInitialTab<T extends string>(keys: readonly T[], fallback: T): T {
  const requested = useSearchParams().get('tab');
  return keys.find((key) => key === requested) ?? fallback;
}
