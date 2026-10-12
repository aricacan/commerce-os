'use client';

import { TrendingDown, TrendingUp } from 'lucide-react';

// Giriş ekranı kartlarının ortak parçaları.
//
// E-ticaret ve Erpis firmaları AYNI bileşenleri kullanıyor: iki kart yan yana duruyor ve
// birinde 19px, diğerinde 21px rakam olması kaza değil, gözle görülür bir dağınıklık.

// Kartta gösterilen bir dönem. Her iki uç da bu şekle dönüyor (ErpisPeriodDto /
// DashboardPeriodDto) — kart, verinin nereden geldiğini bilmiyor.
export interface CardPeriod {
  amount: number;
  orderCount: number;
  itemCount: number;
}

// ── Ana rakam ────────────────────────────────────────────────────────────────
//
// Kartın CEVAP verdiği tek soru: "bu ay ne yaptık". Dört rakamı eşit ağırlıkta yan yana
// dizmek, gözü hiçbir yere götürmüyordu — kart büyüdükçe daha da boş görünüyordu.
export function CardHero({ label, range, note, value, unit, previous, storea }: {
  label: string;
  /** "01.09 – 10.09" — ana rakamın hangi aralığı kapsadığı. */
  range?: string;
  /**
   * Etiketin yanındaki küçük nitelik — "8 Eyl'den beri" gibi.
   *
   * Rakamın NEYİ KAPSADIĞI, rakamın kendisi kadar önemli.
   */
  note?: string;
  value: number;
  /** "TL" ya da "adet" — her firma para diliyle konuşmuyor. */
  unit: string;
  /**
   * Geçen ayın aynı gününe kadarki tutar. YOKSA değişim gösterilmez — eksik bir geçmişle
   * hesaplanan oran, olmayan bir yükselişi anlatır.
   */
  previous?: number | null;
  storea?: readonly number[];
}) {
  const delta = previous != null && previous > 0
    ? ((value - previous) / previous) * 100
    : null;

  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 flex-col gap-1.5">
        <span className="flex flex-wrap items-baseline gap-x-2 text-[10.5px] font-bold uppercase tracking-[0.08em] text-[var(--fg-muted)]">
          {label}
          {range && (
            <span className="font-semibold normal-case tracking-normal tabular-nums opacity-75">
              {range}
            </span>
          )}
          {note && (
            <span className="font-semibold normal-case tracking-normal opacity-70">· {note}</span>
          )}
        </span>

        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 sm:gap-x-2.5">
          <span className="text-[25px] font-extrabold leading-none tracking-[-0.6px] tabular-nums text-[var(--fg)] xs:text-[28px] sm:text-[34px] xl:text-[38px]">
            {money(value)}
          </span>
          <span className="text-[11px] font-bold uppercase text-[var(--fg-muted)] sm:text-[12px]">
            {unit}
          </span>
          {delta != null && <Delta value={delta} />}
        </div>
      </div>

      {storea && storea.length > 1 && (
        <div className="shrink-0 self-start pt-0.5">
          <StoreA values={storea} rising={(delta ?? 0) >= 0} />
        </div>
      )}
    </div>
  );
}

