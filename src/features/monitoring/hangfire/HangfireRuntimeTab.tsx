'use client';

import { Activity, AlertTriangle, ExternalLink, Layers, Server } from 'lucide-react';
import type { HangfireProcessingJobDto, HangfireRuntimeDto } from '../../../lib/api';
import { formatDateTime } from '../../../lib/format';
import { describeError } from '../../../lib/errors';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorState } from '../../../components/ui/ErrorState';
import { SkeletonList } from '../../../components/ui/Skeleton';
import { useHangfireRuntime } from '../../../hooks/hangfire/useHangfirePanel';
import { formatSeconds } from './format';

const SKELETON_ROWS = 4;
const MINUTES_PER_HOUR = 60;

interface Props {
  canOperate: boolean;
  onOpenRun: (hangfireJobId: string) => void;
}

// "Şu an ne oluyor": çalışan ve takılı işler, kuyruk derinliği, işçi sunucuları.
export function HangfireRuntimeTab({ canOperate, onOpenRun }: Props) {
  const { data, isLoading, isError, error, refetch } = useHangfireRuntime();

  if (isLoading) return <SkeletonList count={SKELETON_ROWS} />;
  if (isError || !data) {
    return <ErrorState title="Çalışma durumu alınamadı" description={describeError(error)} onRetry={() => refetch()} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <ProcessingSection runtime={data} canOperate={canOperate} onOpenRun={onOpenRun} />
      <QueuesSection runtime={data} />
      <ServersSection runtime={data} />
    </div>
  );
}

function SectionTitle({ icon: Icon, children }: { icon: typeof Activity; children: string }) {
  return (
    <h3 className="m-0 flex items-center gap-2 text-ui-sm font-semibold text-fg">
      <Icon size={15} className="text-fg-muted" />
      {children}
    </h3>
  );
}

function thresholdLabel(minutes: number): string {
  return minutes % MINUTES_PER_HOUR === 0 ? `${minutes / MINUTES_PER_HOUR} saatten` : `${minutes} dakikadan`;
}

// İki ayrı durum, iki ayrı anlam — önceden tek "takılı" uyarısında karışıyordu:
//   • Uzun süren: sunucusu ayakta ama iş eşikten uzun sürüyor → bakılması gereken şey.
//   • Sahipsiz: işi alan sunucu kapanmış (deploy, yeniden başlatma). Hangfire bu işleri
//     canlı bir işçi sunucusu çalışırken kendiliğinden yeniden kuyruğa alır; tek tek
//     listelemek (yüzlerce satır) gerçek sorunu gizliyordu, bu yüzden özet olarak gösterilir.
function ProcessingSection({ runtime, canOperate, onOpenRun }: { runtime: HangfireRuntimeDto } & Props) {
  const running = runtime.processing.filter((p) => p.serverAlive);
  const orphaned = runtime.processing.filter((p) => !p.serverAlive);
  const longRunning = running.filter((p) => p.isStuck).length;

  return (
    <section className="flex flex-col gap-3">
      <SectionTitle icon={Activity}>{`Şu an çalışanlar (${running.length})`}</SectionTitle>
      {longRunning > 0 && (
        <p className="m-0 flex items-start gap-2 rounded-lg bg-warning-soft p-3 text-ui-xs text-warning">
          <AlertTriangle size={14} className="mt-px shrink-0" />
          {`${longRunning} iş ${thresholdLabel(runtime.stuckThresholdMinutes)} uzun sürüyor — sunucu ayakta ama iş bitmiyor; hata veya kilitlenme olabilir.`}
        </p>
      )}
      {running.length === 0 ? (
        <EmptyState icon={Activity} title="Şu an çalışan iş yok" description="Zamanı gelen işler burada görünür; liste kendiliğinden yenilenir." />
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {running.map((job) => (
            <ProcessingRow key={job.hangfireJobId} job={job} canOperate={canOperate} onOpenRun={onOpenRun} />
          ))}
        </ul>
      )}
      {orphaned.length > 0 && <OrphanedSummary jobs={orphaned} />}
    </section>
  );
}

const ORPHAN_GROUP_LIMIT = 10;

