'use client';

import type { BrandDto, ChannelDto, CountryDto } from '../../lib/api/omnichannel';
import type { CatalogProfileDto } from '../../lib/api/omnichannel-catalog';
import { FilterSelect } from '../../components/ui/FilterSelect';
import { labelClass } from './formClasses';
import type { PaymentOptionDraft } from './paymentOptionDraft';
import {
  PAYMENT_SCOPE_EXPLANATION, PAYMENT_SCOPE_FIELDS, PAYMENT_SCOPE_LABELS, PAYMENT_SCOPE_ORDER, type PaymentScopeKind,
} from './paymentScope';
import { countryLabel } from './useOmnichannelCountries';

interface Props {
  draft: PaymentOptionDraft;
  brands: BrandDto[];
  countries: CountryDto[];
  channels: ChannelDto[];
  profiles: CatalogProfileDto[];
  // Düzenlenen kaydın ülkesi: pasif ülke de listede kalır.
  currentCountry: string | null;
  onChange: <K extends keyof PaymentOptionDraft>(key: K, value: PaymentOptionDraft[K]) => void;
}

const SCOPE_OPTIONS = PAYMENT_SCOPE_ORDER.map((scope) => ({ value: scope, label: PAYMENT_SCOPE_LABELS[scope] }));

const scopeFromValue = (value: string): PaymentScopeKind | undefined =>
  PAYMENT_SCOPE_ORDER.find((scope) => scope === value);

// Kapsam seçici + seçilen kapsamın ihtiyaç duyduğu alanlar (ülke, marka, profil, kanal).
export function PaymentScopeFields({ draft, brands, countries, channels, profiles, currentCountry, onChange }: Props) {
  const fields = PAYMENT_SCOPE_FIELDS[draft.scope];

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className={labelClass}>Kapsam *</label>
          <FilterSelect value={draft.scope} height="h-8.5" placeholder="Kapsam seçin" showAllOption={false}
            onChange={(v) => { const scope = scopeFromValue(v); if (scope) onChange('scope', scope); }}
            options={SCOPE_OPTIONS} />
        </div>
        {fields.country && (
          <div>
            <label className={labelClass}>Ülke *</label>
            <FilterSelect value={draft.country} height="h-8.5" placeholder="Ülke seçin"
              onChange={(v) => onChange('country', v)}
              options={countries
                .filter((c) => c.isActive || c.code === currentCountry)
                .map((c) => ({ value: c.code, label: countryLabel(c) }))} />
          </div>
        )}
        {fields.brand && (
          <div>
            <label className={labelClass}>Marka *</label>
            <FilterSelect value={draft.brandId} height="h-8.5" placeholder="Marka seçin"
              onChange={(v) => onChange('brandId', v)}
              options={brands.map((b) => ({ value: String(b.id), label: b.name }))} />
          </div>
        )}
        {fields.profile && (
          <div>
            <label className={labelClass}>Katalog profili *</label>
            <FilterSelect value={draft.catalogProfileId} height="h-8.5" placeholder="Profil seçin"
              onChange={(v) => onChange('catalogProfileId', v)}
              options={profiles.map((p) => ({ value: String(p.id), label: p.name }))} />
          </div>
        )}
        {fields.channel && (
          <div>
            <label className={labelClass}>Kanal *</label>
            <FilterSelect value={draft.channelId} height="h-8.5" placeholder="Kanal seçin"
              onChange={(v) => onChange('channelId', v)}
              options={channels.map((c) => ({ value: String(c.id), label: c.displayName }))} />
          </div>
        )}
      </div>
      <p className="text-[10.5px] text-[var(--fg-muted)]">{PAYMENT_SCOPE_EXPLANATION}</p>
    </div>
  );
}
