'use client';

import { useId } from 'react';

const DEFAULT_WIDTH_PX = 60;
const DEFAULT_HEIGHT_PX = 26;
const EDGE_PADDING_PX = 2;
const AREA_TOP_OPACITY = 0.25;
const LINE_WIDTH = 1.8;
const LAST_DOT_RADIUS = 2.5;

interface Props {
  data: number[];
  color: string;
  width?: number;
  height?: number;
}

// Küçük çizgi grafik (KPI kartları). En az iki nokta yoksa hiçbir şey çizmez.
export function Sparkline({ data, color, width = DEFAULT_WIDTH_PX, height = DEFAULT_HEIGHT_PX }: Props) {
  const rawId = useId();
  const pts = data.filter((v) => isFinite(v));
  if (pts.length < 2) return null;
  const max = Math.max(...pts);
  const min = Math.min(...pts);
  const range = max - min || 1;
  const coords = pts.map((v, i) => ({
    x: (i / (pts.length - 1)) * width,
    y: height - EDGE_PADDING_PX - ((v - min) / range) * (height - EDGE_PADDING_PX * 2),
  }));
  const line = coords.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const area = `${line} L${width},${height} L0,${height} Z`;
  // Bileşen instance başına benzersiz id — `color` `var(--accent)` gibi CSS değişkeni olabildiği için
  // id'ye rengi gömmek geçersiz URL fragment'ı üretirdi.
  const gradId = `sg${rawId.replace(/:/g, '')}`;
  const last = coords[coords.length - 1];
  return (
    <svg width={width} height={height} className="block shrink-0 overflow-visible" aria-hidden>
      <defs>
        <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
          {/* stopColor/stroke/fill SVG attribute'ları CSS var()'ı güvenilir çözmüyor —
              style prop üzerinden veriliyor, orada var() her zaman çözülür. */}
          <stop offset="0%" style={{ stopColor: color, stopOpacity: AREA_TOP_OPACITY }} />
          <stop offset="100%" style={{ stopColor: color, stopOpacity: 0 }} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`} />
      <path d={line} fill="none" style={{ stroke: color }} strokeWidth={LINE_WIDTH} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last.x} cy={last.y} r={LAST_DOT_RADIUS} style={{ fill: color }} />
    </svg>
  );
}
