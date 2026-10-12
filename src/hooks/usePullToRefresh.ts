'use client';

import { useEffect, useRef, useState } from 'react';
import { haptic } from '../lib/haptics';

// Telefonda F5 yok — insanlar listeyi aşağı çekmeyi refleks olarak deniyor.
//
// Yalnızca kaydırılabilir alan EN ÜSTTEYKEN (scrollTop === 0) devreye girer, aksi halde
// normal kaydırmayı bozardı. Eşiği geçince bırakıldığında `onRefresh` çalışır.

const TRIGGER_PX = 70;      // Bu mesafeden sonra bırakılırsa yenile
const MAX_PULL_PX = 110;    // Görsel olarak daha fazla uzamasın
const RESISTANCE = 0.5;     // Parmak mesafesinin yarısı kadar çek — lastik hissi

interface PullToRefreshResult {
  /** Yenilenecek kaydırma alanına bağlanır. */
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** 0..MAX_PULL_PX — göstergeyi konumlandırmak için. */
  pullDistance: number;
  isRefreshing: boolean;
}

export function usePullToRefresh(onRefresh: () => Promise<unknown>): PullToRefreshResult {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const startYRef = useRef<number | null>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // onRefresh her render'da yeni referans olabilir; dinleyiciyi her seferinde
  // yeniden bağlamamak için ref'te tutuyoruz. Atama render sırasında DEĞİL effect'te
  // yapılmalı — render saf kalmazsa React eşzamanlı modda tutarsız davranır.
  const refreshRef = useRef(onRefresh);
  useEffect(() => { refreshRef.current = onRefresh; }, [onRefresh]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function onTouchStart(e: TouchEvent) {
      // Yalnızca tepedeyken başla — ortadayken çekiş normal kaydırmadır.
      startYRef.current = el!.scrollTop <= 0 ? e.touches[0].clientY : null;
    }

    function onTouchMove(e: TouchEvent) {
      if (startYRef.current === null || isRefreshing) return;
      const delta = e.touches[0].clientY - startYRef.current;
      if (delta <= 0) { setPullDistance(0); return; }

      // Tarayıcının kendi "aşırı kaydırma" davranışını bastır, yoksa sayfa zıplar.
      if (e.cancelable) e.preventDefault();
      const next = Math.min(delta * RESISTANCE, MAX_PULL_PX);

      // Eşiği ilk geçişte tek bir titreşim: kullanıcı parmağını kaldırırsa yenileneceğini
      // ekrana bakmadan anlar. Her harekette değil, yalnızca geçiş anında.
      setPullDistance((prev) => {
        if (prev < TRIGGER_PX && next >= TRIGGER_PX) haptic.light();
        return next;
      });
    }

    async function onTouchEnd() {
      const shouldRefresh = pullDistance >= TRIGGER_PX;
      startYRef.current = null;
      setPullDistance(0);
      if (!shouldRefresh || isRefreshing) return;

      setIsRefreshing(true);
      try {
        await refreshRef.current();
      } finally {
        setIsRefreshing(false);
      }
    }

    // passive:false — preventDefault çağırabilmek için şart.
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);
    el.addEventListener('touchcancel', onTouchEnd);
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [pullDistance, isRefreshing]);

  return { containerRef, pullDistance, isRefreshing };
}
