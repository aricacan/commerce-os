/**
 * Otomasyon modallerinin (mail, Slack) ORTAK sınıf jetonları ve küçük yardımcıları.
 * İki panel aynı görünümü iki kez tanımlamasın diye tek yerde.
 */
export const automationUi = {
  input:
    'w-full rounded-[2px] border border-[#cbd5e1] dark:border-[#475569] bg-[var(--card)] px-3 py-1.5 text-xs text-[var(--fg)] focus:border-sky-500 focus:outline-none',
  inputMono:
    'w-full rounded-[2px] border border-[#cbd5e1] dark:border-[#475569] bg-[var(--card)] px-3 py-1.5 text-xs text-[var(--fg)] focus:border-sky-500 focus:outline-none font-mono',
  label: 'block text-xs font-semibold text-[var(--fg)] mb-1',
  hint: 'mt-1 text-[10px] text-[var(--fg-muted)]',
  card: 'rounded-[2px] border border-[#cbd5e1] dark:border-[#334155] bg-[var(--card)]',
  divider: 'border-[#cbd5e1] dark:border-[#334155]',
  buttonPrimary:
    'rounded-[2px] bg-sky-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-sky-500 transition-colors shadow-xs disabled:opacity-50',
  buttonGhost:
    'flex items-center gap-1 rounded-[2px] border border-[#cbd5e1] dark:border-[#475569] bg-[var(--card)] px-3 py-1 text-xs font-semibold text-[var(--fg)] hover:bg-[var(--card-hover)] transition-colors disabled:opacity-50',
  sectionTitle: 'text-xs font-bold uppercase tracking-wider text-[var(--fg)]',
  sectionHint: 'text-[11px] text-[var(--fg-muted)]',
} as const;

export type Lang = 'tr' | 'en';

/** Basit iki dilli seçici — `t(lang, 'tr metni', 'en text')`. */
export const t = (lang: Lang, tr: string, en: string) => (lang === 'tr' ? tr : en);

export const formatDateTime = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleString('tr-TR') : '—';
