'use client';

import type { ProductDraftContext } from '../../lib/api/product-drafts';
import { fieldClass, textareaClass, labelClass } from './product-entry-ui';
import { useI18n } from '../../lib/i18n';

export interface ProductFields {
  name: string;
  brand: string;
  model: string;
  modelYear: string;
  supplierSku: string;
  barcode: string;
  internalCategoryId: number | '';
  description: string;
  note: string;
}

interface Props {
  editable: boolean;
  context: ProductDraftContext | undefined;
  value: ProductFields;
  onChange: (patch: Partial<ProductFields>) => void;
}

export function ProductEntryTabProduct({ editable, context, value, onChange }: Props) {
  const { lang } = useI18n();
  const isTr = lang === 'tr';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
        <div>
          <label className={labelClass}>{isTr ? 'Ürün Adı *' : 'Product Name *'}</label>
          <input
            disabled={!editable}
            value={value.name}
            onChange={(e) => onChange({ name: e.target.value })}
            className={fieldClass}
            placeholder={isTr ? 'Örn. DEMO Audi A4 Ön Tampon Eki' : 'e.g. DEMO Audi A4 Front Bumper Lip'}
          />
        </div>
        <div>
          <label className={labelClass}>{isTr ? 'Tedarikçi Kodu / SKU' : 'Supplier SKU'}</label>
          <input
            disabled={!editable}
            value={value.supplierSku}
            onChange={(e) => onChange({ supplierSku: e.target.value })}
            placeholder={isTr ? 'Boş bırakılırsa otomatik üretilir' : 'Auto-generated if left empty'}
            className={fieldClass}
          />
        </div>
        <div>
          <label className={labelClass}>{isTr ? 'Barkod / EAN' : 'Barcode / EAN'}</label>
          <input
            disabled={!editable}
            value={value.barcode}
            onChange={(e) => onChange({ barcode: e.target.value })}
            className={fieldClass}
          />
        </div>
        <div>
          <label className={labelClass}>{isTr ? 'Marka' : 'Brand'}</label>
          <input
            disabled={!editable}
            value={value.brand}
            onChange={(e) => onChange({ brand: e.target.value })}
            className={fieldClass}
          />
        </div>
        <div>
          <label className={labelClass}>{isTr ? 'Model' : 'Model'}</label>
          <input
            disabled={!editable}
            value={value.model}
            onChange={(e) => onChange({ model: e.target.value })}
            className={fieldClass}
          />
        </div>
        <div>
          <label className={labelClass}>{isTr ? 'Model Yılı' : 'Model Year'}</label>
          <input
            disabled={!editable}
            value={value.modelYear}
            onChange={(e) => onChange({ modelYear: e.target.value })}
            placeholder="ör. 2018-2024"
            className={fieldClass}
          />
        </div>
        <div>
          <label className={labelClass}>{isTr ? 'Kategori' : 'Category'}</label>
          <select
            disabled={!editable}
            value={value.internalCategoryId}
            onChange={(e) => onChange({ internalCategoryId: e.target.value === '' ? '' : Number(e.target.value) })}
            className={fieldClass}
          >
            <option value="">{isTr ? 'Seçilmedi' : 'Not Selected'}</option>
            {context?.categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className={labelClass}>{isTr ? 'Açıklama' : 'Description'}</label>
        <textarea
          disabled={!editable}
          rows={3}
          value={value.description}
          onChange={(e) => onChange({ description: e.target.value })}
          className={textareaClass}
          placeholder={isTr ? 'Ürün açıklaması…' : 'Product description…'}
        />
      </div>

      <div>
        <label className={labelClass}>{isTr ? 'Dahili Not' : 'Internal Note'}</label>
        <textarea
          disabled={!editable}
          rows={2}
          value={value.note}
          onChange={(e) => onChange({ note: e.target.value })}
          className={textareaClass}
          placeholder={isTr ? 'Sadece iç ekip için notlar…' : 'Notes for internal team…'}
        />
      </div>
    </div>
  );
}
