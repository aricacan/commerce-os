import {
  CONVERSATION_FILTER, CONVERSATION_STATUS, CONVERSATION_TOPIC, SENDER_TYPE,
  type ConversationSummaryDto, type SenderType,
} from '../../lib/api/omnichannel';
import type { InboxFilters } from './inboxFilters';
import { hasDetailFilter } from './InboxDetailFilters';
import { matchStageFilter, STATUS_FILTER_STAGES } from './stageRules';

// Canlı (SignalR) güncellemelerin gelen kutusu listesine uygulanması — saf, test edilebilir.

// 'unknown': istemci karar veremiyor (ülke, etiket, SLA...) — liste sunucudan tazelenmeli.
export type FilterMatch = 'match' | 'mismatch' | 'unknown';

export interface FilterContext {
  myUserId: number | null;
  // Olayı doğuran mesajın göndereni (yalnız yeni mesaj olayında bilinir).
  lastSenderType?: SenderType;
  // Konuşmanın kanalının markası (özet DTO'sunda yok). undefined = kanal bilinmiyor.
  channelBrandId?: number | null;
}

const isClosed = (c: ConversationSummaryDto) =>
  c.status === CONVERSATION_STATUS.Resolved || c.status === CONVERSATION_STATUS.Closed;

// Sunucudaki ConversationService.GetConversationsAsync filtreleriyle AYNI kurallar.
function matchStageStatus(c: ConversationSummaryDto, filter: InboxFilters['filter']): FilterMatch | null {
  const stages = STATUS_FILTER_STAGES[filter];
  if (!stages) return null;
  if (c.stage === undefined) return 'unknown';
  if (!stages.includes(c.stage)) return 'mismatch';
  return filter === CONVERSATION_FILTER.BotRunning && !c.isBotActive ? 'mismatch' : 'match';
}

function matchStatusFilter(c: ConversationSummaryDto, filters: InboxFilters, ctx: FilterContext): FilterMatch {
  const byStage = matchStageStatus(c, filters.filter);
  if (byStage !== null) return byStage;
  switch (filters.filter) {
    case CONVERSATION_FILTER.All: return 'match';
    case CONVERSATION_FILTER.Unread: return c.unreadCount > 0 ? 'match' : 'mismatch';
    case CONVERSATION_FILTER.AssignedToMe:
      if (ctx.myUserId === null) return 'unknown';
      return c.assignedUserId === ctx.myUserId ? 'match' : 'mismatch';
    case CONVERSATION_FILTER.BotHandled:
      if (ctx.lastSenderType === undefined) return 'unknown';
      return ctx.lastSenderType === SENDER_TYPE.Bot ? 'match' : 'mismatch';
    case CONVERSATION_FILTER.AwaitingConsultation:
      if (c.pendingConsultation === undefined) return 'unknown';
      return c.pendingConsultation ? 'match' : 'mismatch';
    case CONVERSATION_FILTER.NeedsAttention:
      return (c.unreadCount > 0 || c.isUrgent) && c.status === CONVERSATION_STATUS.Open ? 'match' : 'mismatch';
    case CONVERSATION_FILTER.Unassigned:
      return c.assignedUserId === null && !isClosed(c) ? 'match' : 'mismatch';
    default:
      return 'unknown';
  }
}

// Sunucu adı ve numarayı büyük/küçük harf duyarsız "içerir" diye arar.
function matchesSearch(c: ConversationSummaryDto, search: string): boolean {
  const fields = [c.contactDisplayName ?? '', c.contactExternalId];
  const term = search.trim();
  return fields.some((field) =>
    field.toLowerCase().includes(term.toLowerCase())
    || field.toLocaleLowerCase('tr').includes(term.toLocaleLowerCase('tr')));
}

export function matchInboxFilters(
  c: ConversationSummaryDto, filters: InboxFilters, ctx: FilterContext,
): FilterMatch {
  if (filters.channelId !== null && c.channelId !== filters.channelId) return 'mismatch';
  if (filters.platform !== null && c.channelType !== filters.platform) return 'mismatch';
  if (filters.brandId !== null && ctx.channelBrandId !== undefined && ctx.channelBrandId !== filters.brandId) {
    return 'mismatch';
  }
  if (filters.topic !== null && (c.topic ?? CONVERSATION_TOPIC.None) !== filters.topic) return 'mismatch';
  if (filters.search.trim() !== '' && !matchesSearch(c, filters.search)) return 'mismatch';
  const stage = matchStageFilter(c.stage, filters.stage);
  if (stage === 'mismatch') return 'mismatch';

  const status = matchStatusFilter(c, filters, ctx);
  if (status !== 'match') return status;
  if (filters.brandId !== null && ctx.channelBrandId === undefined) return 'unknown';
  // Ülke (kanal/müşteri ülkesi) ve müşteri etiketi özet DTO'sunda yok.
  if (hasDetailFilter(filters.detail)) return 'unknown';
  // Eski backend aşama göndermiyorsa aşama filtresine istemci karar veremez.
  if (stage === 'unknown') return 'unknown';
  return 'match';
}

// Kanal rozeti için okunmamış farkı. Önceki sayı biliniyorsa kesin fark; bilinmiyorsa
// (liste dışı konuşma) yalnız yeni müşteri mesajı +1 sayılır — tüm sayı fark sanılmaz.
export function unreadDelta(known: number | undefined, incoming: number, isNewInbound: boolean): number {
  if (known !== undefined) return incoming - known;
  return isNewInbound && incoming > 0 ? 1 : 0;
}

// Gelen/değişen konuşma en üste; acil konuşmalar her zaman en üstte (sunucu sıralamasıyla aynı).
export function upsertSorted(list: ConversationSummaryDto[], incoming: ConversationSummaryDto): ConversationSummaryDto[] {
  const rest = list.filter((c) => c.id !== incoming.id);
  return [incoming, ...rest].sort((a, b) => Number(b.isUrgent) - Number(a.isUrgent));
}

// Filtre sonucuna göre listeye uygular: uymayan çıkarılır; karar verilemeyen yalnız
// zaten listedeyse yerinde güncellenir (yeni satır eklenmez — tazeleme karar verir).
export function applyToList(
  list: ConversationSummaryDto[], incoming: ConversationSummaryDto, match: FilterMatch,
): ConversationSummaryDto[] {
  const exists = list.some((c) => c.id === incoming.id);
  if (match === 'mismatch') return exists ? list.filter((c) => c.id !== incoming.id) : list;
  if (match === 'unknown' && !exists) return list;
  return upsertSorted(list, incoming);
}
