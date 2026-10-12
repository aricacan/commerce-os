// ── Ortak Tasarım Sistemi ─────────────────────────────────────────────────────
//
// Tema değişkenlerine duyarlı renkler ve primitive stiller.

import type { CSSProperties } from 'react';

export const palette = {
  card: 'var(--card)',
  surface: 'var(--card)',
  sidebarBg: 'var(--sidebar)',
  bg: 'var(--bg)',
  contentBg: 'var(--bg)',
  inputBg: 'var(--bg-subtle)',
  chipBg: 'var(--bg-subtle)',

  border: 'var(--border)',
  borderSoft: 'var(--border-soft)',
  divider: 'var(--border-soft)',
  borderFaint: 'var(--border-soft)',

  textOnFill: 'var(--bg)',

  textStrong: 'var(--fg)',
  text: 'var(--fg)',
  textMuted: 'var(--fg-muted)',
  textLabel: 'var(--fg-muted)',
  textFaint: 'var(--fg-subtle)',

  accent: 'var(--fg)',
  accentSoft: 'var(--bg-subtle)',
  accentBorder: 'var(--border)',

  // Durum renkleri TEMA DEĞİŞKENİNDEN gelir. Önceden buraya KOYU TEMANIN hex'leri
  // (#22c55e/#f59e0b/#ef4444) sabitlenmişti; açık temada bunlar beyaz zeminde soluk
  // kalıyordu ve globals.css'teki --success/--warning/--danger ile de tutmuyordu.
  // Tek doğru kaynak tema değişkenleridir — ikisi arasında seçim yapmak zorunda kalmayalım.
  success: 'var(--success)',
  warning: 'var(--warning)',
  warningSoft: 'rgba(var(--warning-rgb), 0.12)',
  warningText: 'var(--warning)',
  danger: 'var(--danger)',
  dangerSoft: 'rgba(var(--danger-rgb), 0.1)',
  neutral: 'var(--fg-muted)',

  // "Bot" bir DURUM değil, bir aktör. Kendi mor tonu tasarım sisteminin geri kalanında
  // karşılığı olmayan tek başına bir renkti; nötr yüzeye indirildi.
  bot: 'var(--fg-muted)',
  botSoft: 'var(--bg-subtle)',
} as const;

// ── Tipografi jetonları ───────────────────────────────────────────────────────
//
// TEK KAYNAK. Bu ölçek globals.css'teki `--text-ui-*` ile BİREBİR aynı değerleri
// taşır; ikisi aynı kararın iki sunumudur:
//   • Tailwind sınıfı  → text-ui-xs, text-ui-sm …  (JSX className)
//   • Satır içi stil   → text.xs, text.sm …        (CSSProperties nesneleri)
// İkinci sunum şart, çünkü bu dosyadaki `btnPrimary`/`input`/`label` gibi paylaşılan
// stiller CSSProperties döndürür ve bir sınıf adı kullanamaz. Değer burada elle
// yazıldığı sürece (12, 10.5, 11.5, 15 idi) ölçek iki yerde ayrışıyordu.
//
// Bir değeri DEĞİŞTİRMEK gerekirse ikisini birlikte değiştirin (globals.css + burası).
// Katman sırası. Modül çalışma alanları tam ekran bir katmandır; body'ye açılan her
// modal onun ÜSTÜNDE olmalı — aksi hâlde açılır ama arkada kalır ve tıklanamaz
// (22 Eyl 2026: Hangfire "Çalıştır" onayı canlıda bu yüzden görünmüyordu).
export const layers = {
  workspace: 20000,
  modal: 40000,
} as const;

export const text = {
  '2xs': 10, // rozet, tablo alt bilgisi
  xs: 11, // ikincil metin, etiket
  sm: 12, // tablo hücresi, düğme
  md: 13.5, // gövde (body ile aynı)
  lg: 16, // kart başlığı
  xl: 20, // sayfa başlığı
  '2xl': 28, // KPI sayısı
} as const;

// Yalnızca üç basamak: arayüzde 5+ ağırlık vardı ve 500 ile 600 ayırt edilemiyordu.
export const weight = {
  normal: 400,
  semibold: 600,
  bold: 700,
} as const;

export const card: CSSProperties = {
  border: '1px solid var(--border-soft)',
  borderRadius: 4,
  padding: 16,
  background: 'var(--card)',
};

export const icon = {
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
  stroke: 1.8,
} as const;

export const btnPrimary: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '6px 14px',
  borderRadius: 4,
  border: '1px solid var(--border)',
  cursor: 'pointer',
  background: 'var(--card)',
  color: 'var(--fg)',
  fontSize: text.sm,
  fontWeight: weight.bold,
  boxShadow: 'var(--shadow-xs)',
};

export const btnGhost: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '6px 12px',
  borderRadius: 4,
  cursor: 'pointer',
  border: '1px solid var(--border-soft)',
  background: 'transparent',
  color: 'var(--fg-muted)',
  fontSize: text.sm,
  fontWeight: weight.semibold,
};

export const input: CSSProperties = {
  width: '100%',
  height: 32,
  padding: '0 10px',
  borderRadius: 4,
  border: '1px solid var(--border)',
  background: 'var(--bg)',
  color: 'var(--fg)',
  fontSize: text.sm,
  outline: 'none',
};

export const select: CSSProperties = {
  width: '100%',
  height: 32,
  padding: '0 10px',
  borderRadius: 4,
  border: '1px solid var(--border)',
  background: 'var(--card)',
  color: 'var(--fg)',
  fontSize: text.sm,
  outline: 'none',
};

