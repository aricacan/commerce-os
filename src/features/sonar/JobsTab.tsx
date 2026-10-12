'use client';

import { useCallback, useEffect, useState } from 'react';
import { Ban, Play, RefreshCw, X } from 'lucide-react';
import { palette } from '../shared/design';
import {
  sonarImports,
  sonarJobs,
  sonarSites,
  type CrawlJobDto,
  type ImportBatchDto,
  type SupplierSiteDto,
} from '../../lib/api/sonar';
import {
  Badge, Button, Card, Empty, ErrorNote, JOB_STATUS, Page, PageHeader, formatDateTime,
} from './shared';

/** Çalışan iş varken listeyi bu sıklıkla tazele (ms). */
const LIVE_REFRESH_MS = 5000;

export function JobsTab() {
  const [jobs, setJobs] = useState<CrawlJobDto[] | null>(null);
  const [sites, setSites] = useState<SupplierSiteDto[]>([]);
  const [batches, setBatches] = useState<ImportBatchDto[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [j, s, b] = await Promise.all([
        sonarJobs.list(), sonarSites.list(), sonarImports.list(),
      ]);
      setJobs(j);
      setSites(s);
      setBatches(b);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'İşler yüklenemedi.');
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  // Çalışan iş varken canlı tazele. İş yoksa zamanlayıcı KURULMAZ: boş bir
  // ekranı beş saniyede bir yenilemek gereksiz yük.
  const hasLive = jobs?.some((j) => j.status === 'Running' || j.status === 'Queued') ?? false;

  useEffect(() => {
    if (!hasLive) return;
    const id = setInterval(() => { void load(); }, LIVE_REFRESH_MS);
    return () => clearInterval(id);
  }, [hasLive, load]);

  const act = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'İşlem başarısız.');
    }
  };

  return (
    <Page>
      <PageHeader
        dataTour="sonar-jobs-header"
        title="Tarama İşleri"
        description="İşler parça parça ilerler ve kontrol noktası tutar; kesinti olursa baştan başlamaz."
        actions={
          <Button onClick={() => void load()}>
            <RefreshCw size={13} /> Yenile
          </Button>
        }
      />

      {error && <ErrorNote message={error} />}

      <div data-tour="sonar-jobs-create">
        <StartJobCard sites={sites} batches={batches}
          onStarted={() => void load()} onError={setError} />
      </div>

      {jobs?.length === 0 && (
        <Empty title="Henüz tarama işi yok"
          hint="Bir Excel ve tedarikçi sitesi seçip tarama başlatın." />
      )}

      {jobs && jobs.length > 0 && (
        <div className="flex flex-col gap-2" data-tour="sonar-jobs-list">
          {jobs.map((job) => (
            <JobRow key={job.id} job={job}
              onResume={() => void act(() => sonarJobs.resume(job.id))}
              onCancel={() => void act(() => sonarJobs.cancel(job.id))} />
          ))}
        </div>
      )}
    </Page>
  );
}

