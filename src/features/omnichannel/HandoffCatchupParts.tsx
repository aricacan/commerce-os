import { CheckCircle2, ChevronDown, Clock, XCircle } from 'lucide-react';
import type { CatchupCandidateDto, CatchupSkippedDto } from '../../lib/api/handoff-catchup';
import { ConversationCountry } from './ConversationCountry';
import { formatRemaining, skipReasonLabel, truncateMessage, type CatchupSummary } from './handoffCatchupRules';

interface CandidateRowProps {
  candidate: CatchupCandidateDto;
  checked: boolean;
  disabled: boolean;
  now: number;
  onToggle: () => void;
}

export function CatchupCandidateRow({ candidate: c, checked, disabled, now, onToggle }: CandidateRowProps) {
  const remaining = formatRemaining(c.windowEndsAt, now);

  return (
    <li className="border-b border-border-soft last:border-b-0">
      <label className="flex cursor-pointer items-start gap-3 px-4 py-3 hover:bg-card-hover">
        <input type="checkbox" checked={checked} disabled={disabled} onChange={onToggle} className="mt-1 size-4 shrink-0" />
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex items-baseline gap-2">
            <span className="min-w-0 flex-1 truncate text-ui-md font-semibold text-fg">{c.contactName ?? 'İsimsiz müşteri'}</span>
            <span className="inline-flex shrink-0 items-center gap-1 text-ui-xs font-semibold tabular-nums text-fg-muted" title="Bot bu süre dolunca yazamaz">
              <Clock size={11} aria-hidden />
              {remaining}
            </span>
          </span>
          <span className="flex items-center gap-2 text-ui-xs text-fg-muted">
            <span className="min-w-0 truncate">{c.channelName}</span>
            <ConversationCountry code={c.country} />
          </span>
          <span className="line-clamp-2 break-words text-ui-sm text-fg-muted">{truncateMessage(c.lastCustomerMessage)}</span>
        </span>
      </label>
    </li>
  );
}

export function CatchupSkippedSection({ skipped }: { skipped: CatchupSkippedDto[] }) {
  if (skipped.length === 0) return null;

  return (
    <details className="group border-t border-border-soft">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-ui-sm font-semibold text-fg-muted hover:bg-card-hover">
        <ChevronDown size={14} aria-hidden className="transition-transform group-open:rotate-180" />
        Atlananlar ({skipped.length})
      </summary>
      <ul className="flex flex-col gap-1 px-4 pb-3">
        {skipped.map((s) => (
          <li key={s.conversationId} className="flex items-baseline gap-2 text-ui-xs text-fg-muted">
            <span className="shrink-0 font-semibold tabular-nums text-fg">#{s.conversationId}</span>
            <span className="min-w-0 break-words">{skipReasonLabel(s.reason)}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}

export function CatchupSummaryCard({ summary }: { summary: CatchupSummary }) {
  const hasFailures = summary.failed > 0;

  return (
    <section aria-label="Çalıştırma sonucu" className="flex flex-col gap-2 border-b border-border-soft bg-bg-subtle px-4 py-3">
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-ui-sm font-semibold text-fg">
        <span className="inline-flex items-center gap-1 text-success"><CheckCircle2 size={14} aria-hidden /> {summary.ok} başarılı</span>
        <span className="text-fg-muted">{summary.skipped} atlandı</span>
        <span className={hasFailures ? 'inline-flex items-center gap-1 text-danger' : 'text-fg-muted'}>
          {hasFailures && <XCircle size={14} aria-hidden />} {summary.failed} hatalı
        </span>
      </p>
      {summary.failures.length > 0 && (
        <ul className="flex flex-col gap-1">
          {summary.failures.map((f) => (
            <li key={f.conversationId} className="text-ui-xs text-danger">
              <span className="font-semibold tabular-nums">#{f.conversationId}</span> — {f.detail ?? 'Bilinmeyen hata'}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
