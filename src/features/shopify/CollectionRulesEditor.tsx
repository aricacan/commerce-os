'use client';

import { Plus, Trash2 } from 'lucide-react';
import type { ShopifyCollectionRuleDto } from '../../lib/api/shopify-store-content';
import {
  EMPTY_RULE, MAX_COLLECTION_RULES, RULE_COLUMN_OPTIONS, RULE_RELATION_OPTIONS,
} from './collectionRules';
import { FormSelect } from '../../components/ui/FormSelect';
import { fieldClass, ghostButtonClass } from './styles';

interface Props {
  rules: ShopifyCollectionRuleDto[];
  appliedDisjunctively: boolean;
  onRulesChange: (rules: ShopifyCollectionRuleDto[]) => void;
  onDisjunctiveChange: (value: boolean) => void;
}

// Akıllı koleksiyon kuralları: "tüm koşullar" (VE) ya da "herhangi biri" (VEYA) + kural satırları.
export function CollectionRulesEditor({ rules, appliedDisjunctively, onRulesChange, onDisjunctiveChange }: Props) {
  const change = (index: number, patch: Partial<ShopifyCollectionRuleDto>) =>
    onRulesChange(rules.map((rule, i) => (i === index ? { ...rule, ...patch } : rule)));

  return (
    <fieldset className="m-0 flex min-w-0 flex-col gap-2 rounded-md border border-border-soft p-3">
      <legend className="px-1 text-ui-2xs font-semibold text-fg-muted">Ürünler şu koşullara uyduğunda koleksiyona girer</legend>
      <div className="flex flex-wrap gap-4 text-ui-xs text-fg">
        <label className="flex items-center gap-1.5">
          <input type="radio" name="rule-mode" checked={!appliedDisjunctively} onChange={() => onDisjunctiveChange(false)} />
          Tüm koşullar (ve)
        </label>
        <label className="flex items-center gap-1.5">
          <input type="radio" name="rule-mode" checked={appliedDisjunctively} onChange={() => onDisjunctiveChange(true)} />
          Herhangi biri (veya)
        </label>
      </div>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {rules.map((rule, index) => (
          <li key={index} className="flex flex-wrap items-center gap-2">
            <FormSelect
              ariaLabel="Kural alanı" value={rule.column} options={RULE_COLUMN_OPTIONS} className="basis-36 flex-1"
              onChange={(column) => change(index, { column })} triggerClassName="h-8 rounded-md"
            />
            <FormSelect
              ariaLabel="Kural ilişkisi" value={rule.relation} options={RULE_RELATION_OPTIONS} className="basis-32 flex-1"
              onChange={(relation) => change(index, { relation })} triggerClassName="h-8 rounded-md"
            />
            <input aria-label="Kural değeri" value={rule.condition} onChange={(e) => change(index, { condition: e.target.value })} className={`${fieldClass} basis-40 flex-[2]`} />
            <button type="button" className={ghostButtonClass} aria-label="Kuralı sil" onClick={() => onRulesChange(rules.filter((_, i) => i !== index))}>
              <Trash2 size={14} aria-hidden />
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button" className={`${ghostButtonClass} self-start`} disabled={rules.length >= MAX_COLLECTION_RULES}
        onClick={() => onRulesChange([...rules, EMPTY_RULE])}
      >
        <Plus size={14} aria-hidden /> Kural ekle
      </button>
    </fieldset>
  );
}
