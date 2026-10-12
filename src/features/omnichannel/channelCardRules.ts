import { CHANNEL_STATUS, type BrandDto, type ChannelDto } from '../../lib/api/omnichannel';

// Kanal kartı için saf mantık: durum etiketi ve markaya göre bölümleme. Bileşenler yalnız çizer.

export type ChannelStatusTone = 'ok' | 'error' | 'idle';

export interface ChannelStatusView {
  label: string;
  tone: ChannelStatusTone;
}

const STATUS_VIEWS: Record<number, ChannelStatusView> = {
  [CHANNEL_STATUS.Connected]: { label: 'Bağlı', tone: 'ok' },
  [CHANNEL_STATUS.Error]: { label: 'Hata', tone: 'error' },
  [CHANNEL_STATUS.Disconnected]: { label: 'Bağlı değil', tone: 'idle' },
};

const PASSIVE_PREFIX = 'Pasif';

// Bağlantı + Aktif/Pasif tek etikette: pasif kanalın rengi söner ("Pasif · Bağlı").
// Kaldırılmış eski durum değeri (1, 2) gelirse ekran çökmesin: "Bağlı değil".
export function channelStatusView(channel: Pick<ChannelDto, 'status' | 'isActive'>): ChannelStatusView {
  const connection = STATUS_VIEWS[channel.status] ?? STATUS_VIEWS[CHANNEL_STATUS.Disconnected];
  if (channel.isActive) return connection;
  return { label: `${PASSIVE_PREFIX} · ${connection.label}`, tone: 'idle' };
}

export interface BrandSectionData {
  key: string;
  // null = markasız kanallar bölümü.
  brand: BrandDto | null;
  channels: ChannelDto[];
}

const UNBRANDED_KEY = 'unbranded';

// Marka bölümleri marka listesinin sırasıyla; boş markalar da görünür.
// Markasız ya da tanınmayan markaya bağlı kanallar sonda tek bölümde toplanır.
export function groupChannelsIntoBrandSections(channels: ChannelDto[], brands: BrandDto[]): BrandSectionData[] {
  const knownIds = new Set(brands.map((b) => b.id));
  const sections: BrandSectionData[] = brands.map((brand) => ({
    key: String(brand.id),
    brand,
    channels: channels.filter((c) => c.brandId === brand.id),
  }));
  const unbranded = channels.filter((c) => c.brandId == null || !knownIds.has(c.brandId));
  if (unbranded.length > 0) sections.push({ key: UNBRANDED_KEY, brand: null, channels: unbranded });
  return sections;
}