function OrphanedSummary({ jobs }: { jobs: HangfireProcessingJobDto[] }) {
  const groups = Object.entries(
    jobs.reduce<Record<string, number>>((acc, job) => {
      acc[job.displayName] = (acc[job.displayName] ?? 0) + 1;
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);

  return (
    <details className="rounded-lg border border-border-soft bg-bg-subtle p-3">
      <summary className="cursor-pointer text-ui-xs font-semibold text-fg">
        {`${jobs.length} iş sahipsiz kaldı — onları çalıştıran sunucu kapanmış`}
      </summary>
      <p className="m-0 mt-2 text-ui-xs text-fg-muted">
        Deploy ya da yeniden başlatma sırasında yarıda kalan çalışmalar. Hangfire bunları canlı bir işçi
        sunucusu çalışırken yeniden kuyruğa alır; bir şey yapmana gerek yok. Sayı sürekli artıyorsa işçi
        sunucusu çalışmıyor demektir (aşağıdaki &quot;İşçi sunucuları&quot; bölümüne bak).
      </p>
      <ul className="m-0 mt-2 flex list-none flex-col gap-1 p-0">
        {groups.slice(0, ORPHAN_GROUP_LIMIT).map(([name, count]) => (
          <li key={name} className="flex justify-between gap-3 text-ui-xs text-fg">
            <span className="min-w-0 break-words">{name}</span>
            <span className="shrink-0 font-mono text-fg-muted">{count}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}

function ProcessingRow({ job, canOperate, onOpenRun }: { job: HangfireProcessingJobDto } & Props) {
  const tone = job.isStuck ? 'border-warning bg-warning-soft' : 'border-border-soft bg-card';
  return (
    <li className={`flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-lg border p-3 ${tone}`}>
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="break-words text-ui-sm font-semibold text-fg">{job.displayName}</span>
        <span className="text-ui-xs text-fg-muted">
          {`#${job.hangfireJobId} · ${formatSeconds(job.runningSeconds)} sürüyor`}
          {job.startedAtUtc && ` · başladı ${formatDateTime(job.startedAtUtc)}`}
        </span>
      </div>
      {canOperate && (
        <Button variant="ghost" size="sm" icon={<ExternalLink size={13} />} onClick={() => onOpenRun(job.hangfireJobId)}>
          Hangfire&apos;da aç
        </Button>
      )}
    </li>
  );
}

function QueuesSection({ runtime }: { runtime: HangfireRuntimeDto }) {
  return (
    <section className="flex flex-col gap-3">
      <SectionTitle icon={Layers}>Kuyruklar</SectionTitle>
      {runtime.queues.length === 0 ? (
        <p className="m-0 text-ui-xs text-fg-muted">Bekleyen kuyruk yok.</p>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {runtime.queues.map((queue) => (
            <div key={queue.name} className="flex flex-col gap-1 rounded-lg border border-border-soft bg-card p-3">
              <span className="font-mono text-ui-xs text-fg-muted">{queue.name}</span>
              <span className="text-ui-xl font-bold text-fg">{queue.length}</span>
              <span className="text-ui-2xs text-fg-muted">bekleyen iş</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function ServersSection({ runtime }: { runtime: HangfireRuntimeDto }) {
  return (
    <section className="flex flex-col gap-3">
      <SectionTitle icon={Server}>{`İşçi sunucuları (${runtime.servers.length})`}</SectionTitle>
      {runtime.servers.length === 0 ? (
        <p className="m-0 rounded-lg bg-danger-soft p-3 text-ui-xs text-danger">
          Hiç işçi sunucusu yok — zamanlanmış işler çalışmıyor (BackgroundJobs:WorkersEnabled kapalı olabilir).
        </p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {runtime.servers.map((server) => (
            <li key={server.name} className="flex min-w-0 flex-col gap-0.5 rounded-lg border border-border-soft bg-card p-3">
              <span className="break-all font-mono text-ui-xs text-fg">{server.name}</span>
              <span className="text-ui-xs text-fg-muted">
                {`${server.workerCount} işçi · kuyruklar: ${server.queues.join(', ') || '—'}`}
                {server.heartbeatUtc && ` · son sinyal ${formatDateTime(server.heartbeatUtc)}`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
