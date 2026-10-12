// Panel ekranlarının ortak sınıf sabitleri.
//
// NEDEN VAR: bu ekranları ilk yazarken `text-muted-foreground`, `text-destructive`,
// `bg-accent` gibi shadcn/ui sözcükleri kullanmıştım. Projenin teması bunları TANIMLAMIYOR
// (globals.css yalnızca --fg-muted, --danger, --card, --border-soft… tanımlar), dolayısıyla:
//   • hata yazıları KIRMIZI GÖRÜNMÜYORDU (text-destructive diye bir renk yok)
//   • hover:bg-accent satırı MARKA KIRMIZISINA boyuyordu (--color-accent gerçekten var)
// Yani sorun estetik değil, görünürdü.
//
// Sabitler burada duruyor ki aynı hata bir daha ekran ekran tekrarlanmasın; değerler
// mevcut sayfalardan (tax-codes, purchase-orders) birebir alındı.

/** Sayfa kabuğu — mevcut sayfalarla aynı iç boşluk ve taban yazı boyu. */
export const page = 'flex flex-col gap-4 p-4 text-xs sm:p-5';

/** Sayfa başlığı ve altındaki açıklama. */
export const pageTitle = 'text-sm font-bold text-[var(--fg)]';
export const pageHint = 'mt-0.5 text-ui-xs leading-relaxed text-[var(--fg-muted)]';

/** İçerik kartı. */
export const card =
  'rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3.5 shadow-xs';

/** Kenarlıklı ama dolgusuz kart (tablo sarmalayıcı). */
export const cardFlush =
  'rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] overflow-hidden shadow-xs';

/** İkincil (varsayılan) buton. */
export const button =
  'inline-flex h-8 items-center gap-1.5 rounded-[4px] border border-[var(--border)] ' +
  'bg-[var(--card)] px-3 text-xs font-semibold text-[var(--fg)] transition cursor-pointer ' +
  'hover:bg-[var(--bg-subtle)] disabled:opacity-50 disabled:cursor-not-allowed';

/** Birincil eylem butonu (koyu dolgu). */
export const buttonPrimary =
  'inline-flex h-8 items-center gap-1.5 rounded-[4px] bg-[var(--fg)] px-3 text-xs ' +
  'font-bold text-[var(--bg)] shadow-xs transition cursor-pointer hover:opacity-90 ' +
  'disabled:opacity-40 disabled:cursor-not-allowed';

/** Yıkıcı eylem (sil). Kenarlık nötr kalır, yalnızca yazı uyarır. */
export const buttonDanger =
  'inline-flex h-8 items-center gap-1.5 rounded-[4px] border border-[var(--border)] ' +
  'bg-[var(--card)] px-3 text-xs font-semibold text-[var(--danger)] transition cursor-pointer ' +
  'hover:bg-[var(--danger-soft)]';

/** Metin bağlantısı görünümlü buton (Vazgeç vb.). */
export const buttonQuiet =
  'text-xs font-semibold text-[var(--fg-muted)] transition cursor-pointer hover:text-[var(--fg)]';

/** Girdi ve seçim alanları — tek yükseklik (h-8) tüm ekranlarda aynı. */
export const input =
  'h-8 rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs ' +
  'text-[var(--fg)] placeholder-[var(--fg-muted)] outline-none transition ' +
  'focus:border-[var(--fg)]';

/** Alan etiketi. */
export const label =
  'block text-ui-xs font-semibold uppercase tracking-wider text-[var(--fg-muted)]';

/** Tablo başlığı. */
export const tableHead =
  'border-b border-[var(--border-soft)] bg-[var(--bg-subtle)]/50 text-ui-xs ' +
  'font-bold uppercase tracking-wider text-[var(--fg-muted)]';

/** Tablo satırı. */
export const tableRow = 'border-b border-[var(--border-soft)] transition hover:bg-[var(--bg-subtle)]/40';

export const th = 'px-3 py-2.5 text-left font-bold';
export const td = 'px-3 py-2.5';

/** Rozet/çip. */
export const chip =
  'inline-flex items-center gap-1 rounded-[3px] bg-[var(--bg-subtle)] px-2 py-0.5 ' +
  'text-ui-xs font-semibold text-[var(--fg-muted)]';

/** Boş durum ve hata metinleri. */
export const emptyText = 'py-8 text-center text-xs text-[var(--fg-muted)]';
export const errorText = 'text-xs font-semibold text-[var(--danger)]';
export const mutedText = 'text-ui-xs text-[var(--fg-muted)]';

/** Sayısal hücreler hizalı dursun. */
export const numeric = 'text-right tabular-nums';
