'use client';

import {
  Area, CartesianGrid, ComposedChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  ErpisCard, ErpisEmpty, ErpisHero, ErpisLoader, ErpisWidgetStyles,
} from './ErpisWidgetShell';
import {
  effectiveBucket, ErpisDimensionTrendCard, ErpisDistributionCard, ErpisRankingCard,
} from './ErpisDashboardWidgets';
import { ErpisPeriodSummary } from './ErpisPeriodSummary';
import { erpisBucketLabel, formatBucketLabel } from './erpisBucket';
import { erpisCategoricalColor, useErpisChartTheme } from './useErpisChartTheme';
import { formatAxis, formatCompact, formatNumber } from '../../../features/erpis/shared';
import { useErpisOrdersTrend, useErpisScopeSummary } from '@/hooks/erpis/useErpisQuery';
import type { ErpisQueryFilter } from '@/lib/api';

// Sipariş Analiz paneli.
//
// Faz 1: genel/yurt içi/yurt dışı en çok satanlar + yurt içi-dışı özet.
// Faz 2: satış adedi trendi + marka/kategori dağılımı.
// Faz 3: dönem karşılaştırması + ortalama sipariş değeri + döviz dağılımı.
// Faz 4: en çok sipariş veren firmalar.
//
// "En Az Satanlar" AYRI WİDGET DEĞİL: `ErpisRankingCard` zaten "En çok / En az" yön
// düğmesiyle geliyor (bkz. Genel En Çok Satanlar kartı) — aynı işi ikinci bir kartla
// tekrarlamak gereksiz olurdu.
//
// FAZ 4'TEN YAPILMAYANLAR (bkz. tasarım dokümanı):
// - Gerçek ülke bazlı kırılım: kaynak veride ülke alanı boş, veri gelmeden yapılamaz.
// - Yeni vs Tekrar Eden Müşteri Oranı: cariler için "ilk sipariş tarihi" hiçbir uçta
//   hesaplanmıyor — bu, seçili filtre penceresinin DIŞINDAKİ tüm geçmişi tarayan yeni
//   bir backend sorgusu ister. Yarım/yanlış bir yaklaşımla (ör. seçili dönem içinde
//   "ilk görülme") yanıltıcı bir rakam üretmektense atlandı.
// - Mevsimsellik Isı Haritası: düşük öncelikli, ayrı bir tasarım kararı gerektiriyor.
//
// Sıralama/dağılım kartları panonun kendi bileşenleri — ayrım scope'u QUERY
// FİLTRESİNDEN geliyor (bkz. ErpisQueryFilter.scope), kart bunun için değiştirilmedi.
//
// İLK N BURADA FARKLI (10/20/30/50/100): patron "10 20 30 50 100" dedi, panonun
// kendi kartları 5/10/20/50 kullanıyor. Ortak bileşenler bunu `topNOptions` ile alıyor,
// panonun geri kalanı etkilenmiyor.
const TOP_N: readonly number[] = [10, 20, 30, 50, 100];

const TREND_HEIGHT = 280;
// Tek sütun düzeninde kart tam genişlik: donut da (yalnız bu dosyaya özel
// ScopeSummaryDonut için) büyütüldü. ErpisDistributionCard'ın kendi donut'u
// BİLEREK değiştirilmedi — Genel Bakış'ta hâlâ üç sütunlu bir satırda duruyor.
const DONUT_SIZE = 200;
const DONUT_INNER = 70;
const DONUT_OUTER = 95;

interface Props {
  queryFilter: ErpisQueryFilter;
}

