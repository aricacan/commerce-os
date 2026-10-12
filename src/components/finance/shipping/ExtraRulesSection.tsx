'use client';

import { useState } from 'react';
import type { FreeShippingEffect } from '../../../lib/api/shipping-policies';
import { FilterSelect } from '../../ui/FilterSelect';
import { zoneColumnLabel } from '../../../lib/shipping-labels';
import { FREE_SHIPPING_EFFECT_OPTIONS, hasAnyPrice, type ShippingPolicyDraft } from './policyDraft';
import { SkuExceptionSection } from './SkuExceptionSection';
import { CollapseButton, FieldLabel, SectionCard, ZoneHeader, ZonePriceInputs } from './ui';

interface ExtraRulesSectionProps {
  step: number;
  draft: ShippingPolicyDraft;
  zones: string[];
  currency: string;
  onChange: (patch: Partial<ShippingPolicyDraft>) => void;
}

// Son adım (katlanmış): ürün istisnaları ve ücretsiz kargo eşiği — her yöntemde geçerli.
export function ExtraRulesSection({ step, draft, zones, currency, onChange }: ExtraRulesSectionProps) {
  const thresholds = draft.freeShippingThresholds;
  const hasThreshold = hasAnyPrice(thresholds);
  const configured = draft.skuRules.length > 0 || hasThreshold;
  const [open, setOpen] = useState(configured);

  const thresholdSummary = zones
    .filter((zone) => (thresholds[zone] ?? '').trim() !== '')
    .map((zone) => `${zone ? `${zoneColumnLabel(zone)} ` : ''}${currency}${thresholds[zone]}+ ücretsiz`)
    .join(', ');
  const summary = [
    draft.skuRules.length ? `${draft.skuRules.length} ürün istisnası` : null,
    thresholdSummary || null,
  ].filter(Boolean).join(' · ');

  return (
    <SectionCard
      tour="shipping-extra"
      title={`${step} · Ek ayarlar`}
      description={summary || 'Ürün istisnası ve ücretsiz kargo eşiği yok.'}
      actions={<CollapseButton open={open} onToggle={() => setOpen((o) => !o)} />}
    >
      {open && (
        <div className="flex flex-col gap-5">
          <SkuExceptionSection zones={zones} rules={draft.skuRules} currency={currency} onChange={(skuRules) => onChange({ skuRules })} />

          <div className="flex flex-col gap-2">
            <FieldLabel>Ücretsiz kargo eşiği</FieldLabel>
            <div className="overflow-x-auto rounded-[6px] border border-[var(--border-soft)]">
              <div className="min-w-fit">
                <div className="border-b border-[var(--border-soft)] bg-[var(--bg-subtle)]">
                  <ZoneHeader zones={zones} first="Bölge" />
                </div>
                <div className="flex items-center gap-2 px-3 py-2">
                  <span className="min-w-40 flex-1 text-xs text-[var(--fg)]">Bu tutar ve üstü</span>
                  <ZonePriceInputs
                    zones={zones}
                    prices={thresholds}
                    currency={currency}
                    rowLabel="Ücretsiz kargo eşiği"
                    placeholder="Yok"
                    onChange={(zone, value) => onChange({ freeShippingThresholds: { ...thresholds, [zone]: value } })}
                  />
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {hasThreshold && (
                <FilterSelect
                  value={draft.effect}
                  options={FREE_SHIPPING_EFFECT_OPTIONS}
                  placeholder="Etkisi"
                  ariaLabel="Ücretsiz kargonun etkisi"
                  showAllOption={false}
                  variant="trigger"
                  minWidth={240}
                  onChange={(value) => onChange({ effect: value as FreeShippingEffect })}
                />
              )}
            </div>
            <p className="m-0 text-[11px] text-[var(--fg-muted)]">
              Siparişin toplam tutarı eşiğe eşit ya da üstündeyse müşteri kargo ödemez. Boş bölgede eşik yok.
              Kargoyu yine biz ödediğimiz için kâr değişmez; yalnızca &quot;taşıyıcı da ücret almaz&quot; seçilirse kargo maliyeti 0 olur.
            </p>
          </div>
        </div>
      )}
    </SectionCard>
  );
}
