import type { HandoffLevel, HandoffTicketDto } from '../../lib/api/handoff';

// Devir öncelik rozeti (P24) için saf eşlemeler. P1 ≈ acil: acil devir stiliyle aynı kırmızı.
export const HANDOFF_LEVEL_TONE: Record<HandoffLevel, string> = {
  P1: 'bg-danger-soft text-danger',
  P2: 'bg-warning-soft text-warning',
  P3: 'bg-bg-subtle text-fg-muted',
};

export interface HandoffPriority {
  level: HandoffLevel;
  score: number | null;
  // Rozetin ipucu: seviye + puan, varsa puan dökümü.
  title: string;
}

type PriorityFields = Pick<HandoffTicketDto, 'level' | 'score' | 'scoreBreakdown'>;

// Eski backend seviye göndermez → rozet yok (null).
export function handoffPriority(ticket: PriorityFields): HandoffPriority | null {
  if (!ticket.level) return null;
  const score = ticket.score ?? null;
  const heading = score === null ? `Öncelik ${ticket.level}` : `Öncelik ${ticket.level} · ${score} puan`;
  const breakdown = ticket.scoreBreakdown?.trim();
  return { level: ticket.level, score, title: breakdown ? `${heading}\n${breakdown}` : heading };
}
