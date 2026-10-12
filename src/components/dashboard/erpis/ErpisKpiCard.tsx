'use client';

import { useId, useState, type ReactNode } from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { AnimatedNumber } from '../../ui/AnimatedNumber';

// Erpis KPI kartı — e-ticaret panosundaki KpiCard'ın birebir karşılığı.
//
// Ölçüler, tipografi ve tıklayınca arka yüzde grafik açma davranışı oradan alındı
// (bkz. components/dashboard/KpiBar.tsx): 9.5px/800 etiket, 22px/800 değer, delta oku.
// İki pano arasında geçiş yapan kullanıcı aynı dili görmeli.
//
// Ortak bir bileşene çıkarılmadı: e-ticaret kartı i18n, KDV rozeti ve kendi veri
// biçimlendirmesiyle o panonun ihtiyaçlarına bağlı; ortaklaştırmak iki panoyu birbirine
// kilitlerdi. Kopyalanan şey KOD değil ÖLÇÜ.

// Kart yüksekliği, alt satırdaki para birimi dökümüne yer açacak kadar büyütüldü.
const CARD_HEIGHT = 128;

export interface ErpisKpiPoint {
  label: string;
  value: number;
}

// Değerin altında ortalanan döküm — "TL 3,2 Mn · USD 4.900" gibi.
export interface ErpisKpiPart {
  label: string;
  value: string;
}

interface Props {
  label: string;
  value: string;
  /** Değerin altındaki tek satırlık açıklama. */
  hint?: string;
  /**
   * Değerin altında ORTALANAN döküm satırı. Para birimi kırılımı gibi "toplam neyden
   * oluşuyor" bilgisi için — ipucu satırına sıkıştırıldığında okunmuyordu.
   */
  parts?: ErpisKpiPart[];
  /** Önceki döneme göre yüzde değişim. null = karşılaştırılacak veri yok. */
  delta?: number | null;
  accent?: string;
  /** Tıklanınca arka yüzde çizilen seri. İki noktadan azsa kart çevrilmez. */
  chart?: ErpisKpiPoint[];
  chartLabel?: string;
  /** Grafik değerlerinin biçimi — eksen ve ipucu bunu kullanır. */
  formatValue?: (value: number) => string;
  /**
   * Grafik yerine çizilen özel arka yüz. Her metrik zaman serisi değil: "son veri
   * yükleme" bir tarih, eğrisi yok — onun arka yüzü bayatlama ölçeği.
   * `chart` ile birlikte verilirse bu kazanır.
   */
  back?: ReactNode;
  isLoading?: boolean;
  delay?: number;
  /** Kart kenarlığını vurgular (veri bayatlaması gibi). */
  borderColor?: string;
}

