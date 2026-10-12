'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, ShoppingBag } from 'lucide-react';
import { shopifyApi } from '../../lib/api/shopify';
import { describeError } from '../../lib/errors';
import { focusRing, motionFast, surfaceCard } from '../shared/design';
import { FormSelect } from '../../components/ui/FormSelect';
import { INSTALL_PARAM, takePendingInstall } from './pendingInstall';
import { AppCredentialFields } from './AppCredentialFields';
import { EMPTY_APP_CREDENTIALS, STORE_COUNTRIES, validateConnect, type ConnectDraft } from './storeRules';
import { fieldClass, primaryButtonClass } from './styles';

const EMPTY_DRAFT: ConnectDraft = { shop: '', countryCode: 'XK', name: '', brandName: '', app: EMPTY_APP_CREDENTIALS };

// "Shopify'a bağlan" — Meta'daki tek düğmeli bağlama gibi: mağaza adresi + ülke (+ ad/marka) seçilir,
// Shopify'ın onay ekranına gidilir, onaydan sonra panele geri dönülür. Client ID/Secret isteğe bağlıdır: boşsa genel uygulama kullanılır.
export function ConnectStoreForm() {
  const [draft, setDraft] = useState<ConnectDraft>(EMPTY_DRAFT);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Uç yoksa (backend henüz yayında değil) ya da uygulama ayarsızsa düğme anlamlı hata verir.
  const statusQuery = useQuery({ queryKey: ['shopify', 'app-status'], queryFn: shopifyApi.appStatus, staleTime: 300_000, retry: false });
  const missing = statusQuery.data && !statusQuery.data.configured ? statusQuery.data.missingSettings : [];
  const needsOwnApp = statusQuery.data?.defaultAppConfigured === false;

  usePrefillFromShopifyInstall((shop) => setDraft((d) => ({ ...d, shop })));

  const set = (field: 'shop' | 'countryCode' | 'name' | 'brandName') => (value: string) => setDraft((d) => ({ ...d, [field]: value }));

  const connect = async () => {
    const result = validateConnect(draft);
    if (!result.ok) { setError(result.error); return; }
    setBusy(true);
    setError(null);
    try {
      const { authorizeUrl } = await shopifyApi.startConnect(result.body);
      window.location.assign(authorizeUrl);
    } catch (e) {
      setError(describeError(e));
      setBusy(false);
    }
  };

  return (
    <form
      className={`${surfaceCard} flex flex-col gap-3 p-4`}
      onSubmit={(e) => { e.preventDefault(); void connect(); }}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Mağaza adresi" hint="storec ya da demo-store.myshopify.com">
          <input className={fieldClass} value={draft.shop} onChange={(e) => set('shop')(e.target.value)} placeholder="storec" autoComplete="off" />
        </Field>
        <Field label="Ülke" hint="Siparişler bu ülkeye göre yönlenir">
          <FormSelect
            ariaLabel="Ülke" value={draft.countryCode} onChange={set('countryCode')} triggerClassName="h-8 rounded-md"
            options={STORE_COUNTRIES.map((c) => ({ value: c.code, label: `${c.label} (${c.code})` }))}
          />
        </Field>
        <Field label="Panelde görünen ad" hint="Boşsa mağaza adresi">
          <input className={fieldClass} value={draft.name} onChange={(e) => set('name')(e.target.value)} placeholder="StoreC (Kosova)" />
        </Field>
        <Field label="Marka" hint="İsteğe bağlı">
          <input className={fieldClass} value={draft.brandName} onChange={(e) => set('brandName')(e.target.value)} placeholder="StoreC" />
        </Field>
      </div>

      <details className="rounded-md border border-border p-3" open={needsOwnApp || undefined}>
        <summary className={`cursor-pointer text-ui-xs font-semibold text-fg ${focusRing}`}>
          Kendi Shopify uygulamam (Dev Dashboard) — isteğe bağlı
        </summary>
        <div className="mt-3 flex flex-col gap-2">
          <AppCredentialFields value={draft.app} onChange={(app) => setDraft((d) => ({ ...d, app }))} />
          <p className="m-0 text-ui-2xs text-fg-muted">Boş bırakırsanız sunucudaki genel uygulama kullanılır.</p>
        </div>
      </details>

      {needsOwnApp && (
        <p role="status" className="m-0 text-ui-xs text-warning">
          Sunucuda genel Shopify uygulaması tanımlı değil; bu mağaza için kendi uygulamanızın Client ID/Secret bilgisini girin.
        </p>
      )}
      {missing.length > 0 && (
        <p role="status" className="m-0 text-ui-xs text-warning">
          Sunucuda Shopify uygulaması ayarlı değil. Eksik: {missing.join(', ')}
        </p>
      )}
      {error && <p role="alert" className="m-0 break-words text-ui-xs text-danger">{error}</p>}

      <button type="submit" disabled={busy || missing.length > 0} className={`${primaryButtonClass} ${focusRing} ${motionFast} self-start`}>
        {busy ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <ShoppingBag size={14} aria-hidden />}
        Shopify&apos;a bağlan
      </button>
    </form>
  );
}

// Shopify'dan başlayan kurulum (?install=<mağaza>) ya da girişten önce saklanmış mağaza: adres alanını doldurur.
// Bağlama yine kullanıcının "Shopify'a bağlan" onayıyla başlar — otomatik bağlanmaz.
function usePrefillFromShopifyInstall(onShop: (shop: string) => void) {
  useEffect(() => {
    const url = new URL(window.location.href);
    const shop = url.searchParams.get(INSTALL_PARAM) ?? takePendingInstall();
    if (!shop) return;
    onShop(shop);
    url.searchParams.delete(INSTALL_PARAM);
    window.history.replaceState(null, '', url.toString());
    // Yalnız ilk açılışta okunur.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

function Field({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-ui-xs font-semibold text-fg">{label}</span>
      {children}
      <span className="text-ui-2xs text-fg-muted">{hint}</span>
    </div>
  );
}
