'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMobile } from './useMobile';

// Mobilde sekmeler arasında yatay kaydırarak geçiş (Twitter/X modeli).
//
// En büyük tuzak: uygulamada yatay kayan tablolar ve sekme çubuğunun kendisi var.
// Kullanıcı bir tabloyu yana kaydırırken sayfa değişirse bu kırık hissettirir —
// bu yüzden jest, yatay kaydırılabilir bir öğenin İÇİNDEN başladıysa yok sayılır.

const MIN_DISTANCE_PX = 60;   // Bu mesafenin altı "kararsız dokunuş"
const HORIZONTAL_RATIO = 2;   // Yatay hareket dikeyin en az 2 katı olmalı

function startsInsideHorizontalScroller(target: EventTarget | null): boolean {
  let node = target as HTMLElement | null;
  while (node && node !== document.body) {
    if (node.scrollWidth > node.clientWidth + 4) {
      const overflowX = getComputedStyle(node).overflowX;
      if (overflowX === 'auto' || overflowX === 'scroll') return true;
    }
    node = node.parentElement;
  }
  return false;
}

/**
 * @param hrefs Sekmelerin sırası (soldan sağa)
 * @param activeIndex Şu an açık olan sekmenin indisi; -1 ise jest devre dışı
 */
export function useSwipeTabs(hrefs: string[], activeIndex: number): void {
  const router = useRouter();
  const isMobile = useMobile();

  useEffect(() => {
    if (!isMobile || activeIndex < 0 || hrefs.length < 2) return;

    let startX = 0;
    let startY = 0;
    let tracking = false;

    function onTouchStart(e: TouchEvent) {
      if (e.touches.length !== 1 || startsInsideHorizontalScroller(e.target)) {
        tracking = false;
        return;
      }
      tracking = true;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    }

    function onTouchEnd(e: TouchEvent) {
      if (!tracking) return;
      tracking = false;

      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      if (Math.abs(dx) < MIN_DISTANCE_PX) return;
      if (Math.abs(dx) < Math.abs(dy) * HORIZONTAL_RATIO) return;

      // Sola kaydırma = sonraki sekme (içerik sola kayar), sağa kaydırma = önceki.
      const nextIndex = dx < 0 ? activeIndex + 1 : activeIndex - 1;
      const href = hrefs[nextIndex];
      if (href) router.push(href);
    }

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [isMobile, hrefs, activeIndex, router]);
}
