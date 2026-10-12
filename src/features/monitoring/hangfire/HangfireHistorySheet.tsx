'use client';

import { ExternalLink, History, RotateCcw } from 'lucide-react';
import type { HangfireJobInfoDto, HangfireJobRunDto } from '../../../lib/api';
import { formatDateTime } from '../../../lib/format';
import { describeError } from '../../../lib/errors';
import { BottomSheet } from '../../../components/ui/BottomSheet';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorState } from '../../../components/ui/ErrorState';
import { SkeletonList } from '../../../components/ui/Skeleton';
import { useHangfireJobHistory, useRetryHangfireRun } from '../../../hooks/hangfire/useHangfirePanel';
import { HangfireRunError } from './HangfireRunError';
import { HangfireStatusBadge } from './HangfireStatusBadge';
import { formatDuration } from './format';

const SKELETON_ROWS = 5;
const SKELETON_ROW_HEIGHT = 56;

interface Props {
  job: HangfireJobInfoDto | null;
  canOperate: boolean;
  onClose: () => void;
  onOpenRun: (hangfireJobId: string) => void;
}

// İşin son çalışmaları — telefonda alttan açılan panel, masaüstünde ortalanmış pencere.
export function HangfireHistorySheet({ job, canOperate, onClose, onOpenRun }: Props) {
  return (
    <BottomSheet open={job !== null} onClose={onClose} title={job ? `${job.displayName} — geçmiş` : ''} desktopDialog>
      {/* Kendi kaydırma alanı ŞART: BottomSheet masaüstü penceresinde taşmayı gizler
          (overflow: hidden); 20 çalışma + açık hata yığını sığmayınca liste kaymıyordu. */}
      <div className="max-h-[70vh] overflow-y-auto overscroll-contain sm:max-h-[calc(100vh-140px)]">
        {job && <HistoryBody jobId={job.jobId} canOperate={canOperate} onOpenRun={onOpenRun} />}
      </div>
    </BottomSheet>
  );
}

function HistoryBody({ jobId, canOperate, onOpenRun }: { jobId: string; canOperate: boolean; onOpenRun: (id: string) => void }) {
  const { data: runs, isLoading, isError, error, refetch } = useHangfireJobHistory(jobId);
  const retry = useRetryHangfireRun();

  if (isLoading) return <SkeletonList count={SKELETON_ROWS} rowHeight={SKELETON_ROW_HEIGHT} className="px-5 py-3" />;

  if (isError) {
    return <ErrorState title="Geçmiş yüklenemedi" description={describeError(error)} onRetry={() => refetch()} />;
  }

  if (!runs || runs.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="Kayıtlı çalışma yok"
        description="Başarılı çalışmalar 1 gün, başarısızlar 7 gün tutulur. Bu süre içinde çalışmamış bir işin geçmişi boş görünür."
      />
    );
  }

  return (
    <ol className="m-0 flex list-none flex-col gap-2 px-4 py-3">
      {runs.map((run) => (
        <RunRow
          key={run.hangfireJobId}
          run={run}
          canOperate={canOperate}
          isRetrying={retry.isPending && retry.variables === run.hangfireJobId}
          onRetry={() => retry.mutate(run.hangfireJobId)}
          onOpenRun={onOpenRun}
        />
      ))}
    </ol>
  );
}

interface RunRowProps {
  run: HangfireJobRunDto;
  canOperate: boolean;
  isRetrying: boolean;
  onRetry: () => void;
  onOpenRun: (id: string) => void;
}

function RunRow({ run, canOperate, isRetrying, onRetry, onOpenRun }: RunRowProps) {
  const at = run.finishedAtUtc ?? run.startedAtUtc;
  return (
    <li className="flex min-w-0 flex-col gap-2 rounded-lg border border-border-soft p-3">
      <div className="flex flex-wrap items-center gap-2">
        <HangfireStatusBadge status={run.status} />
        <span className="font-mono text-ui-2xs text-fg-muted">#{run.hangfireJobId}</span>
        {at && <span className="text-ui-xs text-fg-muted">{formatDateTime(at)}</span>}
        {run.durationMs != null && run.status !== 'skipped' && (
          <span className="text-ui-xs text-fg-muted">· {formatDuration(run.durationMs)}</span>
        )}
      </div>
      {run.reason && run.status !== 'failed' && (
        <p className="m-0 break-words text-ui-xs text-fg-muted">{run.reason}</p>
      )}
      {run.error && <HangfireRunError error={run.error} />}
      {canOperate && (
        <div className="flex flex-wrap gap-2">
          {run.status === 'failed' && (
            <Button variant="secondary" size="sm" icon={<RotateCcw size={13} />} loading={isRetrying} onClick={onRetry}>
              Yeniden dene
            </Button>
          )}
          <Button variant="ghost" size="sm" icon={<ExternalLink size={13} />} onClick={() => onOpenRun(run.hangfireJobId)}>
            Hangfire&apos;da aç
          </Button>
        </div>
      )}
    </li>
  );
}
