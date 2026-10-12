'use client';

import { formatDateTime } from '@/lib/format';
import { useState } from 'react';
import { CountryFlag } from '../../components/ui/CountryFlag';
import { FilterSelect } from '../../components/ui/FilterSelect';
import { omnichannelApi, type ChannelDto } from '../../lib/api/omnichannel';
import type { ChannelCatalogSourceDto, ChannelEffectiveSettingsDto } from '../../lib/api/omnichannel-channel-settings';
import { describeError } from '../../lib/errors';
import { useFeedback } from '../shared/Feedback';
import { ChannelShopifyCard } from './ChannelShopifyCard';
import { channelUpdateBody } from './channelUpdateBody';
import { CountrySiteSources } from './CountrySiteSources';
import { labelClass } from './formClasses';
import { PriceRulesSummary } from './PriceRulesSummary';
import { ScopeBadge } from './ScopeBadge';
import { SettingsLink } from './SettingsLink';
import { useCatalogProfiles } from './useCatalogProfiles';

interface Props {
  channel: ChannelDto;
  settings: ChannelEffectiveSettingsDto;
  onChanged: () => Promise<void>;
}

const NO_PROFILE = '';

const syncText = (at: string | null) => (at ? formatDateTime(at, 'tr', { dateStyle: 'short', timeStyle: 'short' }) : 'hiç çekilmedi');

// Kanal Merkezi › Katalog ve siteler: botun bu kanalda ürün/fiyat/stok/linki nereden okuduğu. Profil seçimi burada
// kaydedilir; profilin kendisi Kanallar ve Profiller › Profiller'de (Profil Merkezi) düzenlenir.
export function ChannelCenterCatalog({ channel, settings, onChanged }: Props) {
  const { catalog } = settings;
  const { profiles, siteSources, reload: reloadCatalog } = useCatalogProfiles();
  const { notify } = useFeedback();
  const [saving, setSaving] = useState(false);
  const countryProfiles = profiles.filter((p) => p.country.toUpperCase() === (settings.country ?? ''));

  const selectProfile = async (value: string) => {
    setSaving(true);
    try {
      const catalogProfileId = value === NO_PROFILE ? null : Number(value);
      await omnichannelApi.updateChannel(channel.id, channelUpdateBody(channel, { catalogProfileId }));
      notify.success(catalogProfileId === null ? 'Kanal ülke varsayılanına döndü.' : 'Katalog profili güncellendi.');
      await onChanged();
    } catch (e) {
      notify.error(describeError(e));
    } finally {
      setSaving(false);
    }
  };

  const reloadAll = async () => { await Promise.all([onChanged(), reloadCatalog()]); };

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <section className="flex min-w-0 flex-col gap-3 rounded-xl border border-[var(--border-soft)] bg-[var(--card)] p-4 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="m-0 text-xs font-bold text-[var(--fg)]">Katalog kaynağı</h3>
          <ScopeBadge
            label={catalog.isCountryDefault ? 'Ülke varsayılanı' : `Profil: ${catalog.profileName ?? ''}`}
            tone={catalog.isCountryDefault ? 'neutral' : 'info'}
          />
        </div>

        <div className={`sm:w-1/2 ${saving || !settings.country ? 'pointer-events-none opacity-60' : ''}`}>
          <label className={labelClass}>Katalog profili</label>
          <FilterSelect
            value={catalog.profileId === null ? NO_PROFILE : String(catalog.profileId)}
            onChange={(value) => void selectProfile(value)}
            placeholder={settings.country ? 'Profil seçin' : 'Önce ülke seçin'}
            height="h-8.5"
            showAllOption={false}
            options={[
              { value: NO_PROFILE, label: 'Ülke varsayılanı' },
              ...countryProfiles.map((p) => ({ value: String(p.id), label: p.name })),
            ]}
          />
        </div>

        {catalog.isCountryDefault ? (
          <p className="m-0 text-[11px] text-[var(--fg-muted)]">
            Profil seçilmediği için bot {settings.country ?? 'ülke'} ülkesindeki aktif kaynakları kullanır.
          </p>
        ) : (
          <div className="flex flex-col gap-1 text-[11px]">
            <PriceRulesSummary profileId={catalog.profileId ?? 0} />
            {catalog.profileId !== null && (
              <SettingsLink target={{ tab: 'channels', sub: 'profiles', profileId: catalog.profileId }}>
                Profil Merkezi: kaynakları ve fiyat listesini düzenle
              </SettingsLink>
            )}
          </div>
        )}

        {catalog.sources.length === 0 ? (
          <p className="m-0 rounded-lg border border-amber-500/40 bg-amber-500/10 p-2.5 text-[11px] text-[var(--fg)]">
            Bu kanalda kaynak yok: bot fiyat ve stok sorusuna cevap vermez, konuşmayı temsilciye devreder.
          </p>
        ) : (
          <ul className="m-0 flex list-none flex-col divide-y divide-[var(--border-soft)] p-0">
            {catalog.sources.map((source) => <CatalogSourceRow key={`${source.isWebsite}-${source.id}-${source.role}`} source={source} />)}
          </ul>
        )}
      </section>

      <CountrySiteSources country={settings.country} siteSources={siteSources} onChanged={reloadAll} />
      <ChannelShopifyCard country={settings.country} brandName={settings.brandName} />
    </div>
  );
}

function CatalogSourceRow({ source }: { source: ChannelCatalogSourceDto }) {
  return (
    <li className="flex min-w-0 flex-wrap items-center justify-between gap-2 py-2">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="flex items-center gap-2 font-bold text-[var(--fg)]">
          <CountryFlag code={source.country} size={16} />
          <span className="truncate">{source.name}</span>
        </span>
        <span className="text-[11px] text-[var(--fg-muted)]">
          {source.isWebsite ? 'Web sitesi' : source.kind} · Son çekme: {syncText(source.lastSyncAt)}
        </span>
        {source.lastError && <span className="truncate text-[11px] text-rose-500" title={source.lastError}>{source.lastError}</span>}
      </div>
      <div className="flex items-center gap-1.5">
        <ScopeBadge label={source.role} tone="info" />
        <ScopeBadge label={source.isActive ? 'Aktif' : 'Pasif'} tone={source.isActive ? 'success' : 'neutral'} />
      </div>
    </li>
  );
}
