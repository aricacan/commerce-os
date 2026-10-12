import type { HangfireJobInfoDto } from '../../../lib/api';

// İşin adı, kapsamı, açıklaması ve etkilediği mağazalar — kart ve tablo aynı başlığı kullanır.
export function HangfireJobTitle({ job }: { job: HangfireJobInfoDto }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-ui-md font-semibold text-fg">{job.displayName}</span>
        <span className="break-all rounded border border-border-soft bg-bg-subtle px-1.5 py-px font-mono text-ui-2xs text-fg-muted">
          {job.jobId}
        </span>
      </div>
      <p className="m-0 break-words text-ui-xs leading-relaxed text-fg-muted">{job.apiDescription}</p>
      {job.affectedStoreNames.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {job.affectedStoreNames.map((store) => (
            <span key={store} className="rounded border border-border-soft px-1.5 py-px text-ui-2xs font-semibold text-fg">
              {store}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
