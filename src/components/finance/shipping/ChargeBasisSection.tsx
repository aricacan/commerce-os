'use client';

import type { ShippingChargeBasis } from '../../../lib/api/shipping-policies';
import { CHARGE_BASIS_OPTIONS } from './policyDraft';
import { SectionCard, Segmented } from './ui';

interface ChargeBasisSectionProps {
  value: ShippingChargeBasis;
  onChange: (value: ShippingChargeBasis) => void;
}

// Adım 3 (kategori / sabit yöntem): kargo ürün başına mı, sipariş başına mı ödenir.
export function ChargeBasisSection({ value, onChange }: ChargeBasisSectionProps) {
  const hint = CHARGE_BASIS_OPTIONS.find((o) => o.key === value)?.hint;

  return (
    <SectionCard tour="shipping-basis" title="3 · Ödeme şekli">
      <div className="flex flex-wrap items-center gap-3">
        <Segmented value={value} options={CHARGE_BASIS_OPTIONS} onChange={onChange} />
        <span className="text-[11px] text-[var(--fg-muted)]">{hint}</span>
      </div>
    </SectionCard>
  );
}
