'use client';

import type { ZonePrices } from './policyDraft';
import { SectionCard, ZoneHeader, ZonePriceInputs } from './ui';

interface FlatPriceSectionProps {
  zones: string[];
  currency: string;
  prices: ZonePrices;
  onChange: (prices: ZonePrices) => void;
}

// Adım 2 (sabit yöntem): tek satır — her teslimat bölgesinin tek fiyatı.
export function FlatPriceSection({ zones, currency, prices, onChange }: FlatPriceSectionProps) {
  return (
    <SectionCard tour="shipping-step2" title="2 · Sabit fiyat">
      <div className="overflow-x-auto rounded-[6px] border border-[var(--border-soft)]">
        <div className="min-w-fit">
          <div className="border-b border-[var(--border-soft)] bg-[var(--bg-subtle)]">
            <ZoneHeader zones={zones} first="Ürünler" />
          </div>
          <div className="flex items-center gap-2 px-3 py-2">
            <span className="min-w-40 flex-1 text-xs font-semibold text-[var(--fg)]">Tüm ürünler</span>
            <ZonePriceInputs
              zones={zones}
              prices={prices}
              currency={currency}
              rowLabel="Tüm ürünler"
              placeholder="0,00"
              onChange={(zone, value) => onChange({ ...prices, [zone]: value })}
            />
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
