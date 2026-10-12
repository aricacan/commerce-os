'use client';

import type { ShopifySkuDiagnosisDto, ShopifySkuIssueDto } from '../../lib/api/shopify-explorer';
import { surfaceCard } from '../shared/design';
import { StatusBadge } from './StatusBadge';

interface Props {
  diagnosis: ShopifySkuDiagnosisDto;
}

function IssueList({ title, hint, issues }: { title: string; hint: string; issues: ShopifySkuIssueDto[] }) {
  return (
    <section className="flex flex-col gap-1" aria-label={title}>
      <h4 className="m-0 flex items-center gap-2 text-ui-xs font-bold text-fg">
        {title} <StatusBadge label={String(issues.length)} tone={issues.length > 0 ? 'warning' : 'success'} />
      </h4>
      <p className="m-0 text-ui-2xs text-fg-muted">{hint}</p>
      {issues.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
          {issues.map((issue) => (
            <li key={issue.sku} className="flex flex-wrap gap-x-3 text-ui-xs">
              <span className="font-mono text-ui-2xs font-semibold text-fg">{issue.sku}</span>
              <span className="min-w-0 break-words text-fg-muted">{issue.products.join(', ')}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// SKU tanısı sonucu: mağazada çift geçen, panel kataloğunda bulunamayan ve SKU'su olmayan varyantlar.
// "Ürün eşleşmedi" sipariş hatalarının ilk kaynağı budur.
export function SkuDiagnosisPanel({ diagnosis }: Props) {
  return (
    <div className={`${surfaceCard} flex flex-col gap-3 p-3`}>
      <p className="m-0 text-ui-xs text-fg">
        {diagnosis.variantsScanned} varyant tarandı
        {diagnosis.truncated ? ' (tarama üst sınırda durdu; mağazada daha fazla varyant var)' : ''}.
        SKU&apos;su olmayan varyant: {diagnosis.withoutSkuCount}.
      </p>
      <IssueList
        title="Panel kataloğunda bulunamayan SKU"
        hint="Sohbet siparişinde bu SKU'lar ürün eşleşmedi hatası verebilir."
        issues={diagnosis.unmatchedSkus}
      />
      <IssueList
        title="Mağazada birden çok varyantta geçen SKU"
        hint="Aynı SKU ile arama yanlış varyantı bulabilir."
        issues={diagnosis.duplicateSkus}
      />
    </div>
  );
}
