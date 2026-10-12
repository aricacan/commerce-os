'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { Search, Store, Workflow, Zap, ZapOff } from 'lucide-react';
import type { HangfireJobInfoDto } from '../../../lib/api';
import { describeError } from '../../../lib/errors';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorState } from '../../../components/ui/ErrorState';
import { SegmentedControl, type SegmentedOption } from '../../../components/ui/SegmentedControl';
import { Select } from '../../../components/ui/Select';
import { SkeletonList } from '../../../components/ui/Skeleton';
import {
  useHangfireJobs, useHangfireRuntime, useHangfireStores, useTriggerHangfireJob,
} from '../../../hooks/hangfire/useHangfirePanel';
import { HangfireHistorySheet } from './HangfireHistorySheet';
import { HangfireJobList } from './HangfireJobList';

type StatusFilter = 'all' | 'failed' | 'unregistered';

const SKELETON_ROWS = 6;
const SKELETON_ROW_HEIGHT = 88;

interface Props {
  isMobile: boolean;
  canOperate: boolean;
  onOpenRun: (hangfireJobId: string) => void;
}

function matchesSearch(job: HangfireJobInfoDto, term: string): boolean {
  if (!term) return true;
  const needle = term.toLocaleLowerCase('tr');
  return [job.displayName, job.apiDescription, job.jobId].some((field) => field.toLocaleLowerCase('tr').includes(needle));
}

function matchesStatus(job: HangfireJobInfoDto, filter: StatusFilter): boolean {
  if (filter === 'failed') return job.lastStatus === 'failed' || job.lastStatus === 'retrying';
  if (filter === 'unregistered') return job.isRegistered === false;
  return true;
}

export function HangfireJobsTab({ isMobile, canOperate, onOpenRun }: Props) {
  const [store, setStore] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [historyJob, setHistoryJob] = useState<HangfireJobInfoDto | null>(null);
  const [pendingTrigger, setPendingTrigger] = useState<HangfireJobInfoDto | null>(null);

  const { data: jobs = [], isLoading, isError, error, refetch } = useHangfireJobs(store || undefined);
  const { data: stores = [] } = useHangfireStores();
  const trigger = useTriggerHangfireJob();

  const failedCount = jobs.filter((j) => matchesStatus(j, 'failed')).length;
  const unregisteredCount = jobs.filter((j) => matchesStatus(j, 'unregistered')).length;
  const visibleJobs = useMemo(
    () => jobs.filter((j) => matchesStatus(j, statusFilter) && matchesSearch(j, search.trim())),
    [jobs, statusFilter, search],
  );

  const statusOptions: SegmentedOption<StatusFilter>[] = [
    { value: 'all', label: `Tümü (${jobs.length})` },
    { value: 'failed', label: `Başarısız (${failedCount})` },
    { value: 'unregistered', label: `Kapalı (${unregisteredCount})` },
  ];
  const storeOptions = [
    { value: '', label: 'Tüm mağazalar' },
    ...stores.map((s) => ({ value: s.code, label: `${s.name} (${s.code})` })),
  ];

  const confirmTrigger = () => {
    if (pendingTrigger) trigger.mutate({ jobId: pendingTrigger.jobId, displayName: pendingTrigger.displayName });
    setPendingTrigger(null);
  };

  return (
    <div className="flex flex-col gap-4">
      <SummaryTiles total={jobs.length} failed={failedCount} isLoading={isLoading} />

      <div className={`flex gap-2 ${isMobile ? 'flex-col' : 'flex-row items-center'}`}>
        <label className="relative flex min-w-0 flex-1 items-center">
          <Search size={14} className="pointer-events-none absolute left-3 text-fg-muted" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Görev adı, açıklama veya kimlik ara…"
            aria-label="Görev ara"
            className="h-9 w-full min-w-0 rounded-lg border border-border bg-card pr-3 pl-9 text-ui-sm text-fg outline-none focus:border-border-strong"
          />
        </label>
        <Select value={store} options={storeOptions} onChange={setStore} icon={<Store size={13} />} />
      </div>

      <div className="overflow-x-auto">
        <SegmentedControl value={statusFilter} options={statusOptions} onChange={setStatusFilter} size="sm" />
      </div>

      <JobsContent
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={() => refetch()}
        hasJobs={jobs.length > 0}
        onClearFilters={() => { setSearch(''); setStatusFilter('all'); setStore(''); }}
      >
        {visibleJobs.length > 0 ? (
          <HangfireJobList
            jobs={visibleJobs}
            isMobile={isMobile}
            canOperate={canOperate}
            triggeringJobId={trigger.isPending ? trigger.variables?.jobId ?? null : null}
            onHistory={setHistoryJob}
            onTrigger={setPendingTrigger}
            onOpenRun={onOpenRun}
          />
        ) : (
          <EmptyState
            icon={Search}
            title="Eşleşen görev yok"
            description="Arama ya da süzgeç tüm görevleri eledi."
            action={{ label: 'Süzgeçleri temizle', onClick: () => { setSearch(''); setStatusFilter('all'); } }}
          />
        )}
      </JobsContent>

      <HangfireHistorySheet job={historyJob} canOperate={canOperate} onClose={() => setHistoryJob(null)} onOpenRun={onOpenRun} />

      <ConfirmDialog
        open={pendingTrigger !== null}
        title="İşi şimdi çalıştır?"
        description={pendingTrigger
          ? `"${pendingTrigger.displayName}" hemen kuyruğa alınacak; iş sistem kapsamında (tüm kiracılar için) çalışır. Tetikleme Aktivite Akışı'na senin adınla yazılır.`
          : ''}
        confirmLabel="Çalıştır"
        cancelLabel="Vazgeç"
        destructive={false}
        onConfirm={confirmTrigger}
        onCancel={() => setPendingTrigger(null)}
      />
    </div>
  );
}

