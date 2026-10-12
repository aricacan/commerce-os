import { useState, type DragEvent } from 'react';
import type { ShopifyMenuNodeDto } from '../../lib/api/shopify-store-content';
import { checkDrop, moveNodeTo, type DropPosition } from './menuDrop';
import { pathKey } from './menuMarks';
import type { NodePath } from './menuTree';

// Satırın üst/alt bu orandaki şeridi "önüne/arkasına", ortası "içine" bırakır.
const EDGE_RATIO = 0.3;

export interface DropIndicator {
  position: DropPosition;
  // Dolu ise bırakma reddedilir ve neden kartta gösterilir.
  reason: string | null;
}

export interface DragBinding {
  isDragged: boolean;
  indicator: DropIndicator | null;
  handleProps: { draggable: true; onDragStart: (e: DragEvent<HTMLElement>) => void; onDragEnd: () => void };
  zoneProps: { onDragOver: (e: DragEvent<HTMLElement>) => void; onDragLeave: () => void; onDrop: (e: DragEvent<HTMLElement>) => void };
}

interface Hover {
  key: string;
  indicator: DropIndicator;
}

function positionIn(event: DragEvent<HTMLElement>): DropPosition {
  const rect = event.currentTarget.getBoundingClientRect();
  const ratio = rect.height === 0 ? 0.5 : (event.clientY - rect.top) / rect.height;
  if (ratio < EDGE_RATIO) return 'before';
  return ratio > 1 - EDGE_RATIO ? 'after' : 'inside';
}

// HTML5 sürükle-bırak: yalnız tutamaç sürüklenir (başlık kutusunda metin seçimi bozulmasın); kurallar menuDrop.ts'te.
export function useMenuDrag(items: ShopifyMenuNodeDto[], onChange: (items: ShopifyMenuNodeDto[]) => void) {
  const [dragged, setDragged] = useState<NodePath | null>(null);
  const [hover, setHover] = useState<Hover | null>(null);

  const reset = () => {
    setDragged(null);
    setHover(null);
  };

  const bind = (path: NodePath): DragBinding => {
    const key = pathKey(path);
    return {
      isDragged: dragged !== null && pathKey(dragged) === key,
      indicator: hover?.key === key ? hover.indicator : null,
      handleProps: {
        draggable: true,
        onDragStart: (event) => {
          event.dataTransfer.effectAllowed = 'move';
          event.dataTransfer.setData('text/plain', key);
          setDragged(path);
        },
        onDragEnd: reset,
      },
      zoneProps: {
        onDragOver: (event) => {
          if (dragged === null) return;
          const position = positionIn(event);
          const check = checkDrop(items, dragged, path, position);
          if (check.ok) {
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
          }
          const reason = check.ok ? null : check.reason;
          if (hover?.key !== key || hover.indicator.position !== position || hover.indicator.reason !== reason) {
            setHover({ key, indicator: { position, reason } });
          }
        },
        onDragLeave: () => setHover((current) => (current?.key === key ? null : current)),
        onDrop: (event) => {
          event.preventDefault();
          if (dragged !== null && hover?.key === key && hover.indicator.reason === null) onChange(moveNodeTo(items, dragged, path, hover.indicator.position));
          reset();
        },
      },
    };
  };

  return { bind };
}
