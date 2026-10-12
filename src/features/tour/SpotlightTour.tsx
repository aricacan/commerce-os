'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useTourStore } from './tour-store';
import { X } from 'lucide-react';

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function SpotlightTour() {
  const {
    isOpen,
    steps,
    currentStepIndex,
    nextStep,
    prevStep,
    skipTour,
    closeTour,
  } = useTourStore();

  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  const currentStep = steps[currentStepIndex];

  // Update target rect on element found or window resize
  const updateRect = useCallback(() => {
    if (!currentStep) {
      setTargetRect(null);
      return;
    }

    const el = document.querySelector(currentStep.target);
    if (el) {
      const r = el.getBoundingClientRect();
      setTargetRect({
        top: Math.round(r.top),
        left: Math.round(r.left),
        width: Math.round(r.width),
        height: Math.round(r.height),
      });
    } else {
      setTargetRect(null);
    }
  }, [currentStep]);

  // Scroll to target element whenever current step changes
  useEffect(() => {
    if (!isOpen || !currentStep) return;

    const timer = setTimeout(() => {
      const el = document.querySelector(currentStep.target);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      }
      updateRect();
    }, 40);

    return () => clearTimeout(timer);
  }, [isOpen, currentStep, currentStepIndex, updateRect]);

  // Window listeners
  useEffect(() => {
    if (!isOpen) return;

    const onResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
      updateRect();
    };

    const onScroll = () => {
      updateRect();
    };

    onResize();

    window.addEventListener('resize', onResize, { passive: true });
    window.addEventListener('scroll', onScroll, { capture: true, passive: true });

    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onScroll, { capture: true });
    };
  }, [isOpen, updateRect]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeTour();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault();
        nextStep();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevStep();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, nextStep, prevStep, closeTour]);

  if (!isOpen || !currentStep) return null;

  const CARD_WIDTH = 340;
  const CARD_ESTIMATED_HEIGHT = 175;
  const MARGIN = 10;

  // Calculate card position
  let cardTop = 100;
  let cardLeft = Math.max(16, (windowSize.width - CARD_WIDTH) / 2);

  if (targetRect) {
    const spaceBelow = windowSize.height - (targetRect.top + targetRect.height);
    const spaceAbove = targetRect.top;

    if (currentStep.placement === 'top' || (spaceBelow < CARD_ESTIMATED_HEIGHT && spaceAbove > CARD_ESTIMATED_HEIGHT)) {
      // Place above target
      cardTop = Math.max(16, targetRect.top - CARD_ESTIMATED_HEIGHT - MARGIN);
    } else {
      // Place below target
      cardTop = Math.min(windowSize.height - CARD_ESTIMATED_HEIGHT - 16, targetRect.top + targetRect.height + MARGIN);
    }

    // Horizontal alignment: align with target's left, but clamp inside viewport
    cardLeft = Math.max(16, Math.min(windowSize.width - CARD_WIDTH - 16, targetRect.left));
  }

  const isLast = currentStepIndex === steps.length - 1;

  return (
    <div className="fixed inset-0 z-[45000] overflow-hidden select-none" style={{ pointerEvents: 'auto' }}>
      {/* SVG Shaded Mask Backdrop */}
      <svg
        className="fixed inset-0 w-full h-full"
        style={{ width: '100vw', height: '100vh', pointerEvents: 'none' }}
      >
        <defs>
          <mask id="spotlight-tour-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {targetRect && (
              <rect
                x={targetRect.left - 5}
                y={targetRect.top - 5}
                width={targetRect.width + 10}
                height={targetRect.height + 10}
                rx="4"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.62)"
          mask="url(#spotlight-tour-mask)"
        />
      </svg>

      {/* Target Focus Border - Sert köşeli & net */}
      {targetRect && (
        <div
          style={{
            position: 'fixed',
            top: targetRect.top - 5,
            left: targetRect.left - 5,
            width: targetRect.width + 10,
            height: targetRect.height + 10,
            borderRadius: 4,
            border: '2px solid #71717a',
            boxShadow: '0 0 0 2px rgba(113, 113, 122, 0.25), 0 0 16px rgba(113, 113, 122, 0.35)',
            pointerEvents: 'none',
            zIndex: 9992,
            transition: 'top 0.08s ease, left 0.08s ease, width 0.08s ease, height 0.08s ease',
          }}
        />
      )}

      {/* Tour Step Card - Beyaz zemin, sert hatlar, ikonsuz net butonlar */}
      <div
        ref={cardRef}
        style={{
          position: 'fixed',
          top: cardTop,
          left: cardLeft,
          width: CARD_WIDTH,
          zIndex: 9995,
          transition: 'top 0.08s ease, left 0.08s ease',
        }}
        className="rounded-[4px] border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 text-zinc-900 dark:text-zinc-100 shadow-2xl"
      >
        {/* Card Header */}
        <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className="text-zinc-700 dark:text-zinc-300 font-bold uppercase tracking-wider text-[11px]">
              Rehber
            </span>
            <span className="rounded-[2px] bg-zinc-100 border border-zinc-300 dark:bg-zinc-800 dark:border-zinc-700 px-1.5 py-0.5 text-[11px] font-bold text-zinc-800 dark:text-zinc-200">
              {currentStepIndex + 1} / {steps.length}
            </span>
          </div>

          <button
            type="button"
            onClick={closeTour}
            className="flex h-5 w-5 items-center justify-center rounded-[2px] text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-colors"
            title="Kapat (Esc)"
          >
            <X size={13} />
          </button>
        </div>

        {/* Card Content */}
        <div className="py-2.5">
          <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-1 leading-snug">
            {currentStep.title}
          </h4>
          <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
            {currentStep.content}
          </p>
        </div>

        {/* Card Footer / Action Controls - Sert ve ikonsuz */}
        <div className="flex items-center justify-between pt-2.5 border-t border-zinc-100 dark:border-zinc-800 mt-1">
          <button
            type="button"
            onClick={skipTour}
            className="text-xs font-medium text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
          >
            Turu Atla
          </button>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentStepIndex === 0}
              onClick={prevStep}
              className="inline-flex h-7 items-center justify-center rounded-[4px] border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-2.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              Geri
            </button>

            <button
              type="button"
              onClick={nextStep}
              className="inline-flex h-7 items-center justify-center rounded-[4px] bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 px-3 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              {isLast ? 'Tamamla' : 'İleri'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
