'use client';

import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react';
import type { MessageDto } from '../../lib/api/omnichannel';
import { wasPrepended } from './chatPaging';

// Alta "yapışık" sayılacak en büyük uzaklık: kullanıcı mesajları okumak için bundan fazla yukarı çıktıysa
// içerik büyüse de yeri korunur.
const STICK_THRESHOLD_PX = 120;

// Sohbet kaydırması: yeni/değişen mesajda en alta iner; eski sayfa başa eklenince okunan yer yerinde kalır (eklenen
// yükseklik kadar aşağı kaydırılır). useLayoutEffect: kaydırma boyamadan önce olur, kullanıcı zıplama görmez.
// Kapsayıcıda tarayıcının kendi kaydırma çapası kapalı olmalı ([overflow-anchor:none]); yoksa iki düzeltme üst üste biner.
// Konuşma açılırken alta yapışık başlar: görsel yüklenmesi ya da yazma alanı/yardımcı kartı büyüyüp kapsayıcıyı
// küçültse de sohbet son mesajda kalır (rastgele bir yerde açılmaz).
export function useChatScroll(scrollRef: RefObject<HTMLDivElement | null>, messages: readonly MessageDto[]) {
  const firstId = useRef<number | null>(null);
  // Son bilinen içerik yüksekliği. Kaydırırken de güncellenir: görseller sonradan yüklenip yüksekliği değiştirirse
  // eski sayfa eklendiğinde fark yanlış hesaplanmasın.
  const lastHeight = useRef(0);
  const stickToBottom = useRef(true);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const toBottom = () => {
      if (stickToBottom.current) el.scrollTop = el.scrollHeight;
    };
    const onScroll = () => {
      lastHeight.current = el.scrollHeight;
      stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight <= STICK_THRESHOLD_PX;
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    // Görsel/video yüklenince içerik uzar; "load" kabarmaz, yakalama aşamasında dinlenir.
    el.addEventListener('load', toBottom, true);
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(toBottom);
    observer?.observe(el);
    return () => {
      el.removeEventListener('scroll', onScroll);
      el.removeEventListener('load', toBottom, true);
      observer?.disconnect();
    };
  }, [scrollRef]);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (wasPrepended(firstId.current, messages)) {
      el.scrollTop += el.scrollHeight - lastHeight.current;
    } else {
      el.scrollTop = el.scrollHeight;
      stickToBottom.current = true;
    }
    firstId.current = messages[0]?.id ?? null;
    lastHeight.current = el.scrollHeight;
  }, [scrollRef, messages]);
}
