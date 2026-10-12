'use client';

import { useDraggable } from '@dnd-kit/core';
import { AlertTriangle, Bot, GripVertical } from 'lucide-react';
import type { AssignmentCardDto } from '../../lib/api/assignments';
import { HANDOFF_REASON_LABELS } from '../../lib/api/handoff';
import { badgeBase, badgeTone, focusRing, motionFast } from '../shared/design';
import { channelTypeMeta } from './shared';
import { SlaBadge } from './SlaBadge';
import { waitingLabel } from './handoffRules';

interface Props {
  card: AssignmentCardDto;
  now: number;
  dragDisabled: boolean;
  onOpen: (conversationId: number) => void;
}

const LEVEL_TONE = { P1: badgeTone.danger, P2: badgeTone.warning, P3: badgeTone.neutral } as const;

const cardKey = (card: AssignmentCardDto) => `c${card.conversationId}`;

// Atananlar kartı: müşteri, kanal, ülke, öncelik, bekleme, SLA, son mesaj ve etiketler. Tutamaktan sürüklenir,
// gövdeye tıklayınca konuşma açılır.
export function AssignmentCardView({ card, now, dragDisabled, onOpen }: Props) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: cardKey(card), data: card, disabled: dragDisabled });
  return (
    <div ref={setNodeRef} className={isDragging ? 'opacity-40' : undefined}>
      <AssignmentCardBody card={card} now={now} onOpen={onOpen}
        handle={!dragDisabled && (
          <button type="button" aria-label="Kartı taşı" {...attributes} {...listeners}
            className={`flex size-6 shrink-0 cursor-grab items-center justify-center rounded text-fg-subtle hover:bg-bg-subtle active:cursor-grabbing ${focusRing}`}>
            <GripVertical size={14} aria-hidden />
          </button>
        )} />
    </div>
  );
}

// Sürükleme önizlemesi (DragOverlay) ve kart gövdesi ortak.
export function AssignmentCardBody({ card, now, onOpen, handle }: {
  card: AssignmentCardDto;
  now: number;
  onOpen?: (conversationId: number) => void;
  handle?: React.ReactNode;
}) {
  const meta = channelTypeMeta(card.channelType);
  return (
    <article className={`flex min-w-0 flex-col gap-1.5 rounded-xl border bg-card p-3 shadow-[var(--shadow-xs)] ${motionFast} ${
      card.isUrgent ? 'border-danger/40' : 'border-border-soft'}`}>
      <div className="flex min-w-0 items-center gap-1.5">
        {handle}
        {card.isUrgent && <AlertTriangle size={13} className="shrink-0 text-danger" aria-label="Acil" />}
        <meta.Icon size={13} color={meta.color} />
        <button type="button" disabled={!onOpen} onClick={() => onOpen?.(card.conversationId)}
          className={`min-w-0 flex-1 truncate rounded text-left text-ui-sm font-semibold text-fg enabled:hover:underline ${focusRing}`}>
          {card.customerName ?? 'İsimsiz müşteri'}
        </button>
        {card.level && <span className={`${badgeBase} ${LEVEL_TONE[card.level]}`}>{card.level}</span>}
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-ui-2xs text-fg-muted">
        {card.country && <span>{card.country}</span>}
        {card.ticketCode && <span className="tabular-nums">{card.ticketCode}</span>}
        {card.reason !== null && <span>{HANDOFF_REASON_LABELS[card.reason] ?? ''}</span>}
        {card.ticketId === null && <span className={`${badgeBase} ${badgeTone.bot}`}><Bot size={10} aria-hidden /> Bot</span>}
        <span className="ml-auto tabular-nums">{waitingLabel(card.waitingSince, now)}</span>
      </div>
      {card.lastMessagePreview && <p className="m-0 line-clamp-2 break-words text-ui-xs text-fg-muted">{card.lastMessagePreview}</p>}
      {(card.tags.length > 0 || card.slaDueAt || card.slaBreachedAt) && (
        <div className="flex flex-wrap items-center gap-1">
          <SlaBadge dueAt={card.slaDueAt} breachedAt={card.slaBreachedAt} now={now} />
          {card.tags.map((tag) => <span key={tag} className={`${badgeBase} ${badgeTone.info}`}>{tag}</span>)}
        </div>
      )}
    </article>
  );
}
