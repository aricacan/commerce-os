import type { SenderKind } from './messageSender';

// Gönderen türüne göre balon görünümü — Gelen Kutusu ile Test Alanı aynı sözlüğü okur.
//   Müşteri   → solda, nötr kart.
//   Bot       → sağda, yumuşak indigo (kendi aktör rengi).
//   Temsilci  → sağda, koyu birincil dolgu.
//   Platform  → sağda, kesikli kenarlı nötr: panel dışından (Facebook/telefon) yazıldı.
// Yön köşe kırpmasıyla da belli: renge bağlı kalmamak renk körü kullanıcı için önemli.
type BubbleKind = Exclude<SenderKind, 'system'>;

export const SENDER_BUBBLE_CLASS: Record<BubbleKind, string> = {
  customer: 'rounded-2xl rounded-bl-md border border-[var(--border)] bg-[var(--card)] text-[var(--fg)] shadow-[var(--shadow-xs)]',
  bot: 'rounded-2xl rounded-br-md border border-[var(--bot-accent-border)] bg-[var(--bot-accent-soft)] text-[var(--fg)]',
  agent: 'rounded-2xl rounded-br-md bg-[var(--fg)] text-[var(--bg)] shadow-[var(--shadow-xs)]',
  platform: 'rounded-2xl rounded-br-md border border-dashed border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--fg)]',
};

// Saat + tik satırı: balon zeminine göre okunur kalan ikincil ton.
export const SENDER_META_CLASS: Record<BubbleKind, string> = {
  customer: 'text-[var(--fg-muted)]',
  bot: 'text-[var(--bot-accent)]',
  agent: 'text-[var(--bg)]/70',
  platform: 'text-[var(--fg-muted)]',
};
