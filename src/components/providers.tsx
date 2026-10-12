'use client';

import { ThemeProvider } from 'next-themes';
import { QueryClient, QueryClientProvider, MutationCache, QueryCache } from '@tanstack/react-query';
import { useState, useEffect, type ReactNode } from 'react';
import { I18nProvider } from '../lib/i18n';
import { toast } from '../lib/toast';
import { describeError } from '../lib/errors';
import { useStoreSelector } from '../stores/store-selector';
import { AlertStack } from './alerts/AlertStack';
import { BackgroundJobWatcher } from './alerts/BackgroundJobWatcher';
import { WelcomeToast } from './alerts/WelcomeToast';
import { FeedbackModal } from './feedback/FeedbackModal';
import { InstallPrompt } from './pwa/InstallPrompt';
import { DEFAULT_QUERY_OPTIONS } from '../lib/query-policy';
import { parseApiError, reportClientError } from '../lib/telemetry';
import { IS_DEMO } from '../lib/demo/config';

const SERVER_ERROR_MIN = 500;

// Sessiz hata: sorgu patladı, ekranda boş tablo ya da sonsuz "yükleniyor" kaldı — kullanıcı
// fark etmeyebilir, biz de. 4xx beklenen durumlar (yetki, bulunamadı) gürültü olur; yalnız
// 5xx, zaman aşımı ve ağ hatası (durum kodu yok) İzleme > Hatalar'a düşer.
function reportFailure(error: unknown): void {
  const { status, correlationId } = parseApiError(error);
  if (status !== undefined && status < SERVER_ERROR_MIN) return;
  if (error instanceof Error && error.message === 'Session expired') return;
  const message = error instanceof Error ? error.message : String(error);
  reportClientError({ message, source: 'query', status, correlationId });
}

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Demo'da servis çalışanı kayıt edilmez: tüm istekler zaten tarayıcıda cevaplanıyor.
    if (IS_DEMO || !('serviceWorker' in navigator)) return;

    // GELİŞTİRMEDE KAYIT EDİLMEZ. sw.js API isteklerini araya girip ağ hatasında
    // 503 {"error":"offline"} döndürüyor; dev sunucusu yeniden başladığında bu
    // "şifre hatalı" gibi görünen sahte giriş hatalarına yol açıyordu. Ayrıca
    // eski chunk'ları önbellekten servis edip HMR'ı bozuyor.
    if (process.env.NODE_ENV !== 'production') {
      navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister()));
      return;
    }

    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, []);

  const [queryClient] = useState(
    () =>
      new QueryClient({
        // Uygulamada 139 mutation var. Her birine tek tek bildirim eklemek hem
        // günler sürer hem de her yeni mutation'da unutulur. Bunun yerine TEK
        // kural burada: yazma işlemi patlarsa kullanıcı MUTLAKA haberdar olur.
        //
        //   • Hata   → varsayılan olarak bildirilir. Sayfa hatayı kendisi görünür
        //              biçimde gösteriyorsa `meta: { silentError: true }` ile susturulur.
        //   • Başarı → varsayılan olarak SESSİZ. Her başarıya jenerik "tamam" basmak
        //              gürültü olurdu; anlamlı olan yerlerde `meta.successMessage` verilir.
        mutationCache: new MutationCache({
          onSuccess: (_data, _vars, _ctx, mutation) => {
            const message = mutation.meta?.successMessage;
            if (message) toast.success(message);
          },
          onError: (error, _vars, _ctx, mutation) => {
            reportFailure(error);
            if (mutation.meta?.silentError) return;
            toast.error(describeError(error));
          },
        }),
        queryCache: new QueryCache({ onError: reportFailure }),
        defaultOptions: DEFAULT_QUERY_OPTIONS,
      }),
  );

  // Mağaza seçimi değişince (Topbar) tüm sorguları geçersiz kılıp yeniden çektiriyoruz —
  // aksi halde eski mağazanın cache'lenmiş verisi ekranda kalmaya devam eder.
  useEffect(() => {
    return useStoreSelector.subscribe(() => {
      queryClient.invalidateQueries();
    });
  }, [queryClient]);

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <QueryClientProvider client={queryClient}>
        <I18nProvider>
          {children}
          <AlertStack />
          <BackgroundJobWatcher />
          <WelcomeToast />
          <FeedbackModal />
          <InstallPrompt />
        </I18nProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
