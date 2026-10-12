'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { BotTurnTraceDto } from '../../lib/api/omnichannel-eval';
import { focusRing } from '../shared/design';
import { formatDuration, formatTokens, formatTraceTime, modeChip, outcomeChip, tracePathLabel } from './botTraceRules';
import { BotTraceDetails } from './BotTraceDetails';
import { ToneChip } from './ToneChip';

// Tek tur özeti (zaman, yol, sonuç, mod, süre, jeton); basınca araç çağrıları ve cevap metinleri açılır.
export function BotTraceItem({ trace }: { trace: BotTurnTraceDto }) {
  const [expanded, setExpanded] = useState(false);
  const Chevron = expanded ? ChevronDown : ChevronRight;

  return (
    <li className="flex min-w-0 flex-col rounded-lg bg-bg-subtle">
      <button
        type="button" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded}
        className={`flex min-w-0 cursor-pointer flex-col gap-1 rounded-lg bg-transparent px-2.5 py-2 text-left ${focusRing}`}
      >
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <Chevron size={12} className="shrink-0 text-fg-muted" aria-hidden />
          <span className="min-w-0 truncate text-ui-sm font-semibold text-fg" title={trace.path}>{tracePathLabel(trace.path)}</span>
          <ToneChip chip={outcomeChip(trace.outcome)} />
          <ToneChip chip={modeChip(trace.mode)} />
        </div>
        <span className="text-ui-2xs tabular-nums text-fg-subtle">
          {formatTraceTime(trace.createdAt)} · {formatDuration(trace.durationMs)} · {formatTokens(trace.promptTokens, trace.completionTokens)}
          {trace.pipelineVersion ? ` · ${trace.pipelineVersion}` : ''}
        </span>
      </button>
      {expanded && <BotTraceDetails trace={trace} />}
    </li>
  );
}
