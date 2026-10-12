import { CONVERSATION_STAGE, type ConversationStage, type ConversationSummaryDto } from '../../lib/api/omnichannel';

// Konuşmanın "ne kadardır bekliyor" bilgisi: listede ve panoda aynı rozeti çizer.
// Yalnız HÂLÂ AÇIK konuşmalar için anlamlıdır; kapanan/uykudaki konuşmada süre gürültüdür.

// Bu kadar gündür yazışma olmayan açık konuşma "eski" sayılır ve süresi gün olarak yazılır.
export const STALE_AFTER_DAYS = 7;
// Temsilci bekleyen konuşma bu süreyi aşınca sarıdan kırmızıya geçer.
const WARN_AFTER_HOURS = 1;
const ALERT_AFTER_HOURS = 24;

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export type AgeTone = 'neutral' | 'warning' | 'danger';

export interface WaitBadge {
  label: string;
  tone: AgeTone;
  title: string;
}

// Müşteri yazdı, sıra bizde.
const AGENT_TURN_STAGES: ReadonlySet<ConversationStage> = new Set<ConversationStage>([
  CONVERSATION_STAGE.AwaitingAgent, CONVERSATION_STAGE.Handoff,
]);

export const isAgentTurn = (conversation: Pick<ConversationSummaryDto, 'stage'>): boolean =>
  conversation.stage !== undefined && AGENT_TURN_STAGES.has(conversation.stage);

// Bitmiş ya da uykuya yatmış: süre rozeti çizilmez.
const FINISHED_STAGES: ReadonlySet<ConversationStage> = new Set<ConversationStage>([
  CONVERSATION_STAGE.OrderPlaced, CONVERSATION_STAGE.Shipped, CONVERSATION_STAGE.Resolved, CONVERSATION_STAGE.Dormant,
]);

export const isDormant = (conversation: Pick<ConversationSummaryDto, 'stage'>): boolean =>
  conversation.stage === CONVERSATION_STAGE.Dormant;

// "12 dk", "3 sa", "2 gün"
function formatDuration(ageMs: number): string {
  if (ageMs < MINUTE_MS) return 'az önce';
  if (ageMs < HOUR_MS) return `${Math.floor(ageMs / MINUTE_MS)} dk`;
  if (ageMs < DAY_MS) return `${Math.floor(ageMs / HOUR_MS)} sa`;
  return `${Math.floor(ageMs / DAY_MS)} gün`;
}

function agentWaitTone(ageMs: number): AgeTone {
  if (ageMs >= ALERT_AFTER_HOURS * HOUR_MS) return 'danger';
  return ageMs >= WARN_AFTER_HOURS * HOUR_MS ? 'warning' : 'neutral';
}

export function waitBadgeOf(
  conversation: Pick<ConversationSummaryDto, 'stage' | 'lastMessageAt'>, now: number = Date.now(),
): WaitBadge | null {
  const { stage, lastMessageAt } = conversation;
  if (lastMessageAt === null || (stage !== undefined && FINISHED_STAGES.has(stage))) return null;

  const ageMs = Math.max(0, now - new Date(lastMessageAt).getTime());
  const agentTurn = isAgentTurn(conversation);
  const label = formatDuration(ageMs);

  if (ageMs >= STALE_AFTER_DAYS * DAY_MS) {
    return { label, tone: agentTurn ? 'danger' : 'warning', title: `Son mesajdan beri ${label} geçti` };
  }
  if (!agentTurn) return null;

  return { label, tone: agentWaitTone(ageMs), title: `Cevap bekleyen süre: ${label}` };
}