export const label: CSSProperties = {
  fontSize: text['2xs'],
  fontWeight: weight.bold,
  color: 'var(--fg-muted)',
  textTransform: 'uppercase',
  marginBottom: 4,
};

export const errorText: CSSProperties = {
  fontSize: text.xs,
  fontWeight: weight.semibold,
  // Sabit hex DEĞİL: açık temada yanlış görünüyordu (bkz. monitoring renk turu).
  color: 'var(--danger)',
  padding: '6px 10px',
  borderRadius: 3,
  background: 'rgba(var(--danger-rgb), 0.1)',
};

export const pageHeading: CSSProperties = {
  fontSize: text.lg,
  fontWeight: weight.bold,
  color: 'var(--fg)',
  margin: 0,
};

export const pageSubtitle: CSSProperties = {
  fontSize: text.xs,
  color: 'var(--fg-muted)',
  marginTop: 2,
  marginBottom: 0,
};

export const pageShell: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  overflowY: 'auto',
  padding: 16,
  background: 'transparent',
};

export const pageInner = (maxWidth = 1000): CSSProperties => ({
  maxWidth,
  width: '100%',
  margin: '0 auto',
  display: 'flex',
  flexDirection: 'column',
  gap: 14,
});

export const mutedText: CSSProperties = {
  fontSize: text.xs,
  color: 'var(--fg-muted)',
};

export const sectionTitle: CSSProperties = {
  fontSize: text.sm,
  fontWeight: weight.bold,
  color: 'var(--fg)',
  textTransform: 'uppercase',
  letterSpacing: '0.02em',
};

// Verilen rengin, tema kartı zeminiyle (palette.card) karıştırılmış soluk bir tonunu üretir —
// örn. bir durum rozetinin arka planı, aynı renkteki yazının okunabilir kalması için zeminden
// belirgin şekilde açık/koyu olmalı. ÖNCEDEN bu fonksiyon "theme-aware design system" geçişinde
// (cc4b179) yanlışlıkla `return colorHex` olarak boşaltılmıştı — yani zemin, üstündeki yazıyla
// AYNI renk oluyordu (bkz. shared ErrorState bileşeni ve durum rozetleri: yazı görünmez oluyordu).
export function softTint(colorHex: string, percent = 12): string {
  return `color-mix(in oklch, ${colorHex} ${percent}%, ${palette.card})`;
}

export function statusDot(color: string, size = 6): CSSProperties {
  return {
    width: size,
    height: size,
    borderRadius: '50%',
    background: color,
    display: 'inline-block',
  };
}

export const toggleTrack = (active: boolean): CSSProperties => ({
  width: 32,
  height: 18,
  borderRadius: 99,
  background: active ? 'var(--fg)' : 'var(--bg-subtle)',
  border: '1px solid var(--border)',
  position: 'relative',
  cursor: 'pointer',
  transition: 'all 0.15s ease',
});

export const toggleKnob = (active: boolean): CSSProperties => ({
  width: 14,
  height: 14,
  borderRadius: '50%',
  background: active ? 'var(--bg)' : 'var(--fg-muted)',
  position: 'absolute',
  top: 1,
  left: active ? 15 : 1,
  transition: 'all 0.15s ease',
});

export const navItem = (active: boolean, _compact?: boolean): CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '6px 12px',
  borderRadius: 4,
  fontSize: text.sm,
  fontWeight: active ? weight.bold : weight.normal,
  color: active ? 'var(--fg)' : 'var(--fg-muted)',
  background: active ? 'var(--card)' : 'transparent',
  border: active ? '1px solid var(--border)' : '1px solid transparent',
  cursor: 'pointer',
});

// ── Sınıf jetonları (Tailwind className) ──────────────────────────────────────
//
// Yukarıdaki nesneler CSSProperties döndürür (satır içi stil kullanan eski ekranlar için).
// Tailwind ile yazılan ekranlar (Gelen Kutusu, Pano) aynı kararları BURADAKİ sınıf
// dizgilerinden alır: odak halkası, hareket süresi, rozet ve yüzey. 8px aralık sistemi
// (gap-2, p-2, p-4 …) ve 150 ms geçiş her yerde aynıdır.

// Klavye odağı: yalnız klavyeyle gezerken görünür (fare tıklamasında halka çıkmaz).
export const focusRing =
  'outline-none focus-visible:ring-2 focus-visible:ring-fg/30 focus-visible:ring-offset-1 focus-visible:ring-offset-card';

// İnce hareket: renk/gölge geçişleri 150 ms; "hareketi azalt" isteyen kullanıcıda kapanır.
export const motionFast = 'transition-[color,background-color,border-color,box-shadow,opacity] duration-150 ease-out motion-reduce:transition-none';

// Kalıcı yüzey: yumuşak gölgeli, yuvarlak köşeli kart.
export const surfaceCard = 'rounded-xl border border-border-soft bg-card shadow-[var(--shadow-xs)]';

export const badgeBase = 'inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-ui-2xs font-semibold leading-none';

// Rozet tonları yalnız tema durum renklerinden gelir (rastgele renk yok).
export const badgeTone = {
  neutral: 'bg-bg-subtle text-fg-muted',
  danger: 'bg-danger-soft text-danger',
  warning: 'bg-warning-soft text-warning',
  info: 'bg-info-soft text-info',
  success: 'bg-success-soft text-success',
  bot: 'bg-[var(--bot-accent-soft)] text-[var(--bot-accent)]',
} as const;

export type BadgeTone = keyof typeof badgeTone;
