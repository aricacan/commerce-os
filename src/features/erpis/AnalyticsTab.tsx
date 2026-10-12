'use client';

import { useState } from 'react';
import {
  Bar, CartesianGrid, Cell, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  CHART_AXIS_TICK, CHART_BAR, CHART_GRID_STROKE, CHART_LINE, CHART_TOOLTIP_STYLE, EmptyState, ErrorState,
  SectionCard, formatAxis, formatCompact, formatNumber,
} from './shared';
import { useErpisBreakdown } from '@/hooks/erpis/useErpisQuery';
import { FilterSelect } from '@/components/ui/FilterSelect';
import {
  ERPIS_BREAKDOWNS,
  ERPIS_BREAKDOWN_HINTS,
  ERPIS_BREAKDOWN_LABELS,
  ERPIS_TOP_N,
  type ErpisBreakdownItem,
  type ErpisBreakdownKey,
  type ErpisQueryFilter,
} from '@/lib/api';

const CHART_HEIGHT = 340;
const LABEL_MAX_LENGTH = 24;
// Pareto çizgisi 0-100 arası; kendi ekseninde çizilir yoksa tutar ekseninde düz bir
// çizgiye dönüşür.
const SHARE_AXIS_MAX = 100;

// Analiz — istenen boyutta, istenen derinlikte sıralama.
//
// Panodaki kartlar sabit boyutlarda özet veriyor; bu ekran "hangi boyut, ilk kaç, en çok
// mu en az mı" sorularını kullanıcıya bırakıyor. Sunucu 13 boyutu da destekliyor, bu
// yüzden liste elle sayılmıyor — yeni bir boyut eklendiğinde burada kendiliğinden çıkar.
// Artık ayrı bir sekme değil, Genel Bakış'ın alt bölümü (bkz. OverviewTab).
// Filtreyi kendisi okumuyor, üstten alıyor: iki ekran tek sayfaya inince aynı
// filtreyi iki kez çözmenin anlamı kalmadı.
export function AnalyticsSection({ filter }: { filter: ErpisQueryFilter }) {

  const [dimension, setDimension] = useState<ErpisBreakdownKey>('party');
  const [topN, setTopN] = useState<number>(10);
  const [ascending, setAscending] = useState(false);

  // Kur çevrimi AÇIK: farklı dövizlerle çalışan cariler aynı listede sıralanabilsin.
  const breakdown = useErpisBreakdown(
    { ...filter, convertTo: 'TL' }, dimension, topN, 'amount', ascending);

  const rows = breakdown.data ?? [];
  const currency = rows[0]?.comparableCurrency;
  const total = rows.reduce((sum, r) => sum + r.comparableAmount, 0);

  if (breakdown.error) {
    return (
      <div className="p-4">
        <ErrorState text={breakdown.error instanceof Error ? breakdown.error.message : undefined} />
      </div>
    );
  }

  // Kümülatif pay (Pareto): "ilk kaç cari cironun %80'ini yapıyor" sorusunun cevabı
  // tek tek satırlara bakarak bulunamıyordu. Toplam SEÇİLEN satırların toplamı —
  // ilk 10 gösteriliyorsa yüzdeler o 10'un içindeki payı anlatır, başlık bunu yazar.
  // reduce ile birikim: render sırasında yeniden atanan bir sayaç lint kuralına
  // takılıyor ve StrictMode'un iki kez çalıştırdığı render'da yanlış toplam üretebilir.
  const chartRows = rows.reduce<RankingRow[]>((acc, r) => {
    const running = (acc[acc.length - 1]?.cumulativeAmount ?? 0) + r.comparableAmount;

    acc.push({
      ...r,
      short: shorten(r.label),
      cumulativeAmount: running,
      share: total > 0 ? (r.comparableAmount / total) * 100 : 0,
      cumulativeShare: total > 0 ? (running / total) * 100 : 0,
    });
    return acc;
  }, []);

  const subLabels = Object.fromEntries(
    chartRows.filter((r) => r.subLabel).map((r) => [r.short, shorten(r.subLabel as string)]));
  const hasSubLabels = Object.keys(subLabels).length > 0;

  return (
    <div className="flex flex-col gap-3">
      {/* Kontroller mobilde alt alta sarılıyor; "toplam" satırı da tam genişlik alıp
          sağa yapışmıyor. */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Ham <select> yerine ortak seçici: on üç boyutun yarısının adı tek başına
            ne olduğunu söylemiyordu ("Segment 1" neyin segmenti?). FilterSelect alt
            satır yazabiliyor ve arayüzün geri kalanıyla aynı görünüyor. */}
        <FilterSelect
          value={dimension}
          options={ERPIS_BREAKDOWNS.map((key) => ({
            value: key,
            label: ERPIS_BREAKDOWN_LABELS[key],
            sublabel: ERPIS_BREAKDOWN_HINTS[key],
          }))}
          placeholder="Kırılım boyutu"
          onChange={(v) => setDimension(v as ErpisBreakdownKey)}
          showAllOption={false}
          minWidth={190}
        />

        <div className="flex rounded-[4px] border border-[var(--border-soft)] p-0.5">
          {[false, true].map((asc) => (
            <button
              key={String(asc)}
              type="button"
              onClick={() => setAscending(asc)}
              aria-pressed={ascending === asc}
              className={`rounded-[3px] px-2.5 py-1 text-[12px] font-bold ${
                ascending === asc
                  ? 'bg-[var(--bg-subtle)] text-[var(--fg)]'
                  : 'text-[var(--fg-muted)]'
              }`}
            >
              {asc ? 'En az' : 'En çok'}
            </button>
          ))}
        </div>

        <div className="flex rounded-[4px] border border-[var(--border-soft)] p-0.5">
          {ERPIS_TOP_N.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setTopN(n)}
              aria-pressed={topN === n}
              className={`rounded-[3px] px-2.5 py-1 text-[12px] font-bold tabular-nums ${
                topN === n ? 'bg-[var(--bg-subtle)] text-[var(--fg)]' : 'text-[var(--fg-muted)]'
              }`}
            >
              İlk {n}
            </button>
          ))}
        </div>

        <span className="w-full text-[11.5px] text-[var(--fg-muted)] md:ml-auto md:w-auto md:text-right">
          {currency
            ? `Tutarlar ${currency} karşılığı · toplam ${formatCompact(total)}`
            : 'Tutar okunabilen kalem yok'}
        </span>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="Gösterilecek veri yok"
          hint="Filtreleri gevşetin ya da farklı bir boyut seçin."
        />
      ) : (
        <SectionCard
          title={`${ascending ? 'En az' : 'En çok'} ${rows.length} · ${ERPIS_BREAKDOWN_LABELS[dimension]}`}
        >
          <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
            <ComposedChart data={chartRows} layout="vertical" margin={{ top: 4, right: 20, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} horizontal={false} />
              <XAxis
                xAxisId="amount"
                type="number"
                tick={CHART_AXIS_TICK}
                axisLine={false}
                tickLine={false}
                tickFormatter={formatAxis}
              />
              {/* Pay ekseni AYRI: yüzde ile tutar aynı eksene binince Pareto çizgisi
                  ekranın dibine yapışıp hiçbir şey söylemiyordu. */}
              <XAxis
                xAxisId="share"
                type="number"
                orientation="top"
                domain={[0, SHARE_AXIS_MAX]}
                tick={CHART_AXIS_TICK}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `%${v}`}
              />
              {/* Kod + ad iki satır: stok kodu ve segment kırılımlarında anahtar tek
                  başına okunmuyor. Alt satır yoksa tek satır çizilir. */}
              <YAxis
                type="category"
                dataKey="short"
                tick={(props: RankTickProps) => (
                  <RankTick x={props.x} y={props.y} payload={props.payload} subLabels={subLabels} />
                )}
                axisLine={false}
                tickLine={false}
                width={hasSubLabels ? 210 : 150}
              />
              <Tooltip
                contentStyle={CHART_TOOLTIP_STYLE}
                cursor={{ fill: CHART_GRID_STROKE }}
                formatter={(value: unknown, name: unknown) => {
                  const num = typeof value === 'number' ? value : null;
                  return name === 'cumulativeShare'
                    ? [`%${formatNumber(num, 1)}`, 'Kümülatif pay']
                    : [formatNumber(num, 2), currency ? `Tutar (${currency})` : 'Tutar'];
                }}
              />
              <Bar xAxisId="amount" dataKey="comparableAmount" radius={[0, 3, 3, 0]} maxBarSize={22}>
                {chartRows.map((row, index) => (
                  <Cell key={row.key} fill={CHART_BAR} fillOpacity={barOpacity(index, chartRows.length)} />
                ))}
              </Bar>
              <Line
                xAxisId="share"
                type="monotone"
                dataKey="cumulativeShare"
                stroke={CHART_LINE}
                strokeWidth={1.8}
                dot={{ r: 2 }}
              />
            </ComposedChart>
          </ResponsiveContainer>

          <RankingTable rows={chartRows} currency={currency ?? null} total={total} />
        </SectionCard>
      )}
    </div>
  );
}


