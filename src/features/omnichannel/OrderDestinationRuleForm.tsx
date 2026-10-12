'use client';

import { useState } from 'react';
import type { BrandDto, CountryDto } from '../../lib/api/omnichannel';
import type { OrderDestinationOptionDto, OrderDestinationRuleSaveDto } from '../../lib/api/omnichannel-order-destinations';
import { formInputClass, labelClass } from './formClasses';
import { OrderDestinationEditor } from './OrderDestinationEditor';
import { ruleBodyFor } from './orderDestinationRules';
import { ANY_COUNTRY } from './paymentScope';
import { countryLabel } from './useOmnichannelCountries';

interface Props {
  brands: BrandDto[];
  countries: CountryDto[];
  saving: boolean;
  onSave: (body: OrderDestinationRuleSaveDto, option: OrderDestinationOptionDto) => void;
  onCancel: () => void;
}

// Yeni marka / ülke / marka+ülke kuralı. Marka ve ülkeden en az biri seçilir (ikisi de boşsa "genel" kural zaten
// ayrı bölümde). Hedef seçenekleri seçilen ülkeye göre süzülür.
export function OrderDestinationRuleForm({ brands, countries, saving, onSave, onCancel }: Props) {
  const [brandId, setBrandId] = useState('');
  const [country, setCountry] = useState('');
  const hasScope = brandId !== '' || country !== '';

  const save = (option: OrderDestinationOptionDto) => {
    const scope = { brandId: brandId === '' ? null : Number(brandId), country: country || ANY_COUNTRY };
    onSave(ruleBodyFor(scope, option), option);
  };

  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3.5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="order-destination-brand" className={labelClass}>Marka</label>
          <select id="order-destination-brand" className={formInputClass} value={brandId} onChange={(e) => setBrandId(e.target.value)}>
            <option value="">Tüm markalar</option>
            {brands.map((brand) => <option key={brand.id} value={String(brand.id)}>{brand.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="order-destination-country" className={labelClass}>Ülke</label>
          <select id="order-destination-country" className={formInputClass} value={country} onChange={(e) => setCountry(e.target.value)}>
            <option value="">Tüm ülkeler</option>
            {countries.filter((c) => c.isActive).map((c) => <option key={c.code} value={c.code}>{countryLabel(c)}</option>)}
          </select>
        </div>
      </div>

      {hasScope ? (
        <OrderDestinationEditor key={country} country={country || null} initialKey="" saving={saving} onSave={save} onCancel={onCancel} />
      ) : (
        <p className="m-0 text-[11px] text-[var(--fg-muted)]">
          Marka ya da ülkeden en az birini seçin. Tüm hesap için varsayılan hedef yukarıdadır.
        </p>
      )}
    </div>
  );
}
