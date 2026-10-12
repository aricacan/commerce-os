'use client';

import { useState } from 'react';
import { ExternalLink, Link2, Power, RefreshCw, Webhook } from 'lucide-react';
import { shopifyApi, SHOPIFY_STORE_STATUS, type ShopifyStoreDto } from '../../lib/api/shopify';
import { describeError } from '../../lib/errors';
import { badgeBase, badgeTone, focusRing, surfaceCard } from '../shared/design';
import { useFeedback } from '../shared/Feedback';
import { StoreCatalogSettings } from './StoreCatalogSettings';
import { StorePriceGuardSettings } from './StorePriceGuardSettings';
import { StoreOrderSettings } from './StoreOrderSettings';
import { StoreAppCredentials } from './StoreAppCredentials';
import { STORE_STATUS_META, appBadgeFor, missingScopeCount } from './storeRules';
import { ghostButtonClass } from './styles';

interface Props {
  store: ShopifyStoreDto;
  onChanged: () => Promise<void>;
}

// Bağlı mağaza kartı: durum, scope hazırlığı, test / webhook / yeniden bağlan / aç-kapa ve sipariş ayarları.
export function StoreCard({ store, onChanged }: Props) {
  const { notify, confirm } = useFeedback();
  const [busy, setBusy] = useState(false);
  const status = STORE_STATUS_META[store.status];
  const disabled = store.status === SHOPIFY_STORE_STATUS.Disabled;
  const missing = missingScopeCount(store);
  const appBadge = appBadgeFor(store);

  const run = async (action: () => Promise<string | null>) => {
    setBusy(true);
    try {
      const message = await action();
      if (message) notify.success(message);
      await onChanged();
    } catch (e) {
      notify.error(describeError(e));
    } finally {
      setBusy(false);
    }
  };

  const verify = () => run(async () => {
    const result = await shopifyApi.verify(store.id);
    if (!result.success) throw new Error(result.error ?? 'Bağlantı başarısız.');
    return `${result.shopName ?? store.name} bağlantısı çalışıyor.`;
  });

  const syncWebhooks = () => run(async () => {
    const result = await shopifyApi.syncWebhooks(store.id);
    if (result.errors.length > 0) throw new Error(result.errors.join(' · '));
    return `Webhook'lar hazır (${result.subscribed.length} yeni, ${result.alreadyPresent.length} mevcut).`;
  });

  const reconnect = () => run(async () => {
    const { authorizeUrl } = await shopifyApi.startConnect({ shopDomain: store.shopDomain, countryCode: store.countryCode });
    window.location.assign(authorizeUrl);
    return null;
  });

  const toggleActive = async () => {
    if (!disabled) {
      const ok = await confirm({
        title: `${store.name} devre dışı bırakılsın mı?`,
        body: 'Sipariş senkronu da kapanır; bu mağazaya sohbet siparişi açılmaz.',
        confirmLabel: 'Devre dışı bırak',
        danger: true,
      });
      if (!ok) return;
    }
    await run(async () => {
      await shopifyApi.setActive(store.id, disabled);
      return disabled ? 'Mağaza etkinleştirildi.' : 'Mağaza devre dışı.';
    });
  };

  return (
    <article className={`${surfaceCard} flex flex-col gap-3 p-4`} aria-label={store.name}>
      <header className="flex flex-wrap items-center gap-2">
        <h3 className="m-0 text-ui-sm font-bold text-fg">{store.name}</h3>
        <span className={`${badgeBase} ${badgeTone[status.tone]}`}>{status.label}</span>
        <span className={`${badgeBase} ${badgeTone.neutral}`}>{store.countryCode}</span>
        <span className={`${badgeBase} ${badgeTone[appBadge.tone]}`}>{appBadge.label}</span>
        {store.brandName && <span className="text-ui-xs text-fg-muted">{store.brandName}</span>}
        <div className="flex-1" />
        <a href={store.adminUrl} target="_blank" rel="noopener noreferrer"
          className={`inline-flex items-center gap-1 text-ui-xs text-fg-muted underline-offset-2 hover:text-fg hover:underline ${focusRing}`}>
          {store.shopDomain} <ExternalLink size={12} aria-hidden />
        </a>
      </header>

      {store.lastError && <p role="alert" className="m-0 break-words text-ui-xs text-danger">{store.lastError}</p>}
      {missing > 0 && (
        <p className="m-0 text-ui-xs text-warning">
          Eksik izin: {store.readiness.flatMap((r) => r.missingScopes).join(', ')} — Dev Dashboard&apos;da uygulamanın yeni sürümünü
          bu izinlerle yayınlayıp &quot;Yeniden bağlan&quot; deyin.
        </p>
      )}

      <StoreOrderSettings store={store} disabled={disabled || busy} onSaved={onChanged} />
      <StoreCatalogSettings store={store} disabled={disabled || busy} onSaved={onChanged} />
      <StorePriceGuardSettings store={store} disabled={disabled || busy} onSaved={onChanged} />

      <div className="flex flex-wrap gap-2">
        <button type="button" className={`${ghostButtonClass} ${focusRing}`} disabled={busy || disabled} onClick={() => void verify()}>
          <RefreshCw size={14} aria-hidden /> Bağlantıyı test et
        </button>
        <button type="button" className={`${ghostButtonClass} ${focusRing}`} disabled={busy || disabled} onClick={() => void syncWebhooks()}>
          <Webhook size={14} aria-hidden /> Webhook&apos;ları eşitle
        </button>
        <button type="button" className={`${ghostButtonClass} ${focusRing}`} disabled={busy} onClick={() => void reconnect()}>
          <Link2 size={14} aria-hidden /> Yeniden bağlan
        </button>
        <button type="button" className={`${ghostButtonClass} ${focusRing}`} disabled={busy} onClick={() => void toggleActive()}>
          <Power size={14} aria-hidden /> {disabled ? 'Etkinleştir' : 'Devre dışı bırak'}
        </button>
        <StoreAppCredentials store={store} disabled={busy} onSaved={onChanged} />
      </div>
    </article>
  );
}
