'use client';

import { useState, useRef, useEffect, useLayoutEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Search, X } from 'lucide-react';
import { trLower } from '../../lib/turkey-locations';

export interface SearchableSelectOption {
  value: string;
  label: string;
  sublabel?: string;
}

interface SearchableSelectProps {
  value: string | null | undefined;
  onChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
  allowCustom?: boolean;
  emptyMessage?: string;
}

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = 'Seçiniz...',
  searchPlaceholder = 'Ara...',
  disabled = false,
  className = '',
  allowCustom = false,
  emptyMessage = 'Sonuç bulunamadı',
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

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
      const popupHeight = 260;
      const spaceBelow = window.innerHeight - rect.bottom;
      const dropUp = spaceBelow < popupHeight && rect.top > popupHeight;

      setCoords({
        top: dropUp ? rect.top - popupHeight - 4 : rect.bottom + 4,
        left: rect.left,
        width: Math.max(rect.width, 180),
      });
    }
  };

  useLayoutEffect(() => {
    if (open) {
      updateCoords();
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      setSearch('');
      return;
    }

    const timer = setTimeout(() => {
      searchInputRef.current?.focus();
    }, 50);

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        popupRef.current &&
        !popupRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };

    const onScrollOrResize = () => {
      if (open) updateCoords();
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [open]);

  const filtered = useMemo(() => {
    if (!search.trim()) return options;
    const q = trLower(search.trim());
    return options.filter(
      (o) => trLower(o.label).includes(q) || (o.sublabel && trLower(o.sublabel).includes(q))
    );
  }, [options, search]);

  const selectedOption = useMemo(
    () => options.find((o) => o.value === value || trLower(o.value) === trLower(value ?? '')),
    [options, value]
  );

  const displayLabel = selectedOption ? selectedOption.label : value || placeholder;

  return (
    <div className={`relative w-full ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={`flex h-8.5 w-full items-center justify-between gap-2 rounded-[4px] border px-3 text-xs outline-none transition cursor-pointer ${
          disabled
            ? 'border-[var(--border-soft)] bg-[var(--bg-subtle)] text-[var(--fg-muted)] opacity-50 cursor-not-allowed'
            : open
            ? 'border-slate-800 bg-[var(--bg)] text-[var(--fg)] shadow-xs dark:border-slate-400'
            : 'border-[var(--border)] bg-[var(--bg)] text-[var(--fg)] hover:border-[var(--fg)]'
        }`}
      >
        <span className={`truncate ${!value && !selectedOption ? 'text-[var(--fg-muted)]' : 'font-medium text-[var(--fg)]'}`}>
          {displayLabel}
        </span>
        <div className="flex shrink-0 items-center gap-1 text-[var(--fg-muted)]">
          {value && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              className="p-0.5 hover:text-[var(--fg)] transition cursor-pointer"
            >
              <X size={12} />
            </span>
          )}
          <ChevronDown size={13} className={`transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {open && mounted && (isMobile || coords) && createPortal(
        <>
          {/* Backdrop for mobile bottom drawer or outside click */}
          {isMobile && (
            <div
              className="fixed inset-0 z-[100000] bg-black/50 backdrop-blur-[2px]"
              onClick={() => setOpen(false)}
            />
          )}

          <div
            ref={popupRef}
            style={
              isMobile
                ? {
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    zIndex: 100001,
                    maxHeight: '75vh',
                  }
                : {
                    position: 'fixed',
                    top: coords?.top ?? 0,
                    left: coords?.left ?? 0,
                    width: coords?.width ?? 200,
                    zIndex: 100001,
                    maxHeight: '260px',
                  }
            }
            className="flex flex-col overflow-hidden rounded-[6px] border border-[var(--border)] bg-[var(--card)] p-1.5 shadow-2xl animate-in fade-in zoom-in-95 duration-100"
          >
            {/* Search Input Box */}
            <div className="relative mb-1.5 shrink-0 px-1 pt-0.5">
              <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]" />
              <input
                ref={searchInputRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="h-8 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] pl-7 pr-3 text-xs text-[var(--fg)] placeholder-[var(--fg-muted)] outline-none focus:border-slate-800 dark:focus:border-slate-400"
              />
            </div>

            {/* Options List */}
            <div className="flex-1 overflow-y-auto space-y-0.5 max-h-56 pr-0.5">
              {filtered.length === 0 ? (
                allowCustom && search.trim() ? (
                  <button
                    type="button"
                    onClick={() => {
                      onChange(search.trim());
                      setOpen(false);
                    }}
                    className="flex w-full items-center justify-between rounded-[4px] px-2.5 py-2 text-left text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-[var(--bg-subtle)] transition cursor-pointer"
                  >
                    <span>&quot;{search.trim()}&quot; ekle</span>
                  </button>
                ) : (
                  <div className="p-3 text-center text-xs text-[var(--fg-muted)]">{emptyMessage}</div>
                )
              ) : (
                filtered.map((opt) => {
                  const isSelected = value === opt.value || (value && trLower(value) === trLower(opt.value));
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        onChange(opt.value);
                        setOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-[4px] px-2.5 py-1.5 text-left text-xs transition cursor-pointer ${
                        isSelected
                          ? 'bg-slate-800 text-slate-100 dark:bg-slate-700 font-semibold'
                          : 'text-[var(--fg)] hover:bg-[var(--bg-subtle)]'
                      }`}
                    >
                      <div className="min-w-0 flex-1 truncate">
                        <span>{opt.label}</span>
                        {opt.sublabel && (
                          <span className="ml-1.5 font-mono text-ui-xs opacity-70">
                            ({opt.sublabel})
                          </span>
                        )}
                      </div>
                      {isSelected && <Check size={13} className="ml-2 shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
