import type { HandoffTicketDto } from '../../lib/api/handoff';
import { HANDOFF_LEVEL_TONE, handoffPriority } from './handoffPriorityRules';

// Devir öncelik rozeti (P24): "P1 · 72". İpucunda puan dökümü. Eski backend'de görünmez.
export function HandoffPriorityBadge({ ticket }: { ticket: HandoffTicketDto }) {
  const priority = handoffPriority(ticket);
  if (!priority) return null;

  return (
    <span
      title={priority.title}
      className={`inline-flex shrink-0 cursor-help items-center gap-1 rounded-[3px] px-1.5 py-px text-[10px] font-bold tabular-nums ${HANDOFF_LEVEL_TONE[priority.level]}`}
    >
      {priority.level}
      {priority.score !== null && <span className="font-semibold opacity-80">· {priority.score}</span>}
    </span>
  );
}
