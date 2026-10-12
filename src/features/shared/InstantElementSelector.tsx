'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { MousePointerClick, X } from 'lucide-react';

export interface SelectedContext {
  title: string;
  type: string;
  dataSnippet: string;
  previewText: string;
  rect: { left: number; top: number; width: number; height: number };
}

interface Props {
  onSelect: (context: SelectedContext) => void;
  onCancel: () => void;
}

export function InstantElementSelector({ onSelect, onCancel }: Props) {
  const [hoveredRect, setHoveredRect] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
    title: string;
    type: string;
  } | null>(null);

  const activeElementRef = useRef<HTMLElement | null>(null);

  // Detect card / table / chart / section elements under cursor
  const handleMouseMove = useCallback((e: MouseEvent) => {
    // Exclude our selector overlay
    const elements = document.elementsFromPoint(e.clientX, e.clientY);
    const target = elements.find(
      (el) =>
        !el.hasAttribute('data-selector-ui') &&
        !el.hasAttribute('data-ambient-ai-ui') &&
        (el.tagName === 'DIV' || el.tagName === 'TABLE' || el.tagName === 'SECTION' || el.tagName === 'ARTICLE') &&
        el.getBoundingClientRect().width > 120 &&
        el.getBoundingClientRect().height > 60 &&
        el.getBoundingClientRect().width < window.innerWidth * 0.98
    ) as HTMLElement | undefined;

    if (!target) return;

    activeElementRef.current = target;
    const rect = target.getBoundingClientRect();

    // Identify what component this is
    let title = 'Bölge / Kart';
    let type = 'Kart';

    const heading = target.querySelector('h1, h2, h3, h4, span.font-bold, div.font-bold');
    if (heading?.textContent) {
      title = heading.textContent.trim().slice(0, 45);
    } else if (target.querySelector('table')) {
      title = 'Veri Tablosu';
      type = 'Tablo';
    } else if (target.querySelector('svg.recharts-surface')) {
      title = 'Performans Grafiği';
      type = 'Grafik';
    }

    setHoveredRect({
      left: rect.left + window.scrollX,
      top: rect.top + window.scrollY,
      width: rect.width,
      height: rect.height,
      title,
      type,
    });
  }, []);

  const handleClick = useCallback(
    (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const el = activeElementRef.current;
      if (!el || !hoveredRect) {
        onCancel();
        return;
      }

      // Extract inner text and structured summary
      const text = el.innerText || el.textContent || '';
      const cleanSnippet = text
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
        .slice(0, 20)
        .join(' | ');

      onSelect({
        title: hoveredRect.title,
        type: hoveredRect.type,
        dataSnippet: cleanSnippet,
        previewText: text.slice(0, 300),
        rect: {
          left: hoveredRect.left,
          top: hoveredRect.top,
          width: hoveredRect.width,
          height: hoveredRect.height,
        },
      });
    },
    [hoveredRect, onSelect, onCancel]
  );

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onCancel();
      }
    }
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('click', handleClick, { capture: true });
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('click', handleClick, { capture: true });
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleMouseMove, handleClick, onCancel]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div data-selector-ui="true" className="fixed inset-0 z-[99999] pointer-events-none font-sans">
      {/* Top Banner Guide */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[100000] flex items-center gap-2.5 px-4 py-2 rounded-[6px] border border-emerald-500/40 bg-black/90 backdrop-blur-xl shadow-2xl text-white text-xs pointer-events-auto animate-in fade-in slide-in-from-top-2">
        <MousePointerClick size={15} className="text-emerald-400 animate-bounce" />
        <span className="font-semibold">
          Analiz etmek istediğiniz <strong className="text-emerald-400 font-bold">grafik, kart veya tabloya</strong> tıklayın
        </span>
        <button
          type="button"
          onClick={onCancel}
          className="ml-2 flex h-5 w-5 items-center justify-center rounded-[3px] text-zinc-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          title="İptal (ESC)"
        >
          <X size={13} />
        </button>
      </div>

      {/* Hover Highlight Box */}
      {hoveredRect && (
        <div
          className="absolute border-2 border-emerald-400 bg-emerald-500/10 rounded-[4px] shadow-[0_0_20px_rgba(52,211,153,0.35)] transition-all duration-75 pointer-events-none"
          style={{
            left: hoveredRect.left,
            top: hoveredRect.top,
            width: hoveredRect.width,
            height: hoveredRect.height,
          }}
        >
          <div className="absolute -top-7 left-0 flex items-center gap-1 px-2.5 py-0.5 rounded-[3px] bg-emerald-500 text-black font-bold text-ui-xs shadow-md tracking-tight">
            <span>{hoveredRect.type}:</span>
            <span className="font-semibold text-black/90">{hoveredRect.title}</span>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
