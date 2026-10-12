'use client';

import { useState } from 'react';
import { Save } from 'lucide-react';
import {
  shopifyApi, SHOPIFY_FINANCIAL_STATUS, type ShopifyFinancialStatus, type ShopifyStoreDto,
} from '../../lib/api/shopify';
import { describeError } from '../../lib/errors';
import { focusRing } from '../shared/design';
import { useFeedback } from '../shared/Feedback';
import { CheckboxField, SelectField } from './FormControls';
import { toUpdateDto } from './storeRules';
import { fieldClass, ghostButtonClass } from './styles';

const COD_STATUS_OPTIONS: { value: ShopifyFinancialStatus; label: string }[] = [
  { value: SHOPIFY_FINANCIAL_STATUS.Pending, label: 'Ödeme bekliyor' },
  { value: SHOPIFY_FINANCIAL_STATUS.Paid, label: 'Ödendi' },
];

interface Props {
  store: ShopifyStoreDto;
  disabled: boolean;
  onSaved: () => Promise<void>;
}

// Sohbet siparişi ayarları: sipariş senkronu (varsayılan kapalı) ve Shopify'da görünecek ödeme yöntemi adları.
// Ödeme yöntemi adı mağazada "Manuel ödeme yöntemi" olarak tanımlı olmalı (ör. "Cash on Delivery (COD)").
export function StoreOrderSettings({ store, disabled, onSaved }: Props) {
  const { notify } = useFeedback();
  const [orderSync, setOrderSync] = useState(store.orderSyncEnabled);
  const [codGateway, setCodGateway] = useState(store.codGatewayName ?? '');
  const [codStatus, setCodStatus] = useState<ShopifyFinancialStatus>(store.codFinancialStatus);
  const [bankGateway, setBankGateway] = useState(store.bankTransferGatewayName ?? '');
  const [saving, setSaving] = useState(false);

  const dirty = orderSync !== store.orderSyncEnabled || codGateway !== (store.codGatewayName ?? '')
    || codStatus !== store.codFinancialStatus || bankGateway !== (store.bankTransferGatewayName ?? '');

  const save = async () => {
    setSaving(true);
    try {
      await shopifyApi.update(store.id, toUpdateDto(store, {
        orderSyncEnabled: orderSync,
        codGatewayName: codGateway.trim() || null,
        codFinancialStatus: codStatus,
        bankTransferGatewayName: bankGateway.trim() || null,
      }));
      notify.success('Mağaza ayarları kaydedildi.');
      await onSaved();
    } catch (e) {
      notify.error(describeError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <fieldset disabled={disabled || saving} className="m-0 flex flex-col gap-3 rounded-lg border border-border-soft p-3">
      <legend className="px-1 text-ui-xs font-semibold text-fg">Sohbet siparişleri</legend>

      <CheckboxField checked={orderSync} onChange={setOrderSync} className="items-start">
        Onaylanan sohbet siparişlerini bu mağazada otomatik aç ({store.countryCode})
        <span className="block text-ui-2xs text-fg-muted">
          Açıldığı andan SONRA onaylanan siparişler gönderilir; stok sipariş üzerinden düşer.
        </span>
      </CheckboxField>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="flex min-w-0 flex-col gap-1">
          <span className="text-ui-2xs font-semibold text-fg-muted">Kapıda ödeme yöntemi adı</span>
          <input className={fieldClass} value={codGateway} onChange={(e) => setCodGateway(e.target.value)} placeholder="Cash on Delivery (COD)" />
        </label>
        <SelectField label="Kapıda ödeme durumu" value={codStatus} options={COD_STATUS_OPTIONS} onChange={setCodStatus} />
        <label className="flex min-w-0 flex-col gap-1">
          <span className="text-ui-2xs font-semibold text-fg-muted">Havale ödeme yöntemi adı</span>
          <input className={fieldClass} value={bankGateway} onChange={(e) => setBankGateway(e.target.value)} placeholder="Para Havalesi" />
        </label>
      </div>

      {dirty && (
        <button type="button" className={`${ghostButtonClass} ${focusRing} self-start`} onClick={() => void save()}>
          <Save size={14} aria-hidden /> Kaydet
        </button>
      )}
    </fieldset>
  );
}
