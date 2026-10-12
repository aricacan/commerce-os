'use client';

import type { SyntheticEvent } from 'react';
import { SelectField } from './FormControls';
import {
  PRODUCT_STATUS_OPTIONS, syncVariantsWithOptions, type ProductFormState, type VariantFormState,
} from './productFormRules';
import { definedOptions, type OptionFormState } from './productOptionRules';
import { ProductOptionsEditor } from './ProductOptionsEditor';
import { ProductVariantFields } from './ProductVariantFields';
import { fieldClass, ghostButtonClass, primaryButtonClass } from './styles';

interface Props {
  form: ProductFormState;
  title: string;
  locked: boolean;
  busy: boolean;
  // Seçenekler (renk/beden) yalnız yeni üründe tanımlanır.
  canDefineOptions: boolean;
  onChange: (form: ProductFormState) => void;
  onSubmit: () => void;
  onCancel: () => void;
  onDeleteVariant?: (variant: VariantFormState) => void;
}

const LABEL_CLASS = 'flex min-w-0 flex-col gap-1 text-ui-2xs font-semibold text-fg-muted';

// Ürün oluştur / düzenle formu (görsel ve koleksiyon bölümleri ProductEditor'da, ürün oluştuktan sonra).
export function ProductForm({ form, title, locked, busy, canDefineOptions, onChange, onSubmit, onCancel, onDeleteVariant }: Props) {
  const set = <K extends keyof ProductFormState>(key: K, value: ProductFormState[K]) => onChange({ ...form, [key]: value });
  // Seçenek değişince varyant satırları kombinasyonlardan yeniden üretilir.
  const changeOptions = (options: OptionFormState[]) =>
    onChange({ ...form, options, variants: syncVariantsWithOptions(options, form.variants) });
  const submit = (event: SyntheticEvent) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3" aria-label={title}>
      <h3 className="m-0 text-ui-sm font-bold text-fg">{title}</h3>
      <label className={LABEL_CLASS}>
        Başlık
        <input className={fieldClass} value={form.title} onChange={(e) => set('title', e.target.value)} />
      </label>
      <label className={LABEL_CLASS}>
        Açıklama (HTML)
        <textarea
          className={`${fieldClass} h-32 py-1.5`} value={form.descriptionHtml}
          onChange={(e) => set('descriptionHtml', e.target.value)}
        />
      </label>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <label className={LABEL_CLASS}>
          Tür / kategori
          <input className={fieldClass} value={form.productType} onChange={(e) => set('productType', e.target.value)} />
        </label>
        <label className={LABEL_CLASS}>
          Satıcı / marka
          <input className={fieldClass} value={form.vendor} onChange={(e) => set('vendor', e.target.value)} />
        </label>
        <label className={LABEL_CLASS}>
          Etiketler (virgülle ayır)
          <input className={fieldClass} value={form.tags} onChange={(e) => set('tags', e.target.value)} />
        </label>
        <SelectField label="Durum" value={form.status} options={PRODUCT_STATUS_OPTIONS} onChange={(status) => set('status', status)} />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className={LABEL_CLASS}>
          SEO başlığı
          <input className={fieldClass} value={form.seoTitle} onChange={(e) => set('seoTitle', e.target.value)} />
        </label>
        <label className={LABEL_CLASS}>
          SEO açıklaması
          <input className={fieldClass} value={form.seoDescription} onChange={(e) => set('seoDescription', e.target.value)} />
        </label>
      </div>
      {canDefineOptions && <ProductOptionsEditor options={form.options} onChange={changeOptions} />}
      <ProductVariantFields
        variants={form.variants} locked={locked} onChange={(variants) => set('variants', variants)}
        generated={canDefineOptions && definedOptions(form.options).length > 0}
        existingOptions={form.existingOptions} onDeleteVariant={onDeleteVariant}
      />
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className={primaryButtonClass}>{busy ? 'Kaydediliyor…' : 'Kaydet'}</button>
        <button type="button" onClick={onCancel} className={ghostButtonClass}>Kapat</button>
      </div>
    </form>
  );
}
