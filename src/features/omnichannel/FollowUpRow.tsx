'use client';

import { useState } from 'react';
import { Ban, Check, CheckCheck, Copy } from 'lucide-react';
import type { FollowUpTaskDto } from '../../lib/api/omnichannel-follow-ups';
import { ghostButtonClass, primaryButtonClass } from './CustomerPanelParts';
import {
  followUpActionFlags, followUpKindLabel, followUpOutcomeLabel, followUpStatusClass, followUpStatusLabel,
  followUpTimeLabel,
} from './followUpRules';

const COPIED_FEEDBACK_MS = 2000;

interface Props {
  task: FollowUpTaskDto;
  now: number;
  canWrite: boolean;
  busy: boolean;
  onComplete: () => void;
  onCancel: () => void;
}

export function FollowUpRow({ task, now, canWrite, busy, onComplete, onCancel }: Props) {
  const flags = followUpActionFlags(task);
  const outcome = followUpOutcomeLabel(task.outcome);
  const time = followUpTimeLabel(task, now);

  return (
    <li className="flex min-w-0 flex-col gap-1.5 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-2">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <span className="font-semibold text-[var(--fg)]">{followUpKindLabel(task.kind)}</span>
        <span className="font-mono text-[10px] text-[var(--fg-muted)]">{task.attempt}/{task.maxAttempts}</span>
        <span className={`shrink-0 rounded-[3px] px-1.5 py-px text-[10px] font-semibold ${followUpStatusClass(task.status)}`}>
          {followUpStatusLabel(task.status)}
        </span>
        <div className="flex-1" />
        {time && <span className="text-[10.5px] text-[var(--fg-muted)]">{time}</span>}
      </div>

      {outcome && <p className="break-words text-[11px] text-[var(--fg-muted)]">{outcome}</p>}
      {flags.showSuggestedText && task.suggestedText && <SuggestedText text={task.suggestedText} />}

      {canWrite && (flags.complete || flags.cancel) && (
        <div className="flex flex-wrap items-center gap-1.5">
          {flags.complete && (
            <button type="button" className={primaryButtonClass} disabled={busy} onClick={onComplete}>
              <Check size={12} aria-hidden /> Ben gönderdim
            </button>
          )}
          {flags.cancel && (
            <button type="button" className={ghostButtonClass} disabled={busy} onClick={onCancel}>
              <Ban size={12} aria-hidden /> İptal
            </button>
          )}
        </div>
      )}
    </li>
  );
}

function SuggestedText({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
    } catch {
      // Pano izni yok: metin zaten seçilebilir kutuda duruyor.
    }
  };

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <textarea
        readOnly
        value={text}
        rows={3}
        aria-label="Önerilen takip mesajı"
        className="w-full resize-none rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] p-2 text-[11px] text-[var(--fg)]"
      />
      <div>
        <button type="button" className={ghostButtonClass} onClick={() => void copy()}>
          {copied ? <CheckCheck size={12} aria-hidden /> : <Copy size={12} aria-hidden />}
          {copied ? 'Kopyalandı' : 'Kopyala'}
        </button>
      </div>
    </div>
  );
}