type RankingRow = ErpisBreakdownItem & {
  short: string;
  cumulativeAmount: number;
  share: number;
  cumulativeShare: number;
};

function RankingTable({ rows, currency, total }: {
  rows: RankingRow[];
  currency: string | null;
  total: number;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[12px]">
        <thead>
          <tr className="text-[10.5px] font-extrabold uppercase tracking-[0.02em] text-[var(--fg-muted)]">
            <th className="border-b border-[var(--border-soft)] px-2 py-1.5 text-left">#</th>
            <th className="border-b border-[var(--border-soft)] px-2 py-1.5 text-left">Değer</th>
            <th className="border-b border-[var(--border-soft)] px-2 py-1.5 text-right">
              Tutar{currency ? ` (${currency})` : ''}
            </th>
            <th className="border-b border-[var(--border-soft)] px-2 py-1.5 text-right">Pay</th>
            <th className="border-b border-[var(--border-soft)] px-2 py-1.5 text-right">Kümülatif</th>
            <th className="border-b border-[var(--border-soft)] px-2 py-1.5 text-right">Miktar</th>
            <th className="border-b border-[var(--border-soft)] px-2 py-1.5 text-right">Kalem</th>
            <th className="border-b border-[var(--border-soft)] px-2 py-1.5 text-right">Sipariş</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.key} className="border-b border-[var(--border-soft)] last:border-0">
              <td className="px-2 py-1.5 tabular-nums text-[var(--fg-muted)]">{index + 1}</td>
              <td className="px-2 py-1.5">
                <span className="block font-semibold text-[var(--fg)]">{row.label}</span>
                {row.subLabel && (
                  <span className="block text-[10.5px] leading-tight text-[var(--fg-muted)]">
                    {row.subLabel}
                  </span>
                )}
              </td>
              <td className="px-2 py-1.5 text-right tabular-nums font-bold text-[var(--fg)]">
                {formatNumber(row.comparableAmount, 2)}
              </td>
              <td className="px-2 py-1.5 text-right tabular-nums text-[var(--fg-muted)]">
                %{formatNumber(row.share, 1)}
              </td>
              <td className="px-2 py-1.5 text-right tabular-nums font-semibold text-[var(--fg)]">
                %{formatNumber(row.cumulativeShare, 1)}
              </td>
              <td className="px-2 py-1.5 text-right tabular-nums text-[var(--fg-muted)]">
                {formatNumber(row.quantity, 2)}
              </td>
              <td className="px-2 py-1.5 text-right tabular-nums text-[var(--fg-muted)]">
                {formatNumber(row.lineCount)}
              </td>
              <td className="px-2 py-1.5 text-right tabular-nums text-[var(--fg-muted)]">
                {formatNumber(row.orderCount)}
              </td>
            </tr>
          ))}
        </tbody>
        {/* Toplam satırı: gösterilen satırların toplamı yokken kullanıcı rakamları
            kafadan toplamak zorunda kalıyordu. */}
        <tfoot>
          <tr className="border-t-2 border-[var(--border)] font-extrabold text-[var(--fg)]">
            <td className="px-2 py-1.5" />
            <td className="px-2 py-1.5">Toplam ({rows.length})</td>
            <td className="px-2 py-1.5 text-right tabular-nums">{formatNumber(total, 2)}</td>
            <td className="px-2 py-1.5 text-right tabular-nums">%100,0</td>
            <td className="px-2 py-1.5" />
            <td className="px-2 py-1.5 text-right tabular-nums">
              {formatNumber(rows.reduce((sum, r) => sum + r.quantity, 0), 2)}
            </td>
            <td className="px-2 py-1.5 text-right tabular-nums">
              {formatNumber(rows.reduce((sum, r) => sum + r.lineCount, 0))}
            </td>
            <td className="px-2 py-1.5 text-right tabular-nums">
              {formatNumber(rows.reduce((sum, r) => sum + r.orderCount, 0))}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// Sıralama grafiği tek renkli ama kademeli: en üstteki değer en koyu, aşağıya doğru
