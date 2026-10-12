'use client';

import { useState } from 'react';
import { Save } from 'lucide-react';
import {
  shopifyApi, SHOPIFY_CATALOG_AUTHORITY, type ShopifyCatalogAuthority, type ShopifyStoreDto,
} from '../../lib/api/shopify';
import { describeError } from '../../lib/errors';
import { focusRing } from '../shared/design';
import { useFeedback } from '../shared/Feedback';
import { SelectField } from './FormControls';
import { toUpdateDto } from './storeRules';
import { ghostButtonClass } from './styles';

const AUTHORITY_OPTIONS: { value: ShopifyCatalogAuthority; label: string }[] = [
  { value: SHOPIFY_CATALOG_AUTHORITY.Shopify, label: 'Shopify (Hub yazar)' },
  { value: SHOPIFY_CATALOG_AUTHORITY.Erp, label: 'ERP (Hub salt okur)' },
];

interface Props {
  store: ShopifyStoreDto;
  disabled: boolean;
  onSaved: () => Promise<void>;
}

// Katalog yetkisi: stok ve fiyatın doğruluk kaynağı. "Shopify" iken Hub yazar; ERP bağlanınca "ERP"ye çevrilir ve
// Hub stok/fiyatı salt okur (sunucu da reddeder). Açıklama, görsel ve kategori her iki durumda düzenlenebilir.
export function StoreCatalogSettings({ store, disabled, onSaved }: Props) {
  const { notify } = useFeedback();
  const [authority, setAuthority] = useState<ShopifyCatalogAuthority>(store.catalogAuthority);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await shopifyApi.update(store.id, toUpdateDto(store, { catalogAuthority: authority }));
      notify.success('Katalog yetkisi kaydedildi.');
      await onSaved();
    } catch (e) {
      notify.error(describeError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <fieldset disabled={disabled || saving} className="m-0 flex flex-col gap-3 rounded-lg border border-border-soft p-3">
      <legend className="px-1 text-ui-xs font-semibold text-fg">Katalog yetkisi</legend>
      <SelectField label="Stok ve fiyatı kim yazar?" value={authority} options={AUTHORITY_OPTIONS} onChange={setAuthority} />
      <span className="text-ui-2xs text-fg-muted">
        ERP seçilince ürün formunda stok/fiyat salt okunur olur; açıklama, görsel ve kategori düzenlenebilir kalır.
      </span>
      {authority !== store.catalogAuthority && (
        <button type="button" className={`${ghostButtonClass} ${focusRing} self-start`} onClick={() => void save()}>
          <Save size={14} aria-hidden /> Kaydet
        </button>
      )}
    </fieldset>
  );
}
