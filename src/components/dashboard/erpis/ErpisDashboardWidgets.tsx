'use client';

import { useState } from 'react';
import {
  Area, Bar, CartesianGrid, ComposedChart, Line, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  ErpisCard, ErpisEmpty, ErpisHero, ErpisLoader, ErpisWidgetStyles,
} from './ErpisWidgetShell';
import { ErpisPeriodSummary } from './ErpisPeriodSummary';
import { ErpisRankList } from './ErpisRankList';
import { ErpisRankControls, ErpisSegment } from './ErpisWidgetControls';
import { erpisCategoricalColor, useErpisChartTheme } from './useErpisChartTheme';
import { erpisBucketLabel, formatBucketLabel, resolveErpisBucket } from './erpisBucket';
import { formatAxis, formatCompact, formatNumber } from '../../../features/erpis/shared';
import {
  useErpisDimensionTrend,
  useErpisOrdersSummary,
  useErpisOrdersTrend,
  useErpisScopeSummary,
  useErpisWarehouseZones,
} from '@/hooks/erpis/useErpisQuery';
import { useErpisDashboardBreakdown } from './useErpisDashboardBreakdown';
import type { ErpisBreakdownKey, ErpisBreakdownOrder, ErpisQueryFilter } from '@/lib/api';
import type { ErpisExportData } from './erpisExport';
import type { ExportColumn } from '@/lib/export';
import type { ErpisBreakdownRow } from './useErpisDashboardBreakdown';

const TREND_HEIGHT = 300;
const DIMENSION_TREND_HEIGHT = 260;
const DONUT_SIZE = 150;
const DONUT_INNER = 52;
const DONUT_OUTER = 70;
const RANK_CHART_HEIGHT = 180;

// Sıralama kartlarının başlangıç derinliği. Kullanıcı kart üstünden 5/10/20/50 seçiyor.
const DEFAULT_TOP_N = 5;

// Kırılım kartlarının ortak dışa aktarma şeması — beş kart aynı satır yapısını
// paylaşıyor, tabloyu her birinde ayrı kurmak beş kez aynı hatayı yapmak olurdu.
// Grafiklerin çözünürlüğü.
//
// Filtrede AÇIK bir kova varsa o kazanır: Erpis modülünün filtre çubuğunda kullanıcı
// gün/hafta/ay/yıl seçebiliyor ve sunucu zaten o kovayı uyguluyordu — kartlar tarihten
// kendi kovasını türetince veri haftalık gelirken başlık "Aylık" yazıyordu. Panoda böyle
// bir seçici yok, orada tarih aralığından türetme devam ediyor.
export function effectiveBucket(filter: ErpisQueryFilter) {
  return filter.bucket ?? resolveErpisBucket(filter.from ?? null, filter.to ?? null);
}

function breakdownExport(
  rows: ErpisBreakdownRow[],
  currency: string | null,
  labelHeader: string,
): ErpisExportData | null {
  if (rows.length === 0) return null;

  const total = rows.reduce((sum, r) => sum + r.amount, 0);
  const columns: ExportColumn[] = [
    { key: 'rank', header: '#', type: 'int' },
    { key: 'label', header: labelHeader, type: 'text' },
    { key: 'subLabel', header: 'Açıklama', type: 'text' },
    { key: 'amount', header: `Tutar${currency ? ` (${currency})` : ''}`, type: 'money' },
    { key: 'share', header: 'Pay', type: 'percent' },
    { key: 'quantity', header: 'Miktar', type: 'decimal' },
    { key: 'lineCount', header: 'Kalem', type: 'int' },
    { key: 'orderCount', header: 'Sipariş', type: 'int' },
  ];

  return {
    columns,
    rows: rows.map((row, i) => ({
      rank: i + 1,
      label: row.label,
      subLabel: row.subLabel ?? '',
      amount: row.amount,
      // Yüzde sütunu Excel'de yüzde biçiminde: 0-1 arası ORAN yazılıyor, 0-100 değil.
      share: total > 0 ? row.amount / total : 0,
      quantity: row.quantity,
      lineCount: row.rowCount,
      orderCount: row.orderCount,
    })),
  };
}

// Tüm kartlar NORMALİZE katmandan (sipariş kalemleri) beslenir.
//
// Ham satır analitiği panoda KULLANILMAZ: sipariş raporunda genel amaçlı "Tutar" alanı
// eşlenmiyor (tutar kalem düzeyinde, NET TUTAR kolonunda) ve o katmandan okuyan kartlar
// sıfır gösteriyordu.
//
// SIRALAMA DEĞERE GÖRE: en üstte zaman ekseni (nereye gidiyoruz), sonra karşılaştırma
// (geçen döneme göre nasılız), sonra kim/ne (cari ve ürün), sonra dağılımlar, en altta
// operasyonel detay (depo). Pano yukarıdan aşağı okunacak.
interface WidgetProps {
  queryFilter: ErpisQueryFilter;
}

