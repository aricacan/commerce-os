'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, SlidersHorizontal, ChevronDown, LineChart, Save, ArrowLeft, Search, Calculator } from 'lucide-react';

import { forecastApi } from '../../lib/api/forecast';
import type {
  ForecastSeries,
  ProductCostFilter,
  ProductStockFilter,
  ScopeFilters,
  SavedLayout,
  SeriesDensityFilter,
  TerminalTimeframe,
} from '../../types/forecast';
import { ForecastChart } from '../../components/analytics/terminal/ForecastChart';
import { METRICS, METRIC_ORDER, type ChartMetricKey } from '../../components/analytics/terminal/metrics';
import { ForecastTree } from '../../components/analytics/terminal/ForecastTree';
import { MoversTable } from '../../components/analytics/terminal/MoversTable';
import { SignalStrip } from '../../components/analytics/terminal/SignalStrip';
import { Dropdown, type DropdownOption } from '../../components/analytics/terminal/Dropdown';
import { percent, TRY } from '../../components/analytics/terminal/format';
import { SkuForecastPanel } from './SkuForecastPanel';
import { LeadTimeSettingsPanel } from './LeadTimeSettingsPanel';
import { ForecastSettingsPanel } from './ForecastSettingsPanel';
import { AnalysisDock, DOCK_SPLIT, type DockTab, type DockHeightMode } from './AnalysisDock';
import { NoticeCenter, type TerminalNotice } from './NoticeCenter';
import { DetailOverlay, DetailButton } from './DetailOverlay';
import { SymbolSearchModal } from './SymbolSearchModal';
import { MarginSimulatorModal } from './MarginSimulatorModal';

const TIMEFRAMES: { key: TerminalTimeframe; label: string }[] = [
  { key: 'Day', label: '1G' },
  { key: 'Week', label: '1H' },
  { key: 'Month', label: '1A' },
];

const TOTAL_KEY = 'toplam';
const REFRESH_MS = 300_000;

// F1 - aynı anda açılabilecek en fazla gösterge pane'i. Sınır keyfî değil:
// her pane ana grafiği kısaltır; 3'ten sonra ana seri okunamaz hale geliyor.
const MAX_PANES = 3;

// F3 - izleme listesi sekmeleri. "Ağaç" ilk sırada ve varsayılan: uzlaştırılmış
// hiyerarşi bu ürünün istatistiksel omurgası, çok satanlar onun tamamlayıcısı.
type WatchTab = 'tree' | 'top' | 'categories' | 'risky';
const WATCH_TABS: { key: WatchTab; label: string }[] = [
  { key: 'tree', label: 'Ağaç' },
  { key: 'top', label: 'Çok satanlar' },
  { key: 'categories', label: 'Kategoriler' },
  { key: 'risky', label: 'Riskli' },
];

const DEFAULT_SCOPE: ScopeFilters = { stockFilter: 'All', costFilter: 'All', densityFilter: 'All' };

const STOCK_OPTIONS: DropdownOption<ProductStockFilter>[] = [
  { value: 'All', label: 'Tümü' },
  { value: 'InStockOnly', label: 'Yalnızca stoklu' },
  { value: 'OutOfStockOnly', label: 'Yalnızca stoksuz' },
];
const COST_OPTIONS: DropdownOption<ProductCostFilter>[] = [
  { value: 'All', label: 'Tümü' },
  { value: 'HasCost', label: 'Alış fiyatı olanlar', hint: 'marj hesaplanabilen ürünler' },
  { value: 'NoCost', label: 'Alış fiyatı olmayanlar' },
];
const DENSITY_OPTIONS: DropdownOption<SeriesDensityFilter>[] = [
  { value: 'All', label: 'Tümü' },
  { value: 'DenseOnly', label: 'Yalnızca yoğun', hint: 'tek başına tahmin edilebilen seriler' },
  { value: 'SparseOnly', label: 'Yalnızca seyrek' },
];

