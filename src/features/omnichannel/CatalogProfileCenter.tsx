'use client';

import { useState } from 'react';
import { ArrowLeft, Pencil } from 'lucide-react';
import { CountryFlag } from '../../components/ui/CountryFlag';
import { omnichannelCatalogApi, type CatalogProfileSaveBody } from '../../lib/api/omnichannel-catalog';
import { describeError } from '../../lib/errors';
import { useFeedback } from '../shared/Feedback';
import { CatalogProfileEditor } from './CatalogProfileEditor';
import { CoverageLine, ProfileFacts } from './CatalogProfileCard';
import { CountrySiteSources } from './CountrySiteSources';
import { secondaryButtonClass } from './formClasses';
import { useOmnichannelNav } from './OmnichannelNavContext';
import { PriceRulesSummary } from './PriceRulesSummary';
import { ProfilePaymentSection } from './ProfilePaymentSection';
import { useCatalogProfiles } from './useCatalogProfiles';
import { useOmnichannelCountries } from './useOmnichannelCountries';

// Profil Merkezi: bir katalog profiliyle ilgili her şey tek sayfada — kaynaklar ve fiyat listesi, ülkenin web
// siteleri, profili kullanan kanallar ve profil kapsamındaki ödeme yöntemleri.
export function CatalogProfileCenter({ profileId }: { profileId: number }) {
  const { go } = useOmnichannelNav();
  const { profiles, sources, siteSources, loading, error, reload } = useCatalogProfiles();
  const { countries } = useOmnichannelCountries();
  const { notify } = useFeedback();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const profile = profiles.find((p) => p.id === profileId) ?? null;
  const backToList = () => go({ tab: 'channels', sub: 'profiles' });

  const save = async (body: CatalogProfileSaveBody) => {
    setSaving(true);
    try {
      await omnichannelCatalogApi.updateProfile(profileId, body);
      notify.success(`${body.name} kaydedildi.`);
      setEditing(false);
      await reload();
    } catch (e) {
      notify.error(describeError(e));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6 text-center text-xs text-[var(--fg-muted)]">Profil yükleniyor…</div>;
  if (!profile) {
    return (
      <div className="flex flex-col items-start gap-3 p-6 text-xs">
        <p className="m-0 text-rose-500">{error ?? 'Profil bulunamadı; silinmiş olabilir.'}</p>
        <button type="button" onClick={backToList} className="font-semibold text-[var(--fg)] underline">Profillere dön</button>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col">
      <header className="flex min-w-0 flex-col gap-2 border-b border-[var(--border-soft)] px-4 pb-3 pt-4 sm:px-5">
        <button type="button" onClick={backToList}
          className="inline-flex w-fit cursor-pointer items-center gap-1 text-[11px] font-semibold text-[var(--fg-muted)] hover:text-[var(--fg)]">
          <ArrowLeft size={12} aria-hidden /> Profiller
        </button>
        <h2 className="m-0 flex min-w-0 items-center gap-2 text-sm font-bold text-[var(--fg)]">
          <CountryFlag code={profile.country} size={18} />
          <span className="truncate">{profile.name}</span>
        </h2>
      </header>

      <div className="flex min-w-0 flex-col gap-4 p-4 text-xs sm:p-5">
        <section className="flex min-w-0 flex-col gap-3 rounded-xl border border-[var(--border-soft)] bg-[var(--card)] p-4 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="m-0 text-xs font-bold text-[var(--fg)]">Katalog kaynakları</h3>
            {!editing && (
              <button type="button" className={secondaryButtonClass} onClick={() => setEditing(true)}>
                <Pencil size={13} /> Düzenle
              </button>
            )}
          </div>
          {editing ? (
            <CatalogProfileEditor
              initial={profile}
              countries={countries}
              sources={sources}
              siteSources={siteSources}
              saving={saving}
              onSave={(body) => void save(body)}
              onCancel={() => setEditing(false)}
            />
          ) : (
            <>
              <ProfileFacts profile={profile} sources={sources} siteSources={siteSources} />
              <PriceRulesSummary profileId={profile.id} />
              <CoverageLine profileId={profile.id} />
            </>
          )}
        </section>

        <CountrySiteSources country={profile.country} siteSources={siteSources} onChanged={reload} />

        <section className="flex min-w-0 flex-col gap-2 rounded-xl border border-[var(--border-soft)] bg-[var(--card)] p-4 shadow-xs">
          <h3 className="m-0 text-xs font-bold text-[var(--fg)]">Bu profili kullanan kanallar</h3>
          {profile.channels.length === 0 ? (
            <p className="m-0 text-[var(--fg-muted)]">Henüz kullanan kanal yok.</p>
          ) : (
            <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
              {profile.channels.map((channel) => (
                <li key={channel.id}>
                  <button type="button" className={secondaryButtonClass}
                    onClick={() => go({ tab: 'channels', channelId: channel.id })}>
                    {channel.displayName}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <ProfilePaymentSection profileId={profile.id} profileName={profile.name} />
      </div>
    </div>
  );
}
