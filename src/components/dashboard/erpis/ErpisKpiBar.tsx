'use client';

import { useRouter } from 'next/navigation';
import { Factory, ChevronRight } from 'lucide-react';
import { useErpisOrdersSummary, useErpisOrdersTrend } from '@/hooks/erpis/useErpisQuery';
import type { ErpisOrdersSummary, ErpisOrderTrendPoint, ErpisQueryFilter } from '@/lib/api';
import { ErrorState, formatCompact, formatNumber, percentChange } from '../../../features/erpis/shared';
import { formatBucketLabel } from './erpisBucket';
import { ErpisKpiCard, ErpisKpiStyles, type ErpisKpiPart, type ErpisKpiPoint } from './ErpisKpiCard';

// Verinin bayatlaması — genel müdürün istediği kademeli uyarı.
//
// Erpis raporu ayda 1-2 kez yükleniyor; bir haftalık gecikme henüz normal, iki hafta
// dikkat, bir ay "kimse yüklemeyi unuttu" demek. Renkler SOLUK: sunum ekranında cırtlak
// bir kırmızı, asıl rakamların önüne geçer.
const STALENESS_STEPS = [
  { days: 30, color: 'rgba(239, 68, 68, 0.55)', border: 'rgba(239, 68, 68, 0.35)', note: '1 aydan eski' },
  { days: 14, color: 'rgba(249, 115, 22, 0.65)', border: 'rgba(249, 115, 22, 0.35)', note: '2 haftadan eski' },
  { days: 7, color: 'rgba(202, 138, 4, 0.75)', border: 'rgba(202, 138, 4, 0.32)', note: '1 haftadan eski' },
] as const;

interface Props {
  filter: ErpisQueryFilter;
  previousFilter: ErpisQueryFilter;
}

