'use client';

import type { PaymentMethod } from '../../lib/api/omnichannel';
import { focusRing } from '../shared/design';
import type { OrderFormDraft } from './chatOrderFormRules';
import { PAYMENT_METHOD_LABELS } from './paymentOptionDraft';

type TextField = 'fullName' | 'phone' | 'email' | 'city' | 'district' | 'addressLine' | 'postalCode' | 'note';

// Sunucudaki ChatOrderLimits ile aynı üst sınırlar (asıl doğrulama sunucuda).
const FIELDS: { key: TextField; label: string; maxLength: number; required?: boolean; wide?: boolean; inputMode?: 'tel' | 'email'; placeholder?: string }[] = [
  { key: 'fullName', label: 'Ad soyad', maxLength: 128, required: true },
  { key: 'phone', label: 'Telefon', maxLength: 32, required: true, inputMode: 'tel' },
  { key: 'email', label: 'E-posta', maxLength: 254, inputMode: 'email', placeholder: 'Sipariş onayı için gerekli' },
  { key: 'city', label: 'Şehir', maxLength: 64, required: true },
  { key: 'district', label: 'İlçe', maxLength: 64 },
  { key: 'addressLine', label: 'Açık adres', maxLength: 512, required: true, wide: true },
  { key: 'postalCode', label: 'Posta kodu', maxLength: 16 },
  { key: 'note', label: 'Not', maxLength: 512 },
];

const fieldClass = `h-10 w-full min-w-0 rounded-lg border border-border bg-card px-3 text-ui-sm text-fg disabled:bg-bg-subtle disabled:text-fg-muted md:h-9 ${focusRing}`;

interface Props {
  draft: OrderFormDraft;
  currency: string;
  // Kapsamdaki (PaymentScope) ödeme yöntemleri; boşsa seçici kapalı.
  paymentMethods: readonly PaymentMethod[];
  paymentLocked: boolean;
  shippingLocked: boolean;
  onChange: (patch: Partial<OrderFormDraft>) => void;
}

// Müşteri, teslimat adresi, ödeme yöntemi, kargo ücreti ve not.
export function ChatOrderDeliveryFields({ draft, currency, paymentMethods, paymentLocked, shippingLocked, onChange }: Props) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {FIELDS.map((field) => (
        <label key={field.key} className={`flex min-w-0 flex-col gap-1 ${field.wide ? 'sm:col-span-2' : ''}`}>
          <span className="text-ui-xs font-semibold text-fg-muted">{field.label}{field.required && ' *'}</span>
          <input
            value={draft[field.key]}
            onChange={(e) => onChange({ [field.key]: e.target.value })}
            maxLength={field.maxLength}
            inputMode={field.inputMode}
            placeholder={field.placeholder}
            className={fieldClass}
          />
        </label>
      ))}

      <label className="flex min-w-0 flex-col gap-1">
        <span className="text-ui-xs font-semibold text-fg-muted">Ödeme yöntemi *</span>
        <select
          value={draft.paymentMethod ?? ''}
          disabled={paymentLocked || paymentMethods.length === 0}
          onChange={(e) => onChange({ paymentMethod: e.target.value === '' ? null : (Number(e.target.value) as PaymentMethod) })}
          className={fieldClass}
        >
          <option value="">{paymentMethods.length === 0 ? 'Bu kanalda ödeme yöntemi tanımlı değil' : 'Seçin'}</option>
          {paymentMethods.map((method) => (
            <option key={method} value={method}>{PAYMENT_METHOD_LABELS[method]}</option>
          ))}
        </select>
      </label>

      <label className="flex min-w-0 flex-col gap-1">
        <span className="text-ui-xs font-semibold text-fg-muted">Kargo ücreti ({currency})</span>
        <input
          inputMode="decimal"
          value={draft.shippingAmount}
          disabled={shippingLocked}
          placeholder="Boş = ekip teyit eder"
          onChange={(e) => onChange({ shippingAmount: e.target.value })}
          className={fieldClass}
        />
      </label>
    </div>
  );
}
