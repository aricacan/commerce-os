'use client';

import { useCallback, useEffect, useState, type RefObject } from 'react';
import { pageIndexOf, steppedScrollLeft } from './boardPaging';

// Kenara bu kadar yakınken (px) "o tarafta içerik yok" sayılır — alt piksel yuvarlaması.
const EDGE_TOLERANCE_PX = 4;

interface ScrollState {
  atStart: boolean;
  atEnd: boolean;
  index: number;
}

// Bir sütunun kapladığı yatay yer: ilk sütun genişliği + sütun arası boşluk. Telefonda sütun tam
// genişlikte olduğundan adım görünüm genişliğine eşittir; masaüstünde sütun + boşluk.
function columnStep(scroller: HTMLElement): number {
  const first = scroller.firstElementChild;
  if (!(first instanceof HTMLElement)) return 0;
  const gap = Number.parseFloat(getComputedStyle(scroller).columnGap) || 0;
  return first.offsetWidth + gap;
}

// Panonun yatay kaydırıcısı: uçlarda mıyız, hangi sütundayız, bir sütun ileri/geri, sütuna atla.
export function useBoardScroller(scrollerRef: RefObject<HTMLDivElement | null>, columnCount: number) {
  const [state, setState] = useState<ScrollState>({ atStart: true, atEnd: true, index: 0 });

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const measure = () => {
      const next: ScrollState = {
        atStart: scroller.scrollLeft <= EDGE_TOLERANCE_PX,
        atEnd: scroller.scrollLeft + scroller.clientWidth >= scroller.scrollWidth - EDGE_TOLERANCE_PX,
        index: pageIndexOf(scroller.scrollLeft, columnStep(scroller), columnCount),
      };
      // Kaydırma olayı her karede gelir; değer değişmediyse yeniden çizim yok.
      setState((prev) => (
        prev.atStart === next.atStart && prev.atEnd === next.atEnd && prev.index === next.index ? prev : next
      ));
    };
    measure();
    scroller.addEventListener('scroll', measure, { passive: true });
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(scroller);
    return () => {
      scroller.removeEventListener('scroll', measure);
      resizeObserver.disconnect();
    };
  }, [scrollerRef, columnCount]);

  const step = useCallback((direction: -1 | 1) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const max = scroller.scrollWidth - scroller.clientWidth;
    scroller.scrollTo({ left: steppedScrollLeft(scroller.scrollLeft, columnStep(scroller), direction, max), behavior: 'smooth' });
  }, [scrollerRef]);

  const goTo = useCallback((index: number) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    scroller.scrollTo({ left: index * columnStep(scroller), behavior: 'smooth' });
  }, [scrollerRef]);

  return { ...state, step, goTo };
}

export type BoardScroller = ReturnType<typeof useBoardScroller>;
