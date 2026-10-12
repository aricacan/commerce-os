'use client';

import type { ShopifyPaymentGatewayDiagnosisDto } from '../../lib/api/shopify-explorer';
import { surfaceCard } from '../shared/design';
import { gatewayRoleLabel, gatewayWarning } from './explorerRules';
import { StatusBadge } from './StatusBadge';

interface Props {
  diagnosis: ShopifyPaymentGatewayDiagnosisDto;
}

// Ödeme yöntemi tanısı. Admin API mağazanın ödeme yöntemi listesini güvenilir vermez; burada yalnız SON SİPARİŞLERDE
// gerçekten kullanılan adlar gösterilir ve panelde tanımlı Kapıda ödeme / Havale adlarıyla karşılaştırılır.
export function PaymentGatewayCard({ diagnosis }: Props) {
  return (
    <article className={`${surfaceCard} flex flex-col gap-3 p-4`} aria-label="Ödeme yöntemi tanısı">
      <header className="flex flex-col gap-1">
        <h3 className="m-0 text-ui-sm font-bold text-fg">Ödeme yöntemleri</h3>
        <p className="m-0 text-ui-2xs text-fg-muted">
          Shopify tam yöntem listesini vermez; son {diagnosis.sampledOrders} siparişte kullanılan adlar gösterilir.
        </p>
      </header>

      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {diagnosis.configured.map((item) => {
          const warning = gatewayWarning(item);
          return (
            <li key={item.role} className="flex flex-wrap items-center gap-2 text-ui-xs">
              <StatusBadge label={gatewayRoleLabel(item.role)} tone={warning.tone} />
              <span className="min-w-0 flex-1 basis-56 break-words text-fg">{warning.text}</span>
            </li>
          );
        })}
      </ul>

      <section className="flex flex-col gap-1" aria-label="Son kullanılan yöntemler">
        <h4 className="m-0 text-ui-xs font-bold text-fg">Son kullanılan yöntemler</h4>
        {diagnosis.used.length === 0 ? (
          <p className="m-0 text-ui-xs text-fg-muted">Son siparişlerde ödeme yöntemi kaydı yok.</p>
        ) : (
          <ul className="m-0 flex list-none flex-wrap gap-1 p-0">
            {diagnosis.used.map((used) => (
              <li key={used.name}><StatusBadge label={`${used.name} · ${used.orderCount}`} tone="neutral" /></li>
            ))}
          </ul>
        )}
        {diagnosis.ordersWithoutGateway > 0 && (
          <p className="m-0 text-ui-2xs text-fg-muted">{diagnosis.ordersWithoutGateway} siparişte ödeme yöntemi kaydı yok.</p>
        )}
      </section>
    </article>
  );
}
