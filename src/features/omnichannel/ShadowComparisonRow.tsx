import type { ShadowComparisonDto, ShadowSideDto } from '../../lib/api/omnichannel-eval';
import { formatTraceTime, outcomeChip, tracePathLabel } from './botTraceRules';
import { ToneChip } from './ToneChip';

// Bir müşteri mesajı ve ona canlı/gölge hattın verdiği cevaplar yan yana (telefonda alt alta).
export function ShadowComparisonRow({ row }: { row: ShadowComparisonDto }) {
  return (
    <li className="flex min-w-0 flex-col gap-2 rounded-xl border border-border-soft bg-card p-3">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 text-ui-2xs text-fg-subtle">
        <span className="min-w-0 truncate">{row.channelName || 'Kanal'} · #{row.conversationId}</span>
        <span className="tabular-nums">{formatTraceTime(row.createdAt)}</span>
      </div>
      <p className="m-0 whitespace-pre-wrap break-words rounded-lg bg-bg-subtle px-2.5 py-2 text-ui-sm text-fg">
        {row.customerText || '—'}
      </p>
      <div className="grid min-w-0 gap-2 md:grid-cols-2">
        <ShadowSide title="Canlı" side={row.live} />
        <ShadowSide title="Gölge" side={row.shadow} />
      </div>
    </li>
  );
}

function ShadowSide({ title, side }: { title: string; side: ShadowSideDto | null }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 rounded-lg border border-border-soft p-2.5">
      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        <span className="text-ui-xs font-bold text-fg">{title}</span>
        {side?.version && <span className="rounded-md bg-bg-subtle px-1.5 py-0.5 text-ui-2xs font-semibold text-fg-muted">{side.version}</span>}
        {side && <ToneChip chip={outcomeChip(side.outcome)} />}
      </div>
      {!side ? <span className="text-ui-xs text-fg-subtle">Kayıt yok.</span> : (
        <>
          <span className="truncate text-ui-2xs text-fg-subtle" title={side.path}>{tracePathLabel(side.path)}</span>
          {side.replyTexts.length === 0 ? <span className="text-ui-xs text-fg-subtle">Cevap yok.</span> : (
            <ul className="m-0 flex min-w-0 list-none flex-col gap-1 p-0">
              {side.replyTexts.map((reply, index) => (
                <li key={index} className="whitespace-pre-wrap break-words text-ui-xs text-fg">{reply}</li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
