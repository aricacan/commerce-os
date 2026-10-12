'use client';

import { useEffect, useState } from 'react';

// SDK tipleri tek yerde: iki bağlama düğmesi de aynı window.FB'yi kullanıyor.
export type FacebookLoginResponse = { authResponse?: { code?: string }; status?: string };

export type FacebookSdk = {
  init(options: { appId: string; autoLogAppEvents: boolean; xfbml: boolean; version: string }): void;
  login(callback: (response: FacebookLoginResponse) => void, options: Record<string, unknown>): void;
};

declare global {
  interface Window {
    FB?: FacebookSdk;
    __storebMetaSdkInitialized?: boolean;
  }
}

const SDK_ID = 'meta-facebook-sdk';
const SDK_SRC = 'https://connect.facebook.net/en_US/sdk.js';
const POLL_MS = 200;
const GIVE_UP_MS = 15_000;

// Meta JavaScript SDK'sını yükler ve BİR KEZ başlatır; hazır olunca true döner.
//
// Neden hook: WhatsApp ve Facebook bağlama düğmeleri aynı SDK'yı paylaşıyor. Her ikisi de
// kendi <Script id="meta-facebook-sdk"> etiketini basıyordu; Next.js aynı id'li script'i
// TEKİLLEŞTİRDİĞİ için yalnız ilk bileşenin onReady'si çalışıyor, ikincisi "SDK hazır
// değil" sanıp düğmesini SONSUZA DEK devre dışı bırakıyordu (canlıda "Facebook ile
// bağlan" tıklanamıyordu). Ayrıca ayarlar sunucudan async geldiği için script önce
// yüklenirse başlatma erken çıkıyor ve bir daha denenmiyordu.
//
// Çözüm onReady'ye güvenmemek: script tek sefer eklenir, window.FB belirene kadar kısa
// aralıklarla yoklanır. İki düğme de kendi hazır bilgisini bağımsız öğrenir.
export function useFacebookSdk(appId: string | undefined, graphApiVersion = 'v21.0'): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!appId) return;

    let cancelled = false;

    if (!document.getElementById(SDK_ID)) {
      const script = document.createElement('script');
      script.id = SDK_ID;
      script.src = SDK_SRC;
      script.async = true;
      document.head.appendChild(script);
    }

    const tryInit = () => {
      if (cancelled || !window.FB) return false;
      // init YALNIZ bir kez: ikinci çağrı Meta tarafından yok sayılsa da uyarı basar.
      if (!window.__storebMetaSdkInitialized) {
        window.FB.init({ appId, autoLogAppEvents: true, xfbml: true, version: graphApiVersion });
        window.__storebMetaSdkInitialized = true;
      }
      setReady(true);
      return true;
    };

    if (tryInit()) return;

    const timer = window.setInterval(() => { if (tryInit()) window.clearInterval(timer); }, POLL_MS);
    // SDK hiç yüklenmezse (reklam engelleyici, ağ) sonsuza dek yoklamayalım.
    const giveUp = window.setTimeout(() => window.clearInterval(timer), GIVE_UP_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.clearTimeout(giveUp);
    };
  }, [appId, graphApiVersion]);

  return ready;
}
