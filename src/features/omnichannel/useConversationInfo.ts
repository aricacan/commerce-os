'use client';

import type { ConversationDigestDto } from '../../lib/api/omnichannel';
import { FOLLOW_UP_STATUS } from '../../lib/api/omnichannel-follow-ups';
import { pickFeaturedChatOrder } from './chatOrderRules';
import { conversationInfoSummary, type ConversationInfoSummary, type WindowWarning } from './conversationInfoRules';
import { useConversationChatOrders } from './useConversationChatOrders';
import { hasConversationContext, useConversationContext } from './useConversationContext';
import { useConversationFollowUps } from './useConversationFollowUps';
import { useHandoffTicket } from './useHandoffTicket';

interface Args {
  conversationId: number;
  // SignalR yeniden bağlandı: her şey tazelenir.
  reloadToken: number;
  // Yeni mesajla bot yeni bilgi yazmış olabilir: sipariş, takip ve bağlam tazelenir.
  messageCount: number;
}

// "Ayrıntılar" panelinin verisi tek yerde yüklenir: panel kapalıyken de başlık sayacı ve
// kritik nokta doğru kalsın. Tazeleme anahtarları önceki şeritlerle aynıdır.
export function useConversationInfo({ conversationId, reloadToken, messageCount }: Args) {
  const messageKey = reloadToken + messageCount;
  const handoff = useHandoffTicket(conversationId, reloadToken);
  const followUps = useConversationFollowUps(conversationId, messageKey);
  const chatOrders = useConversationChatOrders(conversationId, messageKey);
  const context = useConversationContext(conversationId, messageKey);
  return { handoff, followUps, chatOrders, context };
}

export type ConversationInfoData = ReturnType<typeof useConversationInfo>;

// Türkçe konuşmada özet gösterilmez (temsilci zaten okuyor).
export const summaryDigestOf = (digest: ConversationDigestDto | null): ConversationDigestDto | null =>
  digest !== null && digest.customerLanguage !== 'tr' ? digest : null;

export function summarizeConversationInfo(
  info: ConversationInfoData,
  extra: { digest: ConversationDigestDto | null; windowWarning: WindowWarning | null; pendingConsultation: boolean },
): ConversationInfoSummary {
  const { ticket } = info.handoff;
  const { tasks } = info.followUps;
  return conversationInfoSummary({
    hasHandoff: ticket !== null,
    urgentHandoff: ticket?.isUrgent === true,
    followUpCount: tasks.length,
    followUpNeedsAgent: tasks.some((t) => t.status === FOLLOW_UP_STATUS.NeedsAgent),
    hasOrder: pickFeaturedChatOrder(info.chatOrders.orders) !== null,
    hasSummary: summaryDigestOf(extra.digest) !== null,
    hasContext: hasConversationContext(info.context),
    windowWarning: extra.windowWarning,
    pendingConsultation: extra.pendingConsultation,
  });
}
