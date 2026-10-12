'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';
import { ExternalLink, Loader2 } from 'lucide-react';
import { BASE, getBackendUrl } from '../../lib/api/core';
import { shopifyApi } from '../../lib/api/shopify';
import { decideEmbeddedEntry, type ShopifyEmbeddedStatus } from './embeddedRules';
import { primaryButtonClass } from './styles';

const APP_BRIDGE_URL = 'https://cdn.shopify.com/shopifycloud/app-bridge.js';
const INSTALL_PATH = '/api/shopify/oauth/install';
const PANEL_PATH = '/shopify';
const APP_BRIDGE_POLL_MS = 100;
const APP_BRIDGE_WAIT_MS = 10_000;

interface AppBridge {
  idToken: () => Promise<string>;
}
declare global {
  interface Window {
    shopify?: AppBridge;
  }
}

type ViewState = { phase: 'loading' } | { phase: 'ready'; status: ShopifyEmbeddedStatus } | { phase: 'error'; message: string };

// Shopify admin içinde: App Bridge oturum token'ı ile "bu mağaza panelde bağlı mı" sorulur; bağlama/yönetim
// panelde yapılır (giriş + kiracı onayı gerekir), bu sayfa yalnız yönlendirir. Üst pencerede açılırsa
// (Shopify'dan kurulum başlangıcı) istek imza doğrulaması için backend'e aktarılır.
// App Bridge'in api-key'i (Client ID) mağazanın uygulamasına göre backend'den alınır; NEXT_PUBLIC env yalnız yedek.
export function ShopifyEmbeddedApp() {
  const [view, setView] = useState<ViewState>({ phase: 'loading' });
  // null = henüz çözülmedi; '' = çözülemedi.
  const [apiKey, setApiKey] = useState<string | null>(null);

  useEffect(() => {
    const entry = decideEmbeddedEntry(window.location.search, window.top === window.self);
    if (entry.kind === 'install') {
      window.location.replace(`${getBackendUrl(INSTALL_PATH)}${entry.search}`);
      return;
    }
    if (entry.kind === 'panel') {
      window.location.replace(PANEL_PATH);
      return;
    }
    void resolveApiKey(new URLSearchParams(window.location.search).get('shop')).then(setApiKey);
  }, []);

  useEffect(() => {
    if (apiKey === null) return;
    if (apiKey === '') {
      setView({ phase: 'error', message: 'Bu mağaza için Shopify uygulama anahtarı bulunamadı. Panelden mağazayı bağlayın.' });
      return;
    }
    void loadStatus().then(setView);
  }, [apiKey]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col items-center justify-center gap-4 p-6 text-center">
      {apiKey && (
        <>
          <meta name="shopify-api-key" content={apiKey} />
          <Script src={APP_BRIDGE_URL} strategy="afterInteractive" />
        </>
      )}
      <h1 className="m-0 text-ui-md font-bold text-fg">ERP</h1>
      <ViewBody view={view} />
    </main>
  );
}

function ViewBody({ view }: { view: ViewState }) {
  if (view.phase === 'loading') return <Loader2 size={20} className="animate-spin text-fg-muted" aria-label="Yükleniyor" />;
  if (view.phase === 'error') return <p role="alert" className="m-0 text-ui-xs text-danger">{view.message}</p>;

  const { status } = view;
  return (
    <>
      <p className="m-0 text-ui-xs text-fg-muted">
        {status.connected
          ? `${status.shopDomain} mağazası panele bağlı. Yönetim için paneli açın.`
          : `${status.shopDomain} henüz panele bağlı değil. Panelde giriş yapıp bağlantıyı tamamlayın.`}
      </p>
      {/* Gömülü iframe'de panel giriş çerezi kullanılamaz: üst pencerede açılır. */}
      <a href={status.panelUrl} target="_top" rel="noopener" className={primaryButtonClass}>
        <ExternalLink size={14} aria-hidden />
        {status.connected ? 'Paneli aç' : 'Bağlantıyı tamamla'}
      </a>
    </>
  );
}

async function resolveApiKey(shop: string | null): Promise<string> {
  const fallback = process.env.NEXT_PUBLIC_SHOPIFY_CLIENT_ID ?? '';
  if (!shop) return fallback;
  try {
    return (await shopifyApi.embeddedConfig(shop)).clientId ?? fallback;
  } catch {
    return fallback;
  }
}

async function loadStatus(): Promise<ViewState> {
  try {
    const bridge = await waitForAppBridge();
    const token = await bridge.idToken();
    const response = await fetch(`${BASE}/shopify/embedded/status`, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) return { phase: 'error', message: 'Shopify oturumu doğrulanamadı. Uygulamayı Shopify admin içinden yeniden açın.' };
    return { phase: 'ready', status: (await response.json()) as ShopifyEmbeddedStatus };
  } catch {
    return { phase: 'error', message: 'Shopify ile bağlantı kurulamadı. Sayfayı yenileyin.' };
  }
}

function waitForAppBridge(): Promise<AppBridge> {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      if (window.shopify) {
        window.clearInterval(timer);
        resolve(window.shopify);
      } else if (Date.now() - startedAt > APP_BRIDGE_WAIT_MS) {
        window.clearInterval(timer);
        reject(new Error('App Bridge yüklenmedi'));
      }
    }, APP_BRIDGE_POLL_MS);
  });
}
