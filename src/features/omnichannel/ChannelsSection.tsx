'use client';

import { CatalogProfileCenter } from './CatalogProfileCenter';
import { CatalogProfilesTab } from './CatalogProfilesTab';
import { ChannelCenter } from './ChannelCenter';
import { ChannelsTab } from './ChannelsTab';
import { CountriesTab } from './CountriesTab';
import { useOmnichannelNav } from './OmnichannelNavContext';
import { SubTabBar } from './SubTabBar';
import { SETTINGS_PAGES, resolveSubPage } from './workspace-tabs';

// Kanallar ve Profiller: adreste ?channel=<id> varsa o kanalın merkezi, ?profile=<id> varsa o profilin merkezi;
// yoksa üstte Kanallar | Profiller | Ülkeler sekmeleri.
export function ChannelsSection() {
  const { view, go } = useOmnichannelNav();
  if (view.channelId !== null) return <ChannelCenter key={view.channelId} channelId={view.channelId} />;
  if (view.profileId !== null) return <CatalogProfileCenter key={view.profileId} profileId={view.profileId} />;

  const sub = resolveSubPage('channels', view.sub);
  return (
    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col">
      <SubTabBar tabs={SETTINGS_PAGES.channels} active={sub} ariaLabel="Kanallar ve Profiller" onChange={(key) => go({ sub: key })} />
      {sub === 'list' && <ChannelsTab />}
      {sub === 'profiles' && <CatalogProfilesTab />}
      {sub === 'countries' && <CountriesTab />}
    </div>
  );
}
