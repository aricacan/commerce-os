'use client';

/**
 * SectionTabBar — Üst kayar sekme çubuğu.
 * İkonlar kaldırıldı; minimalist, 2px alt çizgili ve 100% Tailwind CSS yapısına geçirildi.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useSwipeTabs } from '../../hooks/useSwipeTabs';
import { PageHelpButton } from '../../features/tour/PageHelpButton';

export interface TabBarItem {
  href: string;
  label: string;
}

interface SectionTabBarProps {
  tabs: TabBarItem[];
  background?: string;
}

export function SectionTabBar({ tabs, background = 'transparent' }: SectionTabBarProps) {
  const pathname = usePathname();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    updateScrollState();
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => updateScrollState();
    const onResize = () => updateScrollState();
    el.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    return () => {
      el.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
    };
  }, [tabs.length]);

  const scrollByAmount = (dir: 1 | -1) => {
    scrollRef.current?.scrollBy({ left: dir * 220, behavior: 'smooth' });
  };

  function isActive(href: string) {
    const cleanPath = pathname.split('?')[0];
    const cleanHref = href.split('?')[0];

    if (cleanPath === cleanHref) return true;

    if (cleanPath.startsWith(cleanHref + '/')) {
      const hasMoreSpecificTab = tabs.some(
        (t) => t.href !== href && cleanPath.startsWith(t.href.split('?')[0]) && t.href.length > href.length
      );
      return !hasMoreSpecificTab;
    }

    return false;
  }

  const hrefs = useMemo(() => tabs.map((tabItem) => tabItem.href), [tabs]);
  const activeIndex = tabs.findIndex((tabItem) => isActive(tabItem.href));
  useSwipeTabs(hrefs, activeIndex);

  return (
    <div className="relative shrink-0 border-b border-[var(--border-soft)]" style={{ background }}>
      <div className="flex items-center justify-between gap-3 pr-4">
        <div className="relative flex-1 min-w-0">
          {canScrollLeft && (
            <button
              type="button"
              onClick={() => scrollByAmount(-1)}
              aria-label="Sola kaydır"
              className="absolute left-0 top-0 bottom-0 z-10 flex w-7 items-center justify-center bg-gradient-to-r from-[var(--card)] to-transparent text-[var(--fg-muted)] hover:text-[var(--fg)]"
            >
              <ChevronLeft size={15} />
            </button>
          )}
          {canScrollRight && (
            <button
              type="button"
              onClick={() => scrollByAmount(1)}
              aria-label="Sağa kaydır"
              className="absolute right-0 top-0 bottom-0 z-10 flex w-7 items-center justify-center bg-gradient-to-l from-[var(--card)] to-transparent text-[var(--fg-muted)] hover:text-[var(--fg)]"
            >
              <ChevronRight size={15} />
            </button>
          )}
          <div
            ref={scrollRef}
            className="flex items-center gap-1 overflow-x-auto px-4 scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          >
            {tabs.map((tab) => {
              const active = isActive(tab.href);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`shrink-0 px-3.5 py-2.5 text-xs font-semibold whitespace-nowrap transition-all border-b-2 -mb-[1px] ${
                    active
                      ? 'border-[var(--fg)] text-[var(--fg)] font-bold'
                      : 'border-transparent text-[var(--fg-muted)] hover:text-[var(--fg)]'
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </div>
        <div className="shrink-0 py-1.5">
          <PageHelpButton />
        </div>
      </div>
    </div>
  );
}
