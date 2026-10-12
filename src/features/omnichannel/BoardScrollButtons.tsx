'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { focusRing, motionFast } from '../shared/design';
import type { BoardScroller } from './useBoardScroller';

const BUTTON_CLASS =
  `absolute top-1/2 z-10 flex size-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-border bg-card text-fg shadow-[var(--shadow-sm)] hover:bg-bg-subtle ${motionFast} ${focusRing}`;

// Masaüstü fare kullanıcısı için: pano yatay kayar ama kaydırma çubuğu ince ve altta; her tıklama
// tam bir sütun kaydırır. Yalnız o yönde içerik varsa görünür. Telefonda BoardMobilePager kullanılır.
export function BoardScrollButtons({ scroller }: { scroller: BoardScroller }) {
  return (
    <>
      {!scroller.atStart && (
        <button type="button" aria-label="Bir sütun sola kaydır" onClick={() => scroller.step(-1)} className={`${BUTTON_CLASS} left-2`}>
          <ChevronLeft size={18} aria-hidden />
        </button>
      )}
      {!scroller.atEnd && (
        <button type="button" aria-label="Bir sütun sağa kaydır" onClick={() => scroller.step(1)} className={`${BUTTON_CLASS} right-2`}>
          <ChevronRight size={18} aria-hidden />
        </button>
      )}
    </>
  );
}
