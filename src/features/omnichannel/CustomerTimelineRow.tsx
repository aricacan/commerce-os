import { createElement } from 'react';
import type { CustomerTimelineEventDto } from '../../lib/api/customer-crm';
import { formatPanelDate } from './CustomerPanelParts';
import { isEmphasizedEvent, timelineConversationId, timelineEventIcon } from './customerTimelineRules';

interface Props {
  event: CustomerTimelineEventDto;
  onOpenConversation?: (conversationId: number) => void;
}

// Tek olay: tip ikonu, backend'in hazır özeti, kim yaptı ve ne zaman. Konuşmaya bağlı olay tıklanınca açılır.
export function CustomerTimelineRow({ event, onOpenConversation }: Props) {
  const conversationId = timelineConversationId(event);
  const clickable = conversationId !== null && onOpenConversation !== undefined;
  const emphasized = isEmphasizedEvent(event.type);

  return (
    <li className="flex items-start gap-2 text-xs">
      {/* İkon tablodan seçilir (createElement: bileşen render sırasında üretilmiyor, yalnız seçiliyor). */}
      {createElement(timelineEventIcon(event.type), {
        size: 12,
        'aria-hidden': true,
        className: `mt-0.5 shrink-0 ${emphasized ? 'text-[var(--fg)]' : 'text-[var(--fg-muted)]'}`,
      })}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <button type="button" disabled={!clickable}
          onClick={() => conversationId !== null && onOpenConversation?.(conversationId)}
          className={`break-words text-left text-[var(--fg)] enabled:hover:underline ${emphasized ? 'font-semibold' : ''}`}>
          {event.summary}
        </button>
        <span className="text-[10.5px] text-[var(--fg-muted)]">
          {formatPanelDate(event.occurredAt, true)}
          {event.actorName && ` · ${event.actorName}`}
        </span>
      </div>
    </li>
  );
}
