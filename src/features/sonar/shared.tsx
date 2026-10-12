'use client';

import type { ReactNode } from 'react';
import { palette } from '../shared/design';
import type {
  CrawlJobStatus,
  MatchDecision,
  SiteHealthState,
} from '../../lib/api/sonar';

/**
 * Durum rozeti.
 *
 * Renk TEK kanal değildir: her rozet metin de taşır. Renk körü kullanıcı,
 * yazdırılmış çıktı ve ekran görüntüsü paylaşımı — üçü de rengi kaybeder.
 */
export function Badge({ tone, children }: { tone: Tone; children: ReactNode }) {
  const { bg, fg } = TONE_STYLES[tone];

  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ background: bg, color: fg }}
    >
      {children}
    </span>
  );
}

export type Tone = 'ok' | 'warn' | 'danger' | 'neutral' | 'info';

const TONE_STYLES: Record<Tone, { bg: string; fg: string }> = {
  ok: { bg: 'rgba(34, 197, 94, 0.12)', fg: palette.success },
  warn: { bg: palette.warningSoft, fg: palette.warningText },
  danger: { bg: 'rgba(239, 68, 68, 0.12)', fg: palette.danger },
  info: { bg: 'rgba(139, 92, 246, 0.12)', fg: palette.bot },
  neutral: { bg: palette.chipBg, fg: palette.textMuted },
};

// ── Durum etiketleri ────────────────────────────────────────────────────────

export const SITE_HEALTH: Record<SiteHealthState, { label: string; tone: Tone }> = {
  NotDiscovered: { label: 'Keşfedilmedi', tone: 'neutral' },
  Healthy: { label: 'Sağlıklı', tone: 'ok' },
  Suspect: { label: 'Şüpheli', tone: 'warn' },
  Quarantined: { label: 'Karantinada', tone: 'danger' },
  NeedsHuman: { label: 'İnsan gerekiyor', tone: 'danger' },
};

export const JOB_STATUS: Record<CrawlJobStatus, { label: string; tone: Tone }> = {
  Queued: { label: 'Kuyrukta', tone: 'neutral' },
  Running: { label: 'Çalışıyor', tone: 'info' },
  Completed: { label: 'Tamamlandı', tone: 'ok' },
  Failed: { label: 'Başarısız', tone: 'danger' },
  Blocked: { label: 'Engellendi', tone: 'danger' },
  AwaitingHuman: { label: 'Captcha bekliyor', tone: 'warn' },
  AbortedProfileStale: { label: 'Profil bayat', tone: 'danger' },
};

export const MATCH_DECISION: Record<MatchDecision, { label: string; tone: Tone }> = {
  Rejected: { label: 'Eşleşme yok', tone: 'neutral' },
  AutoAccepted: { label: 'Otomatik eşleşti', tone: 'ok' },
  NeedsReview: { label: 'İnceleme bekliyor', tone: 'warn' },
  HumanApproved: { label: 'Onaylandı', tone: 'ok' },
  HumanRejected: { label: 'Reddedildi', tone: 'neutral' },
};

// ── Biçimlendirme ───────────────────────────────────────────────────────────

/**
 * Para birimi yazımını ISO koduna indirger.
 *
 * `Intl.NumberFormat` yalnız ISO kodu kabul eder; "₺" verilince RangeError
 * FIRLATIR. Excel'den gelen fiyatlar sembol taşıyor ve bu, tüm Stüdyo
 * tablosunu çökertti — tek bir hücrenin para birimi yüzünden ekranın tamamı
 * kayboldu.
 *
 * Arka uçtaki CurrencyCode ile aynı eşleme. İki yerde durması hoş değil ama
 * alternatifi her fiyat için sunucuya sormak.
 */
const CURRENCY_CODES: Record<string, string> = {
  '₺': 'TRY', TL: 'TRY', TRY: 'TRY',
  '£': 'GBP', GBP: 'GBP',
  $: 'USD', USD: 'USD',
  '€': 'EUR', EUR: 'EUR',
};

