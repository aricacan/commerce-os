'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { ConversationFilter } from '../../lib/api/omnichannel';
import { ModuleWorkspace } from '../shared/ModuleWorkspace';
import { AccountSettingsPage } from './AccountSettingsPage';
import { BotVersionBadge } from './BotVersionBadge';
import { ChannelsSection } from './ChannelsSection';
import { InboxTab } from './InboxTab';
import { OverviewTab } from './OverviewTab';
import { CustomersTab } from './CustomersTab';
import { DemandSignalsTab } from './DemandSignalsTab';
import { TasksTab } from './TasksTab';
import { HandoffQueueTab } from './HandoffQueueTab';
import { AssignmentsTab } from './AssignmentsTab';
import { useHandoffBadge } from './useHandoffBadge';
import { SandboxTab } from './SandboxTab';
import { MonitorTab } from './MonitorTab';
import { OrdersTab } from './OrdersTab';
import { LearningTab } from './LearningTab';
import { QualityCenterTab } from './QualityCenterTab';
import { CONVERSATION_PARAM, parseConversationParam } from './inboxUrlState';
import { OmnichannelNavigationProvider } from './OmnichannelNavContext';
import { useOmnichannelNavigation } from './useOmnichannelNavigation';
import { OMNICHANNEL_TABS } from './workspace-tabs';

interface Props {
  onClose: () => void;
}

export function OmnichannelWorkspace({ onClose }: Props) {
  // Bildirimlerden gelen derin bağlantı (?c=123): gelen kutusu o konuşmayla açılır.
  const linkedConversationId = parseConversationParam(useSearchParams().get(CONVERSATION_PARAM));
  const navigation = useOmnichannelNavigation(linkedConversationId !== null);
  const { tab, go } = navigation;
  // Devirler kuyruğundan "müşteriye git": gelen kutusu o konuşmayla açılır.
  const [focusConversationId, setFocusConversationId] = useState<number | null>(linkedConversationId);
  // Telefonda gelen kutusu/pano sohbeti açıkken kabuğun başlığı gizlenir; sohbetin kendi geri oku yeter.
  const [inboxChatOpen, setInboxChatOpen] = useState(false);
  // Başka ekranlardan (devir kuyruğu, kalite kartı) "konuşmayı aç": gelen kutusu o konuşmayla açılır.
  const openConversation = (id: number) => { setFocusConversationId(id); go({ tab: 'inbox' }); };
  // Genel Bakış KPI'sından "cevap bekleyenleri aç": gelen kutusu o durum filtresiyle açılır. Menüden
  // gelen kutusuna dönüşte filtre tekrar uygulanmasın diye sekme değişince sıfırlanır.
  const [inboxFilter, setInboxFilter] = useState<ConversationFilter | null>(null);
  const openInbox = (filter: ConversationFilter) => { setInboxFilter(filter); go({ tab: 'inbox' }); };
  const changeTab = (key: string) => { setInboxFilter(null); navigation.changeTab(key); };
  // Devirler rozeti: atanmamış ya da süresi aşmış devir sayısı.
  const handoffBadge = useHandoffBadge();
  const tabs = OMNICHANNEL_TABS.map((t) => (t.key === 'handoffs' ? { ...t, badge: handoffBadge } : t));
  const isConversationTab = tab === 'inbox' || tab === 'board';
  const selfScrolling = isConversationTab || tab === 'orders' || tab === 'sandbox' || tab === 'customers' || tab === 'tasks';

  return (
    <OmnichannelNavigationProvider value={navigation}>
      <ModuleWorkspace
        title="Omnichannel"
        titleAddon={<BotVersionBadge />}
        tabs={tabs}
        activeTab={tab}
        onTabChange={changeTab}
        onClose={onClose}
        scroll={!selfScrolling}
        hideMobileHeader={isConversationTab && inboxChatOpen}
      >
        {tab === 'overview' && (
          <OverviewTab onNavigate={changeTab} onOpenConversation={openConversation} onOpenInbox={openInbox} />
        )}
        {tab === 'inbox' && (
          <InboxTab
            view="list" focusConversationId={focusConversationId} initialFilter={inboxFilter}
            onMobileChatOpenChange={setInboxChatOpen}
          />
        )}
        {tab === 'board' && <InboxTab view="board" onMobileChatOpenChange={setInboxChatOpen} />}
        {tab === 'orders' && <OrdersTab onOpenConversation={openConversation} />}
        {tab === 'handoffs' && <HandoffQueueTab onOpenConversation={openConversation} />}
        {tab === 'assignments' && <AssignmentsTab onOpenConversation={openConversation} />}
        {tab === 'customers' && <CustomersTab onOpenConversation={openConversation} />}
        {tab === 'tasks' && <TasksTab />}
        {tab === 'monitor' && <MonitorTab />}
        {tab === 'learning' && <LearningTab />}
        {tab === 'demand' && <DemandSignalsTab onOpenConversation={openConversation} />}
        {tab === 'sandbox' && <SandboxTab />}
        {tab === 'quality' && <QualityCenterTab onOpenConversation={openConversation} />}
        {tab === 'channels' && <ChannelsSection />}
        {tab === 'account' && <AccountSettingsPage onOpenConversation={openConversation} />}
      </ModuleWorkspace>
    </OmnichannelNavigationProvider>
  );
}
