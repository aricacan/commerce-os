'use client';

import { SHOPIFY_CATALOG_AUTHORITY, type ShopifyCatalogAuthority } from '../../lib/api/shopify';
import type { ErpMatchSummaryDto } from '../../lib/api/shopify-erp-match';
import { surfaceCard } from '../shared/design';
import { formatMatchRate, READINESS_META, riskCount } from './erpMatchRules';
import { StatusBadge } from './StatusBadge';
import { ghostButtonClass } from './styles';

interface Props {
  summary: ErpMatchSummaryDto;
  authority: ShopifyCatalogAuthority | undefined;
  onOpenStores: () => void;
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex min-w-24 flex-col gap-0.5">
      <span className="text-ui-lg font-bold text-fg">{value}</span>
      <span className="text-ui-2xs text-fg-muted">{label}</span>
    </div>
  );
}

// "Mağaza katalog yetkisini ERP'ye çevirmeye hazır mı" özeti. Rapor yazmaz; yetki ayarı Mağazalar sekmesindedir.
export function ErpMatchReadinessCard({ summary, authority, onOpenStores }: Props) {
  const meta = READINESS_META[summary.readiness];
  const authorityLabel = authority === SHOPIFY_CATALOG_AUTHORITY.Erp ? 'ERP' : 'Shopify';

  return (
    <section className={`${surfaceCard} flex flex-col gap-3 p-3`} aria-label="ERP'ye çevirme hazırlığı">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="m-0 flex items-center gap-2 text-ui-sm font-bold text-fg">
          Katalog yetkisi hazırlığı <StatusBadge label={meta.label} tone={meta.tone} />
        </h3>
        <button type="button" className={ghostButtonClass} onClick={onOpenStores}>
          Katalog yetkisi: {authorityLabel} · Mağazalar sekmesinde değiştir
        </button>
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-3">
        <Stat label="Eşleşme oranı" value={formatMatchRate(summary.matchRate)} />
        <Stat label="Eşleşen SKU" value={summary.matchedCount} />
        <Stat label="Riskli (çakışma, boşluk farkı, SKU'suz)" value={riskCount(summary)} />
        <Stat label="Yalnız Shopify'da" value={summary.shopifyOnlyCount} />
        <Stat label="Yalnız ERP'de" value={summary.erpOnlyCount} />
        <Stat label="Fiyat farkı" value={summary.priceDiffCount} />
        <Stat label="Stok farkı" value={summary.stockDiffCount} />
      </div>
      <p className="m-0 text-ui-2xs text-fg-muted">
        {summary.shopifyVariantsScanned} Shopify varyantı ve {summary.erpItemsScanned} ERP kaydı tarandı.
        Fiyat farkı eşiği %{summary.priceTolerancePercent}, stok farkı eşiği {summary.stockTolerance} adet.
        Fiyatlar para birimi dönüştürülmeden karşılaştırılır.
      </p>
      {summary.readinessReasons.length > 0 && (
        <ul className="m-0 flex list-disc flex-col gap-0.5 pl-4 text-ui-xs text-fg">
          {summary.readinessReasons.map((reason) => <li key={reason}>{reason}</li>)}
        </ul>
      )}
    </section>
  );
}
