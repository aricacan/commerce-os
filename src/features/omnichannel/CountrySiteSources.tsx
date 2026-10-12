'use client';

import { useState } from 'react';
import { Globe, Plus, RefreshCw } from 'lucide-react';
import {
  omnichannelCatalogApi, type CatalogSiteSourceDto, type CatalogSiteSourceSaveBody,
} from '../../lib/api/omnichannel-catalog';
import { describeError } from '../../lib/errors';
import { useFeedback } from '../shared/Feedback';
import { secondaryButtonClass } from './formClasses';
import { SettingsLink } from './SettingsLink';
import { SiteSourceEditor } from './SiteSourceEditor';
import { SiteSyncStatus } from './SiteSyncStatus';
import { SYNC_STATUS } from './siteSyncHealth';
import { useOmnichannelCountries } from './useOmnichannelCountries';

interface Props {
  country: string | null;
  siteSources: CatalogSiteSourceDto[];
  onChanged: () => Promise<void>;
}

// Bir ülkenin web sitesi kaynakları: son senkron durumu, "şimdi çek" ve yeni site ekleme. Düzenleme/silme
// Hesap geneli › Veri kaynakları'nda kalır (bağlantı aşağıda). Kanal ve Profil Merkezi aynı bileşeni kullanır.
export function CountrySiteSources({ country, siteSources, onChanged }: Props) {
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const { countries } = useOmnichannelCountries();
  const { notify } = useFeedback();
  const sites = siteSources.filter((s) => country !== null && s.country.toUpperCase() === country.toUpperCase());

  const create = async (body: CatalogSiteSourceSaveBody) => {
    setSaving(true);
    try {
      await omnichannelCatalogApi.createSite(body);
      notify.success(`${body.name} eklendi; ürünler arka planda çekiliyor.`);
      setAdding(false);
      await onChanged();
    } catch (e) {
      notify.error(describeError(e));
    } finally {
      setSaving(false);
    }
  };

  const sync = async (site: CatalogSiteSourceDto) => {
    try {
      await omnichannelCatalogApi.syncSite(site.id);
      notify.success('Çekme başladı; birkaç dakika sürebilir.');
      await onChanged();
    } catch (e) {
      notify.error(describeError(e));
    }
  };

  return (
    <section className="flex min-w-0 flex-col gap-3 rounded-xl border border-[var(--border-soft)] bg-[var(--card)] p-4 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="m-0 flex items-center gap-1.5 text-xs font-bold text-[var(--fg)]">
          <Globe size={13} className="text-[var(--fg-muted)]" aria-hidden /> Web sitesi kaynakları{country ? ` (${country})` : ''}
        </h3>
        {!adding && (
          <button type="button" className={secondaryButtonClass} onClick={() => setAdding(true)}>
            <Plus size={13} /> Site kaynağı ekle
          </button>
        )}
      </div>

      {adding && (
        <SiteSourceEditor
          initial={null}
          defaultCountry={country ?? undefined}
          countries={countries}
          saving={saving}
          onSave={(body) => void create(body)}
          onCancel={() => setAdding(false)}
        />
      )}

      {sites.length === 0 && !adding && (
        <p className="m-0 text-[var(--fg-muted)]">Bu ülke için web sitesi kaynağı yok.</p>
      )}
      <ul className="m-0 flex list-none flex-col divide-y divide-[var(--border-soft)] p-0">
        {sites.map((site) => (
          <li key={site.id} className="flex min-w-0 flex-wrap items-start justify-between gap-2 py-2">
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate font-bold text-[var(--fg)]">{site.name}</span>
              <span className="truncate text-[11px] text-[var(--fg-muted)]">
                {site.baseUrl} · {site.activeItems.toLocaleString('tr-TR')} ürün{site.isActive ? '' : ' · pasif'}
              </span>
              <SiteSyncStatus site={site} />
            </div>
            <button
              type="button"
              title="Şimdi çek"
              disabled={!site.isActive || site.syncStatus === SYNC_STATUS.Syncing}
              onClick={() => void sync(site)}
              className={secondaryButtonClass}
            >
              <RefreshCw size={12} /> Şimdi çek
            </button>
          </li>
        ))}
      </ul>

      <SettingsLink target={{ tab: 'account', sub: 'sources' }}>Siteleri düzenle / sil: Hesap geneli › Veri kaynakları</SettingsLink>
    </section>
  );
}
