'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMobile } from '../../hooks/useMobile';
import { useAuthStore } from '../../stores/auth';
import {
  omnichannelApi, MESSAGE_DIRECTION,
  type ConversationFilter, type ConversationSummaryDto, type MessageDto, type MessageStatusChangedDto,
} from '../../lib/api/omnichannel';
import { ConversationList } from './ConversationList';
import { InboxBoard } from './InboxBoard';
import { InboxFilterBar } from './InboxFilterBar';
import { useInboxBoard } from './useInboxBoard';
import { useInboxCounts } from './useInboxCounts';
import { readInboxUrlState, useInboxUrlState } from './useInboxUrlState';
import { EMPTY_INBOX_FILTERS, hasActiveInboxFilter, type InboxFilters, type InboxView } from './inboxFilters';
import { ChatPane } from './ChatPane';
import { CustomerPanel, CustomerPanelDock, customerPanelFitsBeside } from './CustomerPanel';
import { useOmnichannelHub, type HubConnectionStatus } from './useOmnichannelHub';
import { ConnectionBanner, EmptyChat } from './InboxTabParts';
import { shouldGroupDormant } from './conversationGroups';
import { useInboxConversations } from './useInboxConversations';
import { FIRST_INBOX_PAGE } from './inboxPagination';
import { useInboxPageSize } from './useInboxPageSize';
import { appendBounded } from './chatMessages';
import { describeError } from '../../lib/errors';
import { useFeedback } from '../shared/Feedback';

// Arama her tuşta sunucuya gitmesin — 300 ms yazma duraklamasını bekler.
const SEARCH_DEBOUNCE_MS = 300;
// Canlı akışlar yalnız açık konuşmanınkini ve en fazla bu kadar kaydı tutar.
const LIVE_BUFFER_CAP = 200;

// Masaüstünde kolonlar yan yana (konuşmalar → sohbet → müşteri paneli); mobilde aynı
// bölümler ardışık ekranlara dönüşür, geri tuşuyla dolaşılır. Tek kod, iki düzen.
//
// Kanal/durum/konu seçimi ayrı bir kolon değil: gelen kutusunun tepesindeki yatay filtre
// çubuğu (Gelen Kutusu v2 §2).
type MobilePane = 'conversations' | 'chat' | 'customer';

interface Props {
  // 'list': konuşma listesi (Gelen Kutusu sekmesi), 'board': kanban panosu (Pano sekmesi).
  view: InboxView;
  // Devirler kuyruğundan gelindiğinde açılacak konuşma; listede yoksa sunucudan çekilir.
  focusConversationId?: number | null;
  // Telefonda sohbet/müşteri ekranı açık mı — kabuk kendi başlığını gizlesin diye.
  onMobileChatOpenChange?: (open: boolean) => void;
  // Başka ekrandan (Genel Bakış KPI) gelindiyse adresteki ?f= yerine bu durum filtresiyle açılır.
  initialFilter?: ConversationFilter | null;
}

