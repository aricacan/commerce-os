import type { BotTurnTraceDto } from '../../lib/api/omnichannel-eval';
import { formatDuration, traceToolLabel } from './botTraceRules';

const subheadingClass = 'text-ui-2xs font-semibold uppercase tracking-wider text-fg-muted';

// Açılmış turun içeriği: model, hata sebebi, araç çağrıları (ad, durum, süre, kısa argüman) ve cevap metinleri.
export function BotTraceDetails({ trace }: { trace: BotTurnTraceDto }) {
  return (
    <div className="flex min-w-0 flex-col gap-2 border-t border-border-soft px-2.5 py-2">
      {trace.model && <span className="text-ui-2xs text-fg-muted">Model: <span className="text-fg">{trace.model}</span></span>}
      {trace.failureReason && <p className="m-0 break-words text-ui-xs text-danger">{trace.failureReason}</p>}

      <div className="flex min-w-0 flex-col gap-1">
        <span className={subheadingClass}>Araç çağrıları</span>
        {trace.toolCalls.length === 0 ? <span className="text-ui-xs text-fg-subtle">Araç çağrılmadı.</span> : (
          <ul className="m-0 flex min-w-0 list-none flex-col gap-1 p-0">
            {trace.toolCalls.map((call, index) => (
              <li key={`${call.name}-${index}`} className="flex min-w-0 flex-col gap-0.5 rounded-md bg-card px-2 py-1.5">
                <div className="flex min-w-0 items-center justify-between gap-2 text-ui-xs">
                  <code className="min-w-0 truncate font-semibold text-fg" title={call.name}>{traceToolLabel(call.name)}</code>
                  <span className="shrink-0 tabular-nums text-fg-muted">{call.status || '—'} · {formatDuration(call.durationMs)}</span>
                </div>
                {call.args && <code className="min-w-0 break-all text-ui-2xs text-fg-muted">{call.args}</code>}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex min-w-0 flex-col gap-1">
        <span className={subheadingClass}>Cevaplar</span>
        {trace.replyTexts.length === 0 ? <span className="text-ui-xs text-fg-subtle">Cevap gönderilmedi.</span> : (
          <ul className="m-0 flex min-w-0 list-none flex-col gap-1 p-0">
            {trace.replyTexts.map((reply, index) => (
              <li key={index} className="whitespace-pre-wrap break-words rounded-md bg-card px-2 py-1.5 text-ui-xs text-fg">{reply}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