// Panonun üst şeridi. Tasarım e-ticaret KPI'larıyla birebir (bkz. ErpisKpiCard).
//
// Rakamlar NORMALİZE katmandan okunuyor: ham satır analitiğinde genel amaçlı "Tutar"
// alanı eşlenmemiş ve o katmandan okuyan kartlar sıfır gösteriyordu.
export function ErpisKpiBar({ filter, previousFilter }: Props) {
  const router = useRouter();

  // Kur çevrimi AÇIK: tek bir "sipariş tutarı" rakamı ancak dövizler tek birime
  // çevrilince anlamlı; ayrışık toplamlar ipucu satırında duruyor.
  const current = useErpisOrdersSummary({ ...filter, convertTo: 'TL' });
  const previous = useErpisOrdersSummary({ ...previousFilter, convertTo: 'TL' });
  // Kova zaten tarihten türetiliyor (bkz. resolveErpisBucket); kart aynı seriyi kullanır.
  const trend = useErpisOrdersTrend({ ...filter, convertTo: 'TL' });

  if (current.error) {
    return (
      <div className="px-5 pt-4">
        <ErrorState text={current.error instanceof Error ? current.error.message : undefined} />
      </div>
    );
  }

  const data = current.data;
  const prev = previous.data;
  const loading = current.isLoading;

  const total = comparableTotal(data);
  const prevTotal = comparableTotal(prev);
  const currency = data?.converted?.currency ?? data?.totals[0]?.currency ?? '';

  const orderCount = data?.orderCount ?? 0;
  const prevOrderCount = prev?.orderCount ?? 0;

  const average = orderCount > 0 ? total / orderCount : 0;
  const prevAverage = prevOrderCount > 0 ? prevTotal / prevOrderCount : 0;

  const shipped = data?.shippedTotals[0];

  const staleDays = daysSince(data?.lastUploadedAt ?? null);
  const staleness = STALENESS_STEPS.find((step) => staleDays != null && staleDays >= step.days);

  const amountSeries = seriesOf(trend.data, 'amount');
  const countSeries = seriesOf(trend.data, 'lineCount');
  const shippedSeries = seriesOf(trend.data, 'shippedAmount');
  const openSeries = seriesOf(trend.data, 'openLineCount');
  // Kova bazında sipariş SAYISI yok (bir sipariş iki kovaya düşerse mükerrer sayılırdı),
  // bu yüzden ortalama KALEM başına: kartın rakamı sipariş başına, arka yüzdeki eğri
  // kalem başına — grafik başlığı bunu açıkça yazıyor.
  const averageSeries = ratioSeries(trend.data, 'amount', 'lineCount');

  return (
    <>
      <ErpisKpiStyles />
      <div className="grid grid-cols-2 gap-2 px-3 pt-3 sm:grid-cols-3 md:gap-2.5 md:px-5 md:pt-4 lg:grid-cols-6">
        <ErpisKpiCard
          label={currency ? `Sipariş Tutarı (${currency})` : 'Sipariş Tutarı'}
          value={formatCompact(total)}
          parts={currencyParts(data)}
          hint={`${formatNumber(data?.lineCount)} kalem`}
          delta={percentChange(total, prevTotal)}
          accent="var(--fg)"
          chart={amountSeries}
          chartLabel="Sipariş tutarı"
          formatValue={formatCompact}
          isLoading={loading}
          delay={0}
        />

        {/* Sipariş sayısı tek başına eksik bir cevap: kaç farklı ürünü kapsıyor?
            Modülde ve sunum modunda da aynı biçim kullanılıyor. */}
        <ErpisKpiCard
          label="Sipariş / Ürün"
          value={`${formatNumber(orderCount)} / ${formatNumber(data?.itemCount)}`}
          hint={`${formatNumber(data?.lineCount)} kalem`}
          delta={percentChange(orderCount, prevOrderCount)}
          chart={countSeries}
          chartLabel="Kalem adedi"
          formatValue={(v) => formatNumber(v)}
          isLoading={loading}
          delay={40}
        />

        <ErpisKpiCard
          label="Ort. Sipariş Tutarı"
          value={formatCompact(average)}
          hint={currency ? `${currency} ÷ sipariş` : 'Tutar ÷ sipariş'}
          delta={percentChange(average, prevAverage)}
          chart={averageSeries}
          chartLabel="Kalem başına tutar"
          formatValue={formatCompact}
          isLoading={loading}
          delay={80}
        />

        {/* Sevk EDİLEN tutar ayrı bir kart: bu rapor açık sipariş görüntüsü ve kalemlerin
            çoğu hiç sevk edilmemiş. Sipariş tutarına "ciro" demek yanıltıcı olurdu. */}
        <ErpisKpiCard
          label="Sevk Edilen"
          value={shipped ? formatCompact(shipped.total) : '—'}
          hint={shipped
            ? `${shipped.currency} · ${formatNumber(data?.shippedQuantity, 0)} adet`
            : 'Henüz sevkiyat yok'}
          chart={shippedSeries}
          chartLabel="Sevk edilen tutar"
          formatValue={formatCompact}
          isLoading={loading}
          delay={120}
        />

        {/* Açık ve kapalı tek kartta: ikisi aynı bütünün parçası ve ayrı kartlarda
            toplamın ne olduğu görünmüyordu. */}
        <ErpisKpiCard
          label="Açık / Kapalı Kalem"
          value={`${formatNumber(data?.openLineCount)} / ${formatNumber(data?.closedLineCount)}`}
          hint={`${formatNumber(data?.remainingQuantity, 0)} adet bekliyor`}
          chart={openSeries}
          chartLabel="Açık kalem"
          formatValue={(v) => formatNumber(v)}
          isLoading={loading}
          delay={160}
        />

        <ErpisKpiCard
          label="Son Veri Yükleme"
          value={staleDays == null ? '—' : staleDays === 0 ? 'Bugün' : `${formatNumber(staleDays)} gün`}
          hint={staleness?.note ?? (staleDays == null ? 'Henüz yükleme yok' : 'Güncel')}
          accent={staleness?.color ?? 'var(--fg)'}
          borderColor={staleness?.border}
          back={<ErpisStalenessGauge days={staleDays} uploadedAt={data?.lastUploadedAt ?? null} />}
          isLoading={loading}
          delay={200}
        />
      </div>

      {/* Son kart metrik değil KAPI: modüle giriş, e-ticaretteki "Uygulamalar" kartının
          karşılığı. Pano özet, modül detay — ikisi arasında tek tıklık bir geçiş olmalı. */}
      <div className="px-3 pt-3 md:px-5">
        <button
          type="button"
          onClick={() => router.push('/erpis')}
          className="group flex w-full min-h-[58px] sm:min-h-[64px] items-center justify-between rounded-[8px] border border-[var(--border)] bg-[var(--card)] px-4 sm:px-6 py-3.5 shadow-xs transition-all hover:border-[var(--accent,#2563eb)] hover:shadow-md hover:bg-[var(--bg-subtle)]"
        >
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <span className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-[8px] bg-[var(--bg-subtle)] text-[var(--fg)] transition-colors group-hover:bg-[var(--accent,#2563eb)] group-hover:text-white">
              <Factory size={20} strokeWidth={2.2} />
            </span>
            <div className="flex flex-col text-left min-w-0">
              <span className="text-[14px] sm:text-[16px] font-extrabold tracking-tight text-[var(--fg)]">
                Erpis&apos;e gir
              </span>
              <span className="text-[11px] sm:text-[12px] font-medium text-[var(--fg-muted)] truncate">
                siparişler · stok kartları · sözlükler · yüklemeler
              </span>
            </div>
          </div>
          <ChevronRight size={18} className="shrink-0 text-[var(--fg-muted)] transition-transform group-hover:translate-x-1 group-hover:text-[var(--accent,#2563eb)]" />
        </button>
      </div>
    </>
  );
}

// Çevrilmiş toplam varsa o, yoksa en büyük tek para birimi.
function comparableTotal(summary: ErpisOrdersSummary | undefined): number {
  return summary?.converted?.total ?? summary?.totals[0]?.total ?? 0;
}

// Toplamın hangi para birimlerinden oluştuğu — değerin ALTINDA, ortalı.
//
// Tek bir "3,5 Mn TL" rakamı, arkasındaki dört ayrı dövizi gizliyor. Döküm çevrilmemiş
// HAM tutarları gösteriyor: kullanıcı "bu 4.900 USD gerçekten var mı" diye sorabilmeli.
function currencyParts(summary: ErpisOrdersSummary | undefined): ErpisKpiPart[] {
  const totals = summary?.totals ?? [];
  if (totals.length <= 1) return [];

  return totals
    .slice(0, 4)
    .map((t) => ({ label: t.currency, value: formatCompact(t.total) }));
}

// Trend serisini KPI kartının küçük grafiğine çevirir.
//
// Uç para birimi bazında seri döndürüyor; kur çevrimi açık olduğu için kovaları
// toplamak güvenli — hepsi aynı birime çevrilmiş durumda.
type ErpisTrendField = 'amount' | 'lineCount' | 'shippedAmount' | 'openLineCount';

function seriesOf(
  points: ErpisOrderTrendPoint[] | undefined,
  field: ErpisTrendField,
): ErpisKpiPoint[] {
  if (!points || points.length === 0) return [];

  const byBucket = new Map<string, number>();
  for (const point of points) {
    byBucket.set(point.bucket, (byBucket.get(point.bucket) ?? 0) + point[field]);
  }

  return [...byBucket.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([bucket, value]) => ({ label: formatBucketLabel(bucket), value }));
}

function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  return Math.max(0, Math.floor((Date.now() - then) / 86_400_000));
}

// İki serinin kova bazında oranı (ör. tutar ÷ kalem). Payda sıfırsa kova sıfır olur —
// atlanırsa eksende sahte bir süreklilik oluşurdu.
function ratioSeries(
  points: ErpisOrderTrendPoint[] | undefined,
  numerator: ErpisTrendField,
  denominator: ErpisTrendField,
): ErpisKpiPoint[] {
  const top = seriesOf(points, numerator);
  const bottom = seriesOf(points, denominator);

  return top.map((point, i) => {
    const divisor = bottom[i]?.value ?? 0;
    return { label: point.label, value: divisor > 0 ? point.value / divisor : 0 };
  });
}

// "Son veri yükleme" kartının arka yüzü — GRAFİK DEĞİL, ölçek.
//
// Tek bir tarihin zaman serisi yok; çizilecek bir eğri de yok. Sorulan soru "veri ne
// kadar eski" ve cevabı bir konum: işaretçi hangi bantta duruyor. Bantlar KPI'ın renk
// eşikleriyle (STALENESS_STEPS) aynı, böylece kartın rengi ve ölçek aynı şeyi söylüyor.
const GAUGE_MAX_DAYS = 45;
const GAUGE_BANDS = [
  { from: 0, until: 7, color: 'rgba(16, 185, 129, 0.45)', label: 'Güncel' },
  { from: 7, until: 14, color: 'rgba(202, 138, 4, 0.45)', label: '1 hafta' },
  { from: 14, until: 30, color: 'rgba(249, 115, 22, 0.45)', label: '2 hafta' },
  { from: 30, until: GAUGE_MAX_DAYS, color: 'rgba(239, 68, 68, 0.45)', label: '1 ay+' },
] as const;

function ErpisStalenessGauge({ days, uploadedAt }: { days: number | null; uploadedAt: string | null }) {
  const position = days == null ? 0 : Math.min(1, days / GAUGE_MAX_DAYS);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{
          fontSize: 9, fontWeight: 800, color: 'var(--fg-muted)',
          textTransform: 'uppercase', letterSpacing: '0.4px',
        }}>
          Veri Yaşı
        </span>
        <span style={{ fontSize: 9.5, fontWeight: 800, color: 'var(--fg)' }}>
          {days == null ? '—' : days === 0 ? 'Bugün' : `${days} gün önce`}
        </span>
      </div>

      {/* İşaretçi şeridin İÇİNDE, dikey bir çizgi olarak. Şeridin üstünde metin olarak
          duruyordu ve sıfır günde kartın soluna taşıp kırpılıyordu. */}
      <div style={{ position: 'relative', display: 'flex', height: 14, borderRadius: 4, overflow: 'hidden' }}>
        {GAUGE_BANDS.map((band) => (
          <div
            key={band.label}
            style={{
              flex: band.until - band.from,
              background: band.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <span style={{ fontSize: 7.5, fontWeight: 800, color: 'var(--fg)', opacity: 0.65 }}>
              {band.label}
            </span>
          </div>
        ))}

        {days != null && (
          <span style={{
            position: 'absolute',
            left: `calc(${position * 100}% - 1px)`,
            top: 0, bottom: 0, width: 2,
            background: 'var(--fg)',
            borderRadius: 2,
          }} />
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, fontWeight: 700, color: 'var(--fg-subtle)' }}>
        <span>0 gün</span>
        <span>{GAUGE_MAX_DAYS}+ gün</span>
      </div>

      <span style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--fg-muted)' }}>
        {uploadedAt
          ? new Date(uploadedAt).toLocaleString('tr-TR', {
            day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
          })
          : 'Henüz yükleme yok'}
      </span>
    </div>
  );
}