export function InboxTab({ view, focusConversationId = null, onMobileChatOpenChange, initialFilter = null }: Props) {
  const isMobile = useMobile();
  const myUserId = useAuthStore((state) => state.user?.id ?? null);

  // Adresteki ?f= ilk açılışta okunur (paylaşılabilir link, yenilemede kalıcılık). Panoda durum
  // filtresi yoktur; listeden kalan bir ?f= panoyu sessizce daraltmasın.
  const [urlState] = useState(readInboxUrlState);
  const [filters, setFilters] = useState<InboxFilters>({
    ...EMPTY_INBOX_FILTERS, filter: view === 'list' ? (initialFilter ?? urlState.filter) : EMPTY_INBOX_FILTERS.filter,
  });
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(FIRST_INBOX_PAGE);
  const [pageSize, setPageSize] = useInboxPageSize();
  const inbox = useInboxConversations(filters, debouncedSearch, myUserId, page, pageSize);
  const { channels, conversations, selected } = inbox;

  // Sayaçlar ve pano, durum hapı hariç aynı kapsam filtreleriyle çalışır (P28/P30).
  useInboxUrlState(filters.filter);
  const scope = useMemo(() => ({
    channelId: filters.channelId, brandId: filters.brandId, platform: filters.platform,
    topic: filters.topic, stage: filters.stage, search: debouncedSearch || undefined,
    country: filters.detail.country, tagId: filters.detail.tagId,
  }), [filters.channelId, filters.brandId, filters.platform, filters.topic, filters.stage,
    filters.detail.country, filters.detail.tagId, debouncedSearch]);
  const { counts, refreshSoon: refreshCounts } = useInboxCounts(scope);
  // Panoda aşama filtresi yok (sütunlar aşamadır); listede seçilmiş aşama panoyu sessizce daraltmasın.
  const boardScope = useMemo(() => ({ ...scope, stage: null }), [scope]);
  const board = useInboxBoard(boardScope, view === 'board');
  const refreshDerivedViews = () => {
    refreshCounts();
    board.refreshSoon();
  };

  const [mobilePane, setMobilePane] = useState<MobilePane>('conversations');
  const mobileChatOpen = isMobile && mobilePane !== 'conversations';
  useEffect(() => {
    onMobileChatOpenChange?.(mobileChatOpen);
  }, [mobileChatOpen, onMobileChatOpenChange]);
  // Sekmeden çıkınca kabuk başlığı geri gelsin.
  useEffect(() => () => onMobileChatOpenChange?.(false), [onMobileChatOpenChange]);
  // Müşteri paneli yan yana sığıyorsa varsayılan açık; dar ekranda çekmece olarak istenince açılır.
  const [customerOpen, setCustomerOpen] = useState(customerPanelFitsBeside);
  const { notify } = useFeedback();
  // SignalR bağlantı durumu — 'connecting' ilk açılış + yeniden bağlanma sırasında,
  // 'disconnected' bağlantı koptuğunda (yeniden bağlanana kadar canlı güncelleme gelmez).
  const [hubStatus, setHubStatus] = useState<HubConnectionStatus>('connecting');

  // Açık konuşmanın canlı mesajları ve tik güncellemeleri (sınırlı tampon). Tikler AYRI akış:
  // güncellenen mesaj çoğu zaman REST'ten yüklenmiştir, liveMessages'ta yoktur.
  const [liveMessages, setLiveMessages] = useState<MessageDto[]>([]);
  const [statusChanges, setStatusChanges] = useState<MessageStatusChangedDto[]>([]);
  // Yeniden bağlanınca açık sohbetin REST'ten tazelenmesi için artan sayaç.
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    // Yeni arama sonuçları ilk sayfadan başlar.
    const timer = setTimeout(() => {
      setDebouncedSearch(filters.search);
      setPage(FIRST_INBOX_PAGE);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [filters.search]);

  const channelIds = useMemo(() => channels.map((c) => c.id), [channels]);
  const selectedId = selected?.id ?? null;

  useOmnichannelHub(channelIds, {
    onMessage: (message, conversation) => {
      setLiveMessages((prev) => appendBounded(prev, message, selectedId, LIVE_BUFFER_CAP));
      inbox.applyUpdate(conversation, {
        isNewInbound: message.direction === MESSAGE_DIRECTION.Inbound,
        lastSenderType: message.senderType,
      });
      refreshDerivedViews();
    },
    onStatusChanged: (status) => {
      setStatusChanges((prev) => appendBounded(prev, status, selectedId, LIVE_BUFFER_CAP));
    },
    onConversationUpdated: (conversation) => {
      inbox.applyUpdate(conversation, { isNewInbound: false });
      refreshDerivedViews();
    },
    // P38: bağlantı koptuğunda önceden tamamen sessizdi.
    onConnectionStatusChange: setHubStatus,
    onReconnected: () => {
      void inbox.loadChannels();
      void inbox.loadConversations();
      refreshDerivedViews();
      setReloadToken((token) => token + 1);
    },
  });

  const handleSelectConversation = (conversation: ConversationSummaryDto) => {
    // Önceki konuşmanın canlı tamponu yeni sohbete taşınmaz (REST yüklemesi zaten kapsar).
    if (conversation.id !== selectedId) {
      setLiveMessages([]);
      setStatusChanges([]);
    }
    inbox.select(conversation);
    if (isMobile) setMobilePane('chat');
  };

  // Kanal/marka değişince açık sohbet kapanır — seçili konuşma yeni kanalın listesinde olmayabilir.
  const handleFiltersChange = (next: InboxFilters) => {
    if (next.channelId !== filters.channelId || next.brandId !== filters.brandId) inbox.clearSelection();
    setFilters(next);
    // Filtre değişince eski sayfa numarası anlamsız (yeni sonuçta o sayfa olmayabilir).
    setPage(FIRST_INBOX_PAGE);
  };

  // Müşteri panelinden başka bir kanaldaki konuşmaya atlama. Liste filtresinde görünmüyorsa
  // sunucudan tek başına getirilir.
  const handleOpenConversation = async (conversationId: number) => {
    const inList = conversations.find((c) => c.id === conversationId);
    try {
      handleSelectConversation(inList ?? await omnichannelApi.getConversation(conversationId));
    } catch (e) {
      notify.error(describeError(e));
    }
  };

  // Devirler sekmesinden gelen konuşma otomatik açılır (bir kez, id değiştikçe).
  useEffect(() => {
    if (focusConversationId === null) return;
    let cancelled = false;
    void (async () => {
      try {
        const conversation = conversations.find((c) => c.id === focusConversationId)
          ?? await omnichannelApi.getConversation(focusConversationId);
        if (!cancelled) handleSelectConversation(conversation);
      } catch (e) {
        if (!cancelled) notify.error(describeError(e));
      }
    })();
    return () => { cancelled = true; };
    // conversations bilerek dışarıda: liste her tazelendiğinde seçimi yeniden zorlamasın.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusConversationId]);

  const handleConversationChanged = (updated: ConversationSummaryDto) => {
    inbox.applyUpdate(updated, { isNewInbound: false });
    refreshDerivedViews();
  };

  const selectedChannel = channels.find((c) => c.id === selected?.channelId);

  const listNode = (
    <ConversationList
      conversations={conversations}
      channels={channels}
      selectedId={selectedId}
      loading={inbox.loading}
      error={inbox.error}
      showChannelName={filters.channelId === null}
      hasActiveFilter={hasActiveInboxFilter(filters)}
      groupDormant={shouldGroupDormant(filters)}
      page={page}
      pageSize={pageSize}
      total={counts[filters.filter]}
      onPageChange={setPage}
      onPageSizeChange={(size) => { setPageSize(size); setPage(FIRST_INBOX_PAGE); }}
      onSelect={handleSelectConversation}
    />
  );

  const filterBar = (
    <InboxFilterBar
      channels={channels}
      value={filters}
      onChange={handleFiltersChange}
      counts={counts}
      view={view}
    />
  );

  const boardNode = <InboxBoard board={board} channels={channels} selectedId={selectedId} onSelect={handleSelectConversation} onMoved={handleConversationChanged} />;
  const overviewNode = view === 'board' ? boardNode : listNode;

  const chatNode = selected ? (
    <ChatPane
      // key: konuşma değişince pane sıfırdan kurulur — önceki müşteriye yazılan taslak
      // ve geç gelen mesaj yanıtı yeni konuşmaya taşınmaz.
      key={selected.id}
      conversation={selected}
      channel={selectedChannel}
      liveMessages={liveMessages}
      statusChanges={statusChanges}
      reloadToken={reloadToken}
      onBack={isMobile ? () => setMobilePane('conversations') : undefined}
      onConversationChanged={handleConversationChanged}
      onConversationPatched={inbox.patch}
      customerOpen={!isMobile && customerOpen}
      onToggleCustomer={isMobile ? () => setMobilePane('customer') : () => setCustomerOpen((open) => !open)}
    />
  ) : (
    <EmptyChat />
  );

  const customerNode = selected && (
    <CustomerPanel
      key={selected.contactId}
      contactId={selected.contactId}
      conversationId={selected.id}
      onOpenConversation={(id) => void handleOpenConversation(id)}
      onClose={isMobile ? () => setMobilePane('chat') : () => setCustomerOpen(false)}
    />
  );

  const connectionBanner = <ConnectionBanner status={hubStatus} />;

  if (isMobile) {
    // Müşteri paneli açılınca sohbet GİZLENİR ama kurulu kalır: taslak kaybolmaz, dönüşte
    // mesajlar/özet yeniden yüklenmez.
    return (
      <div className="flex h-full min-w-0 flex-col">
        {connectionBanner}
        {mobilePane === 'conversations' && filterBar}
        <div className="min-h-0 min-w-0 flex-1">
          {mobilePane === 'conversations' && overviewNode}
          {mobilePane !== 'conversations' && (
            <div className="h-full" hidden={mobilePane !== 'chat'}>{chatNode}</div>
          )}
          {mobilePane === 'customer' && customerNode}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-w-0 flex-col">
      {connectionBanner}
      {filterBar}
      {/* Dar dizüstü/tarayıcı paneli (~860px): eskiden liste 360px sabit + sohbet en az 380px istiyordu; toplam
          alanı aşınca sohbet sağ kenarda kesiliyordu (başlık ikonları, balonlar yarım). Artık liste ve pano
          çekmecesi ekranla daralır, sohbet min-w-0 ile kalan alanı alır; satır taşmayı kendi içinde keser. */}
      <div className="relative flex min-h-0 min-w-0 flex-1 overflow-hidden">
        {view === 'board' ? (
          // Pano geniş alanı alır; kart seçilince sohbet sağda çekmece olarak açılır.
          <div className="min-h-0 min-w-0 flex-1">{boardNode}</div>
        ) : (
          <div className="min-h-0 w-[280px] shrink-0 border-r border-border lg:w-[320px] xl:w-[360px]">{listNode}</div>
        )}
        {(view === 'list' || selected) && (
          <div className={view === 'board'
            ? 'min-h-0 w-[min(420px,60%)] min-w-0 shrink-0 border-l border-border'
            : 'min-h-0 min-w-0 flex-1'}
          >
            {chatNode}
          </div>
        )}
        {customerOpen && customerNode && (
          <CustomerPanelDock>{customerNode}</CustomerPanelDock>
        )}
      </div>
    </div>
  );
}
