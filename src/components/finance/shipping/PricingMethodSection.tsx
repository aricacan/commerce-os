'use client';

import { Equal, FolderTree, Ruler, type LucideIcon } from 'lucide-react';
import type { ShippingPricingMethod } from '../../../lib/api/shipping-policies';
import { PRICING_METHOD_OPTIONS } from './policyDraft';
import { SectionCard } from './ui';

const METHOD_ICONS: Record<ShippingPricingMethod, LucideIcon> = {
  DesiBand: Ruler,
  Category: FolderTree,
  Flat: Equal,
};

interface PricingMethodSectionProps {
  method: ShippingPricingMethod;
  onChange: (method: ShippingPricingMethod) => void;
}

// Adım 1: kargo neye göre fiyatlanır. Tek seçim; adım 2'deki tablo bu seçime göre değişir.
export function PricingMethodSection({ method, onChange }: PricingMethodSectionProps) {
  return (
    <SectionCard tour="shipping-method" title="1 · Yöntem">
      <div role="radiogroup" aria-label="Fiyatlandırma yöntemi" className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {PRICING_METHOD_OPTIONS.map((option) => {
          const Icon = METHOD_ICONS[option.key];
          const selected = option.key === method;
          return (
            <button
              key={option.key}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(option.key)}
              className={`flex flex-col items-start gap-1.5 rounded-[8px] border p-3 text-left transition cursor-pointer ${
                selected ? 'border-[var(--fg)] bg-[var(--bg-subtle)]' : 'border-[var(--border-soft)] hover:border-[var(--border)]'
              }`}
            >
              <Icon size={16} className={selected ? 'text-[var(--fg)]' : 'text-[var(--fg-muted)]'} />
              <span className="text-xs font-semibold text-[var(--fg)]">{option.label}</span>
              <span className="text-[10.5px] leading-snug text-[var(--fg-muted)]">{option.hint}</span>
            </button>
          );
        })}
      </div>
    </SectionCard>
  );
}
