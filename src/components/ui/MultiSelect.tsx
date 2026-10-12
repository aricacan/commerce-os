'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { text } from '../../features/shared/design';

export interface MultiSelectOption {
  value: number | string;
  label: string;
  color?: string;
}

interface MultiSelectProps {
  label: string;
  options: MultiSelectOption[];
  selected: (number | string)[];
  onChange: (values: (number | string)[]) => void;
  allLabel: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyLabel?: string;
  // Ayarlar panellerindeki native <select> ("customize-select-element") görünümüyle
  // birebir eşleşen dar/kompakt gövde — Özelleştirme sayfalarında diğer dropdown'larla
  // tutarlı olsun diye (bkz. customize/widget, customize/excel).
  compact?: boolean;
  className?: string;
}

// Genel amaçlı çoklu seçim dropdown'ı — Topbar.tsx'teki mağaza seçici desenin
// (custom checkbox satırları + "Tümü" seçeneği) genelleştirilmiş hali. Boş seçim
// dizisi = "Tümü" (store-selector.ts'teki selectedStores ile aynı konvansiyon).
export function MultiSelect({
  label,
  options,
  selected,
  onChange,
  allLabel,
  searchable = false,
  searchPlaceholder,
  emptyLabel = 'Sonuç yok',
  compact = false,
  className = '',
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) setSearch('');
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function handleClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    // Escape ile kapanır ve "işlendi" diye işaretlenir: içeren kabuk (ör. sunum modu) aynı
    // tuşla kendini kapatmasın. Önceden açık listeyi kapatmanın klavye yolu yoktu.
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      setOpen(false);
    }

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const isAll = selected.length === 0;

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.trim().toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, search]);

  const buttonLabel = isAll
    ? `${label}: ${allLabel}`
    : `${label} (${selected.length})`;

  function toggle(value: number | string) {
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
  }

  return (
    <div ref={rootRef} className={`relative ${className} ${open ? 'z-[100]' : 'z-10'}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={compact ? 'customize-select-element' : undefined}
        style={compact ? {
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6,
          textAlign: 'left', color: 'var(--fg)',
        } : {
          display: 'flex', alignItems: 'center', gap: 7,
          height: 36, padding: '0 12px',
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 6,
          cursor: 'pointer', fontSize: text.sm, fontWeight: isAll ? 500 : 600,
          color: 'var(--fg)',
          boxShadow: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        <span style={compact ? { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } : undefined}>{buttonLabel}</span>
        {!compact && <ChevronDown size={12} style={{ opacity: 0.6 }} />}
      </button>

      {open && (
        <div
          className="animate-fade-in"
          style={{
            position: 'absolute', left: 0, top: 'calc(100% + 4px)',
            width: 220, maxHeight: 320, display: 'flex', flexDirection: 'column',
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            boxShadow: 'var(--shadow-lg)',
            zIndex: 200,
            overflow: 'hidden',
          }}
        >
          {searchable && (
            <div style={{ padding: 6, borderBottom: '1px solid var(--border-soft)' }}>
              <div style={{ position: 'relative' }}>
                <Search size={13} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={searchPlaceholder}
                  style={{
                    width: '100%', height: 30, paddingLeft: 26, paddingRight: 8,
                    background: 'var(--bg)', border: '1px solid var(--border-soft)',
                    borderRadius: 'var(--radius-sm)', fontSize: text.sm, color: 'var(--fg)',
                  }}
                />
              </div>
            </div>
          )}

          <div style={{ overflowY: 'auto', padding: 4 }}>
            <button
              type="button"
              onClick={() => { onChange([]); setOpen(false); }}
              className="hover:bg-[var(--bg-subtle)] transition-colors"
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                width: '100%', padding: '8px 10px',
                background: isAll ? 'var(--bg-subtle)' : 'transparent',
                border: 'none', borderRadius: 'var(--radius-sm)',
                cursor: 'pointer', textAlign: 'left',
                fontSize: text.md, fontWeight: isAll ? 700 : 500,
                color: 'var(--fg)',
              }}
            >
              <span style={{
                width: 15, height: 15, borderRadius: 4, flexShrink: 0,
                border: `1.5px solid ${isAll ? 'var(--fg)' : 'var(--border-strong, #94a3b8)'}`,
                background: isAll ? 'var(--fg)' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s ease',
              }}>
                {isAll && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke="var(--card, #fff)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              <span>{allLabel}</span>
            </button>

            <div style={{ height: 1, background: 'var(--border-soft)', margin: '4px 2px' }} />

            {filteredOptions.length === 0 && (
              <div style={{ padding: '10px', fontSize: text.sm, color: 'var(--fg-muted)', textAlign: 'center' }}>
                {emptyLabel}
              </div>
            )}

            {filteredOptions.map((opt) => {
              const checked = selected.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggle(opt.value)}
                  className="hover:bg-[var(--bg-subtle)] transition-colors"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    width: '100%', padding: '8px 10px',
                    background: checked ? 'var(--bg-subtle)' : 'transparent',
                    border: 'none', borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer', textAlign: 'left',
                    fontSize: text.md, fontWeight: checked ? 700 : 500,
                    color: 'var(--fg)',
                  }}
                >
                  <span style={{
                    width: 15, height: 15, borderRadius: 4, flexShrink: 0,
                    border: `1.5px solid ${checked ? (opt.color ?? 'var(--fg)') : 'var(--border-strong, #94a3b8)'}`,
                    background: checked ? (opt.color ?? 'var(--fg)') : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.15s ease',
                  }}>
                    {checked && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4L3.5 6.5L9 1" stroke="var(--card, #fff)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
