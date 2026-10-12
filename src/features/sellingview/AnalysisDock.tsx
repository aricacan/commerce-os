'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { ForecastSeries } from '../../types/forecast';
import { IndicatorPanel } from '../../components/analytics/terminal/IndicatorPanel';
import { EventFeed } from '../../components/analytics/terminal/EventFeed';
import { ModelCard } from '../../components/analytics/terminal/ModelCard';
import { AgentContent } from './AgentPanel';
import { PurchaseAdvisorContent } from './PurchaseAdvisorPanel';
import { ScreenerContent } from './ScreenerPanel';
import { RuleBacktestContent } from './RuleBacktestPanel';
import { DetailOverlay, DetailButton } from './DetailOverlay';

export type DockTab = 'indicators' | 'model' | 'agents' | 'purchase' | 'screener' | 'backtest' | 'events';
export type DockHeightMode = 'compact' | 'normal' | 'expanded';

/**
 * RIHTIM YÜKSEKLİĞİ — ORANSAL, SABİT DEĞİL.
 *
 * ESKİ HATA: rıhtımın içeriği `h-[38vh]` gibi VIEWPORT'a göre sabit bir kutuya
 * konuyor, üstündeki grafik ızgarası ise `flex-1` ile "kalan her şeyi" alıyordu.
 * İki farklı ölçü modeli aynı sınırlı sütunda yarıştığı için rıhtım hiçbir zaman
 * "aşağı gidebildiği kadar" gitmiyordu: üst çubuk + grafik yüksekliğin çoğunu
 * yediğinden 38vh ya alta taşıp kabuğun `overflow:hidden`ı tarafından KIRPILIYOR
 * ya da geniş ekranda erken bitip altta boşluk bırakıyordu. `min-h-[240px]` de
 * kısa ekranlarda taşmayı garantiliyordu.
 *
 * ÇÖZÜM: rıhtım da kardeşi gibi bir flex çocuğudur; S/M/L yalnızca grafik ile
 * rıhtım arasındaki PAYI değiştirir. İkisi kalan yüksekliği her zaman tam olarak
 * paylaşır — ne taşma ne boşluk, her ekran boyunda.
 *
 * Sınıf adları sabit metindir: Tailwind JIT çalışma anında birleştirilen adları
 * göremez, bu yüzden değerler burada tam yazılır.
 */
export const DOCK_SPLIT: Record<DockHeightMode, { main: string; dock: string }> = {
  compact: { main: 'flex-[4_1_0%]', dock: 'flex-[1_1_0%]' },
  normal: { main: 'flex-[3_1_0%]', dock: 'flex-[2_1_0%]' },
  expanded: { main: 'flex-[2_1_0%]', dock: 'flex-[3_1_0%]' },
};

const HEIGHT_BUTTONS: { mode: DockHeightMode; short: string; title: string }[] = [
  { mode: 'compact', short: 'S', title: 'Kompakt — grafiğe öncelik' },
  { mode: 'normal', short: 'M', title: 'Standart — dengeli' },
  { mode: 'expanded', short: 'L', title: 'Geniş — rıhtıma öncelik' },
];

interface Props {
  selected: ForecastSeries | undefined;
  tab: DockTab;
  onTabChange: (tab: DockTab) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chartableCodes: string[];
  activeCodes: string[];
  onToggleChart: (code: string) => void;
  /** Yükseklik payı ÜST bileşende tutulur: grafik ızgarasıyla aynı kararın iki yarısı. */
  heightMode: DockHeightMode;
  onHeightModeChange: (mode: DockHeightMode) => void;
}

/**
 * Analiz Rıhtımı — Terminal alt çalışma alanı.
 *
 * ESKİ SORUNLAR:
 * - 232px'e hapsedilmiş sabit yükseklik çift scroll ve sıkışıklık yaratıyordu.
 * - Kullanıcı yüksekliği ayarlayamıyordu.
 *
 * YENİ ÖZELLİKLER:
 * - S / M / L ile grafik–rıhtım payı seçimi (bkz. DOCK_SPLIT).
 * - terminal-scroll ile ince ve pürüzsüz kaydırma çubuğu.
 * - Sekme başlıklarında dinamik veri sayaçları.
 * - Tek tıkla tam ekran ("Detay") görünümü.
 */
