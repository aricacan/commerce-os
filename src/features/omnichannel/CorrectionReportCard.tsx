import type { CorrectionDigestDto, CorrectionPatternDto, CorrectionReportDto } from '../../lib/api/omnichannel-learning';
import { CORRECTION_SIGNAL } from '../../lib/api/omnichannel-learning';
import {
  CORRECTION_CATEGORY_LABELS, CORRECTION_FIX_TYPE_LABELS, CORRECTION_SIGNAL_LABELS,
  correctionSummary, countOf, formatWeek, isQueuedFix,
} from './correctionRules';
import { EvidenceCount, LearningCard, LearningEmpty } from './LearningParts';

const SIGNALS = [
  CORRECTION_SIGNAL.AgentOverrode, CORRECTION_SIGNAL.AgentFlagged,
  CORRECTION_SIGNAL.RepeatedFailure, CORRECTION_SIGNAL.AgentConsulted,
] as const;

// Öğrenme sekmesi: temsilcinin botu düzelttiği anlar ve haftalık hata kalıpları (P36). Salt okunur:
// sözlük ve SSS önerileri yukarıdaki onay kuyruğunda karar bekler, diğerleri (bot kuralı, kod hatası)
// yalnız burada görünür.
export function CorrectionReportCard({ report }: { report: CorrectionReportDto }) {
  return (
    <LearningCard title="Haftalık düzeltme raporu" hint={correctionSummary(report)}>
      <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {SIGNALS.map((signal) => (
          <div key={signal} className="flex items-baseline justify-between gap-2 rounded-[4px] bg-[var(--bg-subtle)] px-3 py-2">
            <dt className="min-w-0 text-[var(--fg-muted)]">{CORRECTION_SIGNAL_LABELS[signal]}</dt>
            <dd className="font-mono font-bold text-[var(--fg)]">{countOf(report, signal)}</dd>
          </div>
        ))}
      </dl>

      {report.latestDigest
        ? <DigestPatterns digest={report.latestDigest} />
        : <LearningEmpty text="Henüz haftalık rapor yok. Rapor pazartesi günleri, düzeltmeler birikince hazırlanır." />}
    </LearningCard>
  );
}

function DigestPatterns({ digest }: { digest: CorrectionDigestDto }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[11px] font-semibold text-[var(--fg-muted)]">
        {formatWeek(digest.weekStart)} — {digest.correctionCount} düzeltme
      </p>
      {digest.patterns.length === 0 && <LearningEmpty text="Bu hafta tekrar eden bir hata kalıbı bulunmadı." />}
      {digest.patterns.map((p, index) => <PatternRow key={`${index}-${p.pattern}`} pattern={p} />)}
    </div>
  );
}

function PatternRow({ pattern }: { pattern: CorrectionPatternDto }) {
  return (
    <div className="flex flex-col gap-1 border-b border-[var(--border-soft)] py-2 last:border-b-0">
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0 break-words font-semibold text-[var(--fg)]">{pattern.pattern}</span>
        <EvidenceCount count={pattern.count} />
      </div>
      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
        <Tag>{CORRECTION_CATEGORY_LABELS[pattern.category]}</Tag>
        <Tag>{`Önerilen düzeltme: ${CORRECTION_FIX_TYPE_LABELS[pattern.suggestedFixType]}`}</Tag>
        <span className="text-[var(--fg-muted)]">
          {isQueuedFix(pattern.suggestedFixType) ? 'Onay kuyruğunda değerlendirilir.' : 'Yalnız rapor.'}
        </span>
      </div>
      <p className="break-words italic text-[var(--fg-muted)]">&ldquo;{pattern.example}&rdquo;</p>
    </div>
  );
}

function Tag({ children }: { children: string }) {
  return <span className="rounded-[4px] bg-[var(--bg-subtle)] px-1.5 py-0.5 font-semibold text-[var(--fg)]">{children}</span>;
}
