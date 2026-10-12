'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useI18n } from '../../lib/i18n';
import { localDateStr, type DatePreset } from '../../utils/date';
import type { TranslationKey } from '../../lib/translations/tr';

const PRESET_OPTIONS: { value: DatePreset; labelKey: TranslationKey }[] = [
  { value: 'today', labelKey: 'filter_today' },
  { value: 'yesterday', labelKey: 'filter_yesterday' },
  { value: 'week', labelKey: 'filter_week' },
  { value: 'month', labelKey: 'filter_month' },
  { value: 'lastMonth', labelKey: 'filter_last_month' },
  { value: '30days', labelKey: 'filter_30days' },
  { value: '3month', labelKey: 'filter_3month' },
  { value: '6month', labelKey: 'filter_6month' },
  { value: '9month', labelKey: 'filter_9month' },
  { value: 'year', labelKey: 'filter_year' },
  { value: '365days', labelKey: 'filter_365days' },
  { value: 'all', labelKey: 'filter_all' },
  { value: 'custom', labelKey: 'filter_custom' },
];

interface DateRangePickerProps {
  value: DatePreset;
  onChange: (preset: DatePreset) => void;
  customFrom: string;
  customTo: string;
  onCustomChange: (from: string, to: string) => void;
  includeAll?: boolean;
  className?: string;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function buildMonthGrid(monthStart: Date): (Date | null)[][] {
  const year = monthStart.getFullYear();
  const month = monthStart.getMonth();
  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7; // Pazartesi=0
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export function DateRangePicker({ value, onChange, customFrom, customTo, onCustomChange, includeAll = false, className }: DateRangePickerProps) {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState(false);
  const [showCalendar, setShowCalendar] = useState(value === 'custom');
  const [draftFrom, setDraftFrom] = useState(customFrom);
  const [draftTo, setDraftTo] = useState(customTo);
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(customTo ? new Date(customTo) : new Date()));
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    const checkMobile = () => setIsMobile(window.innerWidth <= 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Panel document.body'ye PORTALLANIYOR: tetikleyici düğme, yatay kaydırılan bir filtre
  // çubuğu içinde olabiliyor (bkz. ErpisQueryFilterBar). `overflow-x: auto` tek eksende
  // yazılsa bile tarayıcı diğer ekseni de `auto` sayıyor — position:absolute panel, satırın
  // 40px'lik yüksekliğinin dışına DOM'da var ama ekranda hiç görünmeden kırpılıyordu.
  const updateCoords = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({ top: rect.bottom + 4, left: rect.left });
    }
  }, []);

  useLayoutEffect(() => {
    if (open) updateCoords();
  }, [open, updateCoords]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (
        rootRef.current && !rootRef.current.contains(target)
        && popupRef.current && !popupRef.current.contains(target)
      ) setOpen(false);
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      // "İşlendi" işareti: içeren kabuk (ör. sunum modu) aynı tuşla kendini kapatmasın.
      e.preventDefault();
      setOpen(false);
    }
    function handleScrollOrResize() {
      updateCoords();
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
  }, [open, updateCoords]);

  const options = includeAll ? PRESET_OPTIONS : PRESET_OPTIONS.filter((o) => o.value !== 'all');
  const dateFmt = new Intl.DateTimeFormat(lang === 'tr' ? 'tr-TR' : 'en-US', { day: '2-digit', month: 'short' });

  const triggerLabel =
    value === 'custom' && customFrom && customTo
      ? `${dateFmt.format(new Date(customFrom))} – ${dateFmt.format(new Date(customTo))}`
      : t(options.find((o) => o.value === value)?.labelKey ?? 'filter_custom');

  function openPicker() {
    if (!open) {
      setDraftFrom(customFrom);
      setDraftTo(customTo);
      setShowCalendar(value === 'custom');
      setViewMonth(startOfMonth(customTo ? new Date(customTo) : new Date()));
    }
    setOpen((o) => !o);
  }

  function selectPreset(preset: DatePreset) {
    if (preset === 'custom') {
      setShowCalendar(true);
      return;
    }
    onChange(preset);
    setOpen(false);
  }

  function handleDayClick(day: Date) {
    const str = localDateStr(day);
    if (!draftFrom || (draftFrom && draftTo)) {
      setDraftFrom(str);
      setDraftTo('');
    } else if (str < draftFrom) {
      setDraftTo(draftFrom);
      setDraftFrom(str);
    } else {
      setDraftTo(str);
    }
  }

  function applyCustomRange() {
    if (!draftFrom || !draftTo) return;
    onCustomChange(draftFrom, draftTo);
    setOpen(false);
  }

  const grid = buildMonthGrid(viewMonth);
  const weekdayLabels = Array.from({ length: 7 }, (_, i) => {
    const ref = new Date(2024, 0, 1 + i);
    return new Intl.DateTimeFormat(lang === 'tr' ? 'tr-TR' : 'en-US', { weekday: 'short' }).format(ref);
  });
  const monthLabel = new Intl.DateTimeFormat(lang === 'tr' ? 'tr-TR' : 'en-US', { month: 'long', year: 'numeric' }).format(viewMonth);
  const todayStr = localDateStr();

  const isFull = className?.includes('w-full');

  return (
    <div ref={rootRef} className={`relative ${className || ''}`} style={{ position: 'relative' }}>
      <button
        ref={triggerRef}
        type="button"
        className={`dropdown-trigger ${isFull ? 'w-full justify-between' : ''}`}
        data-open={open}
        onClick={openPicker}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className={`dropdown-trigger-value ${isFull ? 'flex-1 text-left' : ''}`}>{triggerLabel}</span>
        <ChevronDown size={12} className="dropdown-trigger-chevron shrink-0" style={{ transform: open ? 'rotate(180deg)' : undefined }} />
      </button>

      {open && mounted && (isMobile || coords) && createPortal(
        <>
          <button
            type="button"
            className="date-popover-backdrop"
            aria-label={t('date_range_cancel')}
            onClick={() => setOpen(false)}
          />
          <div
            ref={popupRef}
            className="date-popover animate-fade-in"
            role="dialog"
            aria-modal="true"
            style={isMobile ? undefined : { top: coords?.top ?? 0, left: coords?.left ?? 0 }}
          >
            <div className="date-popover-sidebar">
              {options.map((o) => {
                const active = o.value === 'custom' ? showCalendar : (!showCalendar && o.value === value);
                return (
                  <button
                    key={o.value}
                    type="button"
                    data-active={active}
                    className="date-popover-option"
                    onClick={() => selectPreset(o.value)}
                  >
                    <span>{t(o.labelKey)}</span>
                    {active && <Check size={13} />}
                  </button>
                );
              })}
            </div>

            {showCalendar && (
              <div className="date-popover-calendar">
                <div className="date-popover-cal-header">
                  <button type="button" className="date-popover-cal-nav" onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}>
                    <ChevronLeft size={14} />
                  </button>
                  <span>{monthLabel}</span>
                  <button type="button" className="date-popover-cal-nav" onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}>
                    <ChevronRight size={14} />
                  </button>
                </div>

                <div className="date-popover-weekdays">
                  {weekdayLabels.map((w) => <span key={w}>{w}</span>)}
                </div>

                <div className="date-popover-grid">
                  {grid.flatMap((week, wi) => week.map((day, di) => {
                    if (!day) return <span key={`${wi}-${di}`} />;
                    const str = localDateStr(day);
                    const isStart = str === draftFrom;
                    const isEnd = str === draftTo;
                    const inRange = !!draftFrom && !!draftTo && str > draftFrom && str < draftTo;
                    return (
                      <button
                        key={str}
                        type="button"
                        className="date-popover-day"
                        data-endpoint={isStart || isEnd || undefined}
                        data-in-range={inRange || undefined}
                        data-today={str === todayStr || undefined}
                        onClick={() => handleDayClick(day)}
                      >
                        {day.getDate()}
                      </button>
                    );
                  }))}
                </div>

                <div className="date-popover-footer">
                  <span className="date-popover-range-text">
                    {draftFrom ? dateFmt.format(new Date(draftFrom)) : '—'} — {draftTo ? dateFmt.format(new Date(draftTo)) : '—'}
                  </span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" className="date-popover-btn" onClick={() => setOpen(false)}>{t('date_range_cancel')}</button>
                    <button type="button" className="date-popover-btn date-popover-btn-primary" disabled={!draftFrom || !draftTo} onClick={applyCustomRange}>
                      {t('date_range_apply')}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>,
        document.body,
      )}

      <style>{`
        /* Modül ekranları (Erpis, sunum modu) z-index 20000'lik tam ekran katman; body'ye
           portallanan panel onların ÜSTÜNDE olmalı, yoksa açılır ama arkada kalır. */
        .date-popover {
          position: fixed;
          z-index: 99999;
          display: flex;
          background: var(--card);
          border: 1px solid var(--border-soft);
          border-radius: 6px;
          box-shadow: var(--shadow-lg);
          overflow: hidden;
        }

        .date-popover-backdrop { display: none; }

        .date-popover-sidebar {
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding: 6px;
          min-width: 140px;
          border-right: 1px solid var(--border-soft);
        }

        .date-popover-option {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          padding: 6px 10px;
          border: none;
          border-radius: 4px;
          background: transparent;
          color: var(--fg);
          font-size: 12px;
          font-weight: 500;
          font-family: inherit;
          text-align: left;
          white-space: nowrap;
          cursor: pointer;
          transition: background 0.12s ease;
        }

        .date-popover-option:hover { background: var(--card-hover); }
        .date-popover-option[data-active="true"] { background: var(--bg-subtle); color: var(--fg); font-weight: 700; }

        .date-popover-calendar {
          display: flex;
          flex-direction: column;
          padding: 12px 14px;
          width: 270px;
        }

        .date-popover-cal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 12px;
          font-weight: 700;
          color: var(--fg);
          margin-bottom: 8px;
          text-transform: capitalize;
        }

        .date-popover-cal-nav {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          border: none;
          border-radius: 4px;
          background: transparent;
          color: var(--fg-muted);
          cursor: pointer;
        }
        .date-popover-cal-nav:hover { background: var(--card-hover); color: var(--fg); }

        .date-popover-weekdays, .date-popover-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
        }

        .date-popover-weekdays span {
          text-align: center;
          font-size: 10px;
          font-weight: 700;
          color: var(--fg-muted);
          text-transform: uppercase;
          padding-bottom: 4px;
        }

        .date-popover-day {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 28px;
          border: none;
          border-radius: 4px;
          background: transparent;
          color: var(--fg);
          font-size: 11.5px;
          font-weight: 500;
          font-family: inherit;
          cursor: pointer;
        }

        .date-popover-day:hover { background: var(--card-hover); }
        .date-popover-day[data-today="true"] { font-weight: 800; border-bottom: 2px solid var(--fg); }
        .date-popover-day[data-in-range="true"] { background: var(--bg-subtle); border-radius: 0; }
        .date-popover-day[data-endpoint="true"] { background: var(--fg); color: var(--card); font-weight: 700; }

        .date-popover-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px solid var(--border-soft);
        }

        .date-popover-range-text {
          font-size: 11px;
          font-weight: 600;
          color: var(--fg-muted);
          white-space: nowrap;
        }

        .date-popover-btn {
          height: 28px;
          padding: 0 12px;
          border: 1px solid var(--border-soft);
          border-radius: 4px;
          background: transparent;
          color: var(--fg);
          font-size: 11.5px;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
        }

        .date-popover-btn-primary {
          border-color: transparent;
          background: var(--fg);
          color: var(--card);
        }
        .date-popover-btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        @media (max-width: 640px) {
          .date-popover-backdrop {
            display: block;
            position: fixed;
            inset: 0;
            z-index: 99998;
            border: none;
            background: rgba(15, 23, 42, 0.48);
            backdrop-filter: blur(3px);
          }

          .date-popover {
            position: fixed;
            top: auto;
            bottom: 0;
            left: 0;
            right: 0;
            z-index: 99999;
            width: 100%;
            max-height: calc(100dvh - 12px);
            flex-direction: column;
            overflow-y: auto;
            overscroll-behavior: contain;
            border-radius: 12px 12px 0 0;
            border-bottom: none;
            padding-bottom: env(safe-area-inset-bottom);
            box-shadow: 0 -18px 50px rgba(15, 23, 42, 0.24);
          }

          .date-popover::before {
            content: '';
            width: 36px;
            height: 4px;
            margin: 8px auto 2px;
            flex: 0 0 auto;
            border-radius: 999px;
            background: var(--border);
          }

          .date-popover-sidebar {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            border-right: none;
            border-bottom: 1px solid var(--border);
            min-width: 0;
            padding: 8px 12px 12px;
            gap: 3px 8px;
          }

          .date-popover-option {
            min-width: 0;
            min-height: 40px;
            padding: 9px 10px;
          }

          .date-popover-calendar {
            width: 100%;
            box-sizing: border-box;
            padding: 12px 16px 14px;
          }

          .date-popover-footer {
            align-items: center;
            flex-direction: row;
          }

          .date-popover-footer > div {
            justify-content: flex-end;
          }

          .date-popover-btn {
            min-height: 36px;
          }
        }
      `}</style>
    </div>
  );
}