export function ErpisDashboardWidgets({ queryFilter }: WidgetProps) {
  return (
    <>
      <ErpisWidgetStyles />
      <div className="erpis-widgets-section">
        <div className="erpis-widgets-row full">
          <ErpisTrendWidget queryFilter={queryFilter} />
        </div>

        <div className="erpis-widgets-row even">
          <ErpisPeriodSummary filter={queryFilter} />
          <ErpisScopeCard queryFilter={queryFilter} />
        </div>

        <div className="erpis-widgets-row even">
          <ErpisRankingCard
            title="Cari Sıralaması"
            subtitle="Sipariş tutarına göre müşteriler"
            by="party"
            queryFilter={queryFilter}
            emptyHint="Cari adı kolonu eşlenmemiş olabilir."
            secondary="orderCount"
          />
          <ErpisRankingCard
            title="Ürün Sıralaması"
            subtitle="Stok kodu ve ürün adıyla"
            by="item"
            queryFilter={queryFilter}
            emptyHint="Stok kodu kolonu eşlenmemiş olabilir."
            secondary="quantity"
          />
        </div>

        <div className="erpis-widgets-row thirds">
          <ErpisDistributionCard
            title="Marka"
            by="brand"
            queryFilter={queryFilter}
            emptyHint="Ürün adlarından marka çıkarılamadı — sözlüğe marka ekleyin."
          />
          <ErpisDistributionCard
            title="Araç Modeli"
            by="vehicle"
            queryFilter={queryFilter}
            emptyHint="Ürün adlarından araç modeli çıkarılamadı."
          />
          {/* Kırılım `productType` — Erpis'te ürün kategorileri O kolonda duruyor.
              `category` kolonu araç ailesi ve malzeme grubu taşıyor, o da yandaki
              "Araç Modeli" kartıyla çakışırdı. */}
          <ErpisDistributionCard
            title="Kategori"
            by="productType"
            queryFilter={queryFilter}
            emptyHint="Ürün adlarından kategori çıkarılamadı — sözlüğe kategori ekleyin."
          />
        </div>

        <div className="erpis-widgets-row full">
          <ErpisDimensionTrendCard queryFilter={queryFilter} />
        </div>

        <div className="erpis-widgets-row even">
          <ErpisWarehouseZones queryFilter={queryFilter} />
          <ErpisOpenOrders queryFilter={queryFilter} />
        </div>
      </div>
    </>
  );
}

