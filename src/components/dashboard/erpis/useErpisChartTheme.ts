'use client';

import { useTheme } from 'next-themes';

// Recharts ham SVG prop'ları `var()` çözemiyor — bu projede defalarca yaşanmış bir tuzak
// (bkz. AdsHubTrendChart.tsx:9). Bu yüzden grafik renkleri CSS değişkeni değil, temaya
// göre seçilen LİTERAL hex olmak zorunda. Değerler globals.css'teki token'larla eşleşir.
const LIGHT = {
  accent: '#BF4A42',
  grid: 'rgba(0,0,0,0.04)',
  tick: '#71717a',
  // Ciro/Maliyet kartındaki ile aynı ölçü renkleri.
  amount: '#059669',
  volume: '#64748b',
  volumeSoft: '#cbd5e1',
  // Kart zemininin LİTERAL karşılığı — yığılmış alanları birbirinden ayıran ince
  // çizgi için. var(--card) Recharts'ın SVG prop'larında çözülmüyor.
  surface: '#ffffff',
} as const;

const DARK = {
  accent: '#E08E85',
  grid: 'rgba(255,255,255,0.06)',
  tick: '#a1a1aa',
  amount: '#34d399',
  volume: '#94a3b8',
  volumeSoft: '#475569',
  surface: '#161616',
} as const;

// Kategorik kırılımlar — her dilim ayrı bir şey olduğu için tonlama değil ayrı renkler.
//
// Palet YUMUŞATILDI: önceki set doymuş temel renklerdi (saf mavi/yeşil/turuncu) ve altı
// dilimli bir donut "renk bombardımanı" gibi duruyordu. Bunlar aynı ailenin daha kısık
// doygunluktaki tonları — birbirinden hâlâ ayırt edilebiliyor ama sayıların önüne geçmiyor.
// Kahverengi/kehribar tonlar ÇIKARILDI: ekranda pas rengi gibi duruyor ve yanındaki
// nötr grilerle karışıyordu. Yerlerine aynı doygunlukta mavi-yeşil-mor ailesinden
// tonlar geldi; sekiz dilim hâlâ birbirinden ayırt ediliyor ama palet serin kalıyor.
export const ERPIS_CATEGORICAL = [
  '#5b8def', '#4fb286', '#7c93c9', '#9b7ede',
  '#4bb3ba', '#6d9fd4', '#cf87ac', '#8fa3b8',
] as const;

// Koyu temada aynı tonlar bir tık açılır: kısık doygunluktaki renkler koyu zeminde
// birbirine yaklaşıyor.
const ERPIS_CATEGORICAL_DARK = [
  '#7aa5f2', '#6cc79b', '#9aadd9', '#b096e6',
  '#6cc6cc', '#8db4e0', '#dd93b4', '#a6b8c9',
] as const;

export function erpisCategoricalColor(index: number, dark = false): string {
  const palette = dark ? ERPIS_CATEGORICAL_DARK : ERPIS_CATEGORICAL;
  return palette[index % palette.length];
}

export interface ErpisChartTheme {
  dark: boolean;
  accent: string;
  grid: string;
  tick: string;
  amount: string;
  volume: string;
  volumeSoft: string;
  surface: string;
  tooltip: {
    contentStyle: Record<string, string | number>;
    labelStyle: Record<string, string | number>;
    itemStyle: Record<string, string>;
  };
  axisTick: { fill: string; fontSize: number };
}

export function useErpisChartTheme(): ErpisChartTheme {
  const { resolvedTheme, theme } = useTheme();
  const dark = (resolvedTheme ?? theme) === 'dark';
  const c = dark ? DARK : LIGHT;

  return {
    dark,
    ...c,
    // E-ticaret kartlarındaki tooltip ayarlarıyla birebir (StaticWidgets.tsx:236).
    tooltip: {
      contentStyle: {
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 6,
        fontSize: 12,
        boxShadow: 'var(--shadow-md)',
      },
      labelStyle: { fontWeight: 600, marginBottom: 2 },
      itemStyle: { color: 'var(--fg-muted)' },
    },
    axisTick: { fill: c.tick, fontSize: 10 },
  };
}