export function AnalysisDock({
  selected,
  tab,
  onTabChange,
  open,
  onOpenChange,
  chartableCodes,
  activeCodes,
  onToggleChart,
  heightMode,
  onHeightModeChange,
}: Props) {
  const [detailOpen, setDetailOpen] = useState(false);

  const tabs: { key: DockTab; label: string; count?: number; needsSeries?: boolean }[] = [
    {
      key: 'indicators',
      label: 'Göstergeler',
      count: selected?.indicators.length,
      needsSeries: true,
    },
    { key: 'model', label: 'Model', needsSeries: true },
    { key: 'agents', label: 'Analistler & Co-Pilot' },
    { key: 'purchase', label: 'Satın Alma' },
    { key: 'screener', label: 'Tarayıcı' },
    { key: 'backtest', label: 'Kural Testi' },
    {
      key: 'events',
      label: 'Olaylar & Sağlık',
      count: selected?.events.length,
      needsSeries: true,
    },
  ];

  const activeLabel = tabs.find((t) => t.key === tab)?.label ?? '';

  function body() {
    switch (tab) {
      case 'indicators':
        return selected ? (
          <IndicatorPanel
            indicators={selected.indicators}
            chartableCodes={chartableCodes}
            activeCodes={activeCodes}
            onToggleChart={onToggleChart}
          />
        ) : null;
      case 'model':
        return selected ? <ModelCard series={selected} /> : null;
      case 'agents':
        return <AgentContent />;
      case 'purchase':
        return <PurchaseAdvisorContent />;
      case 'screener':
        return <ScreenerContent />;
      case 'backtest':
        return <RuleBacktestContent />;
      case 'events':
        return selected ? <EventFeed events={selected.events} quality={selected.quality} /> : null;
    }
  }

  return (
    // h-full: rıhtım, üst bileşenin kendisine ayırdığı payı SONUNA KADAR doldurur.
    // min-h-0 olmadan içerideki kaydırma kutusu taşar ve kaydırma çubuğu hiç çıkmaz.
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-[7px] border border-border-soft bg-card shadow-xs">
      {/* ── RIHTIM BAŞLIK ŞERİDİ ── */}
      <div className="flex shrink-0 items-center gap-1 border-b border-border-soft bg-bg-subtle/80 px-2 py-1">
        {/* Sekmeler */}
        <div className="flex items-center gap-0.5 overflow-x-auto terminal-scroll">
          {tabs.map((t) => {
            const disabled = t.needsSeries && !selected;
            const isCurrent = tab === t.key && open;

            return (
              <button
                key={t.key}
                type="button"
                disabled={disabled}
                title={disabled ? 'Tahmin koşusu gerekiyor' : undefined}
                onClick={() => {
                  onTabChange(t.key);
                  onOpenChange(true);
                }}
                className={`cursor-pointer whitespace-nowrap px-2.5 py-1 text-ui-xs font-semibold rounded-[5px] transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${
                  isCurrent
                    ? 'bg-card text-fg shadow-xs'
                    : 'text-fg-muted hover:text-fg hover:bg-card/50'
                }`}
              >
                {t.label}
                {typeof t.count === 'number' && (
                  <span className={`ml-1 text-ui-2xs tabular-nums ${isCurrent ? 'text-fg font-bold' : 'text-fg-subtle'}`}>
                    ({t.count})
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Sağ Araçlar: Yükseklik Seçici + Detay + Daralt/Genişlet */}
        <div className="ml-auto flex shrink-0 items-center gap-1.5 pl-2">
          {open && (
            <div className="flex items-center gap-0.5 p-0.5 rounded-[5px] border border-border-soft bg-bg-subtle">
              {HEIGHT_BUTTONS.map(({ mode, short, title }) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onHeightModeChange(mode)}
                  title={title}
                  aria-pressed={heightMode === mode}
                  className={`px-1.5 py-0.5 text-ui-2xs font-bold rounded-[3px] transition-colors cursor-pointer ${
                    heightMode === mode ? 'bg-card text-fg shadow-xs' : 'text-fg-subtle hover:text-fg'
                  }`}
                >
                  {short}
                </button>
              ))}
            </div>
          )}

          {open && <DetailButton onClick={() => setDetailOpen(true)} />}

          <button
            type="button"
            title={open ? 'Rıhtımı daralt' : 'Rıhtımı aç'}
            aria-label={open ? 'Rıhtımı daralt' : 'Rıhtımı aç'}
            aria-expanded={open}
            onClick={() => onOpenChange(!open)}
            className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-[5px] text-fg-subtle transition-colors hover:bg-card hover:text-fg"
          >
            {open ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
        </div>
      </div>

      {/* ── İÇERİK BÖLÜMÜ ── */}
      {open && (
        <div className="min-h-0 flex-1 overflow-y-auto terminal-scroll">{body()}</div>
      )}

      {/* Tam Ekran Detay Modalı */}
      {detailOpen && (
        <DetailOverlay
          title={activeLabel}
          subtitle={selected?.displayName}
          onClose={() => setDetailOpen(false)}
        >
          {body()}
        </DetailOverlay>
      )}
    </section>
  );
}