// ── Tutar ve hacim trendi ───────────────────────────────────────────────────
//
// Panonun en değerli kartı, bu yüzden TAM GENİŞLİK: zaman ekseni dar bir kolonda
// okunmuyor, nokta sayısı arttıkça etiketler üst üste biniyor.
//
// Çözünürlük seçili tarihten türüyor (bkz. resolveErpisBucket): bir aylık dönem günlük,
// üç aylık haftalık, yıllık aylık dilimlenir. Başlık hangi çözünürlükte olduğunu yazar.
function ErpisTrendWidget({ queryFilter }: WidgetProps) {
  const theme = useErpisChartTheme();
  const trend = useErpisOrdersTrend({ ...queryFilter, convertTo: 'TL' });
  const summary = useErpisOrdersSummary({ ...queryFilter, convertTo: 'TL' });

  const bucket = effectiveBucket(queryFilter);
  const total = summary.data?.converted?.total ?? summary.data?.totals[0]?.total ?? 0;
  const currency = summary.data?.converted?.currency ?? summary.data?.totals[0]?.currency;

  const points = (trend.data ?? [])
    .slice()
    .sort((a, b) => a.bucket.localeCompare(b.bucket))
    .map((p) => ({ ...p, label: formatBucketLabel(p.bucket) }));

  return (
    <ErpisCard
      title="Tutar ve Hacim Trendi"
      subtitle={`${erpisBucketLabel(bucket)} · ${points.length} dilim${currency ? ` · ${currency} karşılığı` : ''}`}
      exportData={() => (points.length === 0 ? null : {
        columns: [
          { key: 'label', header: 'Dönem', type: 'text' },
          { key: 'amount', header: `Tutar${currency ? ` (${currency})` : ''}`, type: 'money' },
          { key: 'shippedAmount', header: 'Sevk Tutarı', type: 'money' },
          { key: 'quantity', header: 'Miktar', type: 'decimal' },
          { key: 'lineCount', header: 'Kalem', type: 'int' },
          { key: 'openLineCount', header: 'Açık Kalem', type: 'int' },
        ],
        rows: points.map((p) => ({
          label: p.label,
          amount: p.amount,
          shippedAmount: p.shippedAmount,
          quantity: p.quantity,
          lineCount: p.lineCount,
          openLineCount: p.openLineCount,
        })),
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
            value={formatCompact(total)}
            label={currency ? `Toplam ${currency}` : 'Toplam'}
            stats={[
              { label: 'Kalem', value: formatNumber(summary.data?.lineCount) },
              { label: 'Sipariş', value: formatNumber(summary.data?.orderCount) },
              { label: 'Dilim', value: formatNumber(points.length) },
            ]}
          />

          <ResponsiveContainer width="100%" height={TREND_HEIGHT}>
            <ComposedChart data={points} margin={{ top: 10, right: 10, left: -8, bottom: 0 }}>
              <defs>
                <linearGradient id="erpisAmountArea" x1="0" y1="0" x2="0" y2="1">
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
              {/* İki ölçü, iki eksen: tutar ve kalem adedi farklı büyüklükte ve tek
                  eksende çizilince küçük olan düz çizgiye dönüşüyordu. */}
              <YAxis
                yAxisId="amount"
                tick={theme.axisTick}
                axisLine={false}
                tickLine={false}
                tickFormatter={formatAxis}
                width={58}
              />
              <YAxis
                yAxisId="count"
                orientation="right"
                tick={theme.axisTick}
                axisLine={false}
                tickLine={false}
                width={40}
              />
              <Tooltip
                {...theme.tooltip}
                formatter={(value: unknown, name: unknown) => [
                  formatNumber(typeof value === 'number' ? value : null, name === 'amount' ? 2 : 0),
                  name === 'amount' ? `Tutar${currency ? ` (${currency})` : ''}` : 'Kalem',
                ]}
              />
              <Bar
                yAxisId="count"
                dataKey="lineCount"
                fill={theme.volumeSoft}
                radius={[3, 3, 0, 0]}
                maxBarSize={26}
              />
              <Area
                yAxisId="amount"
                type="monotone"
                dataKey="amount"
                stroke={theme.amount}
                strokeWidth={2.2}
                fill="url(#erpisAmountArea)"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </>
      )}
    </ErpisCard>
  );
}

// ── Sıralama kartı (cari, ürün) ─────────────────────────────────────────────
//
// `topNOptions`/`defaultOrderBy` opsiyonel: Sipariş Analiz paneli (bkz.
// OrderAnalysisWidgets.tsx) aynı kartı 10/20/30/50/100 derinliğinde ve adet öncelikli
// sıralamayla kullanıyor, panonun kendi kartları varsayılanla (5/10/20/50, ciro) çalışmaya
// devam ediyor.
export function ErpisRankingCard({
  title, subtitle, by, queryFilter, emptyHint, secondary, topNOptions, defaultOrderBy,
  showComboChart,
}: {
  title: string;
  subtitle: string;
  by: ErpisBreakdownKey;
  queryFilter: ErpisQueryFilter;
  emptyHint: string;
  secondary: 'orderCount' | 'quantity' | 'lineCount';
  topNOptions?: readonly number[];
  defaultOrderBy?: ErpisBreakdownOrder;
  /** Listenin üstünde adet(bar)/ciro(çizgi) kombine grafiği de göster — "çok satan ama
   * düşük ciro" ürünleri tek bakışta ayırt etmek için (bkz. Sipariş Analiz paneli). */
  showComboChart?: boolean;
}) {
  const theme = useErpisChartTheme();
  // İlk N ve yön KART BAŞINA: kullanıcı carilerde ilk 20'yi, ürünlerde ilk 5'i
  // isteyebiliyor. Tek bir global ayar bunu engellerdi.
  const [topN, setTopN] = useState<number>(topNOptions?.[0] ?? DEFAULT_TOP_N);
  const [ascending, setAscending] = useState(false);
  const [orderBy, setOrderBy] = useState<ErpisBreakdownOrder>(defaultOrderBy ?? 'amount');

  const breakdown = useErpisDashboardBreakdown(queryFilter, by, topN, orderBy, ascending);
  const rows = breakdown.rows;
  const total = rows.reduce((sum, r) => sum + r.amount, 0);

  // Grafik satır etiketi yerine SIRA NUMARASI kullanır: SKU/cari adları uzun, eksende
  // üst üste biner. Tam ad zaten tooltip'te ve alttaki listede yazıyor.
  const chartRows = rows.map((r, i) => ({ ...r, rank: `#${i + 1}` }));

  return (
    <ErpisCard
      title={title}
      subtitle={`${subtitle}${breakdown.currency ? ` · ${breakdown.currency} karşılığı` : ''}`}
      exportData={() => breakdownExport(rows, breakdown.currency, title)}
      action={(
        <ErpisRankControls
          topN={topN}
          onTopNChange={setTopN}
          ascending={ascending}
          onAscendingChange={setAscending}
          orderBy={orderBy}
          onOrderByChange={setOrderBy}
          topNOptions={topNOptions}
        />
      )}
    >
      {breakdown.isLoading ? (
        <ErpisLoader />
      ) : rows.length === 0 ? (
        <ErpisEmpty title="Gösterilecek veri yok" hint={emptyHint} />
      ) : (
        <>
          <ErpisHero
            value={formatCompact(total)}
            // Etiket gerçek satır sayısını söyler: 20 istenip 12 cari varsa
            // "ilk 20 toplamı" demek yanlış olurdu.
            label={`${ascending ? 'En az' : 'En çok'} ${rows.length} toplamı${breakdown.currency ? ` (${breakdown.currency})` : ''}`}
            stats={[
              { label: 'Kalem', value: formatNumber(rows.reduce((s, r) => s + r.rowCount, 0)) },
              { label: 'Miktar', value: formatCompact(rows.reduce((s, r) => s + r.quantity, 0)) },
            ]}
          />

          {showComboChart && (
            <ResponsiveContainer width="100%" height={RANK_CHART_HEIGHT}>
              <ComposedChart data={chartRows} margin={{ top: 8, right: 10, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} vertical={false} />
                <XAxis dataKey="rank" tick={theme.axisTick} axisLine={false} tickLine={false} />
                <YAxis
                  yAxisId="quantity"
                  tick={theme.axisTick}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={formatAxis}
                  width={44}
                />
                <YAxis
                  yAxisId="amount"
                  orientation="right"
                  tick={theme.axisTick}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={formatAxis}
                  width={44}
                />
                <Tooltip
                  {...theme.tooltip}
                  labelFormatter={(label: unknown) => {
                    const row = chartRows.find((r) => r.rank === label);
                    return row?.label ?? String(label);
                  }}
                  formatter={(value: unknown, name: unknown) => [
                    formatNumber(typeof value === 'number' ? value : null, name === 'amount' ? 2 : 0),
                    name === 'amount' ? `Tutar${breakdown.currency ? ` (${breakdown.currency})` : ''}` : 'Adet',
                  ]}
                />
                <Bar
                  yAxisId="quantity"
                  dataKey="quantity"
                  fill={theme.volumeSoft}
                  radius={[3, 3, 0, 0]}
                  maxBarSize={26}
                />
                <Line
                  yAxisId="amount"
                  type="monotone"
                  dataKey="amount"
                  stroke={theme.amount}
                  strokeWidth={2.2}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}

          <ErpisRankList rows={rows} currency={breakdown.currency} secondary={secondary} />
        </>
      )}
    </ErpisCard>
  );
}

// ── Dağılım kartı (marka, araç modeli, kategori) ────────────────────────────
//
// Üçü yan yana ve AYNI biçimde: kullanıcı birini okumayı öğrenince diğer ikisini de
// okuyor. Donut + altında yüzdeli liste — donut payı görsel olarak, liste tam rakamı
// veriyor; ikisi birbirinin yerine geçmiyor.
export function ErpisDistributionCard({
  title, by, queryFilter, emptyHint, topNOptions, defaultOrderBy, metric = 'amount',
}: {
  title: string;
  by: ErpisBreakdownKey;
  queryFilter: ErpisQueryFilter;
  emptyHint: string;
  topNOptions?: readonly number[];
  defaultOrderBy?: ErpisBreakdownOrder;
  /** Donut hangi ölçüyü gösterir — verilmezse tutar (panonun varsayılanı). */
  metric?: 'amount' | 'quantity';
}) {
  const theme = useErpisChartTheme();
  const [topN, setTopN] = useState<number>(topNOptions?.[0] ?? DEFAULT_TOP_N);
  const [orderBy, setOrderBy] = useState<ErpisBreakdownOrder>(defaultOrderBy ?? 'amount');

  const breakdown = useErpisDashboardBreakdown(queryFilter, by, topN, orderBy);
  const rows = breakdown.rows;
  const total = rows.reduce((sum, r) => sum + r[metric], 0);
  const metricLabel = metric === 'quantity' ? 'Adet' : `Tutar${breakdown.currency ? ` (${breakdown.currency})` : ''}`;

  const slices = rows.map((r, i) => ({ ...r, fill: erpisCategoricalColor(i, theme.dark) }));

  return (
    <ErpisCard
      title={`${title} Dağılımı`}
      subtitle={metric === 'quantity'
        ? 'Satış adedine göre pay'
        : (breakdown.currency ? `${breakdown.currency} karşılığı` : 'Tutara göre pay')}
      exportData={() => breakdownExport(rows, breakdown.currency, title)}
      action={(
        <ErpisRankControls
          topN={topN}
          onTopNChange={setTopN}
          orderBy={orderBy}
          onOrderByChange={setOrderBy}
          topNOptions={topNOptions}
        />
      )}
    >
      {breakdown.isLoading ? (
        <ErpisLoader />
      ) : rows.length === 0 ? (
        <ErpisEmpty title="Gösterilecek veri yok" hint={emptyHint} />
      ) : (
        <div className="flex flex-col gap-3">
          <div className="erpis-donut-wrap" style={{ height: DONUT_SIZE }}>
            <ResponsiveContainer width={DONUT_SIZE} height={DONUT_SIZE}>
              <PieChart>
                <Pie
                  data={slices}
                  dataKey={metric}
                  nameKey="label"
                  innerRadius={DONUT_INNER}
                  outerRadius={DONUT_OUTER}
                  paddingAngle={2}
                  stroke="none"
                />
                <Tooltip
                  {...theme.tooltip}
                  formatter={(value: unknown) => [
                    formatNumber(typeof value === 'number' ? value : null, metric === 'quantity' ? 0 : 2),
                    metricLabel,
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="erpis-donut-center">
              <span className="erpis-donut-title">{metric === 'quantity' ? 'Toplam Adet' : 'Toplam'}</span>
              <span className="erpis-donut-value">{formatCompact(total)}</span>
            </div>
          </div>

          {/* Recharts'ın kendi legend'i yerine kendi listemiz: onunki dar kartta iki
              satıra sarıp adları kırpıyor ve rakamı hiç göstermiyordu. */}
          <div>
            {slices.map((slice) => (
              <div key={slice.key} className="erpis-legend-row">
                <span className="erpis-legend-dot" style={{ background: slice.fill }} />
                <span className="erpis-legend-label" title={slice.label}>{slice.label}</span>
                <span className="erpis-legend-value">
                  {formatCompact(slice[metric])}
                  <span style={{ color: theme.tick, fontWeight: 600 }}>
                    {' '}%{total > 0 ? ((slice[metric] / total) * 100).toFixed(1) : '0.0'}
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

// ── Yurt içi / yurt dışı + para birimi ──────────────────────────────────────
//
// İkisi TEK kartta: "yurt dışı 291,5 B" rakamının arkasında hangi dövizlerin olduğu
// ayrı bir kartta duruyordu ve kullanıcı iki kart arasında gidip geliyordu. Pazar
// ayrımı zaten para biriminden türetiliyor — aynı bilginin iki yüzü.
function ErpisScopeCard({ queryFilter }: WidgetProps) {
  const theme = useErpisChartTheme();
  const scopes = useErpisScopeSummary({ ...queryFilter, convertTo: 'TL' });
  const summary = useErpisOrdersSummary({ ...queryFilter, convertTo: 'TL' });

  const rows = scopes.data ?? [];
  const total = rows.reduce((sum, r) => sum + r.amount, 0);
  const currency = rows[0]?.currency;
  const currencies = summary.data?.totals ?? [];

  return (
    <ErpisCard
      title="Yurt İçi / Yurt Dışı"
      subtitle={`Para biriminden türetilir${currency ? ` · ${currency} karşılığı` : ''}`}
      exportData={() => (rows.length === 0 ? null : {
        columns: [
          { key: 'label', header: 'Pazar', type: 'text' },
          { key: 'amount', header: `Tutar${currency ? ` (${currency})` : ''}`, type: 'money' },
          { key: 'share', header: 'Pay', type: 'percent' },
          { key: 'lineCount', header: 'Kalem', type: 'int' },
          { key: 'partyCount', header: 'Cari', type: 'int' },
        ],
        rows: rows.map((r) => ({
          label: r.label,
          amount: r.amount,
          share: total > 0 ? r.amount / total : 0,
          lineCount: r.lineCount,
          partyCount: r.partyCount,
        })),
      })}
    >
      {scopes.isLoading ? (
        <ErpisLoader />
      ) : rows.length === 0 ? (
        <ErpisEmpty title="Gösterilecek veri yok" hint="Seçili dönemde sipariş kalemi yok." />
      ) : (
        <>
          <ErpisHero
            value={formatCompact(total)}
            label={currency ? `Toplam ${currency}` : 'Toplam'}
            stats={rows.map((r) => ({
              label: r.label,
              value: `%${total > 0 ? ((r.amount / total) * 100).toFixed(0) : '0'}`,
            }))}
          />

          <div>
            {rows.map((row, index) => (
              <div key={row.scope} className="erpis-rank-row">
                <span className="erpis-rank-num">{index + 1}</span>
                <div className="erpis-rank-body">
                  <span className="erpis-rank-label">
                    {row.label}
                    <span style={{ color: theme.tick, fontWeight: 500 }}>
                      {' '}· {formatNumber(row.lineCount)} kalem · {formatNumber(row.partyCount)} cari
                    </span>
                  </span>
                  <div className="erpis-bar-track">
                    <div
                      className="erpis-bar-fill"
                      style={{
                        width: `${total > 0 ? Math.max(2, (row.amount / total) * 100) : 0}%`,
                        background: erpisCategoricalColor(index, theme.dark),
                      }}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  <span className="erpis-rank-value">{formatCompact(row.amount)}</span>
                  <span className="erpis-rank-share">
                    %{total > 0 ? ((row.amount / total) * 100).toFixed(1) : '0.0'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Para birimi dökümü ÇEVRİLMEMİŞ ham tutarları gösterir: kullanıcı "bu 4.900
              USD gerçekten var mı" diye sorabilmeli. Üstteki toplamlar çevrilmiş. */}
          <div className="erpis-mini-grid" style={{ marginTop: 12, marginBottom: 0 }}>
            {currencies.slice(0, 4).map((t) => (
              <div key={t.currency} className="erpis-mini-card">
                <span className="erpis-mini-label">{t.currency}</span>
                <span className="erpis-mini-value">{formatCompact(t.total)}</span>
                <span className="erpis-mini-sub">{formatNumber(t.rowCount)} kalem</span>
              </div>
            ))}
          </div>
        </>
      )}
    </ErpisCard>
  );
}

// ── Boyut trendi (cari × zaman) ─────────────────────────────────────────────
//
// YIĞILMIŞ ALAN, üst üste binen çizgiler değil: beş cari çizgi olarak çizilince hem
// birbirini kesiyor hem de altta beş satırlık bir efsane oluşup kartın yarısını
// yiyordu. Yığılmış alanda her cari kendi bandında duruyor, toplam da okunuyor.
//
// Etiketler grafiğin içinde değil, altındaki listede tam adıyla ve rakamıyla.
const TREND_DIMENSIONS: { value: ErpisBreakdownKey; label: string }[] = [
  { value: 'party', label: 'Cari' },
  { value: 'brand', label: 'Marka' },
  { value: 'productType', label: 'Kategori' },
  { value: 'category', label: 'Araç / Grup' },
  { value: 'vehicle', label: 'Araç Modeli' },
];

export function ErpisDimensionTrendCard({ queryFilter, metric = 'amount' }: WidgetProps & {
  /** Bantlar hangi ölçüyü gösterir — verilmezse tutar (panonun varsayılanı). Sipariş
   * Analiz paneli adet kullanıyor (bkz. OrderAnalysisWidgets.tsx). */
  metric?: 'amount' | 'quantity';
}) {
  const theme = useErpisChartTheme();
  const [dimension, setDimension] = useState<ErpisBreakdownKey>('party');
  const [topN, setTopN] = useState<number>(DEFAULT_TOP_N);

  const trend = useErpisDimensionTrend({ ...queryFilter, convertTo: 'TL' }, dimension, topN);
  const series = trend.data ?? [];
  const bucket = effectiveBucket(queryFilter);
  const currency = series[0]?.currency ?? null;

  // Seri toplamı METRİĞE göre: DTO'nun kendi `total`'ı her zaman tutar — adet
  // seçiliyken sıralama ve genel toplam da adede göre olmalı, yoksa yığının en altında
  // en büyük CİRO'lu değil en büyük ADET'li seri durmuyor.
  const seriesTotal = (s: (typeof series)[number]) => (
    metric === 'quantity' ? s.points.reduce((sum, p) => sum + p.quantity, 0) : s.total
  );

  // Recharts tek bir satır dizisi bekliyor: kovalar satır, seriler kolon olacak şekilde
  // çevriliyor. Sunucu seri başına nokta listesi döndürüyor çünkü bir serinin hiç
  // noktası olmayabiliyor ve o bilgi tabloya çevrilirken kaybolurdu.
  //
  // Seriler TOPLAMA GÖRE büyükten küçüğe diziliyor: yığının altında en büyük band
  // durunca üstteki ince bandlar zeminden ayrışıyor; rastgele sırada küçük bandlar
  // birbirinin arasında kayboluyordu.
  const ordered = [...series].sort((a, b) => seriesTotal(b) - seriesTotal(a));
  const buckets = [...new Set(series.flatMap((s) => s.points.map((p) => p.bucket)))].sort();
  const chartRows = buckets.map((b) => {
    const row: Record<string, string | number> = { bucket: formatBucketLabel(b) };
    for (const s of ordered) {
      row[s.key] = s.points.find((p) => p.bucket === b)?.[metric] ?? 0;
    }
    return row;
  });

  const grandTotal = ordered.reduce((sum, s) => sum + seriesTotal(s), 0);
  const dimensionLabel = TREND_DIMENSIONS.find((d) => d.value === dimension)?.label ?? '';
  const metricUnit = metric === 'quantity' ? 'Adet' : `Tutar${currency ? ` (${currency})` : ''}`;

  return (
    <ErpisCard
      title={`${dimensionLabel} Trendi`}
      subtitle={`${erpisBucketLabel(bucket)} · yığılmış${metric === 'quantity' ? ' · satış adedi' : (currency ? ` · ${currency} karşılığı` : '')}`}
      exportData={() => (chartRows.length === 0 ? null : {
        columns: [
          { key: 'bucket', header: 'Dönem', type: 'text' },
          ...ordered.map((s): ExportColumn => ({
            key: s.key,
            header: `${s.label} (${metricUnit})`,
            type: metric === 'quantity' ? 'decimal' : 'money',
          })),
        ],
        rows: chartRows,
      })}
      action={(
        <ErpisRankControls
          topN={topN}
          onTopNChange={setTopN}
          extra={(
            // Açılır liste yerine segment: tarayıcının kendi <select> kutusu kartın
            // geri kalanıyla aynı yükseklikte durmuyordu ve koyu temada sistem
            // renklerine düşüyordu. Beş seçenek zaten tek satıra sığıyor.
            <ErpisSegment
              ariaLabel="Trend boyutu"
              value={dimension as string}
              onChange={(value) => setDimension(value as ErpisBreakdownKey)}
              options={TREND_DIMENSIONS.map((d) => ({ value: d.value as string, label: d.label }))}
            />
          )}
        />
      )}
    >
      {trend.isLoading ? (
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
            label={metric === 'quantity'
              ? `${dimensionLabel} toplamı (adet)`
              : `${dimensionLabel} toplamı${currency ? ` (${currency})` : ''}`}
            stats={[
              { label: dimensionLabel, value: formatNumber(ordered.length) },
              { label: 'Dilim', value: formatNumber(chartRows.length) },
            ]}
          />

          <ResponsiveContainer width="100%" height={DIMENSION_TREND_HEIGHT}>
            <ComposedChart data={chartRows} margin={{ top: 8, right: 10, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} vertical={false} />
              <XAxis dataKey="bucket" tick={theme.axisTick} axisLine={false} tickLine={false} minTickGap={16} />
              <YAxis tick={theme.axisTick} axisLine={false} tickLine={false} tickFormatter={formatAxis} width={58} />
              <Tooltip
                {...theme.tooltip}
                formatter={(value: unknown, name: unknown) => [
                  formatNumber(typeof value === 'number' ? value : null, metric === 'quantity' ? 0 : 2),
                  ordered.find((s) => s.key === name)?.label ?? String(name),
                ]}
              />
              {ordered.map((s, index) => (
                <Area
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  stackId="dimension"
                  // Bandlar ARTIK SAYDAM DEĞİL. Yarı saydam dolgular üst üste binince
                  // renkler karışıyor ve iki komşu cari aynı tona düşüyordu; ayırıcı
                  // kart zemini renginde ince bir çizgi.
                  stroke={theme.surface}
                  strokeWidth={1}
                  fill={erpisCategoricalColor(index, theme.dark)}
                  fillOpacity={0.92}
                />
              ))}
            </ComposedChart>
          </ResponsiveContainer>

          <div>
            {ordered.map((s, index) => {
              const value = seriesTotal(s);
              return (
                <div key={s.key} className="erpis-legend-row">
                  <span
                    className="erpis-legend-dot"
                    style={{ background: erpisCategoricalColor(index, theme.dark) }}
                  />
                  <span className="erpis-legend-label" title={s.label}>{s.label}</span>
                  <span className="erpis-legend-value">
                    {formatCompact(value)}
                    <span style={{ color: theme.tick, fontWeight: 600 }}>
                      {' '}%{grandTotal > 0 ? ((value / grandTotal) * 100).toFixed(1) : '0.0'}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </ErpisCard>
  );
}

// ── Depo bölgeleri ──────────────────────────────────────────────────────────
//
// Ne işe yarıyor: sipariş raporundaki serbest metin raf dağılımı
// ("B:24 RAF:TES09 MİK:25-") ayrıştırılıp sorgulanabilir hâle geliyor. Kart "hangi
// bölgede ne kadar stok duruyor" sorusunu cevaplıyor — sevkiyat planlarken ve sayım
// yaparken hangi bölgeye gidileceğini söylüyor.
//
// Rakam STOKTUR, sipariş değil: kart başına tekilleştirilmiş raf kayıtlarından geliyor
// ve KART filtresiyle daralıyor (marka seçilince o markanın stoğu).
function ErpisWarehouseZones({ queryFilter }: WidgetProps) {
  const theme = useErpisChartTheme();
  const zones = useErpisWarehouseZones(queryFilter);

  const rows = zones.data ?? [];
  const total = rows.reduce((sum, z) => sum + z.quantity, 0);
  const max = rows.length > 0 ? Math.max(...rows.map((z) => z.quantity)) : 0;

  return (
    <ErpisCard
      title="Depo Bölgeleri"
      subtitle="Raf dağılımından çıkarılan stok adedi"
      exportData={() => (rows.length === 0 ? null : {
        columns: [
          { key: 'zone', header: 'Bölge', type: 'text' },
          { key: 'quantity', header: 'Adet', type: 'decimal' },
          { key: 'share', header: 'Pay', type: 'percent' },
          { key: 'shelfCount', header: 'Raf', type: 'int' },
          { key: 'itemCount', header: 'Stok Kartı', type: 'int' },
        ],
        rows: rows.map((z) => ({
          zone: z.zone,
          quantity: z.quantity,
          share: total > 0 ? z.quantity / total : 0,
          shelfCount: z.shelfCount,
          itemCount: z.itemCount,
        })),
      })}
    >
      {zones.isLoading ? (
        <ErpisLoader />
      ) : rows.length === 0 ? (
        <ErpisEmpty
          title="Raf bilgisi yok"
          hint="Depo dağılımı kolonu sipariş raporunda bulunamadı."
        />
      ) : (
        <>
          <ErpisHero
            value={formatCompact(total)}
            label="Toplam adet"
            stats={[
              { label: 'Bölge', value: formatNumber(rows.length) },
              { label: 'Raf', value: formatNumber(rows.reduce((s, z) => s + z.shelfCount, 0)) },
              { label: 'Kart', value: formatNumber(rows.reduce((s, z) => s + z.itemCount, 0)) },
            ]}
          />

          <div>
            {rows.map((zone, index) => (
              <div key={zone.zone} className="erpis-rank-row">
                <span className="erpis-rank-num">{index + 1}</span>
                <div className="erpis-rank-body">
                  <span className="erpis-rank-label">
                    Bölge {zone.zone}
                    <span style={{ color: theme.tick, fontWeight: 500 }}>
                      {' '}· {formatNumber(zone.shelfCount)} raf · {formatNumber(zone.itemCount)} kart
                    </span>
                  </span>
                  <div className="erpis-bar-track">
                    <div
                      className="erpis-bar-fill"
                      style={{
                        width: `${max > 0 ? Math.max(2, (zone.quantity / max) * 100) : 0}%`,
                        background: erpisCategoricalColor(index, theme.dark),
                      }}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  <span className="erpis-rank-value">{formatCompact(zone.quantity)}</span>
                  <span className="erpis-rank-share">
                    %{total > 0 ? ((zone.quantity / total) * 100).toFixed(1) : '0.0'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </ErpisCard>
  );
}

// ── Açık / kapalı sipariş ────────────────────────────────────────────────────
//
// "Kapalı" TÜRETİLMİŞ bir durum: kayıt daha yeni bir anlık görüntüde görünmediği için
// kapandığı varsayılır (bkz. ErpisOrder.IsClosed). Kart bunu açıkça yazar — kullanıcı
// rakamı Erpis'in kendi alanı sanmamalı.
function ErpisOpenOrders({ queryFilter }: WidgetProps) {
  const theme = useErpisChartTheme();
  const summary = useErpisOrdersSummary(queryFilter);

  const open = summary.data?.openLineCount ?? 0;
  const closed = summary.data?.closedLineCount ?? 0;
  const total = open + closed;

  const ordered = summary.data?.totalQuantity ?? 0;
  const shipped = summary.data?.shippedQuantity ?? 0;
  const remaining = summary.data?.remainingQuantity ?? 0;

  return (
    <ErpisCard
      title="Açık / Kapalı Sipariş"
      subtitle="Kapalı = son raporda görünmeyen kalem"
      exportData={() => (total === 0 ? null : {
        columns: [
          { key: 'metric', header: 'Ölçü', type: 'text' },
          { key: 'value', header: 'Değer', type: 'decimal' },
          { key: 'unit', header: 'Birim', type: 'text' },
        ],
        rows: [
          { metric: 'Açık kalem', value: open, unit: 'kalem' },
          { metric: 'Kapalı kalem', value: closed, unit: 'kalem' },
          { metric: 'Toplam kalem', value: total, unit: 'kalem' },
          { metric: 'Sipariş edilen', value: ordered, unit: 'adet' },
          { metric: 'Sevk edilen', value: shipped, unit: 'adet' },
          { metric: 'Kalan', value: remaining, unit: 'adet' },
        ],
      })}
    >
      {summary.isLoading ? (
        <ErpisLoader />
      ) : total === 0 ? (
        <ErpisEmpty title="Gösterilecek veri yok" hint="Seçili dönemde sipariş kalemi yok." />
      ) : (
        <>
          <ErpisHero
            value={formatNumber(open)}
            label="Açık kalem"
            stats={[
              { label: 'Kapalı', value: formatNumber(closed) },
              { label: 'Açık Oranı', value: `%${((open / total) * 100).toFixed(1)}` },
            ]}
          />

          {/* Sevkiyat ilerlemesi: sipariş edilenin ne kadarı çıktı. Açık/kapalı sayısı
              KALEM düzeyinde, bu ise ADET düzeyinde — farklı soruları cevaplıyorlar. */}
          <div className="erpis-mini-grid" style={{ marginBottom: 12 }}>
            <div className="erpis-mini-card">
              <span className="erpis-mini-label">Sipariş</span>
              <span className="erpis-mini-value">{formatCompact(ordered)}</span>
              <span className="erpis-mini-sub">adet</span>
            </div>
            <div className="erpis-mini-card">
              <span className="erpis-mini-label">Sevk</span>
              <span className="erpis-mini-value">{formatCompact(shipped)}</span>
              <span className="erpis-mini-sub">
                %{ordered > 0 ? ((shipped / ordered) * 100).toFixed(1) : '0.0'}
              </span>
            </div>
            <div className="erpis-mini-card">
              <span className="erpis-mini-label">Kalan</span>
              <span className="erpis-mini-value">{formatCompact(remaining)}</span>
              <span className="erpis-mini-sub">
                %{ordered > 0 ? ((remaining / ordered) * 100).toFixed(1) : '0.0'}
              </span>
            </div>
            <div className="erpis-mini-card">
              <span className="erpis-mini-label">Kalem</span>
              <span className="erpis-mini-value">{formatNumber(total)}</span>
              <span className="erpis-mini-sub">toplam</span>
            </div>
          </div>

          <div className="erpis-bar-track" style={{ height: 10 }}>
            <div
              className="erpis-bar-fill"
              style={{
                width: `${(open / total) * 100}%`,
                background: erpisCategoricalColor(0, theme.dark),
              }}
            />
          </div>

          <div style={{ marginTop: 8 }}>
            {[
              { label: 'Açık', value: open, color: erpisCategoricalColor(0, theme.dark) },
              { label: 'Kapalı', value: closed, color: erpisCategoricalColor(7, theme.dark) },
            ].map((row) => (
              <div key={row.label} className="erpis-legend-row">
                <span className="erpis-legend-dot" style={{ background: row.color }} />
                <span className="erpis-legend-label">{row.label}</span>
                <span className="erpis-legend-value">
                  {formatNumber(row.value)}
                  <span style={{ color: theme.tick, fontWeight: 600 }}>
                    {' '}%{((row.value / total) * 100).toFixed(1)}
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