export function OrderAnalysisWidgets({ queryFilter }: Props) {
  const domesticFilter: ErpisQueryFilter = { ...queryFilter, scope: 'domestic' };
  const foreignFilter: ErpisQueryFilter = { ...queryFilter, scope: 'foreign' };

  return (
    <>
      <ErpisWidgetStyles />
      <div className="erpis-widgets-section">
        <div data-tour="erpis-orderanalysis-trends" className="erpis-widgets-row full">
          <SalesQuantityTrendWidget queryFilter={queryFilter} />
        </div>

        <div className="erpis-widgets-row full">
          <DomesticForeignTrendWidget queryFilter={queryFilter} />
        </div>

        <div data-tour="erpis-orderanalysis-rankings" className="erpis-widgets-row full">
          <ErpisRankingCard
            title="Genel En Çok Satanlar"
            subtitle="Tüm siparişler, satış adedine göre"
            by="item"
            queryFilter={queryFilter}
            emptyHint="Stok kodu kolonu eşlenmemiş olabilir."
            secondary="orderCount"
            topNOptions={TOP_N}
            defaultOrderBy="quantity"
            showComboChart
          />
        </div>

        <div data-tour="erpis-orderanalysis-scope" className="erpis-widgets-row full">
          <ScopeSummaryDonut queryFilter={queryFilter} />
        </div>

        <div className="erpis-widgets-row full">
          <ErpisRankingCard
            title="Yurt İçi En Çok Satanlar"
            subtitle="TL siparişler, satış adedine göre"
            by="item"
            queryFilter={domesticFilter}
            emptyHint="Seçili dönemde yurt içi sipariş yok."
            secondary="orderCount"
            topNOptions={TOP_N}
            defaultOrderBy="quantity"
          />
        </div>

        <div className="erpis-widgets-row full">
          <ErpisRankingCard
            title="Yurt Dışı En Çok Satanlar"
            subtitle="Döviz siparişler, satış adedine göre"
            by="item"
            queryFilter={foreignFilter}
            emptyHint="Seçili dönemde yurt dışı sipariş yok."
            secondary="orderCount"
            topNOptions={TOP_N}
            defaultOrderBy="quantity"
          />
        </div>

        <div data-tour="erpis-orderanalysis-distributions" className="erpis-widgets-row full">
          <ErpisDistributionCard
            title="Marka"
            by="brand"
            queryFilter={queryFilter}
            emptyHint="Ürün adlarından marka çıkarılamadı — sözlüğe marka ekleyin."
            metric="quantity"
            topNOptions={TOP_N}
            defaultOrderBy="quantity"
          />
        </div>

        <div className="erpis-widgets-row full">
          <ErpisDistributionCard
            title="Kategori"
            by="productType"
            queryFilter={queryFilter}
            emptyHint="Ürün adlarından kategori çıkarılamadı — sözlüğe kategori ekleyin."
            metric="quantity"
            topNOptions={TOP_N}
            defaultOrderBy="quantity"
          />
        </div>

        <div className="erpis-widgets-row full">
          <ErpisDimensionTrendCard queryFilter={queryFilter} metric="quantity" />
        </div>

        <div className="erpis-widgets-row full">
          <ErpisPeriodSummary filter={queryFilter} showAov />
        </div>

        <div className="erpis-widgets-row full">
          <ErpisDistributionCard
            title="Döviz"
            by="currency"
            queryFilter={queryFilter}
            emptyHint="Para birimi kolonu eşlenmemiş olabilir."
            metric="quantity"
            topNOptions={TOP_N}
            defaultOrderBy="quantity"
          />
        </div>

        <div className="erpis-widgets-row full">
          <ErpisRankingCard
            title="En Çok Sipariş Veren Firmalar"
            subtitle="Sipariş sayısına göre"
            by="party"
            queryFilter={queryFilter}
            emptyHint="Cari adı kolonu eşlenmemiş olabilir."
            secondary="quantity"
            topNOptions={TOP_N}
            defaultOrderBy="orderCount"
          />
        </div>
      </div>
    </>
  );
}

// ── Satış adedi trendi ────────────────────────────────────────────────────
//
// Panonun "Tutar ve Hacim Trendi" kartı ciroyu önceliklendiriyor; bu panel adet
// ekseninde olduğu için aynı veriden (bkz. useErpisOrdersTrend) SATIŞ ADEDİNİ öne
// çıkaran ayrı bir grafik — kartı ciro-öncelikliyle birebir kopyalamak yerine tek
// ölçüye indirildi.
function SalesQuantityTrendWidget({ queryFilter }: Props) {
  const theme = useErpisChartTheme();
  const trend = useErpisOrdersTrend({ ...queryFilter, convertTo: 'TL' });

  const bucket = effectiveBucket(queryFilter);
  const points = (trend.data ?? [])
    .slice()
    .sort((a, b) => a.bucket.localeCompare(b.bucket))
    .map((p) => ({ ...p, label: formatBucketLabel(p.bucket) }));

  const totalQuantity = points.reduce((sum, p) => sum + p.quantity, 0);
  const totalLines = points.reduce((sum, p) => sum + p.lineCount, 0);

  return (
    <ErpisCard
      title="Satış Adedi Trendi"
      subtitle={`${erpisBucketLabel(bucket)} · ${points.length} dilim`}
      exportData={() => (points.length === 0 ? null : {
        columns: [
          { key: 'label', header: 'Dönem', type: 'text' },
          { key: 'quantity', header: 'Adet', type: 'decimal' },
          { key: 'lineCount', header: 'Kalem', type: 'int' },
        ],
        rows: points.map((p) => ({ label: p.label, quantity: p.quantity, lineCount: p.lineCount })),
      })}
    >
      {trend.isLoading ? (
        <ErpisLoader />
      ) : points.length === 0 ? (
        <ErpisEmpty
          title="Trend çizilemedi"
          hint="Seçili dönemde veri yok ya da sipariş tarihi eşlenmemiş."
        />
      ) : (
        <>
          <ErpisHero
            value={formatCompact(totalQuantity)}
            label="Toplam adet"
            stats={[
              { label: 'Kalem', value: formatNumber(totalLines) },
              { label: 'Dilim', value: formatNumber(points.length) },
            ]}
          />

          <ResponsiveContainer width="100%" height={TREND_HEIGHT}>
            <ComposedChart data={points} margin={{ top: 10, right: 10, left: -8, bottom: 0 }}>
              <defs>
                <linearGradient id="erpisQuantityArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={theme.amount} stopOpacity={0.24} />
                  <stop offset="95%" stopColor={theme.amount} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} vertical={false} />
              <XAxis
                dataKey="label"
                tick={theme.axisTick}
                axisLine={false}
                tickLine={false}
                minTickGap={16}
              />
              <YAxis
                tick={theme.axisTick}
                axisLine={false}
                tickLine={false}
                tickFormatter={formatAxis}
                width={58}
              />
              <Tooltip
                {...theme.tooltip}
                formatter={(value: unknown) => [
                  formatNumber(typeof value === 'number' ? value : null, 0),
                  'Adet',
                ]}
              />
              <Area
                type="monotone"
                dataKey="quantity"
                stroke={theme.amount}
                strokeWidth={2.2}
                fill="url(#erpisQuantityArea)"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </>
      )}
    </ErpisCard>
  );
}

