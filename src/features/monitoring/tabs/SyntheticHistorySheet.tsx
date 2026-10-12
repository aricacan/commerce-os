'use client';

import { History } from 'lucide-react';
import type { SyntheticCheckRunDto, SyntheticStepDto } from '../../../lib/api';
import { describeError } from '../../../lib/errors';
import { BottomSheet } from '../../../components/ui/BottomSheet';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorState } from '../../../components/ui/ErrorState';
import { SkeletonList } from '../../../components/ui/Skeleton';
import { useSyntheticHistory } from '../../../hooks/monitoring/useSyntheticChecks';
import { formatStamp } from '../format';
import { formatCheckDuration, STATUS_META, TRIGGER_LABELS } from '../synthetic';
import { Pill } from '../ui';
import { SyntheticArtifactLink } from './SyntheticArtifactLink';

const SKELETON_ROWS = 5;
const SKELETON_ROW_HEIGHT = 56;

interface Props {
  /** Açık kontrol; null → çekmece kapalı. */
  target: { key: string; label: string } | null;
  onClose: () => void;
}

// Kontrolün son 20 çalışması ve adımları — telefonda alttan panel, masaüstünde pencere.
export function SyntheticHistorySheet({ target, onClose }: Props) {
  return (
    <BottomSheet open={target !== null} onClose={onClose} title={target ? `${target.label} — son çalışmalar` : ''} desktopDialog>
      {/* Kendi kaydırma alanı şart: masaüstü penceresi taşmayı gizler (bkz. HangfireHistorySheet). */}
      <div className="max-h-[70vh] overflow-y-auto overscroll-contain sm:max-h-[calc(100vh-140px)]">
        {target ? <HistoryBody checkKey={target.key} /> : null}
      </div>
    </BottomSheet>
  );
}

function HistoryBody({ checkKey }: { checkKey: string }) {
  const { data: runs, isLoading, isError, error, refetch } = useSyntheticHistory(checkKey);

  if (isLoading) return <SkeletonList count={SKELETON_ROWS} rowHeight={SKELETON_ROW_HEIGHT} className="px-5 py-3" />;
  if (isError) return <ErrorState title="Geçmiş yüklenemedi" description={describeError(error)} onRetry={() => refetch()} />;
  if (!runs || runs.length === 0) {
    return <EmptyState icon={History} title="Kayıtlı çalışma yok" description="Bu kontrol henüz hiç koşmadı." />;
  }

  return (
    <ol className="m-0 flex list-none flex-col gap-2 px-4 py-3">
      {/* En yeni çalışmanın adımları açık gelir — çoğu zaman bakılan odur. */}
      {runs.map((run, index) => <RunRow key={run.runId} run={run} defaultOpen={index === 0} />)}
    </ol>
  );
}

function RunRow({ run, defaultOpen }: { run: SyntheticCheckRunDto; defaultOpen: boolean }) {
  const status = STATUS_META[run.status];
  return (
    <li className="flex min-w-0 flex-col gap-2 rounded-[4px] border border-[var(--border-soft)] p-3">
      <div className="flex flex-wrap items-center gap-2 text-ui-2xs text-[var(--fg-muted)]">
        <Pill tone={status.tone}>{status.label}</Pill>
        <span>{formatStamp(run.finishedAt)}</span>
        <span>· {formatCheckDuration(run.durationMs)}</span>
        <span>· {TRIGGER_LABELS[run.trigger]}</span>
      </div>
      {run.error ? (
        <p className="m-0 min-w-0 break-words text-ui-2xs text-[var(--danger)]">
          {run.failedStep ? `${run.failedStep}: ` : ''}{run.error}
        </p>
      ) : null}
      {run.artifactUrl ? <SyntheticArtifactLink url={run.artifactUrl} /> : null}
      {run.steps.length > 0 ? (
        <details open={defaultOpen} className="min-w-0">
          <summary className="cursor-pointer text-ui-2xs font-semibold text-[var(--fg-muted)]">
            Adımlar ({run.steps.length})
          </summary>
          <ol className="m-0 mt-1.5 flex list-none flex-col gap-1 p-0">
            {run.steps.map((step, index) => <StepRow key={`${index}-${step.name}`} step={step} />)}
          </ol>
        </details>
      ) : null}
    </li>
  );
}

function StepRow({ step }: { step: SyntheticStepDto }) {
  const status = STATUS_META[step.status];
  return (
    <li className="flex min-w-0 flex-col gap-0.5">
      <div className="flex min-w-0 items-center gap-2 text-xs">
        <Pill tone={status.tone}>{status.label}</Pill>
        <span className="min-w-0 flex-1 truncate text-[var(--fg)]">{step.name}</span>
        <span className="shrink-0 text-ui-2xs text-[var(--fg-muted)]">{formatCheckDuration(step.durationMs)}</span>
      </div>
      {step.error ? <p className="m-0 min-w-0 break-words text-ui-2xs text-[var(--danger)]">{step.error}</p> : null}
    </li>
  );
}
