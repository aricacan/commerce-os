'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

// Kenara bu kadar yakınken (px) "o tarafta içerik yok" sayılır — alt piksel yuvarlaması
// solmayı sonsuza dek açık bırakmasın.
const EDGE_TOLERANCE_PX = 4;

interface Props {
  children: ReactNode;
  ariaLabel?: string;
  // Solma rengi çubuğun zeminiyle aynı olmalı; varsayılan kart zemini.
  fadeFromClass?: string;
  className?: string;
}

// Yatay kaydırılan çip/hap satırı. Telefonda satır kesik görünmesin: taşan tarafta
// yumuşak bir solma "devamı var" der, kaydırma çubuğu gizlenir.
export function HorizontalScroller({ children, ariaLabel, fadeFromClass = 'from-[var(--card)]', className = '' }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: false, end: false });

  const measure = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setEdges({
      start: el.scrollLeft > EDGE_TOLERANCE_PX,
      end: el.scrollLeft + el.clientWidth < el.scrollWidth - EDGE_TOLERANCE_PX,
    });
  }, []);

  // Gözlemciler bir kez kurulur (children her render yeni nesne — bağımlılık olursa her
  // render'da yıkılıp kurulurdu). Genişlik değişimi ResizeObserver, eklenen/çıkan çipler
  // MutationObserver ile yakalanır.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const resizeObserver = new ResizeObserver(measure);
    const observeChildren = () => {
      resizeObserver.disconnect();
      resizeObserver.observe(el);
      Array.from(el.children).forEach((child) => resizeObserver.observe(child));
    };
    observeChildren();
    const mutationObserver = typeof MutationObserver === 'undefined'
      ? null
      : new MutationObserver(() => { observeChildren(); measure(); });
    mutationObserver?.observe(el, { childList: true });
    return () => {
      resizeObserver.disconnect();
      mutationObserver?.disconnect();
    };
  }, [measure]);

  return (
    <div className={`relative min-w-0 ${className}`}>
      <div
        ref={scrollRef}
        onScroll={measure}
        role={ariaLabel ? 'group' : undefined}
        aria-label={ariaLabel}
        className="flex items-center gap-2 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
      {edges.start && (
        <span aria-hidden className={`pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r ${fadeFromClass} to-transparent`} />
      )}
      {edges.end && (
        <span aria-hidden className={`pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l ${fadeFromClass} to-transparent`} />
      )}
    </div>
  );
}
