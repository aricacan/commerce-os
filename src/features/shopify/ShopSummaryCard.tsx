'use client';

import { CircleAlert, PlugZap } from 'lucide-react';
import type { ShopifyShopSummaryDto } from '../../lib/api/shopify-explorer';
import { surfaceCard } from '../shared/design';
import { STORE_STATUS_META } from './storeRules';
import { StatusBadge } from './StatusBadge';
import { ghostButtonClass } from './styles';

interface Props {
  summary: ShopifyShopSummaryDto;
  verifying: boolean;
  onVerify: () => void;
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-ui-2xs font-semibold text-fg-muted">{label}</dt>
      <dd className="m-0 break-words text-ui-xs text-fg">{value}</dd>
    </div>
  );
}

// Mağaza özeti: panel kaydı (durum, ülke, API sürümü, uygulama tipi) + canlı Shopify bilgisi (ad, plan, para birimi,
// saat dilimi, scope'lar). Canlı bilgi alınamazsa nedeni açıkça yazılır. "Bağlantıyı test et" mevcut doğrulamayı çalıştırır.
export function ShopSummaryCard({ summary, verifying, onVerify }: Props) {
  const { store, shop } = summary;
  const status = STORE_STATUS_META[store.status];

  return (
    <article className={`${surfaceCard} flex flex-col gap-3 p-4`} aria-label="Mağaza özeti">
      <header className="flex flex-wrap items-center gap-2">
        <h3 className="m-0 text-ui-sm font-bold text-fg">{shop?.name ?? store.name}</h3>
        <StatusBadge label={status.label} tone={status.tone} />
        <StatusBadge label={store.countryCode} tone="neutral" />
        <button type="button" className={`${ghostButtonClass} ml-auto`} disabled={verifying} onClick={onVerify}>
          <PlugZap size={14} aria-hidden /> {verifying ? 'Test ediliyor…' : 'Bağlantıyı test et'}
        </button>
      </header>

      {summary.liveError && (
        <p role="alert" className="m-0 flex items-start gap-2 rounded-md bg-danger-soft px-3 py-2 text-ui-xs text-danger">
          <CircleAlert size={14} className="mt-0.5 shrink-0" aria-hidden />
          <span>Shopify&apos;dan canlı bilgi alınamadı: {summary.liveError}</span>
        </p>
      )}

      <dl className="m-0 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Fact label="Mağaza adresi" value={store.shopDomain} />
        <Fact label="Plan" value={shop?.planName ?? '—'} />
        <Fact label="Para birimi" value={shop?.currency ?? store.currency ?? '—'} />
        <Fact label="Saat dilimi" value={shop?.timeZone ?? '—'} />
        <Fact label="API sürümü" value={store.apiVersion} />
        <Fact label="Uygulama" value={store.usesOwnApp ? 'Mağazaya özel uygulama' : 'Genel uygulama'} />
      </dl>

      {shop && (
        <section className="flex flex-col gap-1" aria-label="İzinler">
          <h4 className="m-0 text-ui-xs font-bold text-fg">İzinler (scope)</h4>
          <p className="m-0 break-words text-ui-2xs text-fg-muted">{shop.grantedScopes.length > 0 ? shop.grantedScopes.join(', ') : 'Verilmiş izin yok'}</p>
          {shop.missingScopes.length > 0 && (
            <p className="m-0 text-ui-xs text-warning">Eksik izin: {shop.missingScopes.join(', ')} — Mağazalar sekmesinden &quot;Yeniden bağlan&quot;.</p>
          )}
        </section>
      )}
    </article>
  );
}
