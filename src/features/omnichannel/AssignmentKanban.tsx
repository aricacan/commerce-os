'use client';

import { useMemo, useState } from 'react';
import {
  DndContext, DragOverlay, KeyboardSensor, PointerSensor, pointerWithin, rectIntersection,
  useSensor, useSensors, type CollisionDetection, type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core';
import type { AssignmentBoardDto, AssignmentCardDto } from '../../lib/api/assignments';
import { useMobile } from '../../hooks/useMobile';
import { useAuthStore } from '../../stores/auth';
import { AssignmentCardBody } from './AssignmentCardView';
import { AssignmentColumnView } from './AssignmentColumnView';
import { buildColumns } from './assignmentBoardRules';
import { useNowTick } from './useNowTick';

interface Props {
  board: AssignmentBoardDto | null;
  isAdmin: boolean;
  busy: boolean;
  onMove: (card: AssignmentCardDto, targetKey: string) => void;
  onToggleDuty: (userId: number, onDuty: boolean) => void;
  onOpenConversation: (conversationId: number) => void;
}

// Tıklama ile sürüklemeyi ayıran mesafe: kısa hareket tıklama sayılır.
const DRAG_START_DISTANCE_PX = 6;

const columnCollision: CollisionDetection = (args) => {
  const underPointer = pointerWithin(args);
  return underPointer.length > 0 ? underPointer : rectIntersection(args);
};

// "Kişiye göre" panosu: Atanmamış | temsilciler | Bot sütunları, tam genişlik. Kartı başka temsilciye sürüklemek
// yeniden atar, "Atanmamış"a bırakmak kuyruğa alır, "Bot"a bırakmak bota geri verir. Telefonda sütunlar yatay
// kaydırılır, taşıma konuşmanın içinden yapılır.
export function AssignmentKanban({ board, isAdmin, busy, onMove, onToggleDuty, onOpenConversation }: Props) {
  const isMobile = useMobile();
  const myId = useAuthStore((s) => s.user?.id ?? null);
  const now = useNowTick();
  const [dragging, setDragging] = useState<AssignmentCardDto | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: DRAG_START_DISTANCE_PX } }),
    useSensor(KeyboardSensor),
  );
  const columns = useMemo(() => (board ? buildColumns(board) : []), [board]);

  const handleDragStart = (event: DragStartEvent) => setDragging((event.active.data.current as AssignmentCardDto) ?? null);
  const handleDragEnd = (event: DragEndEvent) => {
    const card = dragging;
    setDragging(null);
    if (card && event.over) onMove(card, String(event.over.id));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={columnCollision}
      onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={() => setDragging(null)}>
      <div className={`flex min-h-[420px] min-w-0 flex-1 overflow-x-auto overscroll-x-contain ${
        isMobile ? 'snap-x snap-mandatory' : 'gap-3 [scrollbar-width:thin]'}`}>
        {board === null && <p className="m-auto text-ui-sm text-fg-muted">Yükleniyor…</p>}
        {columns.map((column) => (
          <AssignmentColumnView
            key={column.key}
            column={column}
            now={now}
            isMobile={isMobile}
            dragging={dragging}
            canToggleDuty={column.agent !== null && (isAdmin || column.agent.userId === myId)}
            busy={busy}
            onToggleDuty={onToggleDuty}
            onOpen={onOpenConversation}
          />
        ))}
      </div>
      <DragOverlay>{dragging && <AssignmentCardBody card={dragging} now={now} />}</DragOverlay>
    </DndContext>
  );
}
