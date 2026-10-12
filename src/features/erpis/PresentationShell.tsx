'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Area, AreaChart, Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { ChevronLeft, ChevronRight, Pause, Play, Settings2, X } from 'lucide-react';
import {
  useErpisAging, useErpisBreakdown, useErpisOrdersSummary, useErpisOrdersTrend,
  useErpisScopeSummary,
} from '@/hooks/erpis/useErpisQuery';
import { useErpisCompanies } from '@/hooks/erpis/useErpis';
import type { ErpisBreakdownItem, ErpisFilterOptions, ErpisQueryFilter } from '@/lib/api';
import { ErpisQueryFilterBar } from './ErpisQueryFilterBar';
import { useMobile } from '../../hooks/useMobile';
import { formatBucketLabel } from '../../components/dashboard/erpis/erpisBucket';
import { formatAxis, formatCompact, formatNumber, formatPeriod } from './shared';

// Erpis sunum modu — toplantı ekranı.
//
// Baştan yazıldı. Öncesinde koyu bir kabuğun içinde küçük kartlar vardı: projeksiyonda
// ekranın yarısı boş kalıyor, slaytlar birbirinin aynı görünüyor ve tema değiştirince
// grafik renkleri temayla gelmediği için içerik kayboluyordu.
//
// Üç kural:
//   1. HER SLAYT EKRANI DOLDURUR. Kartlar değil bölmeler; grafik kalan alanı alır.
//   2. TEK BİR SORU. Her slaytın bir başlığı, bir büyük rakamı ve o rakamı açan tek bir
//      görselleştirmesi var; iki şeyi aynı anda anlatan slayt yok.
//   3. RENK TEMADAN GELİR. Grafik, çubuk ve metin renkleri tema nesnesinden okunuyor —
//      açık temada beyaz çizgi, koyu temada siyah yazı çıkmıyor.

interface PresentationTheme {
  key: string;
  label: string;
  background: string;
  surface: string;
  border: string;
  text: string;
  muted: string;
  accent: string;
  // Sıralama çubukları ve dağılımlar için — temayla uyumlu, tek aile.
  series: string[];
}

const THEMES: PresentationTheme[] = [
  {
    key: 'midnight', label: 'Gece',
    background: '#080c16', surface: 'rgba(255,255,255,0.045)', border: 'rgba(255,255,255,0.10)',
    text: '#f2f5fb', muted: 'rgba(242,245,251,0.55)', accent: '#7aa5f2',
    series: ['#7aa5f2', '#6cc79b', '#b096e6', '#6cc6cc', '#9aadd9', '#dd93b4'],
  },
  {
    key: 'graphite', label: 'Grafit',
    background: '#0d0d0f', surface: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.12)',
    text: '#ffffff', muted: 'rgba(255,255,255,0.55)', accent: '#e8e8ea',
    series: ['#e8e8ea', '#b9bcc4', '#8f949e', '#6d727c', '#d0d3d9', '#a2a7b1'],
  },
  {
    key: 'daylight', label: 'Açık',
    background: '#f6f7f9', surface: '#ffffff', border: 'rgba(15,23,42,0.10)',
    text: '#0f1216', muted: 'rgba(15,18,22,0.55)', accent: '#2f6fd0',
    series: ['#2f6fd0', '#2f9e77', '#7b5fc4', '#2e9aa3', '#5c7fb8', '#b06090'],
  },
];

const SLIDES = [
  'summary', 'trend', 'parties', 'items', 'brands', 'categories', 'vehicles', 'aging', 'scope',
] as const;
type Slide = (typeof SLIDES)[number];

const SLIDE_TITLES: Record<Slide, string> = {
  summary: 'Genel Durum',
  trend: 'Dönem İçi Seyir',
  parties: 'En Yüksek Cariler',
  items: 'En Yüksek Ürünler',
  brands: 'Marka Kırılımı',
  categories: 'Kategori Kırılımı',
  vehicles: 'Araç Modeli Kırılımı',
  aging: 'Açık Sipariş Yaşlandırması',
  scope: 'Yurt İçi / Yurt Dışı',
};

// Otomatik geçiş aralığı. Sunan kişi ekranı bırakıp konuşabilsin; ok tuşuna basıldığı an
// duruyor.
const AUTO_ADVANCE_MS = 15_000;
const TOP_N = 10;

