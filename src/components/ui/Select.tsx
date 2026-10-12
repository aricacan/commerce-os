'use client';

import { useEffect, useRef, useState, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';

export interface SelectOption<T extends string | number> {
  value: T;
  label: string;
}

interface SelectProps<T extends string | number> {
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  icon?: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md';
  placeholder?: string;
}

// React Portal tabanlı, z-index ve overflow kırpılma sorunlarını kökten çözen Custom Select.
// Menü doğrudan document.body üzerinde fixed pozisyonda render edilir.
export function Select<T extends string | number>({
  value,
  options,
  onChange,
  icon,
  className,
  size = 'md',
  placeholder,
}: SelectProps<T>) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; minWidth: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setMounted(true);
    const checkMobile = () => setIsMobile(window.innerWidth <= 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const updateCoords = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + 4,
        left: rect.left,
        minWidth: Math.max(rect.width, 140),
      });
    }
  };

  useLayoutEffect(() => {
    if (open) {
      updateCoords();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        popupRef.current &&
        !popupRef.current.contains(target)
      ) {
        setOpen(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }

    function handleScrollOrResize() {
      if (open) updateCoords();
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [open]);

  const selected = options.find((o) => o.value === value);
  const isFull = className?.includes('w-full');

  return (
    <div className={`relative ${isFull ? 'block w-full' : 'inline-block'} ${className || ''}`}>
      <button
        ref={triggerRef}
        type="button"
        className={`dropdown-trigger ${isFull ? 'w-full justify-between' : ''} ${size === 'sm' ? '!h-7 !px-2.5 !text-ui-xs !rounded-[3px]' : ''}`}
        data-open={open}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {icon}
        <span className={`dropdown-trigger-value ${isFull ? 'flex-1 text-left' : ''}`}>
          {selected?.label || placeholder || ''}
        </span>
        <ChevronDown
          size={11}
          className="dropdown-trigger-chevron shrink-0"
          style={{ transform: open ? 'rotate(180deg)' : undefined }}
        />
      </button>

      {open &&
        mounted &&
        (isMobile || coords) &&
        createPortal(
          <>
            {/* Mobilde ekranı karartan ve arkaya dokununca kapatan perde */}
            <button
              type="button"
              className="dropdown-mobile-backdrop"
              aria-label="Kapat"
              onClick={() => setOpen(false)}
            />
            <div
              ref={popupRef}
              role="listbox"
              style={
                isMobile
                  ? undefined
                  : {
                      position: 'fixed',
                      top: coords?.top ?? 0,
                      left: coords?.left ?? 0,
                      minWidth: coords?.minWidth ?? 140,
                      zIndex: 99999,
                    }
              }
              className="dropdown-popup animate-fade-in shadow-xl max-h-64 overflow-y-auto"
            >
              {/* Mobilde alt çekmece tutamağı ve başlık */}
              <div className="dropdown-mobile-handle sm:hidden" />
              {placeholder && (
                <div className="dropdown-mobile-title sm:hidden">
                  {placeholder}
                </div>
              )}
              <div className="flex flex-col gap-1 sm:gap-0.5 w-full">
                {options.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    role="option"
                    aria-selected={o.value === value}
                    data-active={o.value === value}
                    className={`dropdown-option ${size === 'sm' ? '!py-1.5 !px-2 !text-ui-xs' : ''}`}
                    onClick={() => {
                      onChange(o.value);
                      setOpen(false);
                    }}
                  >
                    <span className="truncate">{o.label}</span>
                    {o.value === value && <Check size={14} strokeWidth={2.5} className="shrink-0" />}
                  </button>
                ))}
              </div>
            </div>
          </>,
          document.body
        )}
    </div>
  );
}
