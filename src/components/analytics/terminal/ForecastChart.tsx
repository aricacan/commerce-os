'use client';

import { useEffect, useRef, useState } from 'react';
import { useTheme } from 'next-themes';
import {
  createChart,
  createSeriesMarkers,
  ColorType,
  LineStyle,
  CrosshairMode,
  LineSeries,
  HistogramSeries,
  type IChartApi,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  type SeriesMarker,
  type Time,
  type UTCTimestamp,
} from 'lightweight-charts';
import type { ForecastSeries, IndicatorValue } from '../../../types/forecast';
import { compactTry, shortDate, TRY } from './format';
import { METRICS, type ChartMetricKey } from './metrics';

// ── Grafik renkleri ──────────────────────────────────────────────────────────
//
// lightweight-charts <canvas>'a çizer: Tailwind sınıfı ya da CSS değişkeni
// okuyamaz, renklerin düz metin verilmesi ZORUNLU. Bu yüzden tek yerde
// toplandılar — aynı değerler hem kurulumda hem tema değişimi efektinde
// kullanılıyordu ve ikisi ayrı ayrı düzenlenmeye açıktı.
//
// "chrome" değerleri tasarım jetonlarının tema karşılıklarıdır (--fg-muted,
// --fg-subtle, --border). "data" değerleri jeton DEĞİL, veri kodlamasıdır:
// tahmin çizgisi, %90 bandı ve rejim işareti birbirinden ayırt edilebilsin
// diye kasten kendi renklerini taşır (bkz. aşağıdaki RENK KURALI notu).
const CHART_THEME = {
  light: {
    axisText: '#a1a1aa',
    axisBorder: '#e4e4e7',
    grid: '#ececee',
    gridFaint: '#f4f4f5',
    separator: '#e4e4e7',
    separatorHover: '#d4d4d8',
    crosshair: '#a1a1aa',
    crosshairLabel: '#71717a',
    barNeutral: '#a1a1aa',
    barBad: '#dc2626',
    forecast: '#6366f1',
    band: 'rgba(99,102,241,0.35)',
    indicator: '#4f46e5',
    baseIndex: '#3f3f46',
  },
  dark: {
    axisText: '#71717a',
    axisBorder: '#3f3f46',
    grid: '#232326',
    gridFaint: '#1c1c1f',
    separator: '#27272a',
    separatorHover: '#3f3f46',
    crosshair: '#52525b',
    crosshairLabel: '#3f3f46',
    barNeutral: '#71717a',
    barBad: '#ef4444',
    forecast: '#818cf8',
    band: 'rgba(129,140,248,0.35)',
    indicator: '#a5b4fc',
    baseIndex: '#e4e4e7',
  },
} as const;

// Karşılaştırma serisi ve rejim işareti her iki temada aynı — ikisi de
// "ikinci seri / dikkat" anlamını taşıyan tek bir amber.
const COMPARE_COLOR = '#f59e0b';
const TODAY_MARKER_COLOR = '#71717a';

interface HistoryPoint {
  timestamp: string;
  revenue: number;
  orders: number;
  grossProfit: number;
  outsideBand: boolean;
}

interface Props {
  series: ForecastSeries;
  history: HistoryPoint[];
  regimeBreakAt?: string | null;
  metric: ChartMetricKey;
  /** F1 — alt pane'lerde çizilecek göstergeler. Boş dizi = yalnızca ana pane. */
  indicatorPanes: IndicatorValue[];
  /**
   * F4 — üste bindirilen karşılaştırma serisi. null = kapalı.
   *
   * 100'E ENDEKSLENİR: StoreB ₺84.000 ile bir kategorinin ₺6.000'ini aynı
   * eksende çizmek küçük olanı düz çizgiye indirger. Endeksleme ikisini de
   * "ilk günden bu yana % değişim" diline çevirir — kıyaslanabilir tek dil budur.
   */
  compare: { key: string; displayName: string; history: HistoryPoint[] } | null;
}

// Grafik artık kabına sığar (SellingView tek ekranlık bir terminal), bu yüzden
// pane'ler SABİT PİKSEL değil ORAN paylaşır: ana seri her zaman göstergelerin
// üç katı yer alır. Sabit yükseklikteyken 3 gösterge açılınca grafik 588px'e
// çıkıp ekranı taşırıyordu.
const MAIN_PANE_STRETCH = 3;
const INDICATOR_PANE_STRETCH = 1;

