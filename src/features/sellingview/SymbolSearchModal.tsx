'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X, Layers, Store, Globe, Tag, Check, TrendingUp } from 'lucide-react';
import type { ForecastSeries } from '../../types/forecast';
import { TRY } from '../../components/analytics/terminal/format';

interface Props {
  open: boolean;
  onClose: () => void;
  series: ForecastSeries[];
  selectedKey: string;
  onSelect: (key: string) => void;
}

export function SymbolSearchModal({ open, onClose, series, selectedKey, onSelect }: Props) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return series;
    return series.filter(
      (s) =>
        s.displayName.toLowerCase().includes(q) ||
        s.key.toLowerCase().includes(q) ||
        (s.dimension && s.dimension.toLowerCase().includes(q)),
    );
  }, [series, query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // Klavyeyle listede gezinme
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((prev) => (prev + 1 < filtered.length ? prev + 1 : prev));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const item = filtered[activeIndex];
        if (item) {
          onSelect(item.key);
          onClose();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, filtered, activeIndex, onSelect, onClose]);

  // Aktif öğeyi görünür alana kaydır
  useEffect(() => {
    if (!listRef.current) return;
    const activeEl = listRef.current.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`);
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  if (!open) return null;

  function getBadge(s: ForecastSeries) {
    if (s.level === 0) {
      return { icon: Layers, label: 'Genel Toplam', color: 'text-fg bg-bg-subtle' };
    }
    if (s.level === 1) {
      return { icon: Store, label: 'Mağaza', color: 'text-warning bg-warning-soft' };
    }
    if (s.dimension === 'platform') {
      return { icon: Globe, label: 'Kanal', color: 'text-info bg-info-soft' };
    }
    return { icon: Tag, label: 'Kategori', color: 'text-fg-muted bg-bg-subtle' };
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/55 backdrop-blur-xs p-4 animate-in fade-in duration-100">
      <div
        className="w-full max-w-[560px] rounded-[8px] border border-border-soft bg-card shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Üst arama çubuğu */}
        <div className="flex items-center gap-2.5 px-3.5 py-3 border-b border-border-soft bg-bg-subtle">
          <Search size={16} className="text-fg-subtle shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Sembol veya seri ara (örn: StoreA, Trendyol, Kılıf)..."
            className="w-full bg-transparent text-ui-md text-fg placeholder:text-fg-subtle outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="text-fg-subtle hover:text-fg p-0.5 rounded cursor-pointer"
            >
              <X size={14} />
            </button>
          )}
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-ui-2xs font-semibold text-fg-subtle border border-border-soft rounded bg-card">
            ESC
          </kbd>
        </div>

        {/* Sonuç Listesi */}
        <div ref={listRef} className="max-h-[360px] overflow-y-auto p-1.5 flex flex-col gap-0.5">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-ui-sm text-fg-subtle">
              &quot;{query}&quot; ile eşleşen bir sembol bulunamadı.
            </div>
          ) : (
            filtered.map((s, idx) => {
              const badge = getBadge(s);
              const Icon = badge.icon;
              const isSelected = s.key === selectedKey;
              const isActive = idx === activeIndex;
              const next30 = s.forecast.reduce((acc, p) => acc + p.revenue, 0);

              return (
                <button
                  key={s.key}
                  type="button"
                  data-index={idx}
                  onClick={() => {
                    onSelect(s.key);
                    onClose();
                  }}
                  onMouseEnter={() => setActiveIndex(idx)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-[5px] text-left transition-colors cursor-pointer ${
                    isActive ? 'bg-bg-subtle text-fg' : 'text-fg-muted hover:bg-bg-subtle/60'
                  }`}
                >
                  <span
                    className={`flex items-center gap-1 text-ui-2xs font-bold px-1.5 py-0.5 rounded-[3px] shrink-0 ${badge.color}`}
                  >
                    <Icon size={11} />
                    {badge.label}
                  </span>

                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-ui-sm font-bold text-fg truncate">{s.displayName}</span>
                      {isSelected && (
                        <span className="text-ui-2xs font-semibold text-success flex items-center gap-0.5">
                          <Check size={11} /> Seçili
                        </span>
                      )}
                    </div>
                    <span className="text-ui-2xs text-fg-subtle truncate">{s.key}</span>
                  </div>

                  {next30 > 0 && (
                    <div className="flex flex-col items-end shrink-0 pl-2">
                      <span className="text-ui-xs font-bold tabular-nums text-fg">
                        {TRY.format(next30)}
                      </span>
                      <span className="text-ui-2xs text-fg-subtle flex items-center gap-0.5">
                        <TrendingUp size={10} /> 30g tahmin
                      </span>
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Alt ipucu çubuğu */}
        <div className="flex items-center justify-between px-3 py-2 border-t border-border-soft bg-bg-subtle text-ui-xs text-fg-subtle">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1 py-0.5 border border-border-soft rounded bg-card text-ui-2xs">↑</kbd>{' '}
              <kbd className="px-1 py-0.5 border border-border-soft rounded bg-card text-ui-2xs">↓</kbd> Gezin
            </span>
            <span>
              <kbd className="px-1 py-0.5 border border-border-soft rounded bg-card text-ui-2xs">Enter</kbd> Seç
            </span>
          </div>
          <span>{filtered.length} sembol</span>
        </div>
      </div>
    </div>
  );
}
