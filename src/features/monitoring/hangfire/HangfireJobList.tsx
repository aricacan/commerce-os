import type { HangfireJobInfoDto } from '../../../lib/api';
import { formatDateTime } from '../../../lib/format';
import { HangfireJobActions } from './HangfireJobActions';
import { HangfireJobTitle } from './HangfireJobTitle';
import { HangfireLastRun } from './HangfireLastRun';
import { describeCron } from './format';

export interface HangfireJobListProps {
  jobs: HangfireJobInfoDto[];
  isMobile: boolean;
  canOperate: boolean;
  triggeringJobId: string | null;
  onHistory: (job: HangfireJobInfoDto) => void;
  onTrigger: (job: HangfireJobInfoDto) => void;
  onOpenRun: (hangfireJobId: string) => void;
}

// Masaüstünde tablo, telefonda (375px) kart — kart düzeninde yatay kaydırma yok.
export function HangfireJobList(props: HangfireJobListProps) {
  return props.isMobile ? <JobCards {...props} /> : <JobTable {...props} />;
}

function Schedule({ job }: { job: HangfireJobInfoDto }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-ui-sm font-semibold text-fg">{describeCron(job.cronExpression)}</span>
      {job.cronExpression && <span className="font-mono text-ui-2xs text-fg-muted">{job.cronExpression}</span>}
    </div>
  );
}

function NextRun({ job }: { job: HangfireJobInfoDto }) {
  return (
    <span className="text-ui-xs text-fg-muted">
      {job.nextExecutionUtc ? formatDateTime(job.nextExecutionUtc) : '—'}
    </span>
  );
}

function JobTable({ jobs, canOperate, triggeringJobId, onHistory, onTrigger, onOpenRun }: HangfireJobListProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-xs)]">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-border bg-bg-subtle text-ui-xs font-semibold text-fg-muted">
              <th className="px-4 py-3">Görev</th>
              <th className="px-4 py-3">Son çalışma</th>
              <th className="px-4 py-3">Sıklık</th>
              <th className="px-4 py-3">Sonraki</th>
              <th className="px-4 py-3 text-right">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job.jobId} className="border-b border-border-soft align-top last:border-b-0">
                <td className="max-w-md px-4 py-3"><HangfireJobTitle job={job} /></td>
                <td className="max-w-sm px-4 py-3"><HangfireLastRun job={job} /></td>
                <td className="px-4 py-3"><Schedule job={job} /></td>
                <td className="px-4 py-3"><NextRun job={job} /></td>
                <td className="px-4 py-3">
                  <div className="flex justify-end">
                    <HangfireJobActions
                      job={job}
                      canOperate={canOperate}
                      isTriggering={triggeringJobId === job.jobId}
                      onHistory={onHistory}
                      onTrigger={onTrigger}
                      onOpenRun={onOpenRun}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function JobCards({ jobs, canOperate, triggeringJobId, onHistory, onTrigger, onOpenRun }: HangfireJobListProps) {
  return (
    <div className="flex flex-col gap-3">
      {jobs.map((job) => (
        <article key={job.jobId} className="flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-card p-4">
          <HangfireJobTitle job={job} />
          <HangfireLastRun job={job} />
          <div className="grid grid-cols-2 gap-2 rounded-lg bg-bg-subtle p-3">
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-ui-2xs font-semibold text-fg-muted">SIKLIK</span>
              <Schedule job={job} />
            </div>
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-ui-2xs font-semibold text-fg-muted">SONRAKİ</span>
              <NextRun job={job} />
            </div>
          </div>
          <HangfireJobActions
            job={job}
            canOperate={canOperate}
            isTriggering={triggeringJobId === job.jobId}
            onHistory={onHistory}
            onTrigger={onTrigger}
            onOpenRun={onOpenRun}
          />
        </article>
      ))}
    </div>
  );
}
