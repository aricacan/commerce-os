'use client';

import { useRef, useState } from 'react';
import {
  DndContext, DragOverlay, KeyboardSensor, PointerSensor, pointerWithin, rectIntersection,
  useSensor, useSensors, type CollisionDetection, type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core';
import type { BoardColumnKey, ConversationSummaryDto, InboxChannelDto } from '../../lib/api/omnichannel';
import { BoardCardPreview } from './BoardCard';
import { BoardMobilePager } from './BoardMobilePager';
import { BoardScrollButtons } from './BoardScrollButtons';
import { BoardColumnView } from './BoardColumnView';
import { BoardSkeleton } from './BoardSkeleton';
import { columnOfStage, dropDeniedReason } from './boardColumns';
import { brandNamesByChannel } from './brandGroups';
import type { InboxBoardState } from './useInboxBoard';
import { useBoardScroller } from './useBoardScroller';
import { useFeedback } from '../shared/Feedback';
import { useMobile } from '../../hooks/useMobile';

// Tıklama ile sürüklemeyi ayıran mesafe: kısa hareket tıklama sayılır.
const DRAG_START_DISTANCE_PX = 6;

// Fare imleci hangi sütunun içindeyse o sütun hedeftir; imleç yoksa (klavye) kesişim alanına bakılır.
const columnCollision: CollisionDetection = (args) => {
  const underPointer = pointerWithin(args);
  return underPointer.length > 0 ? underPointer : rectIntersection(args);
};

interface Props {
  board: InboxBoardState;
  channels: InboxChannelDto[];
  selectedId: number | null;
  onSelect: (conversation: ConversationSummaryDto) => void;
  // Taşıma başarılı: açık sohbet ve liste yeni atama/bot durumunu hub olayını beklemeden alsın.
  onMoved: (conversation: ConversationSummaryDto) => void;
}

// Gelen kutusunun kanban görünümü (P30). Kartlar yalnız izinli sütunlara bırakılabilir; reddedilen
// bırakma nedenini bildirir ve kart yerinde kalır. Masaüstünde sütunlar yan yana kayar (oklar bir
// sütun adımı); telefonda her sütun tam ekran genişliğindedir ve üstteki gezgin ile sütun sütun gezilir.
export function InboxBoard({ board, channels, selectedId, onSelect, onMoved }: Props) {
  const [dragged, setDragged] = useState<ConversationSummaryDto | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const scroller = useBoardScroller(scrollerRef, board.columns.length);
  const { notify } = useFeedback();
  // Telefonda sürükleme kapalı: parmak panoyu kaydırırken kartı kapmasın; Devral/Kapat düğmeleri var.
  const isMobile = useMobile();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: DRAG_START_DISTANCE_PX } }),
    useSensor(KeyboardSensor),
  );
  const brandNames = brandNamesByChannel(channels);
  const allCards = board.columns.flatMap((c) => c.conversations);

  const move = async (conversation: ConversationSummaryDto, target: BoardColumnKey) => {
    const moved = await board.move(conversation, target);
    if (moved) onMoved(moved);
  };

  const handleDragStart = (event: DragStartEvent) =>
    setDragged(allCards.find((c) => c.id === event.active.id) ?? null);

  const handleDragEnd = (event: DragEndEvent) => {
    const card = dragged;
    setDragged(null);
    if (!card || event.over === null) return;

    const target = event.over.id as BoardColumnKey;
    // Aynı sütuna bırakmak bir şey değil: uyarı gösterilmez.
    if (columnOfStage(card.stage) === target) return;

    const denied = dropDeniedReason(card.stage, target);
    if (denied !== null) {
      notify.error(denied);
      return;
    }
    void move(card, target);
  };

  if (board.error) {
    return <p role="alert" className="m-4 rounded-lg bg-danger-soft p-3 text-ui-sm font-semibold text-danger">{board.error}</p>;
  }

  // Sütunlar ilk yanıtla birlikte (boş olsalar bile) gelir; o zamana dek iskelet çizilir.
  if (board.columns.length === 0) return <BoardSkeleton />;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={columnCollision}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setDragged(null)}
    >
      {/* min-w-0 + w-full: sohbet çekmecesi açıkken de pano kendi içinde kayar, sayfayı genişletmez. */}
      <div className="relative flex h-full w-full min-w-0 flex-col">
        {isMobile && <BoardMobilePager columns={board.columns} scroller={scroller} />}
        <div
          ref={scrollerRef}
          className={`flex min-h-0 min-w-0 flex-1 overflow-x-auto overscroll-x-contain ${
            isMobile ? 'snap-x snap-mandatory [scrollbar-width:none]' : 'gap-3 p-4 [scrollbar-width:thin]'
          }`}
        >
          {board.columns.map((column) => (
            <BoardColumnView
              key={column.column}
              column={column}
              brandNames={brandNames}
              selectedId={selectedId}
              dragged={dragged}
              isMobile={isMobile}
              onSelect={onSelect}
              onMove={(conversation, target) => void move(conversation, target)}
            />
          ))}
        </div>
        {!isMobile && <BoardScrollButtons scroller={scroller} />}
      </div>
      <DragOverlay>
        {dragged && <BoardCardPreview conversation={dragged} brandName={brandNames.get(dragged.channelId)} />}
      </DragOverlay>
    </DndContext>
  );
}
