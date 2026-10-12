'use client';

import { Plus, Trash2 } from 'lucide-react';
import { emptyZonePrices, nextRuleKey, type SkuRuleDraft } from './policyDraft';
import { FieldLabel, ZoneHeader, ZonePriceInputs } from './ui';

interface SkuExceptionSectionProps {
  zones: string[];
  rules: SkuRuleDraft[];
  currency: string;
  onChange: (rules: SkuRuleDraft[]) => void;
}

// Tek bir ürüne ayrı kargo fiyatı (ör. büyük koli). Seçilen yöntemin önüne geçer; SKU tüm ERP
// kaynaklarında aynı olduğu için bir kez girilir. Boş bırakılan bölge yöntemin fiyatını öder.
export function SkuExceptionSection({ zones, rules, currency, onChange }: SkuExceptionSectionProps) {
  const update = (key: string, patch: Partial<SkuRuleDraft>) =>
    onChange(rules.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const add = () => onChange([...rules, { key: nextRuleKey(), sku: '', label: null, prices: emptyZonePrices(zones) }]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <FieldLabel>Ürün istisnaları</FieldLabel>
        <button
          type="button"
          onClick={add}
          className="inline-flex h-8 items-center gap-1.5 rounded-[6px] border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-semibold text-[var(--fg)] transition hover:bg-[var(--bg-subtle)] cursor-pointer"
        >
          <Plus size={13} /> Ürün ekle
        </button>
      </div>

      {rules.length === 0 ? (
        <p className="m-0 rounded-[6px] border border-dashed border-[var(--border)] p-4 text-center text-xs text-[var(--fg-muted)]">
          İstisna yok — tüm ürünler seçilen yöntemle fiyatlanır.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-[6px] border border-[var(--border-soft)]">
          <div className="min-w-fit">
            <div className="border-b border-[var(--border-soft)] bg-[var(--bg-subtle)]">
              <ZoneHeader zones={zones} first="SKU" trailing />
            </div>
            <ul className="m-0 flex list-none flex-col divide-y divide-[var(--border-soft)] p-0">
              {rules.map((rule) => (
                <li key={rule.key} className="flex items-center gap-2 px-3 py-2">
                  <div className="flex min-w-40 flex-1 flex-col">
                    <input
                      aria-label="SKU"
                      placeholder="SKU"
                      value={rule.sku}
                      onChange={(e) => update(rule.key, { sku: e.target.value, label: null })}
                      className="h-9 w-full rounded-[6px] border border-[var(--border)] bg-[var(--bg)] px-2.5 font-mono text-xs text-[var(--fg)] outline-none focus:border-[var(--fg)]"
                    />
                    {rule.label && <span className="mt-0.5 truncate text-[10.5px] text-[var(--fg-muted)]">{rule.label}</span>}
                  </div>
                  <ZonePriceInputs
                    zones={zones}
                    prices={rule.prices}
                    currency={currency}
                    rowLabel={rule.sku || 'Ürün'}
                    placeholder="Yöntem"
                    onChange={(zone, value) => update(rule.key, { prices: { ...rule.prices, [zone]: value } })}
                  />
                  <button
                    type="button"
                    aria-label="İstisnayı sil"
                    onClick={() => onChange(rules.filter((r) => r.key !== rule.key))}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] text-rose-500 transition hover:bg-rose-500/10 cursor-pointer"
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
