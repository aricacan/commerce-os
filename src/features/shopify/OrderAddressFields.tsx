'use client';

import type { OrderAddressDraft } from './orderAddressRules';
import { fieldClass } from './styles';

interface Props {
  value: OrderAddressDraft;
  disabled?: boolean;
  onChange: (next: OrderAddressDraft) => void;
}

interface FieldDef {
  key: keyof OrderAddressDraft;
  label: string;
  wide?: boolean;
  maxLength?: number;
}

const COUNTRY_CODE_LENGTH = 2;

const FIELDS: FieldDef[] = [
  { key: 'fullName', label: 'Alıcı adı' },
  { key: 'phone', label: 'Telefon' },
  { key: 'addressLine', label: 'Adres', wide: true },
  { key: 'district', label: 'İlçe / ek adres' },
  { key: 'city', label: 'Şehir' },
  { key: 'postalCode', label: 'Posta kodu' },
  { key: 'countryCode', label: 'Ülke kodu (XK, TR…)', maxLength: COUNTRY_CODE_LENGTH },
];

// Teslimat adresi alanları (elle sipariş ve sipariş düzenlemede ortak).
export function OrderAddressFields({ value, disabled = false, onChange }: Props) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {FIELDS.map(({ key, label, wide, maxLength }) => (
        <label key={key} className={`flex flex-col gap-1 text-ui-2xs font-semibold text-fg-muted ${wide ? 'sm:col-span-2' : ''}`}>
          {label}
          <input
            value={value[key]} disabled={disabled} maxLength={maxLength} className={fieldClass}
            onChange={(e) => onChange({ ...value, [key]: e.target.value })}
          />
        </label>
      ))}
    </div>
  );
}