// Kap ölçülene kadarki ilk çizim yüksekliği. Tek karelik bir değer — ResizeObserver
// ilk ölçümde gerçek yüksekliği yazar.
const INITIAL_HEIGHT = 320;

/**
 * Ana grafik — TradingView'in kendi motoru (lightweight-charts v5).
 *
 * F1 · ÇOK PANE: v5'in `addSeries(def, opts, paneIndex)` API'siyle her gösterge
 * KENDİ pane'ine çizilir. v4'te tek pane vardı ve 20 gösterge tek ölçekte
 * anlamsızdı (RSI 0-100 ile ciro ₺100.000 aynı eksende).
 *
 * F2 · METRİK SEÇİCİ: ana seri Ciro/Adet/ASP/Brüt Kâr arasında değişir. Tahmin
 * bandı YALNIZCA modelin gerçekten tahmin ettiği metriklerde çizilir (ciro ve
 * adet) — ASP ve kâr için model tahmini YOKTUR, o yüzden bant da yoktur.
 * Olmayan bandı çizmek, ölçülmemiş bir belirsizliği ölçülmüş gibi göstermek olurdu.
 *
 * MUM GRAFİĞİ (OHLC) KASITLI OLARAK YOK: cironun açılışı/kapanışı yoktur.
 * RENK KURALI: gerçekleşen sütunlar NÖTR. Kırmızı yalnızca gün %90 bandın
 * dışına çıktığında belirir — "düşüş" değil "sorun" demektir.
 */