interface Props {
  filter: ErpisQueryFilter;
  /**
   * Sunum filtresi modülün filtresiyle AYNI (URL'de tutulan) — sunumda kurulan filtre
   * çıkınca da geçerli kalıyor, sunumdan çıkıp tekrar kurmak gerekmiyor.
   */
  onFilterChange: (patch: Partial<ErpisQueryFilter>) => void;
  onFilterReset: () => void;
  activeFilterCount: number;
  filterOptions?: ErpisFilterOptions;
  onCompanyChange: (companyId: number | null) => void;
  companyName: string;
  datasetName: string;
  onExit: () => void;
}

export function PresentationShell({
  filter, onFilterChange, onFilterReset, activeFilterCount, filterOptions, onCompanyChange,
  companyName, datasetName, onExit,
}: Props) {
  const [index, setIndex] = useState(0);
  const [auto, setAuto] = useState(false);
  const [themeKey, setThemeKey] = useState(THEMES[0].key);
  // Ayarlar VE filtreler TEK panelde: önceden iki ayrı düğme iki ayrı paneli açıyordu
  // ("Tema hangi düğmede, filtre hangisinde" diye her seferinde aranıyordu). Şimdi tek
  // "Ayarlar" düğmesi ikisini birden, aynı yerden gösteriyor.
  const [panelOpen, setPanelOpen] = useState(false);
  const [hidden, setHidden] = useState<readonly Slide[]>([]);
  const companyId = filter.companyId ?? null;

  const isMobile = useMobile();
  const touchStartX = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(diff) > 45) {
      if (diff > 0) step(-1);
      else step(1);
    }
    touchStartX.current = null;
  };

  const theme = THEMES.find((t) => t.key === themeKey) ?? THEMES[0];
  const visible = useMemo(() => SLIDES.filter((key) => !hidden.includes(key)), [hidden]);

  const companies = useErpisCompanies();

  // Sunum firmasını ve filtreyi İÇİNDEN değiştirebiliyor: toplantıda "bir de şu firmayı /
  // şu markayı gösterelim" demek, sunumdan çıkıp modüle dönmeyi gerektiriyordu.
  // Grafik çözünürlüğü filtre durumunda TARİH ARALIĞINDAN türetiliyor (bkz.
  // useErpisFilterState) — "Bu ay" günlük, "Son 1 yıl" aylık çizilir; önceden "ay"a sabitti
  // ve kısa bir aralıkta trend slaytı tek noktaya düşüyordu.
  const converted = useMemo(() => ({ ...filter, convertTo: 'TL' }), [filter]);

  const summary = useErpisOrdersSummary(converted);
  const trend = useErpisOrdersTrend(converted);
  const parties = useErpisBreakdown(converted, 'party', TOP_N);
  const items = useErpisBreakdown(converted, 'item', TOP_N);
  const brands = useErpisBreakdown(converted, 'brand', TOP_N);
  // Genel müdürün ilk sorduğu iki kırılım: hangi ürün kategorisi ve hangi araç modeli.
  // Marka tek başına "FORD" diyor; hangi Ford, hangi parça — onu bu iki slayt söylüyor.
  const categories = useErpisBreakdown(converted, 'productType', TOP_N);
  const vehicles = useErpisBreakdown(converted, 'vehicle', TOP_N);
  const aging = useErpisAging(converted);
  const scopes = useErpisScopeSummary(converted);

  const go = useCallback((delta: number) => {
    setIndex((current) => (current + delta + visible.length) % Math.max(1, visible.length));
  }, [visible.length]);

  const step = useCallback((delta: number) => {
    setAuto(false);
    go(delta);
  }, [go]);

  useEffect(() => {
    if (!auto) return;
    const timer = window.setInterval(() => go(1), AUTO_ADVANCE_MS);
    return () => window.clearInterval(timer);
  }, [auto, go]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        // Karar olay dağıtımı BİTTİKTEN sonra verilir. Açık bir açılır menü ya da filtre
        // çubuğunun gelişmiş paneli Escape'i kendisi işler (kendini kapatıp preventDefault);
        // o dinleyiciler bu kabuktan SONRA kayıtlı olabildiği için anında bakınca işaret henüz
        // konmamış olur ve tek Escape menüyle birlikte paneli de kapatır / sunumdan çıkarırdı.
        window.setTimeout(() => {
          if (event.defaultPrevented) return;
          // Önce açık paneli kapat; sunumdan çıkmak ikinci Escape'e kalsın.
          if (panelOpen) setPanelOpen(false);
          else onExit();
        }, 0);
        return;
      }

      // Ayarlar/filtre paneli AÇIKKEN slayt kısayolları çalışmaz: panelde seçim yaparken
      // (çoklu seçim kutusunda boşlukla işaretleme, düğmeler arasında gezinme) slaytın
      // arkada kayması hem dikkati dağıtıyor hem de izleyiciye yanlış slayt gösteriyordu.
      if (panelOpen) return;

      const target = event.target as HTMLElement | null;
      const typing = !!target && (target.isContentEditable
        || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
      if (typing) return;

      if (event.key === ' ') {
        // Odak bir düğmedeyken boşluk o düğmeye BASAR; aynı anda slayt da değişirse tek tuş
        // iki iş yapar (ör. "Filtreler"e tıkladıktan sonra boşluk hem paneli açıp hem ilerliyordu).
        if (target?.closest('button, a, [role="option"], [role="listbox"], [role="menuitem"]')) return;
        event.preventDefault();
        step(1);
      } else if (event.key === 'ArrowRight') {
        step(1);
      } else if (event.key === 'ArrowLeft') {
        step(-1);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [step, onExit, panelOpen]);

  const slide = visible[Math.min(index, visible.length - 1)] ?? SLIDES[0];
  const data = summary.data;
  const currency = data?.converted?.currency ?? data?.totals[0]?.currency ?? '';
  const activeCompany = companies.data?.find((c) => c.id === companyId)?.name ?? companyName;

  return (
    <div
      className="fixed inset-0 z-[20000] flex flex-col select-none"
      style={{ background: theme.background, color: theme.text }}
    >
      <header
        className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b px-3.5 py-2.5 sm:px-5 sm:py-3 md:px-8 md:py-4"
        style={{ borderColor: theme.border }}
      >
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[15px] font-extrabold leading-tight sm:text-[18px] md:text-[24px]">
            {SLIDE_TITLES[slide]}
          </span>
          <span className="truncate text-[10.5px] sm:text-[11px] md:text-[13px]" style={{ color: theme.muted }}>
            {activeCompany} • {datasetName} • {formatPeriod(data?.periodStart ?? null, data?.periodEnd ?? null)}
            {/* İzleyici ekrandaki rakamın FİLTRELİ olduğunu görsün — "neden toplam bu kadar
                az" sorusu toplantının ortasında sorulmasın. */}
            {activeFilterCount > 0 && ` • ${activeFilterCount} filtre uygulanıyor`}
          </span>
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5">
          <div className="relative">
            <IconButton
              label="Ayarlar ve filtreler"
              theme={theme}
              onClick={() => {
                // Panel açarken slaytın altından kayması dikkati dağıtır.
                setAuto(false);
                setPanelOpen((v) => !v);
              }}
            >
              <Settings2 size={16} strokeWidth={2} />
            </IconButton>
            {activeFilterCount > 0 && (
              <span
                className="pointer-events-none absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-extrabold tabular-nums"
                style={{ background: theme.accent, color: theme.background }}
              >
                {activeFilterCount}
              </span>
            )}
          </div>
          <IconButton
            label={auto ? 'Otomatik geçişi durdur' : 'Otomatik geçişi başlat'}
            theme={theme}
            onClick={() => setAuto((v) => !v)}
          >
            {auto ? <Pause size={16} strokeWidth={2} /> : <Play size={16} strokeWidth={2} />}
          </IconButton>
          <IconButton label="Önceki" theme={theme} onClick={() => step(-1)}>
            <ChevronLeft size={18} strokeWidth={2} />
          </IconButton>
          <span className="min-w-[36px] sm:min-w-[46px] text-center text-[11.5px] sm:text-[13px] tabular-nums" style={{ color: theme.muted }}>
            {visible.indexOf(slide) + 1} / {visible.length}
          </span>
          <IconButton label="Sonraki" theme={theme} onClick={() => step(1)}>
            <ChevronRight size={18} strokeWidth={2} />
          </IconButton>
          <IconButton label="Çık" theme={theme} onClick={onExit}>
            <X size={17} strokeWidth={2} />
          </IconButton>
        </div>
      </header>

      {panelOpen && (
        <SettingsPanel
          theme={theme}
          themeKey={themeKey}
          onThemeChange={setThemeKey}
          companies={(companies.data ?? []).filter((c) => c.isActive)}
          companyId={companyId}
          onCompanyChange={onCompanyChange}
          hidden={hidden}
          onToggleSlide={(key) => setHidden((current) =>
            current.includes(key) ? current.filter((k) => k !== key) : [...current, key])}
          filter={filter}
          filterOptions={filterOptions}
          activeFilterCount={activeFilterCount}
          onFilterChange={onFilterChange}
          onFilterReset={onFilterReset}
          onClose={() => setPanelOpen(false)}
        />
      )}

      {/* İlerleme şeridi: kaçıncı slaytta olunduğu rakam okumadan görünsün. */}
      <div className="flex shrink-0 gap-1 px-3.5 pt-2 sm:px-5 md:px-8">
        {visible.map((key) => (
          <button
            key={key}
            type="button"
            aria-label={SLIDE_TITLES[key]}
            onClick={() => { setAuto(false); setIndex(visible.indexOf(key)); }}
            className="h-[3px] flex-1 rounded-full transition-opacity"
            style={{
              background: key === slide ? theme.accent : theme.border,
              opacity: key === slide ? 1 : 0.7,
            }}
          />
        ))}
      </div>

      {/* SLAYT GÖVDESİ: flex-1 + min-h-0 — her slayt kalan alanın TAMAMINI dolduruyor. */}
      <main
        className="flex min-h-0 flex-1 flex-col px-3 py-3 sm:px-5 sm:py-4 md:px-8 md:py-6"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {slide === 'summary' && (
          <SummarySlide theme={theme} data={data} currency={currency} />
        )}

        {slide === 'trend' && (
          <TrendSlide theme={theme} points={trend.data ?? []} currency={currency} isMobile={isMobile} />
        )}

        {slide === 'parties' && (
          <RankingSlide theme={theme} rows={parties.data ?? []} unit={currency} isMobile={isMobile} />
        )}

        {/* Stok kodu slaytında ürün ADI da yazılıyor: "M.108-..." kimseye bir şey
            anlatmıyor, altındaki "DUSTER ÇAMURLUK KAPLAMA" anlatıyor. */}
        {slide === 'items' && (
          <RankingSlide theme={theme} rows={items.data ?? []} unit={currency} twoLine isMobile={isMobile} />
        )}

        {slide === 'brands' && (
          <RankingSlide theme={theme} rows={brands.data ?? []} unit={currency} isMobile={isMobile} />
        )}

        {slide === 'categories' && (
          <RankingSlide theme={theme} rows={categories.data ?? []} unit={currency} isMobile={isMobile} />
        )}

        {slide === 'vehicles' && (
          <RankingSlide theme={theme} rows={vehicles.data ?? []} unit={currency} isMobile={isMobile} />
        )}

        {slide === 'aging' && (
          <TileSlide
            theme={theme}
            tiles={(aging.data ?? []).map((bucket, i) => ({
              key: bucket.key,
              label: bucket.label,
              value: formatNumber(bucket.lineCount),
              unit: 'kalem',
              hint: `${formatCompact(bucket.amount)} ${bucket.currency} · ${formatCompact(bucket.remainingQuantity)} adet`,
              color: theme.series[i % theme.series.length],
            }))}
          />
        )}

        {slide === 'scope' && (
          <TileSlide
            theme={theme}
            tiles={(scopes.data ?? []).map((row, i) => ({
              key: row.scope,
              label: row.label,
              value: formatCompact(row.amount),
              unit: currency,
              hint: `${formatNumber(row.lineCount)} kalem · ${formatNumber(row.partyCount)} cari`,
              color: theme.series[i % theme.series.length],
            }))}
          />
        )}
      </main>
    </div>
  );
}