interface JobsContentProps {
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  hasJobs: boolean;
  onRetry: () => void;
  onClearFilters: () => void;
  children: ReactNode;
}

// Yükleniyor / hata / hiç görev yok durumları — hata "tanımlı görev yok" ile KARIŞMAZ.
function JobsContent({ isLoading, isError, error, hasJobs, onRetry, onClearFilters, children }: JobsContentProps) {
  if (isLoading) return <SkeletonList count={SKELETON_ROWS} rowHeight={SKELETON_ROW_HEIGHT} />;
  if (isError) return <ErrorState title="Görevler yüklenemedi" description={describeError(error)} onRetry={onRetry} />;
  if (!hasJobs) {
    return (
      <EmptyState
        icon={Workflow}
        title="Bu seçimde görev yok"
        description="Seçili mağazaya dokunan zamanlanmış görev bulunmuyor."
        action={{ label: 'Tüm mağazaları göster', onClick: onClearFilters }}
      />
    );
  }
  return <>{children}</>;
}

function SummaryTiles({ total, failed, isLoading }: { total: number; failed: number; isLoading: boolean }) {
  const { data: runtime } = useHangfireRuntime();
  const serverActive = runtime?.serverStatus.isActive ?? false;
  const placeholder = '—';

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <Tile label="Görev" value={isLoading ? placeholder : String(total)} hint="Zamanlanmış işler" />
      <Tile
        label="Son çalışması başarısız"
        value={isLoading ? placeholder : String(failed)}
        hint={runtime ? `Depoda ${runtime.failedCount} başarısız çalışma` : 'Son 7 gün'}
        tone={failed > 0 ? 'text-danger' : 'text-fg'}
      />
      <div className="col-span-2 flex flex-col gap-1 rounded-xl border border-border bg-card p-4 sm:col-span-1">
        <span className="text-ui-xs font-semibold text-fg-muted">İşçi sunucusu</span>
        <span className={`flex items-center gap-2 text-ui-lg font-bold ${serverActive ? 'text-success' : 'text-danger'}`}>
          {serverActive ? <Zap size={16} /> : <ZapOff size={16} />}
          {runtime ? (serverActive ? 'Çalışıyor' : 'Durdu') : placeholder}
        </span>
        <span className="text-ui-xs text-fg-muted">{`${runtime?.serverStatus.serverCount ?? 0} aktif sunucu`}</span>
      </div>
    </div>
  );
}

function Tile({ label, value, hint, tone = 'text-fg' }: { label: string; value: string; hint: string; tone?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-xl border border-border bg-card p-4">
      <span className="text-ui-xs font-semibold text-fg-muted">{label}</span>
      <span className={`text-ui-2xl font-bold ${tone}`}>{value}</span>
      <span className="text-ui-xs text-fg-muted">{hint}</span>
    </div>
  );
}
