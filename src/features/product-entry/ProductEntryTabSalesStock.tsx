'use client';

import type { ProductDraftContext } from '../../lib/api/product-drafts';
import { fieldClass, labelClass } from './product-entry-ui';
import { useI18n } from '../../lib/i18n';

export interface SalesStockFields {
  price: number;
  stockQuantity: number;
  vatRate: number | '';
  desi: number;
  boxId: number | '';
}

interface Props {
  editable: boolean;
  context: ProductDraftContext | undefined;
  value: SalesStockFields;
  onChange: (patch: Partial<SalesStockFields>) => void;
}

export function ProductEntryTabSalesStock({ editable, context, value, onChange }: Props) {
  const { lang } = useI18n();
  const isTr = lang === 'tr';

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
      <div>
        <label className={labelClass}>{isTr ? 'Fiyat (TRY) *' : 'Price (TRY) *'}</label>
        <input
          disabled={!editable}
          type="number"
          min={0}
          step="0.01"
          value={value.price || ''}
          onChange={(e) => onChange({ price: Number(e.target.value) })}
          className={fieldClass}
          placeholder="0.00"
        />
      </div>
      <div>
        <label className={labelClass}>{isTr ? 'Stok Adedi *' : 'Stock Quantity *'}</label>
        <input
          disabled={!editable}
          type="number"
          min={0}
          step="1"
          value={value.stockQuantity || ''}
          onChange={(e) => onChange({ stockQuantity: Number(e.target.value) })}
          className={fieldClass}
          placeholder="0"
        />
      </div>
      <div>
        <label className={labelClass}>{isTr ? 'KDV Oranı (%)' : 'VAT Rate (%)'}</label>
        <input
          disabled={!editable}
          type="number"
          min={0}
          max={100}
          step="1"
          value={value.vatRate}
          onChange={(e) => onChange({ vatRate: e.target.value === '' ? '' : Number(e.target.value) })}
          className={fieldClass}
          placeholder="20"
        />
      </div>
      <div>
        <label className={labelClass}>{isTr ? 'Desi' : 'Desi (Volumetric Weight)'}</label>
        <input
          disabled={!editable}
          type="number"
          min={0}
          step="0.01"
          value={value.desi || ''}
          onChange={(e) => onChange({ desi: Number(e.target.value) })}
          className={fieldClass}
          placeholder="1.00"
        />
      </div>
      <div>
        <label className={labelClass}>{isTr ? 'Koli / Kutu Paketleme' : 'Packaging Box'}</label>
        <select
          disabled={!editable}
          value={value.boxId}
          onChange={(e) => onChange({ boxId: e.target.value === '' ? '' : Number(e.target.value) })}
          className={fieldClass}
        >
          <option value="">{isTr ? 'Seçilmedi' : 'Not Selected'}</option>
          {context?.boxes.map((box) => (
            <option key={box.id} value={box.id}>
              {box.name} ({box.boxCode})
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
