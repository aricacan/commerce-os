'use client';

import { surfaceCard } from '../shared/design';
import { formatMoney } from './explorerRules';
import { draftSubtotal, draftTotal, parseShipping, type OrderDraft } from './orderDraftRules';

interface Props {
  draft: OrderDraft;
  currency: string;
  paymentLabel: string;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-ui-2xs font-semibold text-fg-muted">{label}</dt>
      <dd className="m-0 break-words text-ui-xs text-fg">{value}</dd>
    </div>
  );
}

// Sipariş önizlemesi: gönderilecek siparişin özeti (müşteri, adres, ödeme, tutarlar). Onaydan önce son bakış.
export function OrderDraftSummary({ draft, currency, paymentLabel }: Props) {
  const money = (amount: number) => formatMoney({ amount, currency });
  const address = draft.address;
  const addressText = [address.addressLine, address.district, address.postalCode, address.city, address.countryCode.toUpperCase()]
    .map((part) => part.trim()).filter(Boolean).join(', ');

  return (
    <section className={`${surfaceCard} flex flex-col gap-2 p-3`} aria-label="Sipariş özeti">
      <h3 className="m-0 text-ui-sm font-bold text-fg">Sipariş özeti</h3>
      <dl className="m-0 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Row label="Müşteri" value={[draft.fullName.trim(), draft.email.trim()].filter(Boolean).join(' · ') || '—'} />
        <Row label="Teslimat" value={addressText || '—'} />
        <Row label="Ödeme" value={paymentLabel} />
        <Row label="Kalem" value={`${draft.lines.length} kalem · ${draft.lines.reduce((sum, line) => sum + line.quantity, 0)} adet`} />
      </dl>
      <dl className="m-0 grid grid-cols-3 gap-2 border-t border-border-soft pt-2">
        <Row label="Ara toplam" value={money(draftSubtotal(draft.lines))} />
        <Row label="Kargo" value={money(parseShipping(draft.shipping) ?? 0)} />
        <Row label="Toplam" value={money(draftTotal(draft))} />
      </dl>
    </section>
  );
}
