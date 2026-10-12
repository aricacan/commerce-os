'use client';

import { AlertTriangle, CheckCircle2, Truck } from 'lucide-react';

// Bu ekranda renk YOK denecek kadar az: durum kartları gri tonlarında, tek vurgu
// başarısız yüklemede. Altı KPI, üç kart ve iki liste hepsi renkliyken ekran
// gürültüye dönüşüyor ve gerçekten dikkat isteyen şey kayboluyordu.
import { useErpisFilterState } from './useErpisFilterState';
import { ErpisDataHealthCard } from './ErpisDataHealthCard';
import { ErpisAgingCard } from './ErpisAgingCard';
import { ErpisCurrencyCard } from './ErpisCurrencyCard';
import { ErpisOverviewHero } from './ErpisOverviewHero';
import { AnalyticsSection } from './AnalyticsTab';
import {
  EmptyState, ErrorState, KpiCard, SectionCard,
  formatCompact, formatDateTime, formatNumber, formatPeriod,
} from './shared';
import { useErpisOrdersSummary, useErpisWarehouseZones } from '@/hooks/erpis/useErpisQuery';
import { useErpisSqlSources, useErpisUploads } from '@/hooks/erpis/useErpis';

// Genel Bakış — modülün DURUM ekranı.
//
// Panodaki Erpis kartlarının kopyası DEĞİL, bilerek. Pano yönetici özeti: ciro, trend,
// en çok satanlar. Buraya giren kişi veriyi YÖNETİYOR ve panonun cevaplamadığı üç soruyu
// soruyor:
//   1. Elimdeki veri sağlam mı? (kaç kartta marka/kategori eksik, kaç kalem kartsız)
//   2. Açık siparişler ne kadar bekledi? (yaşlandırma — panoda yalnız toplam sayı var)
//   3. Sevkiyat nerede, hangi depo bölgesinde ne var, en son ne zaman veri geldi?
//
// Kırılımlar ve sıralamalar Analiz sekmesinde; burada tekrar edilmiyorlar.
export function OverviewTab({ companyId }: { companyId: number | null }) {
  const { filter, activeCount } = useErpisFilterState(companyId);

  // Kur çevrimi AÇIK: tek bir toplam rakamı ancak dövizler tek birime çevrilince anlamlı.
  const summary = useErpisOrdersSummary({ ...filter, convertTo: 'TL' });
  const zones = useErpisWarehouseZones(filter);
  // Genel Bakış yalnız son birkaç yüklemeyi gösteriyor; tamamını çekmesi gereksiz.
  const uploads = useErpisUploads(companyId, null, 1, 6);
  // Canlı Veri (SP) durumu KPI şeridinde: veri artık çoğunlukla Excel'den değil
  // prosedürlerden geliyor, "veri neden güncellenmiyor" sorusunun ilk cevabı burada.
  const sqlSources = useErpisSqlSources();
  const sources = sqlSources.data ?? [];
  const activeSources = sources.filter((s) => s.isEnabled).length;
  const readySources = sources.filter((s) => s.isConfigured).length;
  const failingSources = sources.filter((s) => s.isEnabled && s.status === 'Error').length;

  const data = summary.data;
  const shipped = data?.shippedTotals[0];

  const hasData = (data?.lineCount ?? 0) > 0;

  if (summary.error) {
    return (
      <div className="p-4">
        <ErrorState text={summary.error instanceof Error ? summary.error.message : undefined} />
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="p-4">
        <EmptyState
          title="Bu filtreye uyan sipariş kalemi yok"
          hint={activeCount > 0
            ? 'Filtreleri temizleyip tekrar deneyin.'
            : 'Önce Yüklemeler sekmesinden bir sipariş raporu yükleyin.'}
        />
      </div>
    );
  }

  const ordered = data?.totalQuantity ?? 0;
  const shippedQty = data?.shippedQuantity ?? 0;
  const remaining = data?.remainingQuantity ?? 0;

  return (
    <div className="flex flex-col gap-3 p-4">
      {/* Ekranın CÜMLESİ en üstte: altı eşit ağırlıklı kutuyla başlamak "önce şuna bak"
          demiyordu. Hero bandı tek bir rakam, yönü ve dönem içi seyri veriyor. */}
      <div data-tour="erpis-hero">
        <ErpisOverviewHero filter={filter} />
      </div>

      <div data-tour="erpis-kpis" className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-7">
        {/* Sipariş tutarı BURADA YOK: hemen üstteki hero bandı zaten büyük büyük
            gösteriyor, aynı rakamı iki kez yazmak KPI şeridinin bir yerini boşa
            harcıyordu. Yerine sipariş ve ürün AYRI iki kart. */}
        <KpiCard
          label="Sipariş"
          value={formatNumber(data?.orderCount)}
          hint={`${formatNumber(data?.lineCount)} kalem`}
        />
        <KpiCard
          label="Ürün"
          value={formatNumber(data?.itemCount)}
          hint="Bu siparişlerdeki tekil ürün"
        />
        {/* "Ürün" kartı TEKİL ürün sayısı — bu kart TOPLAM adedi verir (aynı ürün
            10 farklı siparişte geçse "Ürün" kartında 1, burada 10 sayılır). */}
        <KpiCard
          label="Satılan Adet"
          value={formatCompact(ordered)}
          hint="Sipariş edilen toplam ürün adedi"
        />
        {/* Sevk EDİLEN tutar ayrı: bu rapor açık sipariş görüntüsü, kalemlerin çoğu
            henüz sevk edilmemiş. Sipariş tutarına "ciro" demek yanıltıcı olurdu. */}
        <KpiCard
          label="Sevk Edilen"
          value={shipped ? formatCompact(shipped.total) : '—'}
          hint={shipped ? shipped.currency : 'Henüz sevkiyat yok'}
        />
        <KpiCard
          label="Açık / Kapalı"
          value={`${formatNumber(data?.openLineCount)} / ${formatNumber(data?.closedLineCount)}`}
          hint={`${formatNumber(remaining, 0)} adet bekliyor`}
        />
        <KpiCard
          label="Cari"
          value={formatNumber(data?.partyCount)}
          hint={formatPeriod(data?.periodStart ?? null, data?.periodEnd ?? null)}
        />
        {/* "Son Yükleme" tarihi yerine CANLI VERİ DURUMU: tarih tek başına "veri taze mi"
            sorusunu cevaplamıyordu (otomatik çekim durmuşsa tarih de donuyor ama bunu
            göstermiyordu). Kaç prosedür tanımlı, kaçı açık ve hata var mı — asıl soru bu. */}
        <KpiCard
          label="Canlı Veri (SP)"
          value={sources.length === 0 ? '—' : `${activeSources} / ${sources.length}`}
          warn={sources.length > 0 && (activeSources === 0 || failingSources > 0)}
          hint={
            sources.length === 0 ? 'Kaynak listesi yüklenemedi'
              : failingSources > 0 ? `⚠ ${failingSources} kaynakta hata — Canlı Veri'yi açın`
                : activeSources === 0 ? '⚠ Hiçbir SP aktif değil — veri otomatik gelmiyor'
                  : `${readySources} prosedür hazır, ${activeSources} tanesi otomatik çekiyor`
          }
        />
      </div>

      {/* Sıra DEĞERE göre: KPI'ların hemen altında "kim/ne büyük" sorusunun cevabı
          (kırılım + Pareto), sonra eyleme dönüşen yaşlandırma, en altta veri yönetimi. */}
      <div data-tour="erpis-analytics">
        <AnalyticsSection filter={filter} />
      </div>

      <div data-tour="erpis-aging">
        <ErpisAgingCard filter={filter} />
      </div>

      <div data-tour="erpis-shipment-currency" className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <ErpisCurrencyCard filter={filter} />

        <SectionCard title="Sevkiyat İlerlemesi" subtitle="Sipariş edilenin ne kadarı çıktı">
          <ShipmentProgress ordered={ordered} shipped={shippedQty} remaining={remaining} />
        </SectionCard>
      </div>

      {/* Veri yönetimi kartları EN ALTTA ve YAN YANA: günlük bakılan rakamlar değil,
          ayda bir "veri sağlam mı" diye kontrol edilen ekranlar. */}
      <div data-tour="erpis-health-zones" className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <ErpisDataHealthCard filter={filter} />

        <SectionCard title="Depo Bölgeleri" subtitle="Raf dağılımından çıkarılan stok adedi">
          {(zones.data?.length ?? 0) === 0 ? (
            <EmptyState title="Raf bilgisi yok" hint="Depo dağılımı kolonu raporda bulunamadı." />
          ) : (
            <MiniBars
              rows={(zones.data ?? []).slice(0, 8).map((z) => ({
                key: z.zone,
                label: `Bölge ${z.zone}`,
                sub: `${formatNumber(z.shelfCount)} raf · ${formatNumber(z.itemCount)} kart`,
                value: z.quantity,
              }))}
            />
          )}
        </SectionCard>

        <SectionCard title="Son Yüklemeler" subtitle="Verinin nereden geldiği">
          {(uploads.data?.items.length ?? 0) === 0 ? (
            <EmptyState title="Henüz yükleme yok" hint="Yüklemeler sekmesinden rapor yükleyin." />
          ) : (
            <div className="flex flex-col">
              {(uploads.data?.items ?? []).map((upload) => (
                <div
                  key={upload.id}
                  className="flex items-center gap-2 border-b border-[var(--border-soft)] py-2 last:border-0"
                >
                  {/* Durum adı 'Committed' — 'Completed' değil (bkz. ErpisUploadStatus).
                      Yanlış karşılaştırma yüzünden BAŞARILI yüklemeler de uyarı üçgeniyle
                      görünüyordu; canlıda iki sağlam yükleme sorunluymuş gibi duruyordu. */}
                  {upload.status === 'Committed'
                    ? <CheckCircle2 size={13} strokeWidth={2.2} className="shrink-0 text-[var(--fg-subtle)]" />
                    : <AlertTriangle size={13} strokeWidth={2.2} className="shrink-0 text-[rgba(180,83,9,0.8)]" />}
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[12px] font-semibold text-[var(--fg)]">
                      {upload.fileName}
                    </span>
                    <span className="text-[10.5px] text-[var(--fg-muted)]">
                      {formatDateTime(upload.uploadedAt)} · {upload.uploadedBy}
                    </span>
                  </div>
                  <span className="shrink-0 text-[11.5px] font-bold tabular-nums text-[var(--fg)]">
                    {formatNumber(upload.rowCount)} satır
                  </span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

// Sipariş → sevk → kalan üç aşamalı ilerleme.
//
// Üç ayrı sayı yerine tek çubuk: "%2 sevk edilmiş" cümlesi üç rakamı zihinde bölmeden
// okunuyor. Rakamlar ADET düzeyinde — açık/kapalı KALEM düzeyinde ve farklı bir soru.
function ShipmentProgress({ ordered, shipped, remaining }: {
  ordered: number;
  shipped: number;
  remaining: number;
}) {
  const shippedPct = ordered > 0 ? (shipped / ordered) * 100 : 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-[22px] font-extrabold leading-none text-[var(--fg)]">
            %{shippedPct.toFixed(1)}
          </div>
          <div className="mt-1 text-[10px] font-bold uppercase tracking-wide text-[var(--fg-muted)]">
            Sevk oranı
          </div>
        </div>
        <Truck size={20} strokeWidth={1.8} className="text-[var(--fg-subtle)]" />
      </div>

      <div className="h-2.5 overflow-hidden rounded-full bg-[var(--border-soft)]">
        <div
          className="h-full rounded-full bg-[var(--fg-subtle)] transition-[width] duration-700"
          style={{ width: `${Math.max(shippedPct, shipped > 0 ? 1 : 0)}%` }}
        />
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Sipariş', value: ordered },
          { label: 'Sevk', value: shipped },
          { label: 'Kalan', value: remaining },
        ].map((row) => (
          <div
            key={row.label}
            className="flex flex-col rounded-[5px] border border-[var(--border-soft)] bg-[var(--card)] px-3 py-2"
          >
            <span className="text-[9.5px] font-bold uppercase tracking-wide text-[var(--fg-muted)]">
              {row.label}
            </span>
            <span className="text-[14.5px] font-extrabold leading-tight text-[var(--fg)]">
              {formatCompact(row.value)}
            </span>
            <span className="text-[8.5px] text-[var(--fg-muted)]">adet</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Basit yatay çubuk listesi — kartlar arası ortak desen.
function MiniBars({ rows }: {
  rows: { key: string; label: string; sub: string; value: number }[];
}) {
  const max = rows.length > 0 ? Math.max(...rows.map((r) => r.value)) : 0;

  return (
    <div className="flex flex-col">
      {rows.map((row) => (
        <div key={row.key} className="flex items-center gap-2.5 border-b border-[var(--border-soft)] py-2 last:border-0">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="truncate text-[11.5px] font-semibold text-[var(--fg)]">
              {row.label}
              <span className="font-normal text-[var(--fg-muted)]"> · {row.sub}</span>
            </span>
            <div className="h-1.5 overflow-hidden rounded-full bg-[var(--border-soft)]">
              <div
                className="h-full rounded-full transition-[width] duration-700"
                style={{
                  width: `${max > 0 ? Math.max(2, (row.value / max) * 100) : 2}%`,
                  background: 'var(--fg-subtle)',
                }}
              />
            </div>
          </div>
          <span className="shrink-0 text-[11.5px] font-extrabold tabular-nums text-[var(--fg)]">
            {formatCompact(row.value)}
          </span>
        </div>
      ))}
    </div>
  );
}