// Yön RENGİ taşıyor ama renk tek başına konuşmuyor: ok işareti de var.
// Renk körü bir kullanıcı için yeşil/kırmızı ayrımı yok, ok var.
function Delta({ value }: { value: number }) {
  const rising = value >= 0;
  const Icon = rising ? TrendingUp : TrendingDown;

  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[11px] font-bold tabular-nums sm:text-[12px] ${
        rising ? 'text-[var(--success,#16a34a)]' : 'text-[var(--danger,#dc2626)]'
      }`}
    >
      <Icon size={13} strokeWidth={2.4} />
      {rising ? '+' : ''}{value.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}%
    </span>
  );
}

// Son 30 günün eğrisi — kütüphane yok, düz bir SVG yolu.
//
// Recharts bu ölçekte (80×32px) hem ağır hem de eksen/ipucu gibi hiç kullanılmayan
// parçaları getiriyor. Eğrinin işi tek bir şey: "yükseliyor mu, düşüyor mu".
function StoreA({ values, rising }: { values: readonly number[]; rising: boolean }) {
  const width = 84;
  const height = 34;
  const max = Math.max(...values, 1);

  const points = values.map((value, index) => {
    const x = (index / (values.length - 1)) * width;
    const y = height - (value / max) * height;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="h-[26px] w-[64px] shrink-0 overflow-visible xs:h-[30px] xs:w-[74px] sm:h-[34px] sm:w-[84px]"
      aria-hidden="true"
    >
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke={rising ? 'var(--success, #16a34a)' : 'var(--danger, #dc2626)'}
        strokeWidth={1.7}
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity={0.8}
      />
    </svg>
  );
}

// ── Dönem tablosu ────────────────────────────────────────────────────────────
//
// Dört dönem, TABLO gibi: üstte tutar, altında "kaç sipariş, kaç ürün".
// Mobilde ve dar kartlarda 2x2 düzen metinlerin kesilmesini (truncate) engeller;
// geniş ekranlarda (xl+) tek satır 4 sütuna yayılır.
export function CardPeriods({ periods, format, unit, bare = false }: {
  periods: readonly { label: string; period: CardPeriod }[];
  /** Tutar biçimi — miktar diliyle konuşan firmada adet. */
  format: (value: number) => string;
  unit?: string;
  /** Üst çizgi ve iç boşluk olmadan: kartın kendi yan sütununda dururken. */
  bare?: boolean;
}) {
  const frame = bare ? '' : 'border-t border-[var(--border-soft)] pt-3 ';

  return (
    <div className={`grid grid-cols-2 gap-x-3 gap-y-3.5 ${frame}sm:gap-x-4 xl:grid-cols-4 xl:gap-y-0`}>
      {periods.map(({ label, period }) => (
        <div key={label} className="flex min-w-0 flex-col gap-0.5 sm:gap-1">
          <span className="truncate text-[10px] font-bold uppercase tracking-[0.05em] text-[var(--fg-muted)]">
            {label}
          </span>

          <span className="truncate text-[15px] font-extrabold tabular-nums leading-none text-[var(--fg)] sm:text-[17px] xl:text-[18px]">
            {format(period.amount)}
            {unit && <span className="ml-1 text-[10px] font-bold text-[var(--fg-muted)]">{unit}</span>}
          </span>

          <div className="flex flex-wrap items-center gap-x-1 text-[10px] tabular-nums text-[var(--fg-muted)] sm:text-[10.5px]">
            <span className="whitespace-nowrap">{count(period.orderCount)} sipariş</span>
            <span className="opacity-40">·</span>
            <span className="whitespace-nowrap">{count(period.itemCount)} ürün</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// Kartın sağ altındaki küçük "tıklayınca detay açılır" ipucu. Kart `relative` olmalı; ipucunun
// altında yer kalsın diye kartın alt iç boşluğu en az pb-8 olur.
export function DetailHint() {
  return (
    <span className="pointer-events-none absolute bottom-2 right-3.5 text-[10px] font-medium text-[var(--fg-muted)] opacity-70 transition-opacity group-hover:opacity-100">
      Detay için tıklayınız
    </span>
  );
}

// YUVARLAMA YOK — Erpis'in her yerinde olduğu gibi. Kuruş atılıyor: giriş ekranı bir
// büyüklük duygusu veriyor, muhasebe yapmıyor.
export function money(value: number | undefined): string {
  return value == null ? '—' : value.toLocaleString('tr-TR', { maximumFractionDigits: 0 });
}

export function count(value: number | undefined): string {
  return value == null ? '—' : value.toLocaleString('tr-TR');
}

// "01.09 – 10.09" — kartın ana rakamının kapsadığı aralık.
export function formatRange(from?: string, to?: string): string | undefined {
  if (!from || !to) return undefined;

  const short = (iso: string) => {
    const date = new Date(iso);
    return Number.isNaN(date.getTime())
      ? iso
      : date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' });
  };

  return `${short(from)} – ${short(to)}`;
}
