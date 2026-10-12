// Omnichannel ayar formlarının ortak Tailwind sınıfları (etiket, giriş, metin alanı, seçim çipi,
// düğme). Aynı dizeler önceden 10+ dosyada elle kopyalanmıştı; bir tonu değiştirmek tek yerden olur.

// Tüm giriş/metin alanlarının ortak çerçevesi — yükseklik ve iç boşluk varyanta göre eklenir.
const FIELD_BASE =
  'w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] text-xs text-[var(--fg)] outline-none focus:border-[var(--fg)]';

export const labelClass = 'mb-1 block text-[10.5px] font-semibold uppercase tracking-wider text-[var(--fg-muted)]';

// Yüksekliği içeriğe göre (py-2) — Devir Yönlendirme formları.
export const inputClass = `${FIELD_BASE} px-2.5 py-2`;
// Sabit yükseklikli sıkı giriş — menü seçenekleri, hazır cevaplar.
export const compactInputClass = `${FIELD_BASE} h-8 px-2.5`;
// Sabit yükseklikli form girişi — kaynak/ülke düzenleyicileri (kilitli alan soluk görünür).
export const formInputClass = `${FIELD_BASE} h-8.5 px-2.5 disabled:opacity-50`;
export const textareaClass = `${FIELD_BASE} p-2`;

export const chipClass = 'inline-flex cursor-pointer items-center gap-1.5 rounded-[4px] border border-[var(--border)] px-2.5 py-1.5';

export const primaryButtonClass =
  'inline-flex h-8 items-center gap-1.5 rounded-[4px] bg-[var(--fg)] px-4 text-xs font-bold text-[var(--bg)] hover:opacity-90 disabled:opacity-40';
export const secondaryButtonClass =
  'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-semibold text-[var(--fg)] hover:bg-[var(--bg-subtle)] disabled:opacity-40';

// Kenarlıklı kart düğmesi — tasarım sistemindeki `btnPrimary` (design.ts) ile aynı görünüm.
export const cardButtonClass =
  'inline-flex cursor-pointer items-center gap-1.5 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-3.5 py-1.5 text-ui-sm font-bold text-[var(--fg)] shadow-[var(--shadow-xs)]';
// Pencere başlığındaki yalnız ikonlu "Kapat" düğmesi.
export const dialogCloseButtonClass =
  'inline-flex cursor-pointer items-center rounded-[4px] bg-transparent p-1.5 text-[var(--fg-muted)]';
