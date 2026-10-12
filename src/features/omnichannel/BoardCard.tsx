'use client';

import { useDraggable } from '@dnd-kit/core';
import { AlertTriangle, Clock, GripVertical, MessageCircleQuestion, type LucideIcon } from 'lucide-react';
import type { BoardColumnKey, ConversationSummaryDto } from '../../lib/api/omnichannel';
import { focusRing, motionFast } from '../shared/design';
import { CARD_MOVE_TARGETS, dropDeniedReason } from './boardColumns';
import { boardCardPriority, type BoardCardPriorityKind } from './boardCardRules';
import { ConversationAvatar } from './ConversationAvatar';
import { contactTitle } from './contactTitle';
import { conversationSurface } from './conversationTone';
import { formatRelativeTime } from './relativeTime';
import { StatusBadge } from './StatusBadge';
import { channelTypeMeta } from './shared';

interface CardProps {
  conversation: ConversationSummaryDto;
  brandName: string | undefined;
  selected: boolean;
  dragDisabled: boolean;
  onSelect: (conversation: ConversationSummaryDto) => void;
  onMove: (conversation: ConversationSummaryDto, target: BoardColumnKey) => void;
}

// Kart iki kat: dış kabuk opak zemin + çerçeve, iç kat durum tonu (conversationTone). Ton yarı saydam
// olduğundan doğrudan sütun zeminine değil kartın kendi zeminine biner. shrink-0 şart: overflow-hidden
// flex öğesinin min-height'ını 0 yapar, sütun dolunca kartlar ezilip üst üste biniyordu.
const CARD_SHELL_CLASS = 'shrink-0 overflow-hidden rounded-xl border bg-card';
const CARD_INNER_CLASS = 'flex flex-col gap-2 p-3';

const PRIORITY_ICON: Record<BoardCardPriorityKind, LucideIcon> = {
  urgent: AlertTriangle,
  consultation: MessageCircleQuestion,
  wait: Clock,
};

// Pano kartı (P30): yalnız üç bilgi — kim, ne dedi, ne kadar acil (tek rozet). Fareyle tutup sürüklenir, dokunmatikte
// basılı tutulur, klavyede tutamakla taşınır; altındaki "Devral / Kapat" düğmeleri aynı işi tek dokunuşla yapar.
export function BoardCard({ conversation: c, brandName, selected, dragDisabled, onSelect, onMove }: CardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: c.id, disabled: dragDisabled });

  return (
    <div
      ref={setNodeRef}
      // Tüm kart fareyle (ya da basılı tutarak) sürüklenir; tıklama yine kartı açar (6 px eşiği).
      {...listeners}
      className={`group relative ${CARD_SHELL_CLASS} shadow-[var(--shadow-xs)] ${motionFast} ${
        dragDisabled ? '' : 'cursor-grab active:cursor-grabbing'
      } ${
        isDragging
          ? 'border-dashed border-fg-subtle opacity-40'
          : selected ? 'border-fg/40 ring-1 ring-fg/15' : 'border-border-soft hover:border-border hover:shadow-[var(--shadow-sm)]'
      }`}
    >
      {/* Klavye ve ekran okuyucu girişi: dnd-kit'in erişilebilirlik öznitelikleri yalnız tutamakta durur
          (kart gövdesinde iç içe etkileşimli öğe olmasın); sürükleme olayları kartın kendisinde.
          Tutamak yalnız üzerine gelince/odakta görünür; dokunmatikte sürükleme kapalı olduğundan hiç çizilmez. */}
      {!dragDisabled && (
        <button
          type="button"
          {...attributes}
          aria-label="Kartı taşı"
          className={`absolute left-0 top-3 flex h-6 w-4 items-center justify-center rounded border-0 bg-transparent p-0 text-fg-subtle opacity-0 hover:text-fg group-hover:opacity-100 focus-visible:opacity-100 ${motionFast} ${focusRing}`}
        >
          <GripVertical size={12} aria-hidden />
        </button>
      )}
      <div className={`${CARD_INNER_CLASS} ${motionFast} ${conversationSurface(c, '')}`}>
        <BoardCardBody conversation={c} brandName={brandName} onSelect={onSelect} />
        <BoardCardActions conversation={c} onMove={onMove} />
      </div>
    </div>
  );
}

// Sürüklerken imlecin altında görünen kopya (DragOverlay).
export function BoardCardPreview({ conversation, brandName }: { conversation: ConversationSummaryDto; brandName: string | undefined }) {
  return (
    <div className={`w-[284px] rotate-1 cursor-grabbing border-fg/40 shadow-[var(--shadow-lg)] ${CARD_SHELL_CLASS}`}>
      <div className={`${CARD_INNER_CLASS} ${conversationSurface(conversation, '')}`}>
        <BoardCardBody conversation={conversation} brandName={brandName} />
      </div>
    </div>
  );
}

function BoardCardBody({ conversation: c, brandName, onSelect }: {
  conversation: ConversationSummaryDto;
  brandName: string | undefined;
  onSelect?: (conversation: ConversationSummaryDto) => void;
}) {
  const title = contactTitle(c);
  const typeMeta = channelTypeMeta(c.channelType);
  const channelLabel = brandName ? `${brandName} · ${typeMeta.label}` : c.channelName;
  const priority = boardCardPriority(c);
  // Bekleme süresi rozeti zaten "ne zamandır" diyor; zamanı ikinci kez yazmayalım.
  const showTime = priority?.kind !== 'wait';

  return (
    <button
      type="button"
      onClick={() => onSelect?.(c)}
      className={`flex min-w-0 cursor-pointer flex-col gap-2 rounded-lg border-0 bg-transparent p-0 text-left ${focusRing}`}
    >
      <span className="flex items-center gap-2">
        <ConversationAvatar name={title} channelType={c.channelType} size="sm" />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-ui-md font-semibold text-fg">{title}</span>
          <span className="truncate text-ui-2xs text-fg-subtle">{channelLabel}</span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1 self-start">
          {priority && (
            <StatusBadge tone={priority.tone} Icon={PRIORITY_ICON[priority.kind]} title={priority.title}>
              {priority.label}
            </StatusBadge>
          )}
          {showTime && (
            <time dateTime={c.lastMessageAt ?? undefined} className="text-ui-xs tabular-nums text-fg-muted" title="Son mesajdan beri">
              {formatRelativeTime(c.lastMessageAt)}
            </time>
          )}
        </span>
      </span>
      <span className="line-clamp-2 text-ui-sm text-fg-muted">{c.lastMessagePreview ?? '—'}</span>
    </button>
  );
}

function BoardCardActions({ conversation, onMove }: Pick<CardProps, 'conversation' | 'onMove'>) {
  const actions = CARD_MOVE_TARGETS.filter(({ target }) => dropDeniedReason(conversation.stage, target) === null);
  if (actions.length === 0) return null;

  return (
    <div className="flex gap-1 border-t border-border-soft pt-2">
      {actions.map(({ target, label }) => (
        <button
          key={target}
          type="button"
          onClick={() => onMove(conversation, target)}
          className={`h-9 cursor-pointer rounded-lg border-0 bg-transparent px-3 sm:h-7 sm:px-2.5 text-ui-xs font-semibold text-fg-muted hover:bg-bg-subtle hover:text-fg ${motionFast} ${focusRing}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
