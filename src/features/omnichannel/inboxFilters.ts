import {
  CONVERSATION_FILTER,
  type ChannelType, type ConversationFilter, type ConversationStage, type ConversationTopic, type InboxChannelDto,
} from '../../lib/api/omnichannel';
import { EMPTY_DETAIL_FILTER, hasDetailFilter, type InboxDetailFilter } from './InboxDetailFilters';

// Gelen kutusunun üst filtre çubuğunun tüm durumu tek nesnede — hepsi birlikte (VE) uygulanır.
export interface InboxFilters {
  // null = tüm kanallar.
  channelId: number | null;
  // null = tüm markalar (P29).
  brandId: number | null;
  // null = tüm platformlar.
  platform: ChannelType | null;
  filter: ConversationFilter;
  // null = tüm konular.
  topic: ConversationTopic | null;
  // null = tüm aşamalar (P22).
  stage: ConversationStage | null;
  search: string;
  detail: InboxDetailFilter;
}

// Gelen kutusu iki ayrı sekmede açılır: konuşma listesi ('list') ve kanban panosu ('board').
export type InboxView = 'list' | 'board';

export const EMPTY_INBOX_FILTERS: InboxFilters = {
  channelId: null,
  brandId: null,
  platform: null,
  filter: CONVERSATION_FILTER.All,
  topic: null,
  stage: null,
  search: '',
  detail: EMPTY_DETAIL_FILTER,
};

// Boş liste mesajı için: "hiç konuşma yok" mu, "filtreye uyan yok" mu?
export function hasActiveInboxFilter(value: InboxFilters): boolean {
  return value.channelId !== null
    || value.brandId !== null
    || value.platform !== null
    || value.filter !== CONVERSATION_FILTER.All
    || value.topic !== null
    || value.stage !== null
    || value.search.trim() !== ''
    || hasDetailFilter(value.detail);
}

// Filtre çubuğundaki açılır menülerden kaçı seçili (arama kutusu sayılmaz). Panoda durum ve
// aşama menüsü yoktur; oradaki değerler sayıya girmez.
export function countActiveInboxFilters(value: InboxFilters, view: InboxView): number {
  const selected = [
    value.platform !== null,
    value.brandId !== null,
    value.channelId !== null,
    value.topic !== null,
    value.detail.country !== null,
    value.detail.tagId !== null,
    view === 'list' && value.filter !== CONVERSATION_FILTER.All,
    view === 'list' && value.stage !== null,
  ];
  return selected.filter(Boolean).length;
}

// Platform seçilince, başka platformdaki seçili kanal bırakılır — ikisi birlikte boş liste verirdi.
// Seçili marka korunur: "StoreB + Instagram" anlamlı bir birleşim.
export function selectPlatform(
  value: InboxFilters, platform: ChannelType | null, channels: InboxChannelDto[],
): InboxFilters {
  const selectedChannel = channels.find((c) => c.id === value.channelId);
  const keepChannel = platform === null || selectedChannel?.type === platform;
  return { ...value, platform, channelId: keepChannel ? value.channelId : null };
}
