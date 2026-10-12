'use client';

import type { ReactNode } from 'react';
import { Info } from 'lucide-react';
import type { ConversationDigestDto } from '../../lib/api/omnichannel';
import { BotTraceSection } from './BotTraceSection';
import { ChatOrderCard } from './ChatOrderCard';
import { ConversationContextSection } from './ConversationContextSection';
import { ConversationSummaryCard } from './ConversationSummaryCard';
import { FollowUpsSection } from './FollowUpsSection';
import { HandoffCard } from './HandoffCard';
import { hasConversationContext } from './useConversationContext';
import { summaryDigestOf, type ConversationInfoData } from './useConversationInfo';

interface Props {
  info: ConversationInfoData;
  digest: ConversationDigestDto | null;
  digestLoading: boolean;
  onRefreshDigest: () => void;
  // Açık pencerenin uyarısı (kapanmak üzere / insan temsilci etiketi); yoksa null.
  windowNotice: ReactNode;
  // Botun uyguladığı temsilci talimatları; yoksa false/null.
  instructionsSection: ReactNode;
  canWrite: boolean;
}

// "Ayrıntılar" panelinin içeriği, önem sırasıyla: devir → pencere uyarısı → bot talimatları → özet →
// botun öğrendikleri (araç/ürün) → sipariş → takipler → bot tur izi (en altta: konuşmayı anlamak önce gelir).
// Masaüstü çekmecesi ile telefon alt sayfası aynı içeriği çizer.
export function ConversationInfoPanel({
  info, digest, digestLoading, onRefreshDigest, windowNotice, instructionsSection, canWrite,
}: Props) {
  const { handoff, followUps, chatOrders, context } = info;
  const { ticket } = handoff;
  const summaryDigest = summaryDigestOf(digest);
  const empty = ticket === null && !windowNotice && !instructionsSection && followUps.tasks.length === 0
    && chatOrders.orders.length === 0 && summaryDigest === null && !hasConversationContext(context);

  const orderCard = (
    <ChatOrderCard conversationId={chatOrders.conversationId} orders={chatOrders.orders} reload={chatOrders.reload} canWrite={canWrite} />
  );

  // Konuşma değişince iz listesi sıfırdan kurulur (eski konuşmanın izleri karışmaz).
  const traceSection = <BotTraceSection key={chatOrders.conversationId} conversationId={chatOrders.conversationId} />;

  // Boş panelde de temsilci konuşmadan sipariş oluşturabilir.
  if (empty) return <><EmptyInfo />{canWrite && orderCard}{traceSection}</>;

  return (
    <>
      {ticket && (
        <HandoffCard ticket={ticket} handoff={handoff} />
      )}
      {windowNotice}
      {instructionsSection}
      {summaryDigest && <ConversationSummaryCard digest={summaryDigest} loading={digestLoading} onRefresh={onRefreshDigest} />}
      {hasConversationContext(context) && <ConversationContextSection context={context} />}
      {orderCard}
      <FollowUpsSection tasks={followUps.tasks} reload={followUps.reload} canWrite={canWrite} />
      {traceSection}
    </>
  );
}

function EmptyInfo() {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-4 py-8 text-center text-fg-subtle">
      <Info size={16} aria-hidden />
      <p className="m-0 text-ui-sm">Bu konuşma için ek bilgi yok.</p>
    </div>
  );
}
