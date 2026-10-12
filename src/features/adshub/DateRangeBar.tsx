'use client';

import { useRef, useState, useEffect } from 'react';
import { Calendar, ChevronDown, Check } from 'lucide-react';
import { PRESET_OPTIONS, type DateRangeState, type PresetKey } from './useDateRange';

interface Props {
  range: DateRangeState;
}

function useOutsideClick(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open, onClose]);
  return ref;
}

export function DateRangeBar({ range }: Props) {
  const [open, setOpen] = useState(false);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customFrom, setCustomFrom] = useState(range.from);
  const [customTo, setCustomTo] = useState(range.to);

  const ref = useOutsideClick(open, () => {
    setOpen(false);
    setIsCustomMode(false);
  });

  const activePresetOption = PRESET_OPTIONS.find((o) => o.key === range.activePreset);
  const displayLabel = activePresetOption ? activePresetOption.label : `${range.from} – ${range.to}`;

  const applyCustom = () => {
    if (customFrom && customTo) {
      range.setCustom(customFrom, customTo);
    }
    setOpen(false);
    setIsCustomMode(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-7.5 items-center gap-1.5 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-2.5 text-xs font-semibold text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer shadow-xs"
      >
        <Calendar size={12} className="text-[var(--fg-muted)]" />
        <span className="text-[var(--fg)] font-bold">{displayLabel}</span>
        <ChevronDown size={12} className="opacity-70" />
      </button>

      {open && (
        <div className="absolute top-full right-0 sm:left-0 sm:right-auto mt-1 z-30 flex flex-col gap-1 p-1.5 rounded-[4px] border border-[var(--border)] bg-[var(--card)] shadow-xl min-w-[210px]">
          {!isCustomMode ? (
            <>
              {PRESET_OPTIONS.map((opt) => {
                const active = range.activePreset === opt.key;
                return (
                  <button
                    key={String(opt.key)}
                    type="button"
                    onClick={() => {
                      range.setPreset(opt.key as PresetKey);
                      setOpen(false);
                    }}
                    className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-[3px] text-xs font-semibold text-left transition cursor-pointer ${
                      active
                        ? 'bg-[var(--fg)] text-[var(--bg)] font-bold'
                        : 'text-[var(--fg)] hover:bg-[var(--bg-subtle)]'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {active && <Check size={13} />}
                  </button>
                );
              })}

              <div className="border-t border-[var(--border-soft)] my-1"></div>

              <button
                type="button"
                onClick={() => {
                  setCustomFrom(range.from);
                  setCustomTo(range.to);
                  setIsCustomMode(true);
                }}
                className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-[3px] text-xs font-semibold text-left transition cursor-pointer ${
                  range.activePreset === null
                    ? 'bg-[var(--bg-subtle)] text-[var(--fg)] font-bold'
                    : 'text-[var(--fg)] hover:bg-[var(--bg-subtle)]'
                }`}
              >
                <span>Özel Tarih Aralığı...</span>
                {range.activePreset === null && <Check size={13} />}
              </button>
            </>
          ) : (
            <div className="p-2 flex flex-col gap-2.5 w-60">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[var(--fg)]">Özel Tarih Aralığı</span>
                <button
                  type="button"
                  onClick={() => setIsCustomMode(false)}
                  className="text-[10.5px] text-[var(--fg-muted)] hover:text-[var(--fg)] underline"
                >
                  Geri
                </button>
              </div>
              <div className="space-y-1.5">
                <div>
                  <span className="text-[10px] font-semibold text-[var(--fg-muted)] uppercase">Başlangıç</span>
                  <input
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="h-7.5 w-full rounded-[3px] border border-[var(--border)] bg-[var(--bg)] px-2 text-xs text-[var(--fg)] outline-none font-mono"
                  />
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-[var(--fg-muted)] uppercase">Bitiş</span>
                  <input
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="h-7.5 w-full rounded-[3px] border border-[var(--border)] bg-[var(--bg)] px-2 text-xs text-[var(--fg)] outline-none font-mono"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-[var(--border-soft)]">
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomMode(false);
                    setOpen(false);
                  }}
                  className="px-2.5 py-1 text-xs text-[var(--fg-muted)] hover:text-[var(--fg)] cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={applyCustom}
                  className="px-3 py-1 text-xs font-bold rounded-[3px] bg-[var(--fg)] text-[var(--bg)] shadow-xs hover:opacity-90 transition cursor-pointer"
                >
                  Uygula
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
