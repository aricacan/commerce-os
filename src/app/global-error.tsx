'use client';

import { useEffect } from 'react';
import './globals.css';
import { ErrorState } from '../components/ui/ErrorState';
import { classifyRenderError } from '../lib/errors';
import { reportClientError } from '../lib/telemetry';

// app/(app)/error.tsx yalnızca (app) segmentini kurtarır — Sidebar/Topbar bile
// render edilemeyecek kadar KÖK seviyesinde bir çökme (ör. login sayfası, Providers,
// ya da RootLayout'un kendisi) olduğunda Next.js bunu değil, BU dosyayı kullanır.
// Next.js kuralı: kök hata sınırı kendi <html>/<body>'sini basmak ZORUNDA — RootLayout
// devre dışı kaldığı için burada tekrarlanır.
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[global error]', error);
    reportClientError({ message: error.message || 'Render hatası', stack: error.stack, source: 'boundary' });
  }, [error]);

  const known = classifyRenderError(error.message ?? '');

  return (
    <html lang="tr">
      <body>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ErrorState
            title={known?.title ?? 'Uygulama açılamadı'}
            description={
              known?.description ??
              'Beklenmeyen bir hata oldu. Sayfayı yenilemek çoğu zaman yeterli olur.'
            }
            onRetry={() => window.location.reload()}
            retryLabel="Sayfayı Yenile"
            detail={error.digest}
          />
        </div>
      </body>
    </html>
  );
}
