'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';
import { shopifyApi, type ShopifyStoreDto } from '../../lib/api/shopify';
import { workspaceRoute } from '../../lib/workspace-routes';
import { shopifyStoreFor } from './channelScopeRules';
import { ScopeBadge } from './ScopeBadge';

interface Props {
  country: string | null;
  brandName: string | null;
}

// Kanalın ülkesi/markasıyla eşleşen Shopify mağazasının durumu — SALT OKUNUR. Mağaza kimlik bilgileri ve
// ayarları Shopify Hub'dadır. Mağaza listesi alınamazsa (yetki, modül kapalı) kart hiç görünmez.
export function ChannelShopifyCard({ country, brandName }: Props) {
  const [stores, setStores] = useState<ShopifyStoreDto[]>([]);

  useEffect(() => {
    let cancelled = false;
    void shopifyApi.stores().then((list) => { if (!cancelled) setStores(list); }).catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  const store = shopifyStoreFor(stores, { country, brandName });
  if (!store) return null;

  return (
    <section className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border-soft)] bg-[var(--card)] p-4 shadow-xs">
      <div className="flex min-w-0 flex-col gap-0.5">
        <h3 className="m-0 flex items-center gap-1.5 text-xs font-bold text-[var(--fg)]">
          <ShoppingBag size={13} className="text-[var(--fg-muted)]" aria-hidden /> Shopify mağazası
        </h3>
        <span className="truncate text-[11px] text-[var(--fg-muted)]">{store.name} · {store.shopDomain}</span>
        {store.lastError && <span className="truncate text-[11px] text-rose-500" title={store.lastError}>{store.lastError}</span>}
      </div>
      <div className="flex items-center gap-2">
        <ScopeBadge label={store.isConnected ? 'Bağlı' : 'Bağlı değil'} tone={store.isConnected ? 'success' : 'warning'} />
        <Link href={workspaceRoute('shopify')} className="text-[11px] font-semibold text-[var(--fg)] underline-offset-2 hover:underline">
          Shopify Hub&apos;a git
        </Link>
      </div>
    </section>
  );
}