// ── Yurt İçi / Yurt Dışı trendi (zaman × pazar karması) ─────────────────────
//
// Özet donut TEK ANDAKİ payı gösteriyor; bu grafik payın ZAMAN İÇİNDE nasıl değiştiğini
// gösteriyor — "yurt dışı satışlar mevsimsel mi artıyor" gibi sorulara cevap. İki ayrı
// scope filtresiyle (bkz. useErpisOrdersTrend) iki trend çekilip bucket'a göre birleştirilir.
function DomesticForeignTrendWidget({ queryFilter }: Props) {
  const theme = useErpisChartTheme();
  const domestic = useErpisOrdersTrend({ ...queryFilter, scope: 'domestic', convertTo: 'TL' });
  const foreign = useErpisOrdersTrend({ ...queryFilter, scope: 'foreign', convertTo: 'TL' });

  const bucket = effectiveBucket(queryFilter);
  const isLoading = domestic.isLoading || foreign.isLoading;

  const buckets = [...new Set([
    ...(domestic.data ?? []).map((p) => p.bucket),
    ...(foreign.data ?? []).map((p) => p.bucket),
  ])].sort();

  const chartRows = buckets.map((b) => ({
    label: formatBucketLabel(b),
    domestic: domestic.data?.find((p) => p.bucket === b)?.quantity ?? 0,
    foreign: foreign.data?.find((p) => p.bucket === b)?.quantity ?? 0,
  }));

  const totalDomestic = chartRows.reduce((sum, r) => sum + r.domestic, 0);
  const totalForeign = chartRows.reduce((sum, r) => sum + r.foreign, 0);
  const grandTotal = totalDomestic + totalForeign;

  const SERIES = [
    { key: 'domestic' as const, label: 'Yurt İçi', total: totalDomestic },
    { key: 'foreign' as const, label: 'Yurt Dışı', total: totalForeign },
  ];

  return (
    <ErpisCard
      title="Yurt İçi / Yurt Dışı Trendi"
      subtitle={`${erpisBucketLabel(bucket)} · yığılmış · satış adedi`}
      exportData={() => (chartRows.length === 0 ? null : {
        columns: [
          { key: 'label', header: 'Dönem', type: 'text' },
          { key: 'domestic', header: 'Yurt İçi (Adet)', type: 'decimal' },
          { key: 'foreign', header: 'Yurt Dışı (Adet)', type: 'decimal' },
        ],
        rows: chartRows,
      })}
    >
      {isLoading ? (
        <ErpisLoader />
      ) : chartRows.length === 0 ? (
        <ErpisEmpty
          title="Trend çizilemedi"
          hint="Seçili dönemde veri yok ya da sipariş tarihi eşlenmemiş."
        />
      ) : (
        <>
          <ErpisHero
            value={formatCompact(grandTotal)}
            label="Toplam adet"
            stats={SERIES.map((s) => ({
              label: s.label,
              value: `%${grandTotal > 0 ? ((s.total / grandTotal) * 100).toFixed(0) : '0'}`,
            }))}
          />

          <ResponsiveContainer width="100%" height={TREND_HEIGHT}>
            <ComposedChart data={chartRows} margin={{ top: 8, right: 10, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} vertical={false} />
              <XAxis dataKey="label" tick={theme.axisTick} axisLine={false} tickLine={false} minTickGap={16} />
              <YAxis tick={theme.axisTick} axisLine={false} tickLine={false} tickFormatter={formatAxis} width={58} />
              <Tooltip
                {...theme.tooltip}
                formatter={(value: unknown, name: unknown) => [
                  formatNumber(typeof value === 'number' ? value : null, 0),
                  SERIES.find((s) => s.key === name)?.label ?? String(name),
                ]}
              />
              {SERIES.map((s, index) => (
                <Area
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  stackId="scope"
                  stroke={theme.surface}
                  strokeWidth={1}
                  fill={erpisCategoricalColor(index, theme.dark)}
                  fillOpacity={0.92}
                />
              ))}
            </ComposedChart>
          </ResponsiveContainer>

          <div>
            {SERIES.map((s, index) => (
              <div key={s.key} className="erpis-legend-row">
                <span
                  className="erpis-legend-dot"
                  style={{ background: erpisCategoricalColor(index, theme.dark) }}
                />
                <span className="erpis-legend-label">{s.label}</span>
                <span className="erpis-legend-value">
                  {formatCompact(s.total)}
                  <span style={{ color: theme.tick, fontWeight: 600 }}>
                    {' '}%{grandTotal > 0 ? ((s.total / grandTotal) * 100).toFixed(1) : '0.0'}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </ErpisCard>
  );
}

// ── Yurt İçi / Yurt Dışı özet (donut) ────────────────────────────────────────
//
// Panonun kendi "Yurt İçi / Yurt Dışı" kartı (ErpisScopeCard) çubuk+liste biçiminde;
// burada aynı veriyle GERÇEK bir donut grafiği — patron "grafikli" dedi ve bu kart
// panonun geri kalanından görsel olarak ayrışsın istendi.
function ScopeSummaryDonut({ queryFilter }: Props) {
  const theme = useErpisChartTheme();
  const scopes = useErpisScopeSummary({ ...queryFilter, convertTo: 'TL' });

  const rows = scopes.data ?? [];
  const totalQuantity = rows.reduce((sum, r) => sum + r.quantity, 0);
  const slices = rows.map((r, i) => ({ ...r, fill: erpisCategoricalColor(i, theme.dark) }));

  return (
    <ErpisCard
      title="Yurt İçi / Yurt Dışı Özet"
      subtitle="Satış adedine göre pay"
      exportData={() => (rows.length === 0 ? null : {
        columns: [
          { key: 'label', header: 'Pazar', type: 'text' },
          { key: 'quantity', header: 'Adet', type: 'decimal' },
          { key: 'share', header: 'Pay', type: 'percent' },
          { key: 'amount', header: 'Tutar (TL karşılığı)', type: 'money' },
        ],
        rows: rows.map((r) => ({
          label: r.label,
          quantity: r.quantity,
          share: totalQuantity > 0 ? r.quantity / totalQuantity : 0,
          amount: r.amount,
        })),
      })}
    >
      {scopes.isLoading ? (
        <ErpisLoader />
      ) : rows.length === 0 ? (
        <ErpisEmpty title="Gösterilecek veri yok" hint="Seçili dönemde sipariş kalemi yok." />
      ) : (
        <div className="flex flex-col gap-3">
          <div className="erpis-donut-wrap" style={{ height: DONUT_SIZE }}>
            <ResponsiveContainer width={DONUT_SIZE} height={DONUT_SIZE}>
              <PieChart>
                <Pie
                  data={slices}
                  dataKey="quantity"
                  nameKey="label"
                  innerRadius={DONUT_INNER}
                  outerRadius={DONUT_OUTER}
                  paddingAngle={2}
                  stroke="none"
                />
                <Tooltip
                  {...theme.tooltip}
                  formatter={(value: unknown) => [
                    formatNumber(typeof value === 'number' ? value : null, 0),
                    'Adet',
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="erpis-donut-center">
              <span className="erpis-donut-title">Toplam Adet</span>
              <span className="erpis-donut-value">{formatCompact(totalQuantity)}</span>
            </div>
          </div>

          <div>
            {slices.map((slice) => (
              <div key={slice.scope} className="erpis-legend-row">
                <span className="erpis-legend-dot" style={{ background: slice.fill }} />
                <span className="erpis-legend-label" title={slice.label}>{slice.label}</span>
                <span className="erpis-legend-value">
                  {formatCompact(slice.quantity)}
                  <span style={{ color: theme.tick, fontWeight: 600 }}>
                    {' '}%{totalQuantity > 0 ? ((slice.quantity / totalQuantity) * 100).toFixed(1) : '0.0'}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </ErpisCard>
  );
}
