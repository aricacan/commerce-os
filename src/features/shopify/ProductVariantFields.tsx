'use client';

import { Plus, Trash2, X } from 'lucide-react';
import type { ShopifyProductOptionDto } from '../../lib/api/shopify-products';
import { emptyVariant, emptyVariantFor, type VariantFormState } from './productFormRules';
import { variantLabel } from './productOptionRules';
import { fieldClass, ghostButtonClass } from './styles';

interface Props {
  variants: VariantFormState[];
  // ERP yetkili mağaza: fiyat/stok salt okunur.
  locked: boolean;
  onChange: (variants: VariantFormState[]) => void;
  // Seçeneklerden üretilen satırlar (yeni ürün): eklenip kaldırılamaz, ad yerine kombinasyon etiketi gösterilir.
  generated?: boolean;
  // Mevcut çok seçenekli ürünün seçenekleri: yeni varyant her seçenek için değer ister (mevcut değerler öneri olur).
  existingOptions?: ShopifyProductOptionDto[];
  // Verilirse mağazadaki varyantlara "sil" düğmesi konur.
  onDeleteVariant?: (variant: VariantFormState) => void;
}

const LABEL_CLASS = 'flex min-w-0 flex-col gap-1 text-ui-2xs font-semibold text-fg-muted';

// Varyant satırları: SKU, ad (ya da seçenek değerleri), fiyat, stok, barkod. Mağazada olan varyantın adı/seçenek değeri değişmez.
export function ProductVariantFields({ variants, locked, onChange, generated = false, existingOptions = [], onDeleteVariant }: Props) {
  const update = (index: number, patch: Partial<VariantFormState>) =>
    onChange(variants.map((variant, i) => (i === index ? { ...variant, ...patch } : variant)));
  const newVariant = () => (existingOptions.length > 0 ? emptyVariantFor(existingOptions) : emptyVariant());

  return (
    <fieldset className="m-0 flex flex-col gap-2 rounded-md border border-border-soft p-3">
      <legend className="px-1 text-ui-xs font-semibold text-fg">Varyantlar</legend>
      {locked && (
        <p className="m-0 text-ui-2xs text-warning">
          Bu mağazanın katalog yetkisi ERP: stok ve fiyat yalnız ERP senkronuyla değişir, burada salt okunur.
        </p>
      )}
      {variants.map((variant, index) => (
        <div key={variant.id ?? `new-${index}`} className="grid grid-cols-2 items-end gap-2 sm:grid-cols-6">
          <label className={LABEL_CLASS}>
            SKU
            <input className={fieldClass} value={variant.sku} onChange={(e) => update(index, { sku: e.target.value })} />
          </label>
          <VariantNameCell
            variant={variant} readOnlyName={generated || variant.id !== null} existingOptions={existingOptions}
            onChange={(patch) => update(index, patch)}
          />
          <label className={LABEL_CLASS}>
            Fiyat
            <input
              className={fieldClass} inputMode="decimal" value={variant.price} readOnly={locked}
              onChange={(e) => update(index, { price: e.target.value })}
            />
          </label>
          <label className={LABEL_CLASS}>
            Stok
            <input
              className={fieldClass} inputMode="numeric" value={variant.stock} readOnly={locked}
              onChange={(e) => update(index, { stock: e.target.value })}
            />
          </label>
          <label className={LABEL_CLASS}>
            Barkod
            <input className={fieldClass} value={variant.barcode} onChange={(e) => update(index, { barcode: e.target.value })} />
          </label>
          {variant.id === null && !generated && variants.length > 1 && (
            <button
              type="button" className={ghostButtonClass} aria-label={`${index + 1}. varyantı kaldır`}
              onClick={() => onChange(variants.filter((_, i) => i !== index))}
            >
              <X size={14} aria-hidden />
            </button>
          )}
          {variant.id !== null && onDeleteVariant && variants.length > 1 && (
            <button
              type="button" className={ghostButtonClass} aria-label={`${variantLabel(variant.optionValues) || variant.sku || index + 1} varyantını sil`}
              onClick={() => onDeleteVariant(variant)}
            >
              <Trash2 size={14} aria-hidden />
            </button>
          )}
        </div>
      ))}
      {!generated && (
        <button type="button" className={`${ghostButtonClass} self-start`} onClick={() => onChange([...variants, newVariant()])}>
          <Plus size={14} aria-hidden /> Varyant ekle
        </button>
      )}
    </fieldset>
  );
}

interface NameCellProps {
  variant: VariantFormState;
  readOnlyName: boolean;
  existingOptions: ShopifyProductOptionDto[];
  onChange: (patch: Partial<VariantFormState>) => void;
}

// Varyantın kimliği: seçenekliyse etiket ("Kırmızı / M") ya da (yeni varyantta) seçenek başına değer girişi; değilse varyant adı.
function VariantNameCell({ variant, readOnlyName, existingOptions, onChange }: NameCellProps) {
  if (variant.optionValues.length === 0) {
    return (
      <label className={LABEL_CLASS}>
        Varyant adı
        <input
          className={fieldClass} value={variant.title} disabled={readOnlyName} placeholder="Default Title"
          onChange={(e) => onChange({ title: e.target.value })}
        />
      </label>
    );
  }
  if (readOnlyName) {
    return (
      <div className={LABEL_CLASS}>
        Çeşit
        <span className="flex h-8 items-center truncate text-ui-xs font-normal text-fg">{variantLabel(variant.optionValues)}</span>
      </div>
    );
  }
  return (
    <div className="col-span-2 flex gap-2">
      {variant.optionValues.map((option, position) => (
        <label key={option.name} className={`${LABEL_CLASS} flex-1`}>
          {option.name}
          <input
            className={fieldClass} value={option.value} list={`values-${option.name}`}
            onChange={(e) => onChange({
              optionValues: variant.optionValues.map((o, i) => (i === position ? { ...o, value: e.target.value } : o)),
            })}
          />
          <datalist id={`values-${option.name}`}>
            {existingOptions.find((o) => o.name === option.name)?.values.map((value) => <option key={value} value={value} />)}
          </datalist>
        </label>
      ))}
    </div>
  );
}
