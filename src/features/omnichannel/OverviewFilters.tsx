'use client';

import { DateRangePicker } from '../../components/ui/DateRangePicker';
import { FilterSelect } from '../../components/ui/FilterSelect';
import type { InboxChannelDto, OverviewScopeParams } from '../../lib/api/omnichannel';
import type { OverviewRange } from './overviewPeriod';
import { useOmnichannelCountries } from './useOmnichannelCountries';

interface Props {
  range: OverviewRange;
  onRangeChange: (range: OverviewRange) => void;
  scope: OverviewScopeParams;
  onScopeChange: (scope: OverviewScopeParams) => void;
  channels: InboxChannelDto[];
}

const FILTER_WIDTH_PX = 170;

// Marka listesi kanallardan türetilir (ayrı bir uç nokta yok): markası olan kanalların tekil markaları.
function brandOptions(channels: InboxChannelDto[]) {
  const brands = new Map<number, string>();
  for (const channel of channels) {
    if (channel.brandId != null) brands.set(channel.brandId, channel.brandName ?? `Marka ${channel.brandId}`);
  }
  return [...brands].map(([id, name]) => ({ value: String(id), label: name }));
}

// Genel Bakış'ın üst filtre satırı: dönem (ortak tarih aralığı seçici) + marka + kanal + ülke. Marka seçilince kanal listesi o markanınkilerle sınırlanır.
export function OverviewFilters({ range, onRangeChange, scope, onScopeChange, channels }: Props) {
  const { countries } = useOmnichannelCountries();
  const brands = brandOptions(channels);
  const visibleChannels = scope.brandId == null ? channels : channels.filter((c) => c.brandId === scope.brandId);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <DateRangePicker
        className="shrink-0"
        value={range.preset}
        onChange={(preset) => onRangeChange({ ...range, preset })}
        customFrom={range.customFrom}
        customTo={range.customTo}
        onCustomChange={(customFrom, customTo) => onRangeChange({ preset: 'custom', customFrom, customTo })}
      />
      <span aria-hidden className="hidden h-5 w-px bg-border md:block" />
      {brands.length > 1 && (
        <FilterSelect
          ariaLabel="Marka" className="shrink-0" minWidth={FILTER_WIDTH_PX} placeholder="Tüm markalar"
          value={scope.brandId == null ? '' : String(scope.brandId)} options={brands}
          onChange={(v) => onScopeChange({ ...scope, brandId: v === '' ? null : Number(v), channelId: null })}
        />
      )}
      <FilterSelect
        ariaLabel="Kanal" className="shrink-0" minWidth={FILTER_WIDTH_PX} placeholder="Tüm kanallar"
        value={scope.channelId == null ? '' : String(scope.channelId)}
        options={visibleChannels.map((c) => ({ value: String(c.id), label: c.displayName }))}
        onChange={(v) => onScopeChange({ ...scope, channelId: v === '' ? null : Number(v) })}
      />
      {countries.length > 1 && (
        <FilterSelect
          ariaLabel="Ülke" className="shrink-0" minWidth={FILTER_WIDTH_PX} placeholder="Tüm ülkeler"
          value={scope.country ?? ''} options={countries.map((c) => ({ value: c.code, label: c.name }))}
          onChange={(v) => onScopeChange({ ...scope, country: v === '' ? null : v })}
        />
      )}
    </div>
  );
}
