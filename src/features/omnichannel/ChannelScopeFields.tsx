'use client';

import type { BrandDto, ChannelDto } from '../../lib/api/omnichannel';
import { FilterSelect } from '../../components/ui/FilterSelect';
import type { ChannelDraft, ChannelDraftPatch } from './channelDraft';
import { formInputClass, labelClass } from './formClasses';
import { useCatalogProfiles } from './useCatalogProfiles';
import { countryLabel, useOmnichannelCountries } from './useOmnichannelCountries';

interface Props {
  draft: ChannelDraft;
  patch: ChannelDraftPatch;
  /** Marka seçenekleri — liste Kanallar ekranında zaten yüklü, form tekrar çekmez. */
  brands: BrandDto[];
  /** Düzenlemede kanalın kayıtlı hâli: pasif ülke/marka yine de listede kalır. */
  channel: ChannelDto | null;
}

// Mağaza kodu, ülke, marka ve katalog profili: kanalın "hangi mağaza / hangi katalog" kapsamı.
export function ChannelScopeFields({ draft, patch, brands, channel }: Props) {
  const { countries } = useOmnichannelCountries();
  const { profiles } = useCatalogProfiles();

  // Profil listesi ülkeye göre süzülür: başka ülkenin profilini seçmek sunucuda da reddedilir.
  const countryProfiles = draft.country
    ? profiles.filter((p) => p.country.toUpperCase() === draft.country.toUpperCase())
    : [];
  const selectedCountry = countries.find((c) => c.code === draft.country);
  // Profil seçildiyse katalog profilden gelir; ülkenin varsayılan kataloğu önemsizleşir.
  const catalogMissing = draft.catalogProfileId === null && selectedCountry?.catalogStatus === 'NotConfigured';

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Bağlı Mağaza Kodu (Opsiyonel)</label>
          <input
            value={draft.storeCode}
            onChange={(e) => patch({ storeCode: e.target.value })}
            placeholder="Örn: storea-sentos"
            className={`${formInputClass} font-mono`}
          />
        </div>
        <div>
          <label className={labelClass}>Ülke / dil kodu</label>
          <FilterSelect
            value={draft.country}
            // Profil ülkeye bağlı: ülke değişince eski ülkenin profili seçili kalmamalı
            // (sunucu da reddeder, ama kullanıcı hatayı kaydettikten sonra görmemeli).
            onChange={(v) => patch({ country: v, catalogProfileId: null })}
            placeholder="Ülke seçin"
            height="h-8.5"
            options={[
              { value: '', label: 'Genel (belirtilmemiş)' },
              // Pasif ülke seçilemez; ama kanalın mevcut ülkesi pasifse listede kalır.
              ...countries
                .filter((c) => c.isActive || c.code === channel?.country)
                .map((c) => ({ value: c.code, label: countryLabel(c) })),
            ]}
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>Marka</label>
        <FilterSelect
          value={draft.brandId === null ? '' : String(draft.brandId)}
          onChange={(v) => patch({ brandId: v === '' ? null : Number(v) })}
          placeholder="Marka seçin"
          height="h-8.5"
          options={[
            { value: '', label: 'Markasız' },
            // Pasif marka seçilemez; ama kanalın mevcut markası pasifse listede kalır.
            ...brands
              .filter((b) => b.isActive || b.id === channel?.brandId)
              .map((b) => ({ value: String(b.id), label: b.name })),
          ]}
        />
      </div>

      <div>
        <label className={labelClass}>Katalog profili</label>
        <FilterSelect
          value={draft.catalogProfileId === null ? '' : String(draft.catalogProfileId)}
          onChange={(v) => patch({ catalogProfileId: v === '' ? null : Number(v) })}
          placeholder={draft.country ? 'Profil seçin' : 'Önce ülke seçin'}
          height="h-8.5"
          options={[
            { value: '', label: 'Ülke varsayılanı' },
            ...countryProfiles.map((p) => ({ value: String(p.id), label: p.name })),
          ]}
        />
        <div className="mt-0.5 text-[10px] text-[var(--fg-muted)]">
          Bot ürün, fiyat, stok ve linki bu profilin kaynaklarından okur. Profiller: Kanallar ve Profiller › Profiller.
        </div>
      </div>

      {catalogMissing && (
        <div className="rounded-[4px] border border-amber-500/40 bg-amber-500/10 p-2.5 text-[11px] leading-relaxed text-[var(--fg)]">
          <strong>Bu ülkede fiyat/stok kaynağı yok.</strong> Bot bu kanalda fiyat ve stok sorusuna
          cevap vermez; uydurmak yerine konuşmayı temsilciye devreder. Sipariş takibi ve diğer
          sorular normal çalışır.
        </div>
      )}
    </>
  );
}
