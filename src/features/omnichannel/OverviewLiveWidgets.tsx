'use client';

import type { ConversationFilter, OverviewPeriodParams, OverviewScopeParams } from '../../lib/api/omnichannel';
import { OrderFunnelCard } from './OrderFunnelCard';
import { OverviewEmailWidget } from './OverviewEmailWidget';
import { OverviewHandoffsWidget } from './OverviewHandoffsWidget';
import { OverviewSlaWidget } from './OverviewSlaWidget';
import { OverviewTasksWidget } from './OverviewTasksWidget';
import { QualityTrendCard } from './QualityTrendCard';
import { useIsOmnichannelAdmin } from './useIsOmnichannelAdmin';

// E-posta kartı yalnız yöneticiye görünür; görünmediğinde bot kalitesi tüm satırı doldurur.
const QUALITY_ADMIN_SPAN = 'md:col-span-2 xl:col-span-2';
const QUALITY_FULL_SPAN = 'md:col-span-2 xl:col-span-3';

interface Props {
  period: OverviewPeriodParams;
  scope: OverviewScopeParams;
  // Yenile düğmesi bunu artırır; her widget kendi verisini yeniden çeker.
  reloadKey: number;
  onNavigate: (tab: string) => void;
  onOpenConversation?: (conversationId: number) => void;
  onOpenInbox?: (filter: ConversationFilter) => void;
}

// Kendi verisini çeken widget'lar: sipariş hunisi, "şu an" listeleri (devir, süresi geçen, görev), bot kalitesi ve
// (yalnız yöneticiye) giden e-postalar. Izgaranın (OverviewTab) çocuklarıdır.
export function OverviewLiveWidgets({ period, scope, reloadKey, onNavigate, onOpenConversation, onOpenInbox }: Props) {
  const isAdmin = useIsOmnichannelAdmin();

  return (
    <>
      <OrderFunnelCard period={period} scope={scope} reloadKey={reloadKey} className="xl:col-span-2" />
      <OverviewHandoffsWidget reloadKey={reloadKey} onOpenConversation={onOpenConversation} onNavigate={onNavigate} />
      <OverviewSlaWidget scope={scope} reloadKey={reloadKey} onOpenConversation={onOpenConversation} onOpenInbox={onOpenInbox} />
      <OverviewTasksWidget reloadKey={reloadKey} onNavigate={onNavigate} />
      {isAdmin && <OverviewEmailWidget period={period} reloadKey={reloadKey} />}
      <QualityTrendCard reloadKey={reloadKey} onOpenConversation={onOpenConversation} className={isAdmin ? QUALITY_ADMIN_SPAN : QUALITY_FULL_SPAN} />
    </>
  );
}