export function formatPrice(value: number | null, currency: string | null): string {
  if (value === null) return '—';

  const raw = (currency ?? '').trim();
  const code = CURRENCY_CODES[raw] ?? CURRENCY_CODES[raw.toUpperCase()];

  // Tanınmayan birim ATILMAZ, sayının yanında olduğu gibi gösterilir:
  // "36 ZAR" bilgi taşır, sessizce "36 ₺" yazmak yalan olurdu.
  if (!code) {
    const number = new Intl.NumberFormat('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);

    return raw ? `${number} ${raw}` : number;
  }

  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: code,
    minimumFractionDigits: 2,
  }).format(value);
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('tr-TR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function formatRelative(iso: string | null): string {
  if (!iso) return 'hiç';

  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return 'az önce';
  if (minutes < 60) return `${minutes} dk önce`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} sa önce`;

  return `${Math.round(hours / 24)} gün önce`;
}

// ── Ortak parçalar ──────────────────────────────────────────────────────────

/**
 * Sayfa kabuğu.
 *
 * Sekmelerin dış boşluğu BURADA verilir, tek yerde. Önceden her sekme kendi
 * kök div'ini yazıyordu ve hiçbirinde padding yoktu -- içerik ekranın kenarına
 * yapışıyor, başlıklar kenar çubuğuyla dip dibe geliyordu.
 *
 * Genişlik sınırı bilinçli: 1440px üstünde tablo satırları kilometrelerce
 * uzayıp gözün satırı takip etmesini zorlaştırıyor.
 */
export function Page({ children }: { children: ReactNode }) {
  return (
    <div className="w-full flex-1 p-4 sm:p-6 lg:p-7">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-5">
        {children}
      </div>
    </div>
  );
}

/**
 * Sayfa başlığı: ad, bir cümlelik açıklama, sağda eylemler.
 *
 * Altı sekmenin altısı da aynı yapıyı elle yazıyordu ve hepsi biraz farklı
 * boşlukla kaymıştı. Tek parçaya indirmek, sekme değiştirdiğinizde başlığın
 * yerinden oynamaması demek.
 */
export function PageHeader({ title, description, actions, dataTour }: {
  title: string;
  description?: string;
  actions?: ReactNode;
  dataTour?: string;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3" data-tour={dataTour}>
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold tracking-tight"
          style={{ color: palette.textStrong }}>
          {title}
        </h2>
        {description && (
          <p className="mt-1 max-w-2xl text-xs leading-relaxed"
            style={{ color: palette.textMuted }}>
            {description}
          </p>
        )}
      </div>

      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Filtreleri TEK bir çubukta toplar; dağınık duran kontroller bir küme olur. */
export function Toolbar({ children, dataTour }: { children: ReactNode; dataTour?: string }) {
  return (
    <div
      className="flex flex-wrap items-center gap-2 rounded-[4px] px-3 py-2.5"
      style={{ background: palette.card, border: `1px solid ${palette.borderSoft}` }}
      data-tour={dataTour}
    >
      {children}
    </div>
  );
}

/** Ev standardı buton: BaseTrack/AdsHub ile aynı yükseklik, köşe ve gölge. */
export function Button({ variant = 'ghost', className = '', ...props }: {
  variant?: 'ghost' | 'primary';
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const style = variant === 'primary'
    ? { background: palette.accent, color: palette.textOnFill, border: '1px solid transparent' }
    : { background: palette.card, color: palette.text, border: `1px solid ${palette.borderSoft}` };

  return (
    <button
      type="button"
      {...props}
      className={
        'inline-flex h-8 items-center gap-1.5 rounded-[4px] px-3 text-xs font-medium ' +
        'transition-colors disabled:cursor-not-allowed disabled:opacity-40 ' +
        className
      }
      style={{ ...style, ...props.style }}
    />
  );
}

export function Card({ children, className = '', dataTour }: { children: ReactNode; className?: string; dataTour?: string }) {
  return (
    <div
      className={`rounded-[4px] p-4 shadow-xs ${className}`}
      style={{ background: palette.card, border: `1px solid ${palette.borderSoft}` }}
      data-tour={dataTour}
    >
      {children}
    </div>
  );
}

export function Stat({ label, value, tone = 'neutral', hint }: {
  label: string;
  value: string | number;
  tone?: Tone;
  hint?: string;
}) {
  return (
    <div
      className="flex flex-col gap-1 rounded-[4px] px-3.5 py-3 shadow-xs"
      style={{ background: palette.card, border: `1px solid ${palette.borderSoft}` }}
    >
      <span className="text-[11px] uppercase tracking-wide" style={{ color: palette.textFaint }}>
        {label}
      </span>
      <span
        className="text-xl font-semibold tabular-nums leading-none"
        style={{ color: tone === 'neutral' ? palette.textStrong : TONE_STYLES[tone].fg }}
      >
        {value}
      </span>
      {hint && (
        <span className="text-[11px]" style={{ color: palette.textFaint }}>{hint}</span>
      )}
    </div>
  );
}

export function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-1.5 rounded-[4px] px-6 py-16 text-center"
      style={{ border: `1px dashed ${palette.borderSoft}` }}
    >
      <div className="text-sm font-medium" style={{ color: palette.textStrong }}>{title}</div>
      {hint && (
        <div className="max-w-md text-xs leading-relaxed" style={{ color: palette.textMuted }}>
          {hint}
        </div>
      )}
    </div>
  );
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <div
      className="rounded-[4px] px-3 py-2 text-xs"
      style={{
        background: 'rgba(239, 68, 68, 0.1)',
        color: palette.danger,
        border: `1px solid rgba(239, 68, 68, 0.25)`,
      }}
    >
      {message}
    </div>
  );
}
