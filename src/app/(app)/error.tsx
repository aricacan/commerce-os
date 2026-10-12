'use client';

import { useEffect, useMemo } from 'react';
import { ErrorState } from '../../components/ui/ErrorState';
import { classifyRenderError } from '../../lib/errors';
import { reportClientError } from '../../lib/telemetry';

// Bir sayfa render sırasında patlarsa Next.js bunu gösterir; Sidebar/Topbar ayakta kalır,
// kullanıcı beyaz ekranla karşılaşmaz ve başka sayfaya geçebilir.
// Client Component olmak ZORUNDA — hata sınırları öyle çalışır.
//
// `reset` DEĞİL `unstable_retry` kullanıyoruz (Next 16.2+): `reset` yalnızca yeniden
// render eder, veriyi tekrar çekmez. Buradaki hataların çoğu veri kaynaklı olduğu için
// veriyi de tazeleyen `unstable_retry` doğru olan.
//
// P33: render çökmesi HER ZAMAN aynı jenerik mesajı gösteriyordu — bkz. lib/errors.ts
// classifyRenderError() için gerekçe ve test.
export default function AppError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    // Hata yutulmasın: tarayıcı konsoluna ve oradan monitoring'e düşsün.
    console.error('[route error]', error);
    reportClientError({ message: error.message || 'Render hatası', stack: error.stack, source: 'boundary' });
  }, [error]);

  const known = useMemo(() => classifyRenderError(error.message ?? ''), [error.message]);

  return (
    <ErrorState
      className="h-full"
      title={known?.title ?? 'Sayfa yüklenemedi'}
      description={
        known?.description ??
        'Veriler alınırken bir sorun oluştu. Yeniden deneyebilir veya başka bir sekmeye geçebilirsiniz.'
      }
      onRetry={() => unstable_retry()}
      detail={error.digest}
    />
  );
}
