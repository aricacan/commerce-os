'use client';

import { ExternalLink } from 'lucide-react';
import type { ShopifyStockAlertsDto } from '../../lib/api/shopify-bulk';
import { surfaceCard } from '../shared/design';
import { adminProductUrl, stockAlertText } from './bulkRules';
import { StatusBadge } from './StatusBadge';

interface Props {
  alerts: ShopifyStockAlertsDto;
  shopDomain: string;
}

// Genel Bakış "Stok uyarıları": stoksuz + düşük stoklu aktif ürün sayısı ve en düşük stoklu ürünler.
// Ürün adı Shopify yönetiminde düzenleme sayfasını açar. Eşik sunucu varsayılanıdır (ShopifyHubOptions.LowStockThreshold).
export function StockAlertsCard({ alerts, shopDomain }: Props) {
  const text = stockAlertText(alerts);

  return (
    <article className={`${surfaceCard} flex flex-col gap-3 p-4`} aria-label="Stok uyarıları">
      <header className="flex flex-wrap items-center gap-2">
        <h3 className="m-0 text-ui-sm font-bold text-fg">Stok uyarıları</h3>
        <StatusBadge label={`${alerts.outOfStockCount} stoksuz`} tone={alerts.outOfStockCount > 0 ? 'danger' : 'neutral'} />
        <StatusBadge label={`${alerts.lowStockCount} düşük stok`} tone={alerts.lowStockCount > 0 ? 'warning' : 'neutral'} />
      </header>
      {text === null ? (
        <p className="m-0 text-ui-xs text-fg-muted">Aktif ürünlerde stok sorunu yok.</p>
      ) : (
        <>
          <p className="m-0 text-ui-xs text-fg-muted">{text} En düşük stoklular:</p>
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {alerts.items.map((item) => (
              <li key={item.id} className="flex items-center gap-2 text-ui-xs">
                <span className="w-12 shrink-0 text-right font-mono font-semibold text-fg">{item.totalInventory}</span>
                <a
                  href={adminProductUrl(shopDomain, item.id)} target="_blank" rel="noopener noreferrer"
                  className="inline-flex min-w-0 items-center gap-1 text-fg hover:underline"
                >
                  <span className="truncate">{item.title}</span>
                  <ExternalLink size={12} aria-hidden className="shrink-0" />
                </a>
              </li>
            ))}
          </ul>
        </>
      )}
    </article>
  );
}
