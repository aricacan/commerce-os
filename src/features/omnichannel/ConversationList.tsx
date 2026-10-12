'use client';

import { useEffect, useRef } from 'react';
import { AlertCircle, MessageSquareOff } from 'lucide-react';
import type { ConversationSummaryDto, InboxChannelDto } from '../../lib/api/omnichannel';
import { channelTypeMeta } from './shared';
import { brandNamesByChannel } from './brandGroups';
import { channelIdentity } from './channelIdentity';
import { splitDormant, summarizeConversations } from './conversationGroups';
import { ConversationListPager } from './ConversationListPager';
import { ConversationListSkeleton } from './ConversationListSkeleton';
import { ConversationListSummary } from './ConversationListSummary';
import { ConversationRow } from './ConversationRow';
import { DormantConversationGroup } from './DormantConversationGroup';

// Konuşma listesi. Filtreler üstteki InboxFilterBar'da (Gelen Kutusu v2 §2); liste yalnız
// sonuçları gösterir.
interface Props {
  conversations: ConversationSummaryDto[];
  // Satırdaki kanal yazısı için: markalı kanalda "StoreB · Instagram" (P29).
  channels: InboxChannelDto[];
  selectedId: number | null;
  loading: boolean;
  error: string | null;
  // "Tümü" görünümünde satırda kanal adı da gösterilir.
  showChannelName: boolean;
  // Boş liste mesajı: "hiç konuşma yok" mu, "filtreye uyan yok" mu?
  hasActiveFilter: boolean;
  // Uykudaki konuşmalar altta katlı bir grupta mı durur, yoksa diğerleriyle düz mü?
  groupDormant: boolean;
  // Sayfalama: sayfa boyutu kullanıcı seçer (25/50/100); toplam, seçili durum hapının sayacıdır (gelmeyebilir).
  page: number;
  pageSize: number;
  total: number | undefined;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onSelect: (conversation: ConversationSummaryDto) => void;
}

export function ConversationList({
  conversations, channels, selectedId, loading, error, showChannelName, hasActiveFilter, groupDormant,
  page, pageSize, total, onPageChange, onPageSizeChange, onSelect,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  // Yeni sayfa listenin başından okunur.
  useEffect(() => { scrollRef.current?.scrollTo({ top: 0 }); }, [page]);

  const brandNames = brandNamesByChannel(channels);
  const { live, dormant } = groupDormant ? splitDormant(conversations) : { live: conversations, dormant: [] };

  const renderRow = (c: ConversationSummaryDto) => {
    const brandName = brandNames.get(c.channelId);
    const identity = !showChannelName ? null : channelIdentity({
      platformLabel: channelTypeMeta(c.channelType).label, channelName: c.channelName, brandName, country: c.country,
    });
    return (
      <ConversationRow
        key={c.id}
        conversation={c}
        identity={identity}
        selected={c.id === selectedId}
        onSelect={onSelect}
      />
    );
  };

  const initialLoading = loading && conversations.length === 0;

  return (
    <div className="flex h-full min-w-0 flex-col bg-card">
      {!initialLoading && conversations.length > 0 && (
        <ConversationListSummary summary={summarizeConversations(live)} />
      )}

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        {error && (
          <p role="alert" className="m-3 flex items-start gap-2 rounded-lg bg-danger-soft p-3 text-ui-sm font-semibold text-danger">
            <AlertCircle size={14} className="mt-px shrink-0" aria-hidden />
            {error}
          </p>
        )}

        {initialLoading && <ConversationListSkeleton />}

        {!loading && conversations.length === 0 && !error && <EmptyList hasActiveFilter={hasActiveFilter} />}

        {live.map(renderRow)}

        {dormant.length > 0 && (
          <DormantConversationGroup count={dormant.length} containsSelected={dormant.some((c) => c.id === selectedId)}>
            {dormant.map(renderRow)}
          </DormantConversationGroup>
        )}

        <ConversationListPager
          page={page} pageSize={pageSize} loadedCount={conversations.length} total={total} loading={loading}
          onPageChange={onPageChange} onPageSizeChange={onPageSizeChange}
        />
      </div>
    </div>
  );
}

function EmptyList({ hasActiveFilter }: { hasActiveFilter: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      <span className="flex size-10 items-center justify-center rounded-full bg-bg-subtle text-fg-muted">
        <MessageSquareOff size={18} aria-hidden />
      </span>
      <p className="m-0 text-ui-md font-semibold text-fg">Konuşma yok</p>
      <p className="m-0 max-w-[240px] text-ui-sm text-fg-muted">
        {hasActiveFilter ? 'Bu filtreye uyan konuşma bulunamadı.' : 'Müşteri yazdığında konuşmalar burada belirir.'}
      </p>
    </div>
  );
}
