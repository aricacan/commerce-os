import { ExternalLink } from 'lucide-react';
import { RUBRIC_KEYS, type EvalCompareRowDto, type EvalCompareSideDto } from '../../lib/api/omnichannel-quality';
import { tracePathLabel } from './botTraceRules';
import { secondaryButtonClass } from './formClasses';
import { deltaOf, directionChip, rubricMark, type DeltaTone } from './qualityCenterRules';
import { ToneChip } from './ToneChip';

interface Props {
  row: EvalCompareRowDto;
  onOpenConversation: (conversationId: number) => void;
}

const DELTA_CLASS: Record<DeltaTone, string> = { up: 'text-success', down: 'text-danger', none: 'text-fg-subtle' };

// Farklı çıkan tek tur: müşteri mesajı, iki koşunun cevabı yan yana, boyut puanları ve farkları. Veri seti gerçek
// konuşmadan kurulduysa orijinal konuşmaya geçilebilir.
export function EvalCompareRow({ row, onOpenConversation }: Props) {
  const { conversationId } = row;
  return (
    <li className="flex min-w-0 flex-col gap-3 rounded-xl border border-border-soft bg-card p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <ToneChip chip={directionChip(row.direction)} />
          <span className="text-ui-xs font-semibold text-fg">{row.conversationKey} · {row.turnNumber}. tur</span>
          <span className="truncate text-ui-2xs text-fg-subtle">{[row.country, row.channel].filter(Boolean).join(' · ')}</span>
        </div>
        {conversationId !== null && (
          <button type="button" className={secondaryButtonClass} onClick={() => onOpenConversation(conversationId)}>
            <ExternalLink size={13} aria-hidden /> Konuşmayı aç
          </button>
        )}
      </div>

      <p className="m-0 whitespace-pre-wrap break-words rounded-lg bg-bg-subtle px-3 py-2 text-ui-xs text-fg">
        <span className="font-semibold text-fg-muted">Müşteri: </span>{row.customerText || '—'}
      </p>

      <DeltaStrip row={row} />

      <div className="grid gap-2 md:grid-cols-2">
        <SideColumn title="Taban" side={row.base} highlight={row.textChanged} />
        <SideColumn title="Hedef" side={row.target} highlight={row.textChanged} />
      </div>
    </li>
  );
}

function DeltaStrip({ row }: { row: EvalCompareRowDto }) {
  return (
    <ul aria-label="Boyut farkları" className="m-0 grid list-none grid-cols-7 gap-1 p-0">
      {RUBRIC_KEYS.map((key) => {
        const delta = deltaOf(row.deltas[key]);
        return (
          <li key={key} className="flex flex-col items-center gap-0.5 rounded-md border border-border-soft py-1">
            <span className="text-ui-2xs font-semibold text-fg-muted">{key}</span>
            <span className="text-ui-xs tabular-nums text-fg">
              {rubricMark(row.base.scores?.[key] ?? null)} → {rubricMark(row.target.scores?.[key] ?? null)}
            </span>
            <span className={`h-3 text-ui-2xs font-bold tabular-nums ${DELTA_CLASS[delta.tone]}`}>{delta.text}</span>
          </li>
        );
      })}
    </ul>
  );
}

function SideColumn({ title, side, highlight }: { title: string; side: EvalCompareSideDto; highlight: boolean }) {
  return (
    <div className={`flex min-w-0 flex-col gap-2 rounded-lg border p-3 ${highlight ? 'border-border' : 'border-border-soft'}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-ui-2xs font-semibold uppercase text-fg-muted">{title}</span>
        <span className="text-ui-2xs text-fg-subtle">
          {[side.path ? tracePathLabel(side.path) : null, side.outcome].filter(Boolean).join(' · ') || '—'}
        </span>
      </div>
      {side.replies.length === 0
        ? <p className="m-0 text-ui-xs italic text-fg-muted">{side.error ?? 'Cevap yok'}</p>
        : side.replies.map((reply, index) => (
          <p key={index} className="m-0 whitespace-pre-wrap break-words text-ui-xs text-fg">{reply}</p>
        ))}
      {side.issues.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {side.issues.map((issue) => (
            <span key={issue} className="rounded bg-bg-subtle px-1.5 py-0.5 text-ui-2xs font-semibold text-danger">{issue}</span>
          ))}
        </div>
      )}
    </div>
  );
}
