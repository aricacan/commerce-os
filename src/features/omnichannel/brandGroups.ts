import type { ChannelType, InboxChannelDto } from '../../lib/api/omnichannel';
import type { InboxFilters } from './inboxFilters';

// Gelen kutusunun "Marka → kanal" çubuğu (P29) için saf mantık: kanalları markaya göre
// gruplar, okunmamışları toplar, filtre geçişlerini üretir. Bileşenler yalnız çizer.

// Markasız kanalların grubu. Marka filtresi yoktur — yalnız tek tek kanal seçilir.
export const OTHER_GROUP_KEY = 'other';
export const OTHER_GROUP_NAME = 'Diğer';

export interface BrandGroup {
  // OTHER_GROUP_KEY ya da markanın id'si (metin olarak) — React key'i ve seçim kimliği.
  key: string;
  // null = "Diğer" grubu.
  brandId: number | null;
  name: string;
  // Seçili platforma uyan kanallar (platform yoksa hepsi).
  channels: InboxChannelDto[];
  unread: number;
}

// Eski backend markayı göndermez → undefined da markasız sayılır.
const brandIdOf = (channel: InboxChannelDto): number | null => channel.brandId ?? null;

// Marka katmanı yalnız birden çok marka varken anlamlı; tek markada bugünkü düz görünüm kalır.
export function hasBrandLayer(channels: InboxChannelDto[]): boolean {
  const brandIds = new Set(channels.map(brandIdOf).filter((id): id is number => id !== null));
  return brandIds.size > 1;
}

// Markalar ada göre sıralı, "Diğer" en sonda (yalnız markasız kanal varsa). Marka listesi
// platformdan bağımsızdır — platform değişince çipler kaybolup seçim görünmez olmasın.
export function groupChannelsByBrand(channels: InboxChannelDto[], platform: ChannelType | null): BrandGroup[] {
  const groups = new Map<string, BrandGroup>();
  for (const channel of channels) {
    const brandId = brandIdOf(channel);
    const key = brandId === null ? OTHER_GROUP_KEY : String(brandId);
    const name = brandId === null ? OTHER_GROUP_NAME : channel.brandName ?? `Marka ${brandId}`;
    const group = groups.get(key) ?? { key, brandId, name, channels: [], unread: 0 };
    if (platform === null || channel.type === platform) {
      group.channels.push(channel);
      group.unread += channel.unreadCount;
    }
    groups.set(key, group);
  }
  const brands = [...groups.values()].filter((g) => g.brandId !== null)
    .sort((a, b) => a.name.localeCompare(b.name, 'tr'));
  const other = groups.get(OTHER_GROUP_KEY);
  return other ? [...brands, other] : brands;
}

// Marka seçimi: markanın tüm kanalları. Seçili tek kanal bırakılır — ikisi birden daraltırdı.
export function selectBrand(value: InboxFilters, brandId: number | null): InboxFilters {
  return { ...value, brandId, channelId: null };
}

// Tek kanal seçimi marka filtresini kaldırır; null = "Tümü".
export function selectChannel(value: InboxFilters, channelId: number | null): InboxFilters {
  return { ...value, channelId, brandId: null };
}

// Canlı güncellemede konuşmanın markası kanal listesinden bulunur. undefined = kanal bilinmiyor.
export function channelBrandOf(channels: InboxChannelDto[], channelId: number): number | null | undefined {
  const channel = channels.find((c) => c.id === channelId);
  return channel ? brandIdOf(channel) : undefined;
}

// Konuşma satırının kanal yazısı için kanal → marka adı eşlemesi (yalnız markalı kanallar).
export function brandNamesByChannel(channels: InboxChannelDto[]): Map<number, string> {
  const names = new Map<number, string>();
  for (const channel of channels) {
    if (brandIdOf(channel) !== null && channel.brandName) names.set(channel.id, channel.brandName);
  }
  return names;
}
