'use client';

import type { FilterSelectOption } from '../../components/ui/FilterSelect';
import { CHANNEL_TYPE, type ChannelType, type InboxChannelDto } from '../../lib/api/omnichannel';
import { InboxFilterSelect } from './InboxFilterSelect';
import { channelTypeMeta } from './shared';
import { groupChannelsByBrand, hasBrandLayer, selectBrand, selectChannel } from './brandGroups';
import { selectPlatform, type InboxFilters } from './inboxFilters';

// Platform, marka ve kanal açılır menüleri. Platform yalnız birden çok platform varken,
// marka yalnız birden çok marka varken (P29) gösterilir; tek seçenekli menü gereksiz tekrar olurdu.
const PLATFORM_ORDER: ChannelType[] = [
  CHANNEL_TYPE.WhatsApp, CHANNEL_TYPE.Instagram, CHANNEL_TYPE.Facebook, CHANNEL_TYPE.TikTok, CHANNEL_TYPE.Email,
];

// Okunmamış yoksa sayı yazılmaz: menüde "(0)" gürültü olurdu.
const unreadLabel = (count: number) => (count > 0 ? String(count) : undefined);

// "Facebook · StoreB Oto Aksesuar" — aynı adı taşıyan kanallar platformla ayırt edilir.
export function channelTitle(channel: InboxChannelDto): string {
  const inactive = channel.isActive === false ? ' (pasif)' : '';
  return `${channelTypeMeta(channel.type).label} · ${channel.displayName}${inactive}`;
}

interface Props {
  channels: InboxChannelDto[];
  value: InboxFilters;
  onChange: (value: InboxFilters) => void;
}

export function InboxChannelFilters({ channels, value, onChange }: Props) {
  const platforms = PLATFORM_ORDER.filter((type) => channels.some((c) => c.type === type));
  const platformOptions: FilterSelectOption[] = platforms.map((type) => ({
    value: String(type), label: channelTypeMeta(type).label,
  }));

  const brands = hasBrandLayer(channels)
    ? groupChannelsByBrand(channels, value.platform).filter((group) => group.brandId !== null)
    : [];
  const brandOptions: FilterSelectOption[] = brands.map((group) => ({
    value: String(group.brandId), label: group.name, sublabel: unreadLabel(group.unread),
  }));

  // Kanal listesi seçili platform ve markayla daralır: olmayan bir birleşim seçtirilmez.
  const visibleChannels = channels.filter((c) =>
    (value.platform === null || c.type === value.platform)
    && (value.brandId === null || (c.brandId ?? null) === value.brandId));
  const channelOptions: FilterSelectOption[] = visibleChannels.map((c) => ({
    value: String(c.id), label: channelTitle(c), sublabel: unreadLabel(c.unreadCount),
  }));

  return (
    <>
      {platforms.length > 1 && (
        <InboxFilterSelect
          ariaLabel="Platform"
          value={value.platform === null ? '' : String(value.platform)}
          placeholder="Tüm platformlar"
          options={platformOptions}
          onChange={(v) => onChange(selectPlatform(
            value, platforms.find((type) => String(type) === v) ?? null, channels,
          ))}
        />
      )}
      {brandOptions.length > 0 && (
        <InboxFilterSelect
          ariaLabel="Marka"
          value={value.brandId === null ? '' : String(value.brandId)}
          placeholder="Tüm markalar"
          options={brandOptions}
          onChange={(v) => onChange(selectBrand(value, v === '' ? null : Number(v)))}
        />
      )}
      <InboxFilterSelect
        ariaLabel="Kanal"
        value={value.channelId === null ? '' : String(value.channelId)}
        placeholder="Tüm kanallar"
        options={channelOptions}
        // "Tüm kanallar" seçili markayı bozmaz; tek kanal seçimi markanın yerini alır (selectChannel).
        onChange={(v) => onChange(v === '' ? { ...value, channelId: null } : selectChannel(value, Number(v)))}
      />
    </>
  );
}