// açılır. Kategorik palet burada yanıltıcı olurdu — kategoriler değil aynı ölçünün
// büyüklükleri karşılaştırılıyor.
function barOpacity(index: number, total: number): number {
  const min = 0.35;
  return total <= 1 ? 1 : 1 - ((1 - min) * index) / (total - 1);
}

function shorten(label: string): string {
  return label.length <= LABEL_MAX_LENGTH ? label : `${label.slice(0, LABEL_MAX_LENGTH - 1)}…`;
}

interface RankTickProps {
  x?: number | string;
  y?: number | string;
  payload?: { value?: string };
}

// Eksen etiketi: üstte anahtar, altında (varsa) adı.
function RankTick({ x, y, payload, subLabels }: RankTickProps & { subLabels: Record<string, string> }) {
  const value = payload?.value ?? '';
  const sub = subLabels[value];

  return (
    <g transform={`translate(${x ?? 0},${y ?? 0})`}>
      <text x={-6} y={sub ? -1 : 4} textAnchor="end" fontSize={10.5} fontWeight={600} fill="var(--fg)">
        {value}
      </text>
      {sub && (
        <text x={-6} y={10} textAnchor="end" fontSize={9.5} fill="#64748b">
          {sub}
        </text>
      )}
    </g>
  );
}
