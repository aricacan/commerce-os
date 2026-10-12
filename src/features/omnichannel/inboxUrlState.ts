import { CONVERSATION_FILTER, type ConversationFilter } from '../../lib/api/omnichannel';

// Gelen kutusu durum filtresinin adres çubuğundaki karşılığı (P28): ?f=payment.
// Saf eşleme — tarayıcıya dokunmaz, böylece tek başına test edilir.
export const FILTER_PARAM = 'f';

// Dışarıdan (devir/sipariş e-postası, Slack düğmesi, panel zili) bir konuşmayı açan derin bağlantı:
// /omnichannel/inbox?c=123. Sunucu tarafı aynı şemayı kullanır (PanelPaths.Conversation).
export const CONVERSATION_PARAM = 'c';

// Geçerli pozitif tamsayı değilse null (deneme e-postasındaki ?c=0 dahil).
export function parseConversationParam(value: string | null): number | null {
  if (value === null || !/^\d+$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

// "Tümü" bilerek yok: varsayılan adreste iz bırakmaz.
const FILTER_SLUGS: Partial<Record<ConversationFilter, string>> = {
  [CONVERSATION_FILTER.WaitingReply]: 'waiting',
  [CONVERSATION_FILTER.AssignedToMe]: 'mine',
  [CONVERSATION_FILTER.InOrder]: 'order',
  [CONVERSATION_FILTER.AwaitingPayment]: 'payment',
  [CONVERSATION_FILTER.BotRunning]: 'bot',
  [CONVERSATION_FILTER.SlaBreached]: 'sla',
  [CONVERSATION_FILTER.Closed]: 'closed',
  [CONVERSATION_FILTER.Unread]: 'unread',
  [CONVERSATION_FILTER.Unassigned]: 'unassigned',
  [CONVERSATION_FILTER.BotHandled]: 'bothandled',
  [CONVERSATION_FILTER.AwaitingConsultation]: 'consult',
};

export interface InboxUrlState {
  filter: ConversationFilter;
}

export function filterToSlug(filter: ConversationFilter): string | null {
  return FILTER_SLUGS[filter] ?? null;
}

export function slugToFilter(slug: string | null): ConversationFilter {
  const match = Object.entries(FILTER_SLUGS).find(([, value]) => value === slug);
  return match ? (Number(match[0]) as ConversationFilter) : CONVERSATION_FILTER.All;
}

export function parseInboxUrlState(search: string): InboxUrlState {
  const params = new URLSearchParams(search);
  return {
    filter: slugToFilter(params.get(FILTER_PARAM)),
  };
}

// Diğer query parametrelerine (tab, run…) dokunmadan filtreyi yazar; varsayılan silinir.
export function applyInboxUrlState(search: string, filter: ConversationFilter): string {
  const params = new URLSearchParams(search);
  const slug = filterToSlug(filter);
  if (slug) params.set(FILTER_PARAM, slug);
  else params.delete(FILTER_PARAM);
  const next = params.toString();
  return next ? `?${next}` : '';
}