export function ErpisKpiCard({
  label, value, hint, parts, delta = null, accent = 'var(--fg)',
  chart, chartLabel, formatValue, back, isLoading = false, delay = 0, borderColor,
}: Props) {
  const [showChart, setShowChart] = useState(false);
  const hasChart = back != null || (chart?.length ?? 0) >= 2;

  return (
    <div
      style={{
        position: 'relative',
        height: CARD_HEIGHT,
        background: 'var(--card)',
        border: `1px solid ${borderColor ?? 'var(--border)'}`,
        borderRadius: 6,
        padding: '12px 14px',
        boxShadow: 'var(--shadow-xs)',
        display: 'flex',
        flexDirection: 'column',
        animationDelay: `${delay}ms`,
        animation: 'erpis-kpi-enter 0.4s ease both',
        cursor: hasChart ? 'pointer' : 'default',
        overflow: 'hidden',
      }}
      onClick={() => hasChart && setShowChart((v) => !v)}
      title={hasChart ? (showChart ? 'Metriği göster' : 'Ayrıntıyı göster') : undefined}
    >
      {showChart && back ? (
        back
      ) : showChart && chart ? (
        <ErpisKpiBackChart
          points={chart}
          color={accent}
          label={chartLabel ?? label}
          formatValue={formatValue}
        />
      ) : (
        <>
          <span
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              fontSize: 9.5, fontWeight: 800, color: 'var(--fg-muted)',
              letterSpacing: '0.4px', textTransform: 'uppercase',
            }}
          >
            {label}
          </span>

          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
          }}>
            {isLoading ? (
              <div style={{ height: 26, width: '55%', borderRadius: 4, background: 'var(--border-soft)' }} />
            ) : (
              <p style={{
                fontSize: 24, fontWeight: 800, color: accent, lineHeight: 1,
                letterSpacing: '-0.5px', margin: 0,
              }}>
                <AnimatedNumber value={value} />
              </p>
            )}

          </div>

          {/* Para birimi dökümü ARTIK DEĞERİN İÇİNDE DEĞİL, kartın dibinde ve çok küçük.
              Ortada dururken iki satıra sarıp asıl rakamı yukarı itiyor, kartın odağını
              dağıtıyordu. Tek satır, taşarsa kırpılır — döküm ayrıntı, başlık değil. */}
          {!isLoading && parts && parts.length > 0 && (
            <div style={{
              display: 'flex', justifyContent: 'center', gap: 7,
              maxWidth: '100%', overflow: 'hidden', marginBottom: 2,
            }}>
              {parts.map((part) => (
                <span
                  key={part.label}
                  style={{ fontSize: 8.5, fontWeight: 600, color: 'var(--fg-subtle)', whiteSpace: 'nowrap' }}
                >
                  <span style={{ fontWeight: 800 }}>{part.label}</span>
                  {' '}{part.value}
                </span>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 5, minHeight: 14 }}>
            {delta !== null && !isLoading && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 2,
                fontWeight: 700, fontSize: 10.5,
                color: delta >= 0 ? '#10b981' : '#f43f5e',
              }}>
                {delta >= 0
                  ? <TrendingUp size={10} strokeWidth={2.5} />
                  : <TrendingDown size={10} strokeWidth={2.5} />}
                {delta >= 0 ? '+' : ''}{delta.toFixed(1)}%
              </span>
            )}
            {hint && (
              <span style={{ fontSize: 9, color: 'var(--fg-subtle)' }}>{hint}</span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// Kartın arka yüzü.
//
// Grafik ÖLÇEKLENMİYOR, gerçek piksel koordinatlarıyla çiziliyor: preserveAspectRatio
// ile esnetilen bir viewBox çizgi kalınlığını bozuyor ve eğriyi yamultuyordu. Ayrıca
// en yüksek/en düşük nokta ve son değer etiketleniyor — etiketsiz bir kıvrım "iyi mi
// kötü mü" sorusuna cevap vermiyor.
const CHART_WIDTH = 260;
const CHART_HEIGHT = 54;
const CHART_PAD = 6;

function ErpisKpiBackChart({ points, color, label, formatValue }: {
  points: ErpisKpiPoint[];
  color: string;
  label: string;
  formatValue?: (value: number) => string;
}) {
  const rawId = useId();
  const gradientId = `ek${rawId.replace(/:/g, '')}`;

  const values = points.map((p) => p.value).filter(Number.isFinite);
  if (values.length < 2) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 11, color: 'var(--fg-muted)' }}>Veri yok</span>
      </div>
    );
  }

  const max = Math.max(...values);
  const min = Math.min(...values);
  // Tüm değerler eşitse aralık 0 olur ve çizgi kartın tepesine yapışır; taban değerin
  // kendisi kadar bir aralık varsayarak çizgiyi ortaya alıyoruz.
  const range = max - min || Math.abs(max) || 1;

  const usableHeight = CHART_HEIGHT - CHART_PAD * 2;
  const coords = values.map((v, i) => ({
    x: (i / (values.length - 1)) * CHART_WIDTH,
    y: CHART_PAD + (1 - (v - min) / range) * usableHeight,
  }));

  const line = coords.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const area = `${line} L${CHART_WIDTH},${CHART_HEIGHT} L0,${CHART_HEIGHT} Z`;
  const last = coords[coords.length - 1];
  const format = formatValue ?? ((v: number) => v.toLocaleString('tr-TR'));

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{
          fontSize: 9, fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: '0.4px',
        }}>
          {label}
        </span>
        <span style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--fg-muted)' }}>
          {format(max)}
        </span>
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          style={{ display: 'block', overflow: 'visible' }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
              {/* stopColor SVG attribute'u CSS var()'ı güvenilir çözmüyor; style ile veriliyor. */}
              <stop offset="0%" style={{ stopColor: color, stopOpacity: 0.22 }} />
              <stop offset="100%" style={{ stopColor: color, stopOpacity: 0 }} />
            </linearGradient>
          </defs>
          <path d={area} fill={`url(#${gradientId})`} />
          <path
            d={line}
            fill="none"
            style={{ stroke: color }}
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx={last.x} cy={last.y} r={2.4} style={{ fill: color }} />
        </svg>
      </div>

      <div style={{
        display: 'flex', justifyContent: 'space-between',
        fontSize: 8.5, color: 'var(--fg-subtle)', fontWeight: 600,
      }}>
        <span>{points[0].label}</span>
        <span style={{ color: 'var(--fg-muted)', fontWeight: 700 }}>
          {format(values[values.length - 1])}
        </span>
        <span>{points[points.length - 1].label}</span>
      </div>
    </div>
  );
}

// Kart giriş animasyonu — e-ticaretteki kpi-enter ile aynı.
export function ErpisKpiStyles() {
  return (
    <style>{`
      @keyframes erpis-kpi-enter {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `}</style>
  );
}
