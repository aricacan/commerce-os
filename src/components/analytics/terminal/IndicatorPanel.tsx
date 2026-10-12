'use client';

import { useMemo, useState } from 'react';
import { LineChart, Search, X } from 'lucide-react';
import type { IndicatorValue } from '../../../types/forecast';
import { STATUS_CLASS } from './format';

const GROUP_LABEL: Record<string, string> = {
  A: 'Talep & Momentum',
  B: 'Fiyat & Elastikiyet',
  C: 'Kârlılık',
  D: 'Stok & Tedarik',
  E: 'Kanal & Portföy Riski',
  F: 'Model Sağlığı',
  G: 'Reklam',
  H: 'Rakip Fiyatı',
};

const GROUP_ORDER = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'] as const;

type StatusFilter = 'all' | 'attention' | 'unmeasured';

interface Props {
  indicators: IndicatorValue[];
  /** Grafiğe pane olarak eklenebilen gösterge kodları. */
  chartableCodes?: string[];
  /** Şu an grafikte açık olan gösterge kodları. */
  activeCodes?: string[];
  onToggleChart?: (code: string) => void;
}

export function IndicatorPanel({
  indicators,
  chartableCodes = [],
  activeCodes = [],
  onToggleChart,
}: Props) {
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Grup sayıları
  const groupCounts = useMemo(() => {
    const counts: Record<string, number> = { all: indicators.length };
    GROUP_ORDER.forEach((g) => {
      counts[g] = indicators.filter((i) => i.group === g).length;
    });
    return counts;
  }, [indicators]);

  // Durum sayıları
  const statusCounts = useMemo(
    () => ({
      all: indicators.length,
      attention: indicators.filter((i) => i.status === 'warn' || i.status === 'bad').length,
      unmeasured: indicators.filter((i) => i.value === null).length,
    }),
    [indicators],
  );

  // Filtreleme mantığı
  const filtered = useMemo(() => {
    return indicators.filter((i) => {
      // 1. Grup filtresi
      if (selectedGroup !== 'all' && i.group !== selectedGroup) return false;

      // 2. Durum filtresi
      if (statusFilter === 'attention' && i.status !== 'warn' && i.status !== 'bad') return false;
      if (statusFilter === 'unmeasured' && i.value !== null) return false;

      // 3. Arama sorgusu
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchLabel = i.label.toLowerCase().includes(q);
        const matchCode = i.code.toLowerCase().includes(q);
        const matchText = (i.text ?? '').toLowerCase().includes(q);
        if (!matchLabel && !matchCode && !matchText) return false;
      }

      return true;
    });
  }, [indicators, selectedGroup, statusFilter, searchQuery]);

  if (indicators.length === 0) {
    return (
      <div className="p-8 text-center text-[12px] text-fg-subtle">
        Gösterge hesaplanmadı — henüz bir tahmin koşusu bekleniyor.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* ── ÜST KONTROL ŞERİDİ ── */}
      <div className="flex flex-col gap-2 p-2.5 border-b border-border-soft bg-bg-subtle/40 shrink-0">
        {/* Satır 1: Grup Seçici Sekmeler (Horizontal Pills) */}
        <div className="flex items-center gap-1 overflow-x-auto terminal-scroll pb-0.5">
          <button
            type="button"
            onClick={() => setSelectedGroup('all')}
            className={`px-2.5 py-1 text-[11px] font-bold rounded-[5px] transition-colors whitespace-nowrap cursor-pointer ${
              selectedGroup === 'all'
                ? 'bg-fg text-bg'
                : 'text-fg-muted hover:bg-bg-subtle hover:text-fg'
            }`}
          >
            Tümü ({groupCounts.all})
          </button>

          {GROUP_ORDER.map((g) => {
            const count = groupCounts[g] ?? 0;
            if (count === 0) return null;
            const isSelected = selectedGroup === g;
            return (
              <button
                key={g}
                type="button"
                onClick={() => setSelectedGroup(g)}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-[5px] transition-colors whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? 'bg-fg text-bg'
                    : 'text-fg-muted hover:bg-bg-subtle hover:text-fg'
                }`}
              >
                {g} · {GROUP_LABEL[g]}
                <span className={`ml-1 text-[9.5px] tabular-nums ${isSelected ? 'opacity-80' : 'text-fg-subtle'}`}>
                  ({count})
                </span>
              </button>
            );
          })}
        </div>

        {/* Satır 2: Hızlı Durum Filtreleri + Arama Kutusu */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-2 py-0.5 text-[10.5px] font-medium rounded-[4px] border transition-colors cursor-pointer ${
                statusFilter === 'all'
                  ? 'border-fg text-fg bg-bg-subtle'
                  : 'border-border-soft text-fg-muted hover:bg-card'
              }`}
            >
              Tüm Durumlar
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('attention')}
              className={`px-2 py-0.5 text-[10.5px] font-semibold rounded-[4px] border transition-colors cursor-pointer ${
                statusFilter === 'attention'
                  ? 'border-danger text-danger bg-danger-soft'
                  : 'border-border-soft text-fg-muted hover:bg-card'
              }`}
            >
              ⚠️ Dikkat Gerektirenler ({statusCounts.attention})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('unmeasured')}
              className={`px-2 py-0.5 text-[10.5px] font-medium rounded-[4px] border transition-colors cursor-pointer ${
                statusFilter === 'unmeasured'
                  ? 'border-warning text-warning bg-warning-soft'
                  : 'border-border-soft text-fg-muted hover:bg-card'
              }`}
            >
              Ölçülemeyenler ({statusCounts.unmeasured})
            </button>
          </div>

          {/* Hızlı Arama */}
          <div className="relative flex items-center min-w-[190px]">
            <Search size={12} className="absolute left-2.5 text-fg-subtle" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Göstergelerde ara..."
              className="w-full h-7 pl-7 pr-7 text-[11px] rounded-[5px] border border-border-soft bg-card text-fg placeholder:text-fg-subtle outline-none focus:border-fg"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 text-fg-subtle hover:text-fg cursor-pointer"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── GÖSTERGE KARTLARI LİSTESİ ── */}
      <div className="p-3">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-[11.5px] text-fg-subtle">
            Seçili kriterlere uygun gösterge bulunamadı.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2.5">
            {filtered.map((i) => {
              const chartable = chartableCodes.includes(i.code);
              const active = activeCodes.includes(i.code);

              return (
                <div
                  key={i.code}
                  className={`flex flex-col justify-between p-2.5 rounded-[6px] border transition-all ${
                    active
                      ? 'border-fg bg-bg-subtle/80 shadow-xs'
                      : 'border-border-soft bg-card hover:border-border hover:bg-card-hover'
                  }`}
                >
                  <div>
                    {/* Kart Başlığı & Grup */}
                    <div className="flex items-center justify-between gap-1.5 mb-1.5">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-fg-subtle truncate">
                        {i.group} · {GROUP_LABEL[i.group] ?? i.group}
                      </span>
                      <span
                        className={`text-[9.5px] font-bold px-1.5 py-0.2 rounded-[3px] shrink-0 tabular-nums ${STATUS_CLASS[i.status]}`}
                      >
                        {i.status === 'ok' ? 'Normal' : i.status === 'warn' ? 'Uyarı' : i.status === 'bad' ? 'Kritik' : 'Ölçülemedi'}
                      </span>
                    </div>

                    {/* Gösterge Adı & Değer */}
                    <div className="flex items-baseline justify-between gap-2 mt-1">
                      <span className="text-[12px] font-bold text-fg truncate" title={i.label}>
                        {i.label}
                      </span>
                      <span className="text-base font-extrabold text-fg tabular-nums shrink-0">
                        {i.value === null ? '—' : i.value.toFixed(2)}
                      </span>
                    </div>

                    {/* Açıklama Metni */}
                    {i.text && (
                      <p className="text-[10px] leading-tight text-fg-muted mt-1 m-0 line-clamp-2" title={i.text}>
                        {i.text}
                      </p>
                    )}
                  </div>

                  {/* Grafiğe Ekle Butonu */}
                  {chartable && onToggleChart && (
                    <div className="pt-2 mt-2 border-t border-border-soft">
                      <button
                        type="button"
                        onClick={() => onToggleChart(i.code)}
                        className={`flex items-center justify-center gap-1.5 w-full py-1 text-[10px] font-semibold rounded-[4px] border transition-colors cursor-pointer ${
                          active
                            ? 'bg-fg text-bg border-fg'
                            : 'border-border-soft text-fg-muted hover:bg-bg-subtle hover:text-fg'
                        }`}
                      >
                        <LineChart size={11} />
                        <span>{active ? 'Grafikten Kaldır' : 'Grafiğe Ekle'}</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