// ── Slaytlar ────────────────────────────────────────────────────────────────

function SummarySlide({ theme, data, currency }: {
  theme: PresentationTheme;
  data: ReturnType<typeof useErpisOrdersSummary>['data'];
  currency: string;
}) {
  const total = data?.converted?.total ?? data?.totals[0]?.total ?? 0;

  // Kuru bulunamayan para birimleri çevrilmiş toplama GİRMİYOR (bkz. ConvertAsync). Bunu
  // söylemeden büyük rakamı göstermek, eksik bir toplamı tam gibi sunmak olurdu.
  const missingRates = data?.converted?.missingRates ?? [];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 md:gap-4">
      {/* Tek büyük rakam: uzaktan okunacak ilk şey bu. */}
      <div
        className="flex flex-1 flex-col items-center justify-center rounded-xl border p-4"
        style={{ borderColor: theme.border, background: theme.surface }}
      >
        <span className="text-[11.5px] sm:text-[13px] font-bold uppercase tracking-[0.1em]" style={{ color: theme.muted }}>
          Sipariş Tutarı
        </span>
        <span className="mt-2 text-[44px] xs:text-[54px] sm:text-[68px] md:text-[104px] font-extrabold leading-none tabular-nums">
          {formatCompact(total)}
        </span>
        <span className="mt-2 text-[15px] sm:text-[18px] font-bold" style={{ color: theme.muted }}>{currency}</span>
        {missingRates.length > 0 && (
          <span className="mt-3 text-center text-[12px] sm:text-[14px] font-semibold" style={{ color: theme.muted }}>
            Kuru bulunamadığı için toplama dahil değil: {missingRates.join(', ')}
          </span>
        )}
      </div>

      <div className="grid shrink-0 grid-cols-2 gap-2.5 md:gap-3 md:grid-cols-4">
        {[
          { label: 'Sipariş', value: formatNumber(data?.orderCount) },
          { label: 'Ürün', value: formatNumber(data?.itemCount) },
          { label: 'Cari', value: formatNumber(data?.partyCount) },
          { label: 'Açık Kalem', value: formatNumber(data?.openLineCount) },
        ].map((stat) => (
          <div
            key={stat.label}
            className="flex flex-col gap-0.5 sm:gap-1 rounded-lg border px-3 py-2 sm:px-4 sm:py-3"
            style={{ borderColor: theme.border, background: theme.surface }}
          >
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.06em]" style={{ color: theme.muted }}>
              {stat.label}
            </span>
            <span className="text-[20px] sm:text-[26px] md:text-[34px] font-extrabold leading-none tabular-nums">
              {stat.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrendSlide({ theme, points, currency, isMobile = false }: {
  theme: PresentationTheme;
  points: { bucket: string; amount: number }[];
  currency: string;
  isMobile?: boolean;
}) {
  const rows = points
    .slice()
    .sort((a, b) => a.bucket.localeCompare(b.bucket))
    .map((p) => ({ ...p, label: formatBucketLabel(p.bucket) }));

  if (rows.length === 0) return <EmptySlide theme={theme} />;

  return (
    <div
      className="flex min-h-0 flex-1 flex-col rounded-xl border p-2.5 sm:p-4 md:p-6"
      style={{ borderColor: theme.border, background: theme.surface }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={rows}
          margin={{
            top: 12,
            right: isMobile ? 8 : 12,
            left: isMobile ? -14 : 4,
            bottom: 4,
          }}
        >
          <defs>
            <linearGradient id="erpisPresentTrend" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={theme.accent} stopOpacity={0.42} />
              <stop offset="100%" stopColor={theme.accent} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="label"
            tick={{ fontSize: isMobile ? 11 : 15, fill: theme.muted }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: isMobile ? 11 : 15, fill: theme.muted }}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatAxis}
            width={isMobile ? 48 : 82}
          />
          <Tooltip
            contentStyle={{
              background: theme.background, border: `1px solid ${theme.border}`,
              borderRadius: 8, fontSize: isMobile ? 12 : 15, color: theme.text,
            }}
            formatter={(value: unknown) => [
              formatNumber(typeof value === 'number' ? value : null, 2),
              currency ? `Tutar (${currency})` : 'Tutar',
            ]}
          />
          <Area
            type="monotone"
            dataKey="amount"
            stroke={theme.accent}
            strokeWidth={isMobile ? 2 : 3}
            fill="url(#erpisPresentTrend)"
          >
            {/* Nokta başına değer YAZILI. Sunumda ipucu yok — eğrinin şeklini görüp
                "peki mart kaçtı" diye sormak zorunda kalınıyordu. On ikiden fazla
                nokta olunca etiketler üst üste bineceği için yazılmıyor. */}
            {rows.length <= (isMobile ? 6 : 12) && (
              <LabelList
                dataKey="amount"
                position="top"
                offset={isMobile ? 8 : 12}
                formatter={(value: unknown) => formatCompact(typeof value === 'number' ? value : null)}
                style={{ fill: theme.text, fontSize: isMobile ? 10.5 : 13, fontWeight: 700 }}
              />
            )}
          </Area>
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

const LABEL_MAX_LENGTH = 28;
const SUBLABEL_MAX_LENGTH = 34;

function clip(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

// Stok kodu slaytında eksende İKİ SATIR: üstte kod, altında ürün adı.
//
// Recharts'ın kendi tick'i tek satırlık metin çiziyor; iki satır için kendi tick'imizi
// veriyoruz. Alternatif "KOD — Ad" tek satırı denendi, 270px'e sığmıyordu ve ad hep
// kesiliyordu — yani hiç yazmamakla aynı kapıya çıkıyordu.
interface TwoLineTickProps {
  x?: number | string;
  y?: number | string;
  payload?: { value?: string };
}

function TwoLineTick({ x, y, payload, theme, subLabels, isMobile = false }: TwoLineTickProps & {
  theme: PresentationTheme;
  subLabels: Record<string, string>;
  isMobile?: boolean;
}) {
  const value = payload?.value ?? '';
  const sub = subLabels[value];

  return (
    <g transform={`translate(${x ?? 0},${y ?? 0})`}>
      <text
        x={-6}
        y={sub ? (isMobile ? -2 : -3) : (isMobile ? 3 : 5)}
        textAnchor="end"
        fontSize={isMobile ? 10.5 : 15}
        fontWeight={700}
        fill={theme.text}
      >
        {value}
      </text>
      {sub && (
        <text
          x={-6}
          y={isMobile ? 9 : 14}
          textAnchor="end"
          fontSize={isMobile ? 8.5 : 12.5}
          fill={theme.muted}
        >
          {sub}
        </text>
      )}
    </g>
  );
}

function RankingSlide({ theme, rows, unit, twoLine = false, isMobile = false }: {
  theme: PresentationTheme;
  rows: ErpisBreakdownItem[];
  unit: string;
  /** Eksende ikinci satır (stok kodunun altında ürün adı). */
  twoLine?: boolean;
  isMobile?: boolean;
}) {
  if (rows.length === 0) return <EmptySlide theme={theme} />;

  const labelMax = isMobile ? (twoLine ? 16 : 13) : LABEL_MAX_LENGTH;
  const sublabelMax = isMobile ? 16 : SUBLABEL_MAX_LENGTH;

  const chartRows = rows.map((item, i) => ({
    ...item,
    short: clip(item.label, labelMax),
    fill: theme.series[i % theme.series.length],
  }));

  const subLabels = Object.fromEntries(
    chartRows
      .filter((row) => row.subLabel)
      .map((row) => [row.short, clip(row.subLabel as string, sublabelMax)]));

  return (
    <div
      className="flex min-h-0 flex-1 flex-col rounded-xl border p-2.5 sm:p-4 md:p-6"
      style={{ borderColor: theme.border, background: theme.surface }}
    >
      <ResponsiveContainer width="100%" height="100%">
        {/* Sağ boşluk çubuğun ucundaki rakama ayrıldı — sunumda kimse fareyi ipucunun
            üstüne getiremiyor, değer ekranda YAZILI olmalı. */}
        <BarChart
          data={chartRows}
          layout="vertical"
          margin={{
            top: 4,
            right: isMobile ? 54 : 132,
            left: isMobile ? -16 : 8,
            bottom: 4,
          }}
        >
          <XAxis
            type="number"
            tick={{ fontSize: isMobile ? 10.5 : 14, fill: theme.muted }}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatAxis}
          />
          <YAxis
            type="category"
            dataKey="short"
            tick={twoLine
              ? (props: TwoLineTickProps) => (
                <TwoLineTick
                  x={props.x}
                  y={props.y}
                  payload={props.payload}
                  theme={theme}
                  subLabels={subLabels}
                  isMobile={isMobile}
                />
              )
              : { fontSize: isMobile ? 10.5 : 15, fill: theme.text }}
            tickLine={false}
            axisLine={false}
            width={isMobile ? (twoLine ? 116 : 92) : (twoLine ? 310 : 270)}
          />
          <Tooltip
            cursor={{ fill: theme.border }}
            contentStyle={{
              background: theme.background, border: `1px solid ${theme.border}`,
              borderRadius: 8, fontSize: isMobile ? 12 : 15, color: theme.text,
            }}
            formatter={(value: unknown) => [
              formatNumber(typeof value === 'number' ? value : null, 2),
              unit ? `Tutar (${unit})` : 'Tutar',
            ]}
            labelFormatter={(_, payload) => payload?.[0]?.payload?.label ?? ''}
          />
          <Bar dataKey="comparableAmount" radius={[0, 5, 5, 0]} maxBarSize={isMobile ? 22 : 34}>
            {chartRows.map((row) => (
              <Cell key={row.key} fill={row.fill} />
            ))}
            <LabelList
              dataKey="comparableAmount"
              position="right"
              formatter={(value: unknown) => formatCompact(typeof value === 'number' ? value : null)}
              style={{ fill: theme.text, fontSize: isMobile ? 10.5 : 14, fontWeight: 700 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function TileSlide({ theme, tiles }: {
  theme: PresentationTheme;
  tiles: { key: string; label: string; value: string; unit: string; hint: string; color: string }[];
}) {
  if (tiles.length === 0) return <EmptySlide theme={theme} />;

  return (
    <div className={`grid min-h-0 flex-1 gap-2.5 md:gap-3 ${tiles.length > 2 ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-1 md:grid-cols-2'}`}>
      {tiles.map((tile) => (
        <div
          key={tile.key}
          className="flex flex-col justify-center gap-1.5 md:gap-2 rounded-xl border p-3.5 sm:p-5 md:p-8"
          style={{ borderColor: theme.border, background: theme.surface }}
        >
          <span className="flex items-center gap-1.5 md:gap-2 text-[11px] md:text-[12px] font-bold uppercase tracking-[0.06em]" style={{ color: theme.muted }}>
            <span className="h-2 w-2 md:h-2.5 md:w-2.5 rounded-sm" style={{ background: tile.color }} />
            {tile.label}
          </span>
          <span className="text-[26px] xs:text-[32px] md:text-[60px] font-extrabold leading-none tabular-nums">
            {tile.value}
          </span>
          <span className="text-[12px] md:text-[13px] font-bold" style={{ color: theme.muted }}>{tile.unit}</span>
          <span className="text-[10.5px] sm:text-[12px] md:text-[14px]" style={{ color: theme.muted }}>{tile.hint}</span>
        </div>
      ))}
    </div>
  );
}

function EmptySlide({ theme }: { theme: PresentationTheme }) {
  return (
    <div
      className="flex min-h-0 flex-1 items-center justify-center rounded-xl border text-[18px]"
      style={{ borderColor: theme.border, background: theme.surface, color: theme.muted }}
    >
      Bu slayt için veri yok.
    </div>
  );
}

// ── Ayarlar + filtreler paneli ───────────────────────────────────────────────
//
// Önceden tema/firma/slayt seçimi ("Ayarlar") ve filtreler ("Filtreler") iki ayrı
// düğme ve iki ayrı panel altındaydı — "renk temasını nereden değiştiriyordum"
// sorusu toplantı ortasında soruluyordu. Artık TEK düğme, TEK panel, tek yerden.
//
// Filtre çubuğu modülün KENDİ çubuğu (ErpisQueryFilterBar) — ikinci bir filtre
// arayüzü yazılmadı: tarih aralığı, tarih alanı, çözünürlük, pazar, marka/model/
// kategori/cari seçimleri ve arama birebir aynı davranıyor. Uygulama temasıyla
// bir KART içinde çiziliyor: sunum temaları (Gece/Grafit/Açık) yalnız slaytları
// boyar; açılır menüler koyu sunum zemininde doğrudan çizilince okunmuyordu.
function SettingsPanel({
  theme, themeKey, onThemeChange, companies, companyId, onCompanyChange, hidden, onToggleSlide,
  filter, filterOptions, activeFilterCount, onFilterChange, onFilterReset, onClose,
}: {
  theme: PresentationTheme;
  themeKey: string;
  onThemeChange: (key: string) => void;
  companies: { id: number; name: string }[];
  companyId: number | null;
  onCompanyChange: (id: number | null) => void;
  hidden: readonly Slide[];
  onToggleSlide: (key: Slide) => void;
  filter: ErpisQueryFilter;
  filterOptions?: ErpisFilterOptions;
  activeFilterCount: number;
  onFilterChange: (patch: Partial<ErpisQueryFilter>) => void;
  onFilterReset: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className="flex shrink-0 flex-col gap-3 border-b px-3.5 py-3 sm:px-5 md:px-8"
      style={{ borderColor: theme.border, background: theme.surface }}
    >
      <Row label="Tema" theme={theme}>
        {THEMES.map((option) => (
          <Chip
            key={option.key}
            theme={theme}
            active={option.key === themeKey}
            onClick={() => onThemeChange(option.key)}
          >
            {option.label}
          </Chip>
        ))}
      </Row>

      {/* Firma sunumun İÇİNDEN değişebiliyor: toplantıda "bir de şu firmayı gösterelim"
          demek, sunumdan çıkıp modüle dönmeyi gerektiriyordu. */}
      {companies.length > 1 && (
        <Row label="Firma" theme={theme}>
          {companies.map((company) => (
            <Chip
              key={company.id}
              theme={theme}
              active={company.id === companyId}
              onClick={() => onCompanyChange(company.id)}
            >
              {company.name}
            </Chip>
          ))}
        </Row>
      )}

      <Row label="Slaytlar" theme={theme}>
        {SLIDES.map((key) => (
          <Chip
            key={key}
            theme={theme}
            active={!hidden.includes(key)}
            onClick={() => onToggleSlide(key)}
          >
            {SLIDE_TITLES[key]}
          </Chip>
        ))}
      </Row>

      <div
        className="flex flex-col gap-2.5 rounded-lg border border-[var(--border-soft)] bg-[var(--card)] p-3 text-[var(--fg)]"
        style={filterCardVars(theme)}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col">
            <span className="text-[13px] font-extrabold">Sunum filtreleri</span>
            <span className="text-[11px] text-[var(--fg-muted)]">
              Tüm slaytlara anında uygulanır; sunumdan çıkınca da geçerli kalır.
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onFilterReset}
              disabled={activeFilterCount === 0}
              className="h-8 rounded-[4px] border border-[var(--border-soft)] px-3 text-[12px] font-bold disabled:opacity-40"
            >
              Sıfırla
            </button>
            <button
              type="button"
              onClick={onClose}
              className="h-8 rounded-[4px] bg-[var(--fg)] px-3 text-[12px] font-bold text-[var(--bg)]"
            >
              Tamam
            </button>
          </div>
        </div>

        <ErpisQueryFilterBar
          filter={filter}
          options={filterOptions}
          activeCount={activeFilterCount}
          onChange={onFilterChange}
          onReset={onFilterReset}
        />
      </div>
    </div>
  );
}

// Filtre çubuğu uygulamanın CSS değişkenleriyle (--card, --fg…) boyanıyor. Kartın içinde
// bu değişkenler SUNUM TEMASINA eşleniyor: koyu sunum zemininde bembeyaz bir kart
// sırıtıyordu. Açılır listeler body'ye portallandığı için uygulama temasında kalır.
function filterCardVars(theme: PresentationTheme): React.CSSProperties {
  return {
    '--card': theme.surface,
    '--card-hover': theme.border,
    '--bg': theme.background,
    '--bg-subtle': theme.surface,
    '--border': theme.border,
    '--border-soft': theme.border,
    '--fg': theme.text,
    '--fg-muted': theme.muted,
    '--fg-subtle': theme.muted,
  } as React.CSSProperties;
}

function Row({ label, theme, children }: {
  label: string;
  theme: PresentationTheme;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span
        className="w-[64px] shrink-0 text-[11px] font-bold uppercase tracking-[0.06em]"
        style={{ color: theme.muted }}
      >
        {label}
      </span>
      {children}
    </div>
  );
}

function Chip({ theme, active, onClick, children }: {
  theme: PresentationTheme;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="rounded-full px-3 py-1 text-[12px] font-bold transition-opacity"
      style={{
        background: active ? theme.accent : 'transparent',
        color: active ? theme.background : theme.muted,
        border: `1px solid ${active ? theme.accent : theme.border}`,
      }}
    >
      {children}
    </button>
  );
}

function IconButton({ label, theme, onClick, children }: {
  label: string;
  theme: PresentationTheme;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-9 w-9 items-center justify-center rounded-lg transition-opacity hover:opacity-70"
      style={{ border: `1px solid ${theme.border}`, color: theme.text }}
    >
      {children}
    </button>
  );
}
