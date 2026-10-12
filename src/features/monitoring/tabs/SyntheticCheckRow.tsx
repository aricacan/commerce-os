'use client';

import { useState } from 'react';
import { ChevronRight, Play } from 'lucide-react';
import { SyntheticArtifactLink } from './SyntheticArtifactLink';
import type { SyntheticCheckDto } from '../../../lib/api';
import { formatRelative } from '../format';
import { formatCheckDuration, isRunnableLayer, STATUS_META } from '../synthetic';
import { Pill } from '../ui';

// Bu uzunluğu aşan hata iki satıra kısaltılır, "Devamı" ile açılır.
const ERROR_PREVIEW_CHARS = 140;

interface Props {
  check: SyntheticCheckDto;
  label: string;
  now: number;
  isRunning: boolean;
  onOpen: () => void;
  onRun: () => void;
}

// Tek kontrol satırı: satıra tıklamak geçmişi açar; "Şimdi çalıştır" ayrı bir düğme
// (iç içe düğme olamayacağı için başlık ve çalıştır yan yana iki ayrı öğe).
export function SyntheticCheckRow({ check, label, now, isRunning, onOpen, onRun }: Props) {
  const status = STATUS_META[check.status];
  const meta = [check.path, formatCheckDuration(check.durationMs), formatRelative(check.finishedAt, now)]
    .filter(Boolean)
    .join(' · ');

  return (
    <li className="flex min-w-0 flex-col gap-1.5 px-4 py-2.5">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={onOpen}
          title="Son çalışmaları göster"
          className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
        >
          <Pill tone={status.tone}>{status.label}</Pill>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-xs font-semibold text-[var(--fg)]">{label}</span>
            <span className="truncate text-ui-2xs text-[var(--fg-muted)]">{meta}</span>
          </span>
          <ChevronRight size={13} className="shrink-0 text-[var(--fg-muted)]" />
        </button>
        {isRunnableLayer(check.layer) ? (
          <button
            type="button"
            onClick={onRun}
            disabled={isRunning}
            title="Şimdi çalıştır"
            aria-label={`${label} — şimdi çalıştır`}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[4px] border border-[var(--border)] bg-[var(--card)] text-[var(--fg-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--fg)] disabled:opacity-50"
          >
            <Play size={12} />
          </button>
        ) : null}
      </div>
      {check.status === 'failed' && (check.failedStep || check.error) ? (
        <FailureText step={check.failedStep} error={check.error} />
      ) : null}
      {check.artifactUrl ? <SyntheticArtifactLink url={check.artifactUrl} /> : null}
    </li>
  );
}

function FailureText({ step, error }: { step: string | null; error: string | null }) {
  const [expanded, setExpanded] = useState(false);
  const text = [step ? `${step} adımında kaldı` : null, error].filter(Boolean).join(': ');
  const long = text.length > ERROR_PREVIEW_CHARS;

  return (
    <div className="flex min-w-0 flex-col items-start gap-0.5">
      <p className={`min-w-0 max-w-full break-words text-ui-2xs text-[var(--danger)] ${expanded ? '' : 'line-clamp-2'}`}>
        {text}
      </p>
      {long ? (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="text-ui-2xs font-semibold text-[var(--fg-muted)] hover:text-[var(--fg)]"
        >
          {expanded ? 'Kısalt' : 'Devamı'}
        </button>
      ) : null}
    </div>
  );
}
