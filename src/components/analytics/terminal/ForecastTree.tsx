'use client';

import type { ForecastSeries } from '../../../types/forecast';
import { compactTry, STATUS_CLASS } from './format';

interface Props {
  series: ForecastSeries[];
  selectedKey: string;
  onSelect: (key: string) => void;
}

const COVERAGE_TARGET = 90;
const COVERAGE_TOLERANCE = 3;
const FORECAST_PREVIEW_DAYS = 7;

/**
 * Hiyerarşi ağacı — TradingView'in watchlist'inin karşılığı, ama bir izleme
 * listesi değil: MinT ile uzlaştırılmış tahmin ağacı. Alt serilerin toplamı üst
 * seriye TAM eşittir (gerçek veride %0,000000 fark ölçüldü).
 *
 * Seyrek ve durmuş seriler AÇIKÇA etiketlenir. Bunları normal seri gibi
 * göstermek, tek başına tahmin edilemeyen bir seride güvenilir bir sayı varmış
 * izlenimi verirdi — 14 serinin 12'si bu durumda.
 */
export function ForecastTree({ series, selectedKey, onSelect }: Props) {
  // B3 - kategori ve pazaryeri AYNI mağazanın KESİŞEN kırılımlarıdır (iç içe değil,
  // bkz. hierarchy.py). Aynı satır grubunda karışırlarsa "Trendyol" ile "Kaput
  // Rüzgarlığı" aynı çocuk kümesindeymiş gibi görünür ve yanlış okunur — bu yüzden
  // dimension="category" olan yapraklar ayrı bir bölüm başlığı altında listelenir.
  const platformRows = series.filter((s) => s.dimension !== 'category');
  const categoryRows = series.filter((s) => s.dimension === 'category');

  const sortRows = (rows: ForecastSeries[]) =>
    [...rows].sort((a, b) => {
      if (a.level !== b.level) return a.level - b.level;
      return a.key.localeCompare(b.key, 'tr');
    });

  return (
    <div role="list" className="flex flex-col">
      {sortRows(platformRows).map((s) => (
        <TreeRow key={s.key} s={s} selectedKey={selectedKey} onSelect={onSelect} />
      ))}

      {categoryRows.length > 0 && (
        <>
          <div className="px-3 py-1 bg-bg-subtle border-b border-border-soft">
            <span className="text-[9.5px] font-semibold uppercase tracking-wider text-fg-subtle">
              Kategori kırılımı
            </span>
          </div>
          {sortRows(categoryRows).map((s) => (
            <TreeRow key={s.key} s={s} selectedKey={selectedKey} onSelect={onSelect} indent />
          ))}
        </>
      )}
    </div>
  );
}

function TreeRow({
  s,
  selectedKey,
  onSelect,
  indent,
}: {
  s: ForecastSeries;
  selectedKey: string;
  onSelect: (key: string) => void;
  indent?: boolean;
}) {
  const preview = s.forecast.slice(0, FORECAST_PREVIEW_DAYS);
  const avg = preview.length ? preview.reduce((sum, p) => sum + p.revenue, 0) / preview.length : 0;
  const badge = stateBadge(s);

  return (
    <button
      type="button"
      role="listitem"
      onClick={() => onSelect(s.key)}
      className={`grid grid-cols-[1fr_auto_auto] items-center gap-2 px-3 py-1.5 text-left border-b border-border-soft transition-colors ${
        s.key === selectedKey
          ? 'bg-bg-subtle shadow-[inset_2px_0_0] shadow-fg'
          : 'hover:bg-bg-subtle'
      } ${s.level === 1 ? 'bg-bg-subtle' : ''}`}
    >
      <span className={`flex items-center gap-1.5 min-w-0 ${s.level === 2 || indent ? 'pl-3' : ''}`}>
        <span
          className={`truncate text-fg ${
            s.level === 0 ? 'text-[12.5px] font-bold' : 'text-[11.5px] font-semibold'
          }`}
        >
          {s.displayName}
        </span>
      </span>

      <span className="text-[11px] font-semibold tabular-nums text-fg">
        {s.state === 'Dormant' ? '—' : compactTry(avg)}
      </span>

      <span
        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-[3px] whitespace-nowrap ${STATUS_CLASS[badge.status]}`}
      >
        {badge.label}
      </span>
    </button>
  );
}

/**
 * Rozet, serinin GÜVENİLİRLİĞİNİ söyler — cirosunun yükselip düştüğünü değil.
 * Ciro yönü zaten sayıda görünüyor; burada cevaplanan soru "bu tahmine
 * güvenebilir miyim".
 */
function stateBadge(s: ForecastSeries): { label: string; status: string } {
  if (s.state === 'Dormant') return { label: 'durdu', status: 'bad' };
  if (s.state === 'Sparse') return { label: 'seyrek', status: 'neutral' };
  if (s.baselineWon) return { label: 'taban model', status: 'warn' };

  // B2 - ModelCard ile AYNI kaynak: bant genişletildiyse teslim edilen bandı
  // coverage90Adjusted tanımlar, coverage90 artık düzeltme öncesi teşhis.
  const coverage = s.accuracy.coverage90Adjusted ?? s.accuracy.coverage90;
  if (coverage === null) return { label: 'ölçülmedi', status: 'neutral' };
  if (Math.abs(coverage - COVERAGE_TARGET) <= COVERAGE_TOLERANCE) {
    return { label: 'bant sağlam', status: 'ok' };
  }
  return { label: coverage < COVERAGE_TARGET ? 'bant dar' : 'bant geniş', status: 'warn' };
}
