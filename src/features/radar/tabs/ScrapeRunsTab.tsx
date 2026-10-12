'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, Activity } from 'lucide-react';
import { radarApi } from '../../../lib/api';
import { useAuthStore } from '../../../stores/auth';
import { useRadarScrapeRuns } from '../../../hooks/radar/useRadarScrapeRuns';
import { useRadarSicCodes } from '../../../hooks/radar/useRadarSicCodes';
import { ADMIN_ROLES, fmt } from '../shared';
import { useFeedback } from '../../shared/Feedback';
import { formatDateTime } from '../../../lib/format';
import { FilterSelect } from '../../../components/ui/FilterSelect';

function fmtDateTime(iso: string): string {
  return formatDateTime(iso, 'tr', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function fmtDuration(startedAt: string, completedAt?: string | null): string {
  const end = completedAt ? new Date(completedAt) : new Date();
  const ms = end.getTime() - new Date(startedAt).getTime();
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes} dk ${seconds} sn` : `${seconds} sn`;
}

export function ScrapeRunsTab() {
  const { data: runs, isLoading, isError } = useRadarScrapeRuns(20);
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isAdmin = ADMIN_ROLES.some((r) => user?.roles?.includes(r));
  const { notify } = useFeedback();
  const [fullRescan, setFullRescan] = useState(false);
  const [sicCode, setSicCode] = useState('');
  const { data: sicCodes } = useRadarSicCodes(true);

  const triggerMut = useMutation({
    mutationFn: () => radarApi.scraper.trigger(fullRescan, sicCode || undefined),
    onSuccess: (res) => {
      notify.success(res.message);
      qc.invalidateQueries({ queryKey: ['radar-scrape-runs'] });
      qc.invalidateQueries({ queryKey: ['radar-stats'] });
    },
    onError: (err: Error) => notify.error(err.message),
  });

  const runningCount = runs?.filter((r) => r.status === 'Running').length ?? 0;

  const sicOptions = [
    { value: '', label: 'Tüm SIC Kodları' },
    ...(sicCodes ?? []).map((c) => ({
      value: c.code,
      label: `${c.code}${c.label ? ` — ${c.label}` : ''}`,
    })),
  ];

  return (
    <div className="w-full flex-1 p-4 sm:p-5 flex flex-col gap-4 text-xs">
      {/* Header & Trigger Controls */}
      <div data-tour="radar-scraperuns-header" className="flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <Activity size={16} className="text-[var(--fg-muted)]" />
            <h2 className="text-sm font-bold text-[var(--fg)]">Veri Çekme & Scraping Takibi</h2>
          </div>
          <p className="text-[11px] text-[var(--fg-muted)] mt-0.5">
            Otomatik veya tetiklenen B2B şirket keşif ve zenginleştirme koşuları.
            {runningCount > 0 && <span className="text-[var(--fg)] font-bold"> • {runningCount} görev şu anda çalışıyor.</span>}
          </p>
        </div>

        {isAdmin && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-48">
              <FilterSelect
                value={sicCode}
                onChange={setSicCode}
                placeholder="SIC Kodu Filtrele"
                height="h-8"
                options={sicOptions}
              />
            </div>

            <label className="flex items-center gap-1.5 px-2 text-xs font-semibold text-[var(--fg)] cursor-pointer">
              <input
                type="checkbox"
                checked={fullRescan}
                onChange={(e) => setFullRescan(e.target.checked)}
                className="h-4 w-4 rounded-[3px]"
              />
              <span>Tam Tarama</span>
            </label>

            <button
              type="button"
              onClick={() => triggerMut.mutate()}
              disabled={triggerMut.isPending}
              className="inline-flex h-8 items-center gap-1.5 rounded-[4px] bg-[var(--fg)] px-3 text-xs font-bold text-[var(--bg)] shadow-xs hover:opacity-90 transition cursor-pointer disabled:opacity-40"
            >
              <RefreshCw size={12} className={triggerMut.isPending ? 'animate-spin' : ''} />
              <span>{triggerMut.isPending ? 'Başlatılıyor...' : 'Şirketleri Çek'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Scrape Runs Table */}
      <div data-tour="radar-scraperuns-table" className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] shadow-xs flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="grid grid-cols-12 gap-2 border-b border-[var(--border-soft)] bg-[var(--bg-subtle)]/40 p-3 font-mono text-[10.5px] font-bold text-[var(--fg-muted)] uppercase tracking-wider shrink-0">
          <div className="col-span-2">Durum</div>
          <div className="col-span-2">Süre</div>
          <div className="col-span-2">Bulunan</div>
          <div className="col-span-2">Kaydedilen</div>
          <div className="col-span-2">E-posta</div>
          <div className="col-span-2 text-right">Başlangıç</div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-[var(--border-soft)]">
          {isLoading && <div className="p-8 text-center text-xs text-[var(--fg-muted)]">Koşular yükleniyor...</div>}
          {isError && <div className="p-8 text-center text-xs text-rose-500">Koşu geçmişi yüklenemedi.</div>}
          {!isLoading && !isError && (!runs || runs.length === 0) && (
            <div className="p-8 text-center text-xs text-[var(--fg-muted)]">Henüz veri çekme koşusu kaydedilmedi.</div>
          )}

          {runs?.map((run) => {
            const isRunning = run.status === 'Running';
            const isFailed = run.status === 'Failed';
            return (
              <div key={run.id} className="p-3 hover:bg-[var(--bg-subtle)]/30 transition text-xs">
                <div className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-2 flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${
                      isRunning ? 'bg-amber-500 animate-pulse' : isFailed ? 'bg-rose-500' : 'bg-emerald-500'
                    }`} />
                    <span className="font-bold text-[var(--fg)]">{run.status}</span>
                  </div>

                  <div className="col-span-2 font-mono text-[11px] text-[var(--fg-muted)]">
                    {fmtDuration(run.startedAt, run.completedAt)}
                  </div>

                  <div className="col-span-2 font-mono text-[11px] text-[var(--fg)]">
                    <span className="font-bold">{fmt(run.companiesFound)}</span> şirket
                  </div>

                  <div className="col-span-2 font-mono text-[11px] text-[var(--fg)]">
                    <span className="font-bold">{fmt(run.companiesUpserted)}</span> kayıt
                  </div>

                  <div className="col-span-2 font-mono text-[11px] text-[var(--fg)]">
                    <span className="font-bold">{fmt(run.emailsFound)}</span> e-posta
                  </div>

                  <div className="col-span-2 font-mono text-[10.5px] text-[var(--fg-muted)] text-right">
                    {fmtDateTime(run.startedAt)}
                  </div>
                </div>

                {isFailed && run.errorMessage && (
                  <div className="mt-2 p-2 rounded-[3px] bg-rose-500/10 border border-rose-500/20 text-rose-500 font-mono text-[10.5px]">
                    {run.errorMessage}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
