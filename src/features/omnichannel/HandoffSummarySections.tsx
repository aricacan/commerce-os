import { badgeBase, badgeTone } from '../shared/design';
import { parseHandoffSummary } from './handoffSummaryRules';

interface Props {
  summary: string;
}

const SECTIONS = [
  { key: 'request', label: 'İstek' },
  { key: 'done', label: 'Yapılan' },
  { key: 'open', label: 'Açık kalan' },
] as const;

// Devir özeti: İstek / Yapılan / Açık kalan başlıklı satırlar (etiket solda, metin sağda; dar ekranda alt alta).
// "Açık kalan" vurguludur — temsilcinin ilk cevaplaması gereken şey. Yapısız özet olduğu gibi gösterilir.
export function HandoffSummarySections({ summary }: Props) {
  const parts = parseHandoffSummary(summary);
  if (!parts) return <p className="m-0 whitespace-pre-wrap break-words text-ui-md leading-relaxed text-fg">{summary}</p>;

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <dl className="m-0 grid min-w-0 grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-[96px_1fr]">
        {SECTIONS.map(({ key, label }) => {
          const value = parts[key];
          if (!value) return null;
          const emphasised = key === 'open';
          return (
            <div key={key} className="contents">
              <dt className={`pt-0.5 text-ui-xs font-semibold uppercase tracking-wide ${emphasised ? 'text-warning' : 'text-fg-subtle'}`}>
                {label}
              </dt>
              <dd className={`m-0 min-w-0 break-words text-ui-md leading-relaxed ${emphasised ? 'font-semibold text-fg' : 'text-fg'}`}>
                {value}
              </dd>
            </div>
          );
        })}
      </dl>
      {parts.mood && (
        <span className={`${badgeBase} ${badgeTone.neutral} self-start`} title="Müşterinin tonu (yapay zekâ özeti)">
          Duygu: {parts.mood}
        </span>
      )}
    </div>
  );
}