export function ForecastChart({ series, history, regimeBreakAt, metric, indicatorPanes, compare }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const realizedRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const forecastRef = useRef<ISeriesApi<'Line'> | null>(null);
  const upperRef = useRef<ISeriesApi<'Line'> | null>(null);
  const lowerRef = useRef<ISeriesApi<'Line'> | null>(null);
  const markersRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
  // F4 - karşılaştırma serileri. Endekslendikleri için AYRI fiyat ölçeğinde
  // yaşarlar ('cmp'); ana seriyle aynı eksene koymak ikisini de bozardı.
  const baseIdxRef = useRef<ISeriesApi<'Line'> | null>(null);
  const cmpIdxRef = useRef<ISeriesApi<'Line'> | null>(null);
  const indicatorRefs = useRef<Map<string, ISeriesApi<'Line'>>>(new Map());
  const legendRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const theme = isDark ? CHART_THEME.dark : CHART_THEME.light;

  const cfg = METRICS[metric];

  // Pane etiketlerini doğru yüksekliğe koyabilmek için kabın ölçülen yüksekliği.
  const [chartHeight, setChartHeight] = useState(INITIAL_HEIGHT);

  // Grafik + ana seriler bir kez kurulur; tema değişince applyOptions ile renklenir
  // (kütüphaneyi yeniden yaratmak crosshair/zoom durumunu sıfırlardı).
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const chart = createChart(el, {
      height: el.clientHeight || INITIAL_HEIGHT,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: theme.axisText,
        fontSize: 10.5,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        panes: { separatorColor: theme.separator, separatorHoverColor: theme.separatorHover },
      },
      // TradingView'in ızgarası iki yönlüdür — yalnızca yatay çizgi, sütunları
      // zaman ekseninde okumayı zorlaştırıyordu. Dikey çizgiler daha soluk.
      grid: { vertLines: { color: theme.gridFaint }, horzLines: { color: theme.grid } },
      rightPriceScale: { borderVisible: true, borderColor: theme.axisBorder, scaleMargins: { top: 0.12, bottom: 0.06 } },
      timeScale: { borderVisible: true, borderColor: theme.axisBorder, timeVisible: false, rightOffset: 6, barSpacing: 8 },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: theme.crosshair, width: 1, style: LineStyle.Dashed, labelBackgroundColor: theme.crosshairLabel },
        horzLine: { color: theme.crosshair, width: 1, style: LineStyle.Dashed, labelBackgroundColor: theme.crosshairLabel },
      },
      handleScroll: { mouseWheel: false, pressedMouseMove: true },
      handleScale: { mouseWheel: true, pinch: true, axisPressedMouseMove: true },
    });

    const realized = chart.addSeries(HistogramSeries, {}, 0);
    const band = { color: theme.band, lineWidth: 1 as const, lineStyle: LineStyle.Dashed, crosshairMarkerVisible: false, lastValueVisible: false, priceLineVisible: false };
    const upper = chart.addSeries(LineSeries, band, 0);
    const lower = chart.addSeries(LineSeries, band, 0);
    const forecast = chart.addSeries(LineSeries, {
      color: theme.forecast,
      lineWidth: 2,
      pointMarkersVisible: true,
      pointMarkersRadius: 2.5,
      lastValueVisible: true,
      priceLineVisible: false,
    }, 0);

    markersRef.current = createSeriesMarkers(realized, []);

    // F4 - endeksli karşılaştırma çizgileri. Kendi ölçeklerinde ('cmp'), ana
    // fiyat ekseninden bağımsız. Karşılaştırma kapalıyken veri verilmez.
    const idxOpts = { priceScaleId: 'cmp', lineWidth: 2 as const, priceLineVisible: false, lastValueVisible: true };
    baseIdxRef.current = chart.addSeries(LineSeries, { ...idxOpts, color: theme.baseIndex }, 0);
    cmpIdxRef.current = chart.addSeries(LineSeries, { ...idxOpts, color: COMPARE_COLOR }, 0);
    chart.priceScale('cmp').applyOptions({ visible: false, scaleMargins: { top: 0.08, bottom: 0.02 } });

    const ro = new ResizeObserver(() => {
      const h = el.clientHeight;
      chart.applyOptions({ width: el.clientWidth, height: h });
      setChartHeight(h);
    });
    ro.observe(el);

    chartRef.current = chart;
    realizedRef.current = realized;
    forecastRef.current = forecast;
    upperRef.current = upper;
    lowerRef.current = lower;

    // Map ORNEGI kurulum aninda yakalanir. React'in uyarisi genelde hakli (ref.current
    // temizlik zamani degismis olabilir) ama burada indicatorRefs.current HIC yeniden
    // atanmiyor - yalnizca set/delete/clear ediliyor. Yerele almak hem uyariyi durdurur
    // hem de ileride biri Map'i yeniden atarsa temizligin YANLIS Map'i bosaltmasini onler.
    const indicators = indicatorRefs.current;

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      indicators.clear();
      markersRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tema — mevcut grafiği yeniden boyar, sıfırdan kurmaz (zoom/pan korunur).
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    chart.applyOptions({
      layout: {
        textColor: theme.axisText,
        panes: { separatorColor: theme.separator, separatorHoverColor: theme.separatorHover },
      },
      grid: { vertLines: { color: theme.gridFaint }, horzLines: { color: theme.grid } },
      rightPriceScale: { borderColor: theme.axisBorder },
      timeScale: { borderColor: theme.axisBorder },
    });
    upperRef.current?.applyOptions({ color: theme.band });
    lowerRef.current?.applyOptions({ color: theme.band });
    forecastRef.current?.applyOptions({ color: theme.forecast });
    indicatorRefs.current.forEach((s) => s.applyOptions({ color: theme.indicator }));
    // theme, CHART_THEME'in iki sabit dalından biri — referansı render'lar
    // arasında değişmez, bu yüzden bağımlılık olarak doğrudan verilebilir.
  }, [theme]);

  // F1 — gösterge pane'lerini ekle/çıkar. Pane 0 ana seridir; göstergeler 1'den başlar.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const wanted = new Set(indicatorPanes.map((i) => i.code));

    indicatorRefs.current.forEach((s, code) => {
      if (!wanted.has(code)) {
        chart.removeSeries(s);
        indicatorRefs.current.delete(code);
      }
    });

    indicatorPanes.forEach((ind, idx) => {
      if (indicatorRefs.current.has(ind.code)) return;
      const s = chart.addSeries(LineSeries, {
        color: theme.indicator,
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: true,
      }, idx + 1);
      indicatorRefs.current.set(ind.code, s);
    });

    // Pane'leri oranla böl: ana seri 3, her gösterge 1 pay. Grafik kabın
    // yüksekliğini korur, gösterge eklemek onu uzatmaz — daraltır.
    const panes = chart.panes();
    panes.forEach((pane, i) => pane.setStretchFactor(i === 0 ? MAIN_PANE_STRETCH : INDICATOR_PANE_STRETCH));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indicatorPanes.map((i) => i.code).join('|'), isDark]);

  // Veri — seri seçimi, metrik, zaman dilimi ya da yeniden hesaplama değişince.
  useEffect(() => {
    const realized = realizedRef.current;
    const forecast = forecastRef.current;
    const upper = upperRef.current;
    const lower = lowerRef.current;
    const chart = chartRef.current;
    if (!realized || !forecast || !upper || !lower || !chart) return;

    const toTime = (iso: string): UTCTimestamp => Math.floor(new Date(iso).getTime() / 1000) as UTCTimestamp;
    const { barNeutral, barBad } = theme;

    chart.applyOptions({ localization: { priceFormatter: cfg.format } });
    realized.applyOptions({ priceFormat: { type: 'custom', formatter: cfg.format, minMove: cfg.minMove } });

    // F4 - karşılaştırma açıkken ana sütunlar SÖNÜKLEŞİR: odak iki endeks
    // çizgisine kayar, sütunlar bağlam olarak kalır.
    const comparing = compare !== null;
    realized.applyOptions({ priceScaleId: comparing ? 'left' : 'right' });
    chart.priceScale('left').applyOptions({ visible: false });
    chart.priceScale('cmp').applyOptions({ visible: comparing });
    chart.priceScale('right').applyOptions({ visible: !comparing });

    realized.setData(
      history.map((h) => ({
        time: toTime(h.timestamp),
        value: cfg.fromHistory(h),
        // outsideBand yalnızca CİRO için ölçüldü (model onu tahmin ediyor).
        // Diğer metriklerde kırmızı boyamak, ölçülmemiş bir sapmayı ölçülmüş
        // gibi göstermek olurdu — nötr kalır.
        color: cfg.hasForecast && h.outsideBand ? barBad : barNeutral,
      })),
    );

    // Köprü: son gerçek nokta tahmin dizisine de eklenir ki çizgi kopuk başlamasın.
    const bridge = history.length > 0 ? history[history.length - 1] : null;

    if (cfg.hasForecast) {
      const bridgePoint = bridge ? [{ time: toTime(bridge.timestamp), value: cfg.fromHistory(bridge) }] : [];
      forecast.setData([...bridgePoint, ...series.forecast.map((f) => ({ time: toTime(f.timestamp), value: cfg.fromForecast!(f) }))]);
      upper.setData([...bridgePoint, ...series.forecast.map((f) => ({ time: toTime(f.timestamp), value: cfg.forecastBand ? f.upper90 : cfg.fromForecast!(f) }))]);
      lower.setData([...bridgePoint, ...series.forecast.map((f) => ({ time: toTime(f.timestamp), value: cfg.forecastBand ? f.lower90 : cfg.fromForecast!(f) }))]);
      upper.applyOptions({ visible: cfg.forecastBand });
      lower.applyOptions({ visible: cfg.forecastBand });
    } else {
      // ASP ve brüt kâr için model tahmini YOK — çizgi ve bant boş bırakılır.
      forecast.setData([]);
      upper.setData([]);
      lower.setData([]);
    }

    // F4 - 100'e endeksleme. Taban, penceredeki İLK SIFIR OLMAYAN değerdir;
    // sıfıra bölmemek için. Taban bulunamazsa seri çizilmez (uydurma taban yok).
    const indexTo100 = (pts: HistoryPoint[]) => {
      const vals = pts.map((p) => cfg.fromHistory(p));
      const base = vals.find((v) => v > 0);
      if (base === undefined) return [];
      return pts.map((p, i) => ({ time: toTime(p.timestamp), value: (vals[i]! / base) * 100 }));
    };

    if (compare) {
      baseIdxRef.current?.setData(indexTo100(history));
      cmpIdxRef.current?.setData(indexTo100(compare.history));
    } else {
      baseIdxRef.current?.setData([]);
      cmpIdxRef.current?.setData([]);
    }
    baseIdxRef.current?.applyOptions({ color: theme.baseIndex });

    const markers: SeriesMarker<Time>[] = [];
    if (bridge) {
      markers.push({ time: toTime(bridge.timestamp), position: 'aboveBar', color: TODAY_MARKER_COLOR, shape: 'arrowDown', text: 'BUGÜN' });
    }
    if (regimeBreakAt) {
      const hit = history.find((h) => h.timestamp.slice(0, 10) === regimeBreakAt.slice(0, 10));
      if (hit) markers.push({ time: toTime(hit.timestamp), position: 'belowBar', color: COMPARE_COLOR, shape: 'circle', text: 'REJİM' });
    }
    markers.sort((a, b) => (a.time as number) - (b.time as number));
    markersRef.current?.setMarkers(markers);

    // Gösterge noktaları TÜM geçmişle hesaplanır, grafik son N kovayı gösterir —
    // sondan hizalanır. Baştan hizalamak göstergeyi tarih ekseninde KAYDIRIRDI.
    indicatorPanes.forEach((ind) => {
      const s = indicatorRefs.current.get(ind.code);
      if (!s) return;
      const pts = ind.points.slice(-history.length);
      s.setData(
        pts
          .map((v, i) => ({ time: toTime(history[i]!.timestamp), value: v }))
          .filter((p): p is { time: UTCTimestamp; value: number } => p.value !== null && Number.isFinite(p.value)),
      );
    });

    chart.timeScale().fitContent();
  }, [series, history, regimeBreakAt, theme, metric, cfg, indicatorPanes, compare]);

  // Crosshair açıklaması — metrik değişince etiket de değişmeli.
  useEffect(() => {
    const chart = chartRef.current;
    const realized = realizedRef.current;
    const forecast = forecastRef.current;
    if (!chart || !realized || !forecast) return;

    const handler = (param: Parameters<Parameters<IChartApi['subscribeCrosshairMove']>[0]>[0]) => {
      const legend = legendRef.current;
      if (!legend) return;
      if (!param.time) {
        legend.style.opacity = '0';
        return;
      }
      const r = param.seriesData.get(realized) as { value: number } | undefined;
      const f = param.seriesData.get(forecast) as { value: number } | undefined;
      const date = new Date((param.time as number) * 1000).toISOString();
      legend.style.opacity = '1';
      legend.innerHTML =
        `<span class="font-semibold">${shortDate(date)}</span>` +
        `<span class="opacity-60"> · ${cfg.label}</span>` +
        (r ? ` · gerçekleşen <b>${cfg.format(r.value)}</b>` : '') +
        (f ? ` · tahmin <b>${cfg.format(f.value)}</b>` : '');
    };

    chart.subscribeCrosshairMove(handler);
    return () => chart.unsubscribeCrosshairMove(handler);
  }, [cfg]);

  // Etiket konumu pane oranlarından türer: toplam pay = 3 + gösterge sayısı.
  const totalStretch = MAIN_PANE_STRETCH + indicatorPanes.length * INDICATOR_PANE_STRETCH;
  const paneTop = (i: number) =>
    (chartHeight * (MAIN_PANE_STRETCH + i * INDICATOR_PANE_STRETCH)) / totalStretch;

  return (
    <div className="relative min-h-0 w-full flex-1">
      <div
        ref={legendRef}
        className="pointer-events-none absolute left-3 top-2 z-10 rounded-[4px] bg-card/85 px-1.5 py-0.5 text-[10.5px] text-fg-muted transition-opacity"
        style={{ opacity: 0 }}
      />

      {/* Pane etiketleri — hangi alt grafiğin hangi gösterge olduğu yazmazsa
          çok-pane görünüm okunamaz hâle gelir.
          ÇİPE ALINDI: çıplak yazı ızgara çizgilerinin üstünde kayboluyordu ve
          pane'ler birbirinden ayrılmıyordu. Zeminli etiket + üstündeki ayırıcı
          çizgi, her pane'in nerede başladığını tek bakışta gösterir. */}
      {indicatorPanes.map((ind, i) => (
        <div
          key={ind.code}
          className="pointer-events-none absolute left-0 right-0 z-10"
          style={{ top: paneTop(i) }}
        >
          <div className="h-px w-full bg-border" />
          <span className="ml-3 mt-1 inline-flex items-center gap-1.5 rounded-[4px] border border-border-soft bg-card/90 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-fg-muted">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: theme.indicator }} />
            {ind.label}
          </span>
        </div>
      ))}

      <div ref={containerRef} className="absolute inset-0" />
    </div>
  );
}

export { TRY, compactTry };
