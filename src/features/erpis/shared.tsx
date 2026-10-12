'use client';

import { AlertTriangle } from 'lucide-react';
import { palette, icon, softTint } from '../shared/design';

// Erpis sekmelerinin ortak parçaları. Kart/renk gibi primitive'ler design.ts'ten gelir —
// burada yeniden tanımlanmaz, aksi hâlde ortak tasarım değişince modül geride kalırdı.

export function ErrorState({ text }: { text?: string }) {
  return (
    <div
      className="flex items-center gap-2 rounded-[4px] px-4 py-3 text-[13px] font-semibold"
      style={{ color: palette.danger, background: softTint(palette.danger) }}
    >
      <AlertTriangle size={icon.lg} strokeWidth={icon.stroke} />
      {text ?? 'Veri yüklenemedi. Bağlantıyı kontrol edip tekrar deneyin.'}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 rounded-[4px] border border-dashed border-[var(--border-soft)] px-6 py-10 text-center">
      <p className="text-[13px] font-bold text-[var(--fg)]">{title}</p>
      {hint && <p className="text-[11.5px] text-[var(--fg-muted)]">{hint}</p>}
    </div>
  );
}

export function SectionCard({ title, subtitle, action, children }: {
  title: string;
  /** Başlığın altındaki tek satırlık açıklama — kartın hangi soruyu cevapladığı. */
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-4 shadow-xs">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col">
          <h3 className="text-[12px] font-bold uppercase tracking-[0.02em] text-[var(--fg)]">{title}</h3>
          {subtitle && <p className="mt-0.5 text-[10.5px] text-[var(--fg-muted)]">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

// İKON YOK.
//
// Altı KPI'nın her birinde farklı bir simge, rakamların yanında sürekli göz çeken ama
// hiçbir şey söylemeyen bir gürültü katmanıydı: "Sipariş" yazısının yanındaki pano
// simgesi o kartı okumayı kolaylaştırmıyor. Etiket zaten neyin ne olduğunu söylüyor.
export function KpiCard({ label, value, hint, large = false, delta, warn = false }: {
  label: string;
  value: string;
  hint?: string;
  /** Sunum modu: uzaktan okunabilmesi için rakam ve etiketler büyütülür. */
  large?: boolean;
  /** Önceki döneme göre yüzde değişim. null = karşılaştırılacak veri yok. */
  delta?: number | null;
  /** Kartı dikkat çekici hale getirir (ör. veri bayatlamış). */
  warn?: boolean;
}) {
  return (
    <div
      className={`flex flex-col rounded-[4px] border bg-[var(--card)] shadow-xs ${large ? 'gap-2 p-6' : 'gap-1 p-3'}`}
      style={{ borderColor: warn ? palette.warning : palette.borderSoft }}
    >
      <div className="flex items-center gap-1.5 text-[var(--fg-muted)]">
        <span className={`font-bold uppercase tracking-[0.02em] ${large ? 'text-[13px]' : 'text-[10.5px]'}`}>
          {label}
        </span>
      </div>

      <div className="flex items-baseline gap-2">
        <span className={`font-extrabold tabular-nums text-[var(--fg)] ${large ? 'text-[40px] leading-none' : 'text-[20px] leading-tight'}`}>
          {value}
        </span>
        {delta != null && <DeltaBadge value={delta} />}
      </div>

      {hint && (
        <span
          className={`${large ? 'text-[13px]' : 'text-[10.5px]'}`}
          style={{ color: warn ? palette.warningText : palette.textMuted }}
        >
          {hint}
        </span>
      )}
    </div>
  );
}

// Yön rengi bilinçli olarak sabit: artış her zaman yeşil değildir (iade tutarı artışı
// kötüdür), ama bu panodaki KPI'ların hepsinde artış olumludur. Başka bir KPI eklenirse
// yön anlamı gözden geçirilmeli.
function DeltaBadge({ value }: { value: number }) {
  const positive = value >= 0;

  return (
    <span
      className="text-[11px] font-bold tabular-nums"
      style={{ color: positive ? palette.success : palette.danger }}
    >
      {positive ? '+' : ''}{formatNumber(value, 1)}%
    </span>
  );
}

// Önceki döneme göre yüzde değişim. Önceki dönem sıfırsa oran tanımsızdır — 0'dan
// artışı "%100 arttı" diye göstermek yanıltıcı olurdu, o yüzden null döner.
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

// ── Biçimlendirme ────────────────────────────────────────────────────────────
//
// Tümü tr-TR: rakamlar sunumda okunacak, ondalık ayracı arayüzün geri kalanıyla
// tutarlı olmalı.

export function formatNumber(value: number | null | undefined, fractionDigits = 0): string {
  if (value == null) return '—';
  return value.toLocaleString('tr-TR', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

// YUVARLAMA YOK.
//
// Bu fonksiyon eskiden "12,4 Mn" gibi kısaltıyordu. Erpis'te rakamlar müzakere edilen
// rakamlar: 6.198 kalemi "6,2 B" diye göstermek, ekrandaki sayıyla ERP'deki sayıyı
// karşılaştırmayı imkânsız kılıyor ve toplantıda "peki tam kaç?" sorusunu doğuruyor.
// Ad bilinçli olarak korundu — çağrı yerleri "kısalt" değil "değeri yaz" diyor.
export function formatCompact(value: number | null | undefined): string {
  if (value == null) return '—';
  // Tutarlarda kuruş anlamlı, adetlerde değil: ondalıklı gelen değer ondalığıyla yazılır.
  return formatNumber(value, Number.isInteger(value) ? 0 : 2);
}

// Grafik EKSENİ — tek yuvarlanan yer.
//
// Eksen etiketi bir değer değil, bir ölçek işareti: yanına "12.400.000" yazmak eksenin
// yarısını kaplıyor ve grafiği okunmaz hâle getiriyor. Kesin değer ipucunda (tooltip)
// ve etiketlerde yazıyor; orada yuvarlama yok.
export function formatAxis(value: number | null | undefined): string {
  if (value == null) return '—';
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${formatNumber(value / 1_000_000_000, 1)} Mr`;
  if (abs >= 1_000_000) return `${formatNumber(value / 1_000_000, 1)} Mn`;
  return formatNumber(value, 0);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('tr-TR');
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('tr-TR');
}

export function formatPeriod(start: string | null, end: string | null): string {
  if (!start && !end) return '—';
  if (start === end) return formatDate(start);
  return `${formatDate(start)} – ${formatDate(end)}`;
}

// Recharts'ın tema duyarlı olması için: kütüphane kendi varsayılan renklerini
// kullanırsa koyu temada okunmuyor.
export const CHART_TOOLTIP_STYLE = {
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'var(--card)',
  fontSize: 12,
  color: 'var(--fg)',
} as const;

// ── Grafik renkleri ──────────────────────────────────────────────────────────
//
// E-ticaret panosuyla AYNI dil: aynı slate/emerald tonları, aynı kategorik palet
// (bkz. components/dashboard/WidgetCard.tsx PALETTE ve KpiTrendChart).
//
// Daha önce grafikler `var(--fg)` kullanıyordu; açık temada bu saf siyah demek ve
// e-ticaretten Erpis'e geçerken sert bir görsel kopuş yaratıyordu. Ölçü rengi asla
// metin rengi olmamalı.
export const CHART_AXIS_TICK = { fontSize: 10.5, fill: '#64748b' } as const;
export const CHART_GRID_STROKE = 'rgba(148, 163, 184, 0.25)';

// Tek serili grafiklerin (tutar trendi) ana rengi.
export const CHART_LINE = '#059669';
export const CHART_AREA_FROM = 'rgba(5, 150, 105, 0.20)';
export const CHART_AREA_TO = 'rgba(5, 150, 105, 0.02)';

// Sıralama çubukları: kategorik değil, aynı ölçünün büyüklükleri — tek ton, kademeli
// şeffaflık. Slate, e-ticaretteki çubuklarla (#94a3b8 / #cbd5e1) aynı aileden.
export const CHART_BAR = '#64748b';

// Kategorik kırılımlar (firma, depo, kategori) için — her dilim ayrı bir şey.
export const CHART_CATEGORICAL = [
  '#3b82f6', '#22c55e', '#f97316', '#8b5cf6',
  '#14b8a6', '#eab308', '#ec4899', '#ef4444',
] as const;

export function categoricalColor(index: number): string {
  return CHART_CATEGORICAL[index % CHART_CATEGORICAL.length];
}

// Recharts formatter'ı değeri geniş bir birleşim tipiyle (dizi/undefined dahil) veriyor;
// tek yerde daraltıp her grafikte tekrarlamıyoruz.
export function amountTooltipFormatter(value: unknown): [string, string] {
  return [formatNumber(typeof value === 'number' ? value : null, 2), 'Tutar'];
}
