import type { HangfireJobInfoDto } from '../../../lib/api';
import { formatDateTime } from '../../../lib/format';
import { HangfireRunError } from './HangfireRunError';
import { HangfireStatusBadge } from './HangfireStatusBadge';
import { formatDuration } from './format';

// Bir işin SON çalışması: durum rozeti, zaman, süre; atlandıysa sebebi, patladıysa hatası.
export function HangfireLastRun({ job }: { job: HangfireJobInfoDto }) {
  const run = job.lastRun;
  const finishedAt = run?.finishedAtUtc ?? job.lastExecutionUtc;

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <HangfireStatusBadge status={job.lastStatus} />
        {finishedAt && <span className="text-ui-xs text-fg-muted">{formatDateTime(finishedAt)}</span>}
        {run?.durationMs != null && run.status !== 'skipped' && (
          <span className="text-ui-xs text-fg-muted">· {formatDuration(run.durationMs)}</span>
        )}
      </div>
      {run?.status === 'skipped' && run.reason && (
        <p className="m-0 text-ui-xs text-fg-muted">{run.reason}</p>
      )}
      {run?.status === 'retrying' && run.reason && (
        <p className="m-0 break-words text-ui-xs text-warning">{run.reason}</p>
      )}
      {run?.error && <HangfireRunError error={run.error} />}
      {job.registrationError && (
        <p className="m-0 break-words text-ui-xs text-danger">Zamanlama hatası: {job.registrationError}</p>
      )}
    </div>
  );
}
