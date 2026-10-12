'use client';

import { CONVERSATION_FILTER, omnichannelApi, type ConversationFilter, type OverviewScopeParams } from '../../lib/api/omnichannel';
import { CardLink, ChartCard } from './OverviewCards';
import { SnapshotList, type SnapshotItem } from './SnapshotList';
import { formatRelativeTime } from './relativeTime';
import { useResource } from './useResource';

const VISIBLE_COUNT = 5;

interface Props {
  scope: OverviewScopeParams;
  reloadKey: number;
  onOpenConversation?: (conversationId: number) => void;
  onOpenInbox?: (filter: ConversationFilter) => void;
}

// Cevap süresi hedefini aşmış konuşmalar (şu an, dönemden bağımsız; seçili marka/kanal/ülkeye uyar).
export function OverviewSlaWidget({ scope, reloadKey, onOpenConversation, onOpenInbox }: Props) {
  const { brandId, channelId, country } = scope;
  const conversations = useResource(
    () => omnichannelApi.getConversations({ filter: CONVERSATION_FILTER.SlaBreached, take: VISIBLE_COUNT, brandId, channelId, country }),
    `sla-${brandId}-${channelId}-${country}-${reloadKey}`,
  );

  const items: SnapshotItem[] = (conversations.data ?? []).map((c) => ({
    id: c.id,
    title: c.contactDisplayName ?? c.contactExternalId,
    subtitle: c.lastMessagePreview ? `${c.channelName} · ${c.lastMessagePreview}` : c.channelName,
    meta: formatRelativeTime(c.lastMessageAt),
    attention: true,
    onOpen: onOpenConversation && (() => onOpenConversation(c.id)),
  }));

  return (
    <ChartCard
      title="Süresi geçen konuşmalar" loading={conversations.loading && !conversations.data} error={conversations.error}
      caption={items.length === 0 ? undefined : 'Müşteri cevap bekliyor ve hedef süre aşıldı; en eskiden başlayın.'}
      action={onOpenInbox && <CardLink label="Gelen kutusunda aç" onClick={() => onOpenInbox(CONVERSATION_FILTER.SlaBreached)} />}
    >
      <SnapshotList items={items} ariaLabel="Süresi geçen konuşmalar" emptyText="Süresi geçen konuşma yok." />
    </ChartCard>
  );
}
