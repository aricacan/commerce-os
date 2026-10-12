'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import type { TranslationKey } from '../../lib/translations/tr';

export interface CustomSelectOption<T extends string | number> {
  value: T;
  label: string;
  color?: string;
}

export function CustomSelect<T extends string | number>({
  value,
  onChange,
  options,
  placeholder = 'Seçiniz',
  disabled = false,
  icon,
}: {
  value: T | '';
  onChange: (v: T) => void;
  options: CustomSelectOption<T>[];
  placeholder?: string;
  disabled?: boolean;
  icon?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const selectedOpt = options.find((o) => o.value === value);

  return (
    <div ref={rootRef} style={{ position: 'relative', width: '100%', opacity: disabled ? 0.6 : 1 }}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          height: 36, padding: '0 11px', width: '100%',
          background: 'var(--card)', border: '1px solid var(--border-soft)',
          borderRadius: 'var(--radius-sm)', cursor: disabled ? 'not-allowed' : 'pointer',
          fontSize: 12, fontWeight: 600, color: selectedOpt ? 'var(--fg)' : 'var(--fg-muted)',
          outline: 'none', transition: 'all 0.15s ease', boxShadow: 'var(--shadow-xs)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden', whiteSpace: 'nowrap' }}>
          {icon}
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {selectedOpt ? selectedOpt.label : placeholder}
          </span>
        </div>
        <ChevronDown size={11} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease', color: 'var(--fg-muted)', flexShrink: 0 }} />
      </button>

      {open && !disabled && (
        <div
          style={{
            position: 'absolute', left: 0, right: 0, top: 'calc(100% + 4px)',
            maxHeight: 220, overflowY: 'auto', background: 'var(--card)',
            border: '1px solid var(--border-soft)', borderRadius: 'var(--radius-sm)',
            boxShadow: 'var(--shadow-lg)', zIndex: 100, padding: 4,
            display: 'flex', flexDirection: 'column', gap: 2,
          }}
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={String(opt.value)}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  width: '100%', padding: '6px 8px', borderRadius: 'var(--radius-sm)',
                  border: 'none', background: isSelected ? 'var(--accent-soft)' : 'transparent',
                  color: isSelected ? 'var(--accent)' : 'var(--fg)', fontSize: 12,
                  fontWeight: isSelected ? 700 : 500, cursor: 'pointer', textAlign: 'left',
                  transition: 'background 0.12s ease',
                }}
              >
                <span style={{ color: opt.color }}>{opt.label}</span>
                {isSelected && <Check size={12} style={{ color: 'var(--accent)' }} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const CHART_TYPES = [
  {
    id: 'bar',
    preview: (c: string) => (
      <svg viewBox="0 0 48 32" fill="none">
        {[28, 20, 34, 16, 24].map((h, i) => (
          <rect key={i} x={3 + i * 9} y={32 - h} width={6} height={h} rx="1" fill={c} opacity={0.7 + i * 0.06} />
        ))}
      </svg>
    ),
  },
  {
    id: 'horizontal-bar',
    preview: (c: string) => (
      <svg viewBox="0 0 48 32" fill="none">
        {[32, 22, 38, 14, 26].map((w, i) => (
          <rect key={i} x={0} y={2 + i * 6} width={w} height={4} rx="1" fill={c} opacity={0.65 + i * 0.07} />
        ))}
      </svg>
    ),
  },
  {
    id: 'line',
    preview: (c: string) => (
      <svg viewBox="0 0 48 32" fill="none">
        <polyline points="4,24 13,16 22,20 31,8 40,14 47,6" stroke={c} strokeWidth="2" fill="none" strokeLinejoin="round" />
        {[4, 13, 22, 31, 40, 47].map((x, i) => {
          const ys = [24, 16, 20, 8, 14, 6];
          return <circle key={i} cx={x} cy={ys[i]} r="2" fill={c} />;
        })}
      </svg>
    ),
  },
  {
    id: 'stepped-line',
    preview: (c: string) => (
      <svg viewBox="0 0 48 32" fill="none">
        <path d="M4,24 L14,24 L14,16 L24,16 L24,20 L34,20 L34,8 L44,8" stroke={c} strokeWidth="2" fill="none" />
      </svg>
    ),
  },
  {
    id: 'area',
    preview: (c: string) => (
      <svg viewBox="0 0 48 32" fill="none">
        <defs>
          <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={c} stopOpacity="0.3" />
            <stop offset="100%" stopColor={c} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d="M4,24 13,16 22,20 31,8 40,14 47,6 47,32 4,32Z" fill="url(#pg)" />
        <polyline points="4,24 13,16 22,20 31,8 40,14 47,6" stroke={c} strokeWidth="2" fill="none" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'composed',
    preview: (c: string) => (
      <svg viewBox="0 0 48 32" fill="none">
        <rect x="4" y="16" width="6" height="16" fill={c} opacity="0.4" />
        <rect x="18" y="10" width="6" height="22" fill={c} opacity="0.4" />
        <rect x="32" y="14" width="6" height="18" fill={c} opacity="0.4" />
        <polyline points="4,12 16,6 28,14 40,8" stroke="#8b5cf6" strokeWidth="2" fill="none" />
      </svg>
    ),
  },
  {
    id: 'pie',
    preview: (_c: string) => (
      <svg viewBox="0 0 48 32" fill="none">
        <circle cx="24" cy="16" r="12" fill="#fee2e2" />
        <path d="M24,16 L24,4 A12,12 0 0,1 35.2,22 Z" fill="#ef4444" />
        <path d="M24,16 L35.2,22 A12,12 0 0,1 13.8,23 Z" fill="#f97316" />
        <path d="M24,16 L13.8,23 A12,12 0 0,1 24,4 Z" fill="#3b82f6" />
      </svg>
    ),
  },
  {
    id: 'donut',
    preview: (_c: string) => (
      <svg viewBox="0 0 48 32" fill="none">
        <circle cx="24" cy="16" r="12" fill="none" stroke="#fee2e2" strokeWidth="7" />
        <circle cx="24" cy="16" r="12" fill="none" stroke="#ef4444" strokeWidth="7" strokeDasharray="20 56" strokeLinecap="round" />
        <circle cx="24" cy="16" r="12" fill="none" stroke="#f97316" strokeWidth="7" strokeDasharray="14 62" strokeDashoffset="-20" strokeLinecap="round" />
        <circle cx="24" cy="16" r="12" fill="none" stroke="#3b82f6" strokeWidth="7" strokeDasharray="22 54" strokeDashoffset="-34" strokeLinecap="round" />
        <circle cx="24" cy="16" r="5" fill="var(--card, #fff)" />
      </svg>
    ),
  },
  {
    id: 'radial',
    preview: (c: string) => (
      <svg viewBox="0 0 48 32" fill="none">
        <circle cx="24" cy="24" r="20" fill="none" stroke={c + '20'} strokeWidth="4" />
        <circle cx="24" cy="24" r="20" fill="none" stroke={c} strokeWidth="4" strokeDasharray="62 64" strokeLinecap="round" />
        <circle cx="24" cy="24" r="13" fill="none" stroke={c + '50'} strokeWidth="4" strokeDasharray="40 42" strokeLinecap="round" />
        <circle cx="24" cy="24" r="6"  fill="none" stroke={c + '80'} strokeWidth="4" strokeDasharray="18 20" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'radar',
    preview: (c: string) => (
      <svg viewBox="0 0 48 32" fill="none">
        <polygon points="24,4 38,14 32,28 16,28 10,14" stroke="var(--fg-subtle)" strokeWidth="1" fill="none" />
        <polygon points="24,8 34,16 30,24 18,24 14,16" stroke={c} strokeWidth="1.5" fill={c} fillOpacity="0.3" />
      </svg>
    ),
  },
  {
    id: 'scatter',
    preview: (c: string) => (
      <svg viewBox="0 0 48 32" fill="none">
        <circle cx="10" cy="20" r="2.5" fill={c} />
        <circle cx="20" cy="10" r="2.5" fill={c} />
        <circle cx="30" cy="25" r="2.5" fill={c} />
        <circle cx="38" cy="15" r="2.5" fill={c} />
        <circle cx="15" cy="8" r="2.5" fill={c} />
      </svg>
    ),
  },
] as const;

export const CHART_TYPE_LABEL_KEYS: Record<string, TranslationKey> = {
  'bar': 'customize_chart_bar',
  'horizontal-bar': 'customize_chart_horizontal_bar',
  'line': 'customize_chart_line',
  'stepped-line': 'customize_chart_stepped_line',
  'area': 'customize_chart_area',
  'composed': 'customize_chart_composed',
  'pie': 'customize_chart_pie',
  'donut': 'customize_chart_donut',
  'radial': 'customize_chart_radial',
  'radar': 'customize_chart_radar',
  'scatter': 'customize_chart_scatter',
};

export const THEME_COLORS = [
  { id: '#ef4444', bg: '#fee2e2', palette: ['#ef4444','#f87171','#fca5a5','#fee2e2','#b91c1c','#991b1b'] },
  { id: '#3b82f6', bg: '#dbeafe', palette: ['#3b82f6','#60a5fa','#93c5fd','#dbeafe','#1d4ed8','#1e40af'] },
  { id: '#10b981', bg: '#d1fae5', palette: ['#10b981','#34d399','#6ee7b7','#d1fae5','#047857','#065f46'] },
  { id: '#f59e0b', bg: '#fef3c7', palette: ['#f59e0b','#fbbf24','#fde68a','#fef3c7','#b45309','#92400e'] },
  { id: '#8b5cf6', bg: '#ede9fe', palette: ['#8b5cf6','#a78bfa','#c4b5fd','#ede9fe','#6d28d9','#5b21b6'] },
  { id: '#0ea5e9', bg: '#e0f2fe', palette: ['#0ea5e9','#38bdf8','#7dd3fc','#e0f2fe','#0369a1','#075985'] },
];

export const THEME_COLOR_LABEL_KEYS: Record<string, TranslationKey> = {
  '#ef4444': 'customize_color_red',
  '#3b82f6': 'customize_color_blue',
  '#10b981': 'customize_color_green',
  '#f59e0b': 'customize_color_orange',
  '#8b5cf6': 'customize_color_purple',
  '#0ea5e9': 'customize_color_sky',
};

export const COLOR_FALLBACK = ['#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#8b5cf6','#ec4899','#14b8a6'];


