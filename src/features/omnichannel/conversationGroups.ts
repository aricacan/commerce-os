import { CONVERSATION_FILTER, type ConversationSummaryDto } from '../../lib/api/omnichannel';
import { isAgentTurn, isDormant } from './conversationAge';
import type { InboxFilters } from './inboxFilters';

// Uykudaki ("Eski") konuşmalar canlı listeyi kirletmesin diye listenin altında katlanmış
// bir grupta durur. Sunucu verisi ve sıralaması DEĞİŞMEZ: yalnız gösterim ikiye bölünür.
export interface ConversationGroups {
  live: ConversationSummaryDto[];
  dormant: ConversationSummaryDto[];
}

export function splitDormant(conversations: ConversationSummaryDto[]): ConversationGroups {
  const live: ConversationSummaryDto[] = [];
  const dormant: ConversationSummaryDto[] = [];
  for (const conversation of conversations) (isDormant(conversation) ? dormant : live).push(conversation);
  return { live, dormant };
}

// Kullanıcı eskileri kendisi istediğinde (Kapanan durumu, aşama filtresi) ya da bir şey ararken
// grup KATLANMAZ: aranan konuşma katlı grubun içinde saklı kalmasın.
export function shouldGroupDormant(filters: InboxFilters): boolean {
  return filters.filter !== CONVERSATION_FILTER.Closed
    && filters.stage === null
    && filters.search.trim() === '';
}

export interface ConversationSummary {
  total: number;
  urgent: number;
  awaitingReply: number;
}

// Liste başlığındaki "bir bakışta" özeti: kaç konuşma, kaçı acil, kaçında sıra bizde.
export function summarizeConversations(conversations: ConversationSummaryDto[]): ConversationSummary {
  return {
    total: conversations.length,
    urgent: conversations.filter((c) => c.isUrgent).length,
    awaitingReply: conversations.filter(isAgentTurn).length,
  };
}