/**
 * SellingView — ciro/talep tahmin terminali.
 *
 * TASARIM DİLİ TRADINGVIEW'DEN, VERİ DİLİ DEĞİL: üst ince araç çubuğu, sağda
 * izleme listesi, ortada grafik, ALTTA analiz rıhtımı — borsa terminalinin
 * ETKİLEŞİM MODELİ alınır. Mum grafiği (OHLC) kasıtlı olarak YOK — cironun
 * açılış/kapanışı yoktur, sahte bir OHLC üretmek veriyi uydurmak olurdu
 * (bkz. ForecastChart.tsx).
 *
 * ANALİZ GÖRÜNÜR OLMALI: göstergeler, analistler, satın alma önerileri, tarayıcı
 * ve kural testi eskiden ayrı modal pencerelerdeydi; kullanıcı hiçbirini
 * görmüyordu. Hepsi artık alttaki rıhtımın sekmelerinde, üstte de yalnızca
 * uyarı veren göstergeleri özetleyen bir şerit var.
 */
export function SellingViewContent({ onClose }: { onClose: () => void }) {
  const [timeframe, setTimeframe] = useState<TerminalTimeframe>('Day');
  const [selectedKey, setSelectedKey] = useState<string>(TOTAL_KEY);
  const [scope, setScope] = useState<ScopeFilters>(DEFAULT_SCOPE);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [watchTab, setWatchTab] = useState<WatchTab>('tree');
  const [metric, setMetric] = useState<ChartMetricKey>('revenue');
  const [paneCodes, setPaneCodes] = useState<string[]>([]);
  const [paneMenuOpen, setPaneMenuOpen] = useState(false);
  const [compareKey, setCompareKey] = useState<string | null>(null);
  const [dockTab, setDockTab] = useState<DockTab>('indicators');
  const [dockOpen, setDockOpen] = useState(true);
  // Grafik ızgarası ile rıhtım kalan yüksekliği PAYLAŞIR; pay burada tutulur çünkü
  // kararın iki tarafı da (ızgara ve rıhtım) bu bileşenin çocukları.
  const [dockHeight, setDockHeight] = useState<DockHeightMode>('normal');
  const [watchDetailOpen, setWatchDetailOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [marginSimOpen, setMarginSimOpen] = useState(false);
  const queryClient = useQueryClient();

  // TradingView tarzı klavye kısayolları
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const isEditing =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      if (e.key === 'Escape') {
        if (searchOpen) {
          setSearchOpen(false);
          return;
        }
        if (marginSimOpen) {
          setMarginSimOpen(false);
          return;
        }
        if (filtersOpen) {
          setFiltersOpen(false);
          return;
        }
        if (paneMenuOpen) {
          setPaneMenuOpen(false);
          return;
        }
        if (watchDetailOpen) {
          setWatchDetailOpen(false);
          return;
        }
      }

      // Ctrl+K veya / ile sembol arama
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
        return;
      }
      if (!isEditing && e.key === '/') {
        e.preventDefault();
        setSearchOpen(true);
        return;
      }

      if (isEditing) return;

      // Zaman dilimi kısayolları
      if (e.key === '1' || e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setTimeframe('Day');
      } else if (e.key.toLowerCase() === 'w') {
        e.preventDefault();
        setTimeframe('Week');
      } else if (e.key.toLowerCase() === 'm') {
        e.preventDefault();
        setTimeframe('Month');
      }
      // Analiz rıhtımı sekme kısayolları
      else if (e.key.toLowerCase() === 'i') {
        e.preventDefault();
        setDockTab('indicators');
        setDockOpen(true);
      } else if (e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setDockTab('purchase');
        setDockOpen(true);
      } else if (e.key.toLowerCase() === 's') {
        e.preventDefault();
        setDockTab('screener');
        setDockOpen(true);
      } else if (e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setDockTab('agents');
        setDockOpen(true);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // marginSimOpen de LISTEDE: Escape isleyicisi onu OKUYOR ama bagimliliklarda yoktu,
    // yani handler hep ilk render'daki false'u goruyordu -> Esc marj simulatorunu
    // KAPATMIYORDU. Kardes durumlarin (searchOpen, filtersOpen...) hepsi zaten listedeydi;
    // bu unutulmus.
  }, [searchOpen, marginSimOpen, filtersOpen, paneMenuOpen, watchDetailOpen]);

  const isDefaultScope =
    scope.stockFilter === 'All' && scope.costFilter === 'All' && scope.densityFilter === 'All';

  const { data, isLoading } = useQuery({
    queryKey: ['forecast-latest', timeframe],
    queryFn: () => forecastApi.latest(timeframe),
    refetchInterval: REFRESH_MS,
  });

  // F5 - kaydedilmiş çalışma alanı. Yalnızca BİR KEZ uygulanır (restoredRef):
  // aksi halde kullanıcı metrik değiştirdiğinde sorgu yeniden çözülüp seçimi
  // eski düzene geri çevirirdi.
  const { data: savedSettings } = useQuery({
    queryKey: ['sellingview-forecast-settings'],
    queryFn: () => forecastApi.settings.get(),
    staleTime: 60 * 60_000,
  });

  const restoredRef = useRef(false);
  useEffect(() => {
    if (restoredRef.current || !savedSettings?.layoutJson) return;
    restoredRef.current = true;
    try {
      const l = JSON.parse(savedSettings.layoutJson) as SavedLayout;
      if (l.timeframe && TIMEFRAMES.some((t) => t.key === l.timeframe)) setTimeframe(l.timeframe);
      if (l.metric && l.metric in METRICS) setMetric(l.metric as ChartMetricKey);
      if (Array.isArray(l.panes)) setPaneCodes(l.panes.slice(0, MAX_PANES));
      if (l.watchTab && WATCH_TABS.some((t) => t.key === l.watchTab)) setWatchTab(l.watchTab as WatchTab);
    } catch {
      // Bozuk düzen kaydı ekranı DÜŞÜRMEZ — varsayılan düzenle devam edilir.
    }
  }, [savedSettings]);

  const saveLayout = useMutation({
    // Yalnızca düzen gönderilir — eskiden elimizdeki (bayat olabilecek) TÜM ayar
    // nesnesi PUT ediliyor, başkasının kaydettiği motor ayarları eziliyordu.
    mutationFn: () =>
      forecastApi.settings.saveLayout(
        JSON.stringify({ timeframe, metric, panes: paneCodes, watchTab } satisfies SavedLayout),
      ),
    onSuccess: (saved) => queryClient.setQueryData(['sellingview-forecast-settings'], saved),
  });

  // F3 - yalnızca ilgili sekme açıldığında çekilir; ağaç sekmesinde boşuna sorgu yok.
  const {
    data: movers,
    isLoading: moversLoading,
    isError: moversError,
  } = useQuery({
    queryKey: ['forecast-movers'],
    queryFn: () => forecastApi.movers(30, 30),
    enabled: watchTab !== 'tree',
    staleTime: REFRESH_MS,
  });

  const { data: onboarding } = useQuery({
    queryKey: ['forecast-onboarding-status'],
    queryFn: () => forecastApi.onboardingStatus(),
    staleTime: 60 * 60_000,
  });

  // A3 - kapsam filtresi degistirildiginde "Yeniden hesapla" GERCEKTEN o kapsamla
  // koşar ve sonuc DOGRUDAN gosterilir (queryClient.setQueryData) - eskiden yalnizca
  // invalidateQueries cagriliyordu, bu da /latest'i (gecelik, FILTRESIZ kosuyu) yeniden
  // cekiyordu; canli sonuc hicbir zaman ekrana gelmiyordu.
  const recompute = useMutation({
    mutationFn: () =>
      forecastApi.recompute({
        timeframe,
        horizon: 30,
        scope: isDefaultScope ? undefined : scope,
      }),
    onSuccess: (result) => {
      queryClient.setQueryData(['forecast-latest', timeframe], result);
    },
  });

  const series = useMemo(() => data?.series ?? [], [data]);
  const selected = useMemo<ForecastSeries | undefined>(
    () => series.find((s) => s.key === selectedKey) ?? series.find((s) => s.key === TOTAL_KEY) ?? series[0],
    [series, selectedKey],
  );

  const regimeBreak = selected?.events.find((e) => e.kind === 'regime_break')?.timestamp ?? null;

  // Grafik son 90 kovayı gösterir: tamamı 361 kova ve hepsini çizmek sütunları
  // okunamaz hale getiriyor. Model TÜM geçmişle eğitiliyor, kısıtlama sadece görsel.
  const history = useMemo(() => (selected?.history ?? []).slice(-90), [selected]);

  // F1 - pane'e çizilebilecek göstergeler: nokta dizisi olan VE seçili seriye ait
  // olanlar. Göstergeler "toplam" serisinde hesaplanır; alt seri seçildiğinde
  // toplamın RSI'ını onun grafiğine çizmek YANLIŞ atıf olurdu — o yüzden filtreli.
  const chartableIndicators = useMemo(
    () => (selected?.indicators ?? []).filter((i) => i.points.length > 0 && i.seriesKey === selected?.key),
    [selected],
  );
  const chartableCodes = useMemo(() => chartableIndicators.map((i) => i.code), [chartableIndicators]);
  const indicatorPanes = useMemo(
    () => chartableIndicators.filter((i) => paneCodes.includes(i.code)).slice(0, MAX_PANES),
    [chartableIndicators, paneCodes],
  );

  const togglePane = useCallback(
    (code: string) =>
      setPaneCodes((prev) => {
        if (prev.includes(code)) return prev.filter((c) => c !== code);
        if (prev.length >= MAX_PANES) return prev;
        return [...prev, code];
      }),
    [],
  );

  // F4 - karşılaştırma. Seçili serinin kendisi listede YOKTUR (kendisiyle
  // karşılaştırmak anlamsız) ve durmuş seriler dışlanır (tahmin üretilmiyor).
  const compareOptions = useMemo<DropdownOption<string>[]>(
    () =>
      series
        .filter((s) => s.key !== selected?.key && s.state !== 'Dormant')
        .map((s) => ({ value: s.key, label: s.displayName })),
    [series, selected],
  );
  const compare = useMemo(() => {
    const s = series.find((x) => x.key === compareKey);
    if (!s) return null;
    return { key: s.key, displayName: s.displayName, history: s.history.slice(-90) };
  }, [series, compareKey]);

  const openIndicators = useCallback(() => {
    setDockTab('indicators');
    setDockOpen(true);
  }, []);

  // Uyarılar artık grafiğin üstünde şerit değil, araç çubuğundaki zilde
  // (bkz. NoticeCenter). Tek bir cümle bile ekranın en değerli 40 pikselini
  // kalıcı olarak yiyordu.
  const notices: TerminalNotice[] = [];
  if (onboarding && !onboarding.skuUnlocked) {
    notices.push({ key: 'onboarding', tone: 'warn', text: onboarding.message });
  }
  if (!isDefaultScope && recompute.isSuccess) {
    notices.push({
      key: 'live-scope',
      tone: 'warn',
      text: 'Bu görünüm seçtiğiniz kapsam filtreleriyle canlı hesaplandı ve kaydedilmedi — sayfayı yenilediğinizde gecelik (filtresiz) koşuya döner.',
    });
  }
  if (data?.status === 'not_computed' && data.message) {
    notices.push({ key: 'not-computed', tone: 'warn', text: data.message });
  }
  if (data?.isStale && data.staleReason) {
    notices.push({ key: 'stale', tone: 'warn', text: data.staleReason });
  }
  if (recompute.isError) {
    notices.push({
      key: 'recompute-error',
      tone: 'bad',
      text: 'Tahmin servisi yanıt vermedi. Ekranda son kaydedilmiş koşu gösteriliyor.',
    });
  }
  if (selected?.state === 'Sparse') {
    notices.push({
      key: 'sparse',
      tone: 'warn',
      text: 'Bu seri tek başına tahmin edilemeyecek kadar seyrek — toplamdan pay olarak hesaplandı. Rakamı tek başına karar için kullanmayın.',
    });
  }
  if (selected?.state === 'Dormant') {
    notices.push({
      key: 'dormant',
      tone: 'bad',
      text: 'Bu seri uzun süredir sipariş almıyor, durmuş sayıldı. Tahmin üretilmedi.',
    });
  }

  // İzleme listesinin gövdesi iki yerde çizilir: sağ sütunun kutusunda ve
  // "Detay" tam ekranında. Tek fonksiyon — ikisi ayrışamaz.
  function watchBody() {
    if (watchTab === 'tree') {
      return selected ? (
        <ForecastTree series={series} selectedKey={selected.key} onSelect={setSelectedKey} />
      ) : (
        <p className="m-0 px-3 py-4 text-ui-xs text-fg-muted">
          Uzlaştırma ağacı tahmin koşusundan gelir — henüz hesaplanmadı.
        </p>
      );
    }
    if (moversLoading) return <p className="m-0 px-3 py-4 text-ui-xs text-fg-muted">Yükleniyor…</p>;
    if (moversError) return <p className="m-0 px-3 py-4 text-ui-xs text-danger">Liste alınamadı.</p>;
    if (!movers) return null;
    if (watchTab === 'top') {
      return <MoversTable rows={movers.skus} emptyText="Bu pencerede satış yok." />;
    }
    if (watchTab === 'categories') {
      return <MoversTable rows={movers.categories} showStock={false} emptyText="Kategori satışı yok." />;
    }
    return (
      <MoversTable
        rows={movers.skus.filter((r) => r.risk === 'Stockout' || r.risk === 'Dead')}
        emptyText="Riskli SKU yok — stok kapsaması 10 günün altına düşen ya da hiç satmayan ürün bulunamadı."
      />
    );
  }

  const next30 = selected?.forecast.reduce((sum, p) => sum + p.revenue, 0) ?? 0;
  const next30Lower = selected?.forecast.reduce((sum, p) => sum + p.lower90, 0) ?? 0;
  const next30Upper = selected?.forecast.reduce((sum, p) => sum + p.upper90, 0) ?? 0;

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-bg">
      {/* ── İnce araç çubuğu (TradingView tarzı) ───────────────────────
          Sayfa artık tek parça kayıyor, bu yüzden çubuk `sticky`: aşağı
          inildiğinde zaman dilimi / yeniden hesapla / geri dön hep elde kalır. */}
      <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border-soft bg-card px-3 py-2">
        <span className="text-ui-md font-extrabold tracking-tight text-fg pr-1">
          SellingView
        </span>
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          title="Sembol veya seri ara (Ctrl+K veya /)"
          className="flex items-center gap-1.5 px-2 py-1 text-ui-xs font-semibold rounded-[5px] border border-border-soft bg-bg-subtle hover:bg-bg-subtle/80 text-fg transition-colors cursor-pointer mr-1"
        >
          <Search size={12} className="text-fg-subtle" />
          <span className="font-bold text-fg truncate max-w-[130px]">
            {selected?.displayName ?? 'Sembol Seç'}
          </span>
          <kbd className="hidden sm:inline-block px-1 py-0.5 text-ui-2xs font-mono text-fg-subtle border border-border-soft rounded bg-card">
            Ctrl+K
          </kbd>
        </button>

        <div className="flex items-center gap-1 bg-bg-subtle border border-border-soft rounded-[5px] p-0.5">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.key}
              type="button"
              onClick={() => setTimeframe(tf.key)}
              className={`px-2.5 py-1 text-ui-xs font-bold rounded-[4px] transition-colors cursor-pointer ${
                timeframe === tf.key
                  ? 'bg-fg text-bg'
                  : 'text-fg-muted hover:bg-bg-subtle'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-ui-xs font-semibold rounded-[5px] border transition-colors cursor-pointer ${
              !isDefaultScope
                ? 'border-fg text-fg bg-bg-subtle'
                : 'border-border-soft text-fg-muted hover:bg-bg-subtle'
            }`}
          >
            <SlidersHorizontal size={12} />
            <span>Filtreler</span>
            <ChevronDown size={12} className={filtersOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
          </button>

          {filtersOpen && (
            <div className="absolute top-full left-0 mt-1.5 z-40 flex flex-col gap-2 p-2.5 rounded-[6px] border border-border-soft bg-card shadow-xl w-[268px]">
              <Dropdown
                label="Stok"
                options={STOCK_OPTIONS}
                value={scope.stockFilter}
                onChange={(v) => setScope((s) => ({ ...s, stockFilter: v }))}
              />
              <Dropdown
                label="Maliyet"
                options={COST_OPTIONS}
                value={scope.costFilter}
                onChange={(v) => setScope((s) => ({ ...s, costFilter: v }))}
              />
              <Dropdown
                label="Yoğunluk"
                options={DENSITY_OPTIONS}
                value={scope.densityFilter}
                onChange={(v) => setScope((s) => ({ ...s, densityFilter: v }))}
              />
              {!isDefaultScope && (
                <span className="text-ui-2xs text-warning pt-0.5">
                  "Yeniden hesapla"ya basmadan uygulanmaz.
                </span>
              )}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => recompute.mutate()}
          disabled={recompute.isPending}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-ui-xs font-semibold rounded-[5px] border border-border-soft bg-bg-subtle hover:bg-bg-subtle text-fg transition-colors cursor-pointer disabled:opacity-50"
        >
          <RefreshCw size={12} className={recompute.isPending ? 'animate-spin' : ''} />
          <span>{recompute.isPending ? 'Hesaplanıyor…' : 'Yeniden hesapla'}</span>
        </button>

        {/* F5 - düzen AÇIK bir eylemle kaydedilir. Otomatik kaydetme, her metrik
            tıklamasında API çağrısı demek olurdu. */}
        <button
          type="button"
          onClick={() => saveLayout.mutate()}
          disabled={saveLayout.isPending || !savedSettings}
          title="Zaman dilimi, metrik, açık göstergeler ve sekme tercihini kaydet"
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-ui-xs font-semibold rounded-[5px] border border-border-soft bg-bg-subtle hover:bg-bg-subtle text-fg transition-colors cursor-pointer disabled:opacity-50"
        >
          <Save size={12} />
          <span>
            {saveLayout.isPending ? 'Kaydediliyor…' : saveLayout.isSuccess ? 'Düzen kaydedildi' : 'Düzeni kaydet'}
          </span>
        </button>

        <span className="ml-1 text-ui-2xs text-fg-subtle">
          uzlaştırma: {data?.reconciliation ?? '—'}
        </span>
        {isLoading && <span className="text-ui-2xs text-fg-subtle">yükleniyor…</span>}

        {/* Sağ uç: araçlar + ÇIKIŞ. Geri dönüş düğmesi en sağda çünkü kullanıcı
            çıkışı orada arar; eskiden 52 piksellik bir sol rayda tek başınaydı. */}
        <div className="ml-auto flex items-center gap-1.5">
          <NoticeCenter notices={notices} />
          <button
            type="button"
            onClick={() => setMarginSimOpen(true)}
            title="Marj & İndirim Başa-Baş Simülatörü"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-ui-xs font-semibold rounded-[5px] border border-border-soft bg-bg-subtle hover:bg-bg-subtle/80 text-fg transition-colors cursor-pointer"
          >
            <Calculator size={12} className="text-fg-subtle" />
            <span className="hidden xl:inline">Marj Simülatörü</span>
          </button>
          <SkuForecastPanel />
          <ForecastSettingsPanel />
          <LeadTimeSettingsPanel />
          <button
            type="button"
            onClick={onClose}
            title="SellingView'i kapat"
            aria-label="SellingView'i kapat"
            className="flex items-center gap-1.5 px-2.5 py-1.5 ml-1 text-ui-xs font-semibold rounded-[5px] border border-border bg-bg-subtle hover:bg-bg-subtle text-fg transition-colors cursor-pointer"
          >
            <ArrowLeft size={13} />
            <span>Geri dön</span>
          </button>
        </div>
      </header>

      {/* ── Tek ekran ────────────────────────────────────────────────────
          SellingView bir terminal: ana ekran KAYMAZ. Grafik ve izleme listesi
          kalan yüksekliği paylaşır, rıhtım alt şerittir. Kutusuna sığmayan her
          panelin "Detay" düğmesi var (bkz. DetailOverlay) — sayfayı uzatmak ya
          da içeriği minik bir pencereden okutmak yerine üçüncü yol. */}
      {/* MOBİLDE ızgara tek sütuna düşer ve iki panel ALT ALTA gelir; `grid-auto-rows: auto`
          olduğu için satırlar içeriğe göre büyür ve sınırlı yüksekliği taşardı — taşan kısım
          da kabuğun overflow:hidden'ı yüzünden görünmeden kırpılıyordu. Mobilde bu bölge
          kendi içinde kayar (panellere okunabilir bir taban yüksekliği verilir), masaüstünde
          tek satır olduğu için kaydırma yoktur: ekran birebir oturur. */}
      <div
        className={`grid min-h-0 grid-cols-1 gap-2.5 overflow-y-auto terminal-scroll px-2.5 pt-2.5 lg:grid-cols-[minmax(0,1fr)_336px] lg:grid-rows-1 lg:overflow-hidden ${
          dockOpen ? DOCK_SPLIT[dockHeight].main : 'flex-1'
        }`}
      >
        {selected ? (
          <section className="flex min-h-[340px] flex-col overflow-hidden rounded-[6px] border border-border-soft bg-card lg:min-h-0">
            {/* TEK SATIR: sembol + istatistikler + metrik + karşılaştırma +
                gösterge menüsü. Önce iki ayrı satırdı ve ikisi birden grafiği
                80 piksel aşağı itiyordu. */}
            <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-border-soft px-3 py-2">
              <div className="flex items-baseline gap-2">
                <span className="text-ui-2xs font-bold uppercase tracking-wider text-fg-subtle">
                  {selected.displayName}
                </span>
                <span className="text-lg font-bold leading-none tabular-nums text-fg">
                  {TRY.format(next30)}
                </span>
              </div>
              <Stat label="%90 aralık" value={`${TRY.format(next30Lower)} – ${TRY.format(next30Upper)}`} />
              <Stat label="30g doğruluk" value={mapeToAccuracy(selected.accuracy.mapeMonthly)} />

              <span className="h-4 w-px bg-border-soft" />

              <div className="flex items-center gap-0.5 rounded-[5px] bg-bg-subtle p-0.5">
                {METRIC_ORDER.map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setMetric(k)}
                    title={METRICS[k].label}
                    className={`cursor-pointer rounded-[4px] px-2 py-0.5 text-ui-xs font-bold transition-colors ${
                      metric === k ? 'bg-card text-fg shadow-sm' : 'text-fg-muted hover:text-fg'
                    }`}
                  >
                    {METRICS[k].short}
                  </button>
                ))}
              </div>

              {compareOptions.length > 0 && (
                <Dropdown
                  options={compareOptions}
                  value={compareKey ?? ''}
                  onChange={(v) => setCompareKey(v || null)}
                  placeholder="Karşılaştır…"
                  clearable
                  widthClass="w-[168px]"
                />
              )}

              {compare && (
                <span className="text-ui-2xs text-fg-muted">
                  100&apos;e endeksli · <span className="text-fg">■</span> {selected.displayName} ·{' '}
                  <span className="text-warning">■</span> {compare.displayName}
                </span>
              )}

              {!METRICS[metric].hasForecast && (
                <span className="text-ui-2xs text-fg-muted">
                  bu metrikte model tahmini yok — yalnızca gerçekleşen
                </span>
              )}

              <div className="relative ml-auto">
                <button
                  type="button"
                  onClick={() => setPaneMenuOpen((v) => !v)}
                  disabled={chartableIndicators.length === 0}
                  className="flex cursor-pointer items-center gap-1 rounded-[5px] border border-border-soft px-2 py-1 text-ui-xs font-semibold text-fg-muted transition-colors hover:bg-bg-subtle disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <LineChart size={11} />
                  Gösterge ekle
                  {indicatorPanes.length > 0 && <span className="text-fg">({indicatorPanes.length})</span>}
                </button>

                {paneMenuOpen && (
                  <div className="absolute right-0 top-full z-40 mt-1 max-h-[260px] w-[248px] overflow-y-auto rounded-[6px] border border-border-soft bg-card py-1 shadow-xl">
                    {chartableIndicators.map((i) => {
                      const on = paneCodes.includes(i.code);
                      const full = !on && indicatorPanes.length >= MAX_PANES;
                      return (
                        <button
                          key={i.code}
                          type="button"
                          disabled={full}
                          onClick={() => togglePane(i.code)}
                          className={`flex w-full cursor-pointer items-center gap-2 px-2.5 py-1.5 text-left text-ui-xs disabled:cursor-not-allowed disabled:opacity-35 ${
                            on ? 'font-semibold text-fg' : 'text-fg-muted hover:bg-bg-subtle'
                          }`}
                        >
                          <span className="w-3 shrink-0">{on ? '✓' : ''}</span>
                          <span className="truncate">{i.label}</span>
                        </button>
                      );
                    })}
                    <div className="mt-1 border-t border-border-soft px-2.5 py-1 text-ui-2xs text-fg-subtle">
                      en fazla {MAX_PANES} gösterge · göstergeler &quot;toplam&quot; serisinde hesaplanır
                    </div>
                  </div>
                )}
              </div>
            </div>

            <SignalStrip indicators={selected.indicators} onOpenIndicators={openIndicators} />

            <ForecastChart
              series={selected}
              history={history}
              regimeBreakAt={regimeBreak}
              metric={metric}
              indicatorPanes={indicatorPanes}
              compare={compare}
            />

            <p className="m-0 shrink-0 border-t border-border-soft px-3 py-1.5 text-ui-2xs text-fg-subtle">
              Nötr sütun = gerçekleşen {METRICS[metric].label.toLowerCase()}
              {METRICS[metric].hasForecast && <> · renkli çizgi = tahmin</>}
              {METRICS[metric].forecastBand && (
                <> · kesikli çizgiler = %90 bant · <span className="text-danger">kırmızı sütun</span> = bandın dışı</>
              )}
              {' '}· tekerlekle yakınlaştır, sürükleyerek gez
            </p>
          </section>
        ) : (
          <section className="flex min-h-[200px] items-center justify-center rounded-[6px] border border-dashed border-border bg-bg-subtle px-6 lg:min-h-0">
            <p className="m-0 max-w-[46ch] text-center text-ui-xs text-fg-muted">
              Tahmin grafiği için gecelik koşu gerekiyor — &quot;Yeniden hesapla&quot; ile şimdi
              üretebilirsiniz. Sağdaki <strong>çok satanlar</strong>, <strong>kategoriler</strong> ve{' '}
              <strong>riskli</strong> sekmeleri ile alttaki <strong>tarayıcı</strong> ve{' '}
              <strong>satın alma</strong> sekmeleri tahminden bağımsızdır ve şu anda kullanılabilir.
            </p>
          </section>
        )}

        {/* SAĞ: izleme listesi. Model kartı BURADAN ALINDI — listenin altına
            ikinci bir kart koymak sütunu ekrandan taşırıyordu; artık rıhtımın
            "Model" sekmesinde. */}
        <aside className="flex min-h-[260px] flex-col overflow-hidden rounded-[6px] border border-border-soft bg-card lg:min-h-0">
          <div className="flex shrink-0 items-center gap-0.5 border-b border-border-soft bg-bg-subtle px-1.5">
            {WATCH_TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setWatchTab(t.key)}
                className={`cursor-pointer border-b-2 px-2 py-1.5 text-ui-xs font-bold transition-colors ${
                  watchTab === t.key ? 'border-fg text-fg' : 'border-transparent text-fg-muted hover:text-fg'
                }`}
              >
                {t.label}
              </button>
            ))}
            <span className="ml-auto pr-0.5">
              <DetailButton onClick={() => setWatchDetailOpen(true)} />
            </span>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">{watchBody()}</div>

          {watchTab !== 'tree' && movers && (
            <div className="shrink-0 border-t border-border-soft px-3 py-1.5 text-ui-2xs text-fg-subtle">
              son {movers.windowDays} gün · marj {movers.marginCoverage}/{movers.marginCoverageTotal} üründe
              biliniyor
            </div>
          )}
        </aside>
      </div>

      {/* Rıhtım kapalıyken yalnızca başlık şeridi kadar yer kaplar (shrink-0);
          açıkken ızgarayla kalan yüksekliği DOCK_SPLIT oranında paylaşır. */}
      <div
        className={`flex min-h-0 flex-col p-2.5 ${
          dockOpen ? DOCK_SPLIT[dockHeight].dock : 'shrink-0'
        }`}
      >
        <AnalysisDock
          selected={selected}
          tab={dockTab}
          onTabChange={setDockTab}
          open={dockOpen}
          onOpenChange={setDockOpen}
          chartableCodes={chartableCodes}
          activeCodes={paneCodes}
          onToggleChart={togglePane}
          heightMode={dockHeight}
          onHeightModeChange={setDockHeight}
        />
      </div>

      {watchDetailOpen && (
        <DetailOverlay
          title={WATCH_TABS.find((t) => t.key === watchTab)?.label ?? 'İzleme listesi'}
          subtitle={watchTab === 'tree' ? 'uzlaştırma ağacı' : `son ${movers?.windowDays ?? 30} gün`}
          onClose={() => setWatchDetailOpen(false)}
        >
          {watchBody()}
        </DetailOverlay>
      )}

      <SymbolSearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        series={series}
        selectedKey={selected?.key ?? TOTAL_KEY}
        onSelect={setSelectedKey}
      />

      <MarginSimulatorModal
        open={marginSimOpen}
        onClose={() => setMarginSimOpen(false)}
      />
    </div>
  );
}

/** MAPE'den doğruluk yüzdesi. Ölçülmediyse "—" — sayı UYDURULMAZ. */
function mapeToAccuracy(mape: number | null): string {
  if (mape === null) return '—';
  return percent(Math.max(0, 100 - mape));
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex items-baseline gap-1.5 pb-0.5">
      <span className="text-ui-2xs font-semibold uppercase tracking-wider text-fg-subtle">
        {label}
      </span>
      <span className="text-ui-xs font-bold tabular-nums text-fg">{value}</span>
    </span>
  );
}
