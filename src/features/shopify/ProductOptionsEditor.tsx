'use client';

import { Plus, X } from 'lucide-react';
import {
  MAX_COMBINATIONS, MAX_OPTIONS, combinationCount, definedOptions, emptyOption, type OptionFormState,
} from './productOptionRules';
import { fieldClass, ghostButtonClass } from './styles';

interface Props {
  options: OptionFormState[];
  onChange: (options: OptionFormState[]) => void;
}

const LABEL_CLASS = 'flex min-w-0 flex-col gap-1 text-ui-2xs font-semibold text-fg-muted';

// Yeni ürün için seçenek tanımı (renk, beden…): ad + virgülle ayrılmış değerler. Varyant satırları bunlardan üretilir.
export function ProductOptionsEditor({ options, onChange }: Props) {
  const update = (index: number, patch: Partial<OptionFormState>) =>
    onChange(options.map((option, i) => (i === index ? { ...option, ...patch } : option)));
  const count = combinationCount(definedOptions(options));

  return (
    <fieldset className="m-0 flex flex-col gap-2 rounded-md border border-border-soft p-3">
      <legend className="px-1 text-ui-xs font-semibold text-fg">Seçenekler (renk, beden…)</legend>
      <p className="m-0 text-ui-2xs text-fg-muted">
        Ürün birden fazla çeşitte satılıyorsa seçenek ekleyin; her kombinasyon için aşağıda SKU, fiyat ve stok girilir.
      </p>
      {options.map((option, index) => (
        <div key={index} className="grid grid-cols-1 items-end gap-2 sm:grid-cols-[1fr_2fr_auto]">
          <label className={LABEL_CLASS}>
            Seçenek adı
            <input className={fieldClass} value={option.name} placeholder="Renk" onChange={(e) => update(index, { name: e.target.value })} />
          </label>
          <label className={LABEL_CLASS}>
            Değerler (virgülle ayır)
            <input className={fieldClass} value={option.values} placeholder="Kırmızı, Mavi" onChange={(e) => update(index, { values: e.target.value })} />
          </label>
          <button
            type="button" className={ghostButtonClass} aria-label={`${index + 1}. seçeneği kaldır`}
            onClick={() => onChange(options.filter((_, i) => i !== index))}
          >
            <X size={14} aria-hidden />
          </button>
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button" className={ghostButtonClass} disabled={options.length >= MAX_OPTIONS}
          onClick={() => onChange([...options, emptyOption()])}
        >
          <Plus size={14} aria-hidden /> Seçenek ekle
        </button>
        {count > 1 && (
          <span className={`text-ui-2xs ${count > MAX_COMBINATIONS ? 'text-danger' : 'text-fg-muted'}`}>
            {count} kombinasyon (en fazla {MAX_COMBINATIONS})
          </span>
        )}
      </div>
    </fieldset>
  );
}