function StartJobCard({ sites, batches, onStarted, onError }: {
  sites: SupplierSiteDto[];
  batches: ImportBatchDto[];
  onStarted: () => void;
  onError: (message: string) => void;
}) {
  const [siteId, setSiteId] = useState<number | ''>('');
  const [batchId, setBatchId] = useState<number | ''>('');
  const [busy, setBusy] = useState(false);

  const runnable = sites.filter((s) => s.isEnabled && s.activeProfileRevision !== null);
  const canStart = siteId !== '' && batchId !== '' && !busy;

  const start = async () => {
    if (siteId === '' || batchId === '') return;
    setBusy(true);
    try {
      await sonarJobs.start(siteId, batchId);
      onStarted();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Tarama başlatılamadı.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <div className="mb-3 text-sm font-medium" style={{ color: palette.textStrong }}>
        Yeni tarama
      </div>

      {runnable.length === 0 ? (
        <p className="text-xs" style={{ color: palette.textMuted }}>
          Doğrulanmış profili olan aktif site yok. Tarama başlatmadan önce site
          eklenip keşif çalıştırılmalı — doğrulanmamış profille saatlerce
          güvenilmez veri üretilir.
        </p>
      ) : (
        <div className="flex flex-wrap items-end gap-3">
          <Select label="Tedarikçi sitesi" value={siteId} onChange={setSiteId}
            options={runnable.map((s) => ({ value: s.id, label: s.displayName }))} />

          <Select label="Excel dosyası" value={batchId} onChange={setBatchId}
            options={batches.map((b) => ({
              value: b.id,
              label: `${b.fileName} (${b.pendingOemCount} OEM)`,
            }))} />

          <button type="button" onClick={() => void start()} disabled={!canStart}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-50"
            style={{ background: palette.accent, color: palette.textOnFill }}>
            <Play size={14} /> {busy ? 'Başlatılıyor…' : 'Taramayı başlat'}
          </button>
        </div>
      )}
    </Card>
  );
}

function Select({ label, value, onChange, options }: {
  label: string;
  value: number | '';
  onChange: (value: number | '') => void;
  options: { value: number; label: string }[];
}) {
  return (
    <label className="flex min-w-[12rem] flex-1 flex-col gap-1">
      <span className="text-xs font-medium" style={{ color: palette.textLabel }}>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        className="rounded-lg px-3 py-2 text-sm outline-none"
        style={{
          background: palette.inputBg,
          border: `1px solid ${palette.border}`,
          color: palette.text,
        }}
      >
        <option value="">Seçin…</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

function JobRow({ job, onResume, onCancel }: {
  job: CrawlJobDto;
  onResume: () => void;
  onCancel: () => void;
}) {
  const status = JOB_STATUS[job.status];
  const percent = job.totalCount === 0
    ? 0
    : Math.round((job.processedCount / job.totalCount) * 100);

  // Doğrulanmamış kuyruk: kanaryaların en son geçtiği andan sonraki sonuçlar.
  // Kullanıcı hangi kısmın güvenilir olduğunu bilmeli.
  const unverified = Math.max(0, job.processedCount - job.verifiedThroughSeq);
  const active = job.status === 'Queued' || job.status === 'Running';

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium" style={{ color: palette.textStrong }}>
              {job.siteName}
            </span>
            <Badge tone={status.tone}>{status.label}</Badge>
            <span className="text-xs" style={{ color: palette.textFaint }}>#{job.id}</span>
          </div>

          <div className="mt-2 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full"
              style={{ background: palette.chipBg }}>
              <div className="h-full rounded-full transition-[width]"
                style={{ width: `${percent}%`, background: palette.accent }} />
            </div>
            <span className="text-xs tabular-nums" style={{ color: palette.textMuted }}>
              {job.processedCount}/{job.totalCount}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs"
            style={{ color: palette.textFaint }}>
            <span>{job.itemsWritten} katalog kalemi</span>
            {unverified > 0 && (
              <span style={{ color: palette.warningText }}>
                {unverified} sonuç doğrulanmadı
              </span>
            )}
            <span>Başlangıç: {formatDateTime(job.startedAt)}</span>
            {job.adaptedRequestsPerHour !== null && (
              <span>Öğrenilen hız: saatte {job.adaptedRequestsPerHour}</span>
            )}
          </div>

          {job.errorMessage && (
            <div className="mt-2 text-xs" style={{ color: palette.danger }}>
              {job.errorMessage}
            </div>
          )}

          {job.status === 'AwaitingHuman' && (
            <div className="mt-2 text-xs" style={{ color: palette.warningText }}>
              Captcha çıktı. Operatör çözdükten sonra iş kaldığı yerden devam eder.
            </div>
          )}

          {job.status === 'Blocked' && (
            <div className="mt-2 text-xs" style={{ color: palette.textMuted }}>
              Site erişimi engelledi; soğuma süresi uygulandı. Tedarikçiyle IP
              muafiyeti konuşulabilir.
            </div>
          )}
        </div>

        <div className="flex gap-2">
          {job.status === 'AwaitingHuman' && (
            <button type="button" onClick={onResume}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium"
              style={{ background: palette.accent, color: palette.textOnFill }}>
              <Play size={13} /> Sürdür
            </button>
          )}

          {active && (
            <button type="button" onClick={onCancel}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs"
              style={{ border: `1px solid ${palette.border}`, color: palette.textMuted }}>
              <X size={13} /> İptal
            </button>
          )}

          {job.status === 'Blocked' && (
            <span className="inline-flex items-center gap-1.5 text-xs"
              style={{ color: palette.danger }}>
              <Ban size={13} /> Soğumada
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}
