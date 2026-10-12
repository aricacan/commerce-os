'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CircleCheck, CircleSlash, Play, TriangleAlert } from 'lucide-react';
import { monitoringApi, type HealthCheckResultDto } from '../../../lib/api/monitoring';
import { TestsTab } from './TestsTab';
import { HEALTH_CHECKS_KEY, useHealthChecks } from '../../../hooks/monitoring/useMonitoring';

// "Hangi kontrol çalışıyor, hangisi bozuk?" — Monitoring ekranının asıl sorusu.
// Kontroller burada çalıştırılmaz, arka plan işinin yazdığı son sonuç okunur; "Şimdi çalıştır"
// hepsini yeniden koşturur.
export function HealthChecksTab() {
  const qc = useQueryClient();

  const { data: checks = [], isLoading } = useHealthChecks();

  const run = useMutation({
    mutationFn: monitoringApi.runHealthChecks,
    onSuccess: (results) => qc.setQueryData(HEALTH_CHECKS_KEY, results),
  });

  // Hatalılar en üstte: ekranı açan kişi önce bozuk olanı görmeli.
  const groups = [...new Set(checks.map((c) => c.groupName))];
  const failingCount = checks.filter((c) => c.state === 'Failing').length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-[var(--fg-muted)]">
          {checks.length === 0
            ? 'Henüz kontrol çalışmadı.'
            : failingCount === 0
              ? `${checks.length} kontrolün tümü çalışıyor.`
              : `${failingCount} kontrol hatalı (${checks.length} kontrol içinde).`}
        </p>
        <button
          type="button"
          onClick={() => run.mutate()}
          disabled={run.isPending}
          className="flex items-center gap-1.5 rounded-[3px] border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-xs font-semibold text-[var(--fg)] hover:bg-[var(--bg-subtle)] disabled:opacity-60"
        >
          <Play className="h-3.5 w-3.5" />
          {run.isPending ? 'Çalışıyor…' : 'Şimdi Çalıştır'}
        </button>
      </div>

      {isLoading ? (
        <p className="p-8 text-center text-xs text-[var(--fg-muted)]">Yükleniyor…</p>
      ) : (
        groups.map((group) => (
          <section key={group} className="flex flex-col gap-2">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-[var(--fg-muted)]">{group}</h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {checks
                .filter((c) => c.groupName === group)
                .sort((a, b) => Number(b.state === 'Failing') - Number(a.state === 'Failing'))
                .map((check) => (
                  <HealthCheckCard key={check.key} check={check} />
                ))}
            </div>
          </section>
        ))
      )}

      {/* Test koşuları BURADA: ayrı bir "Testler" sekmesi tek bir olay türünü gösteriyordu
          ve aynı soruyu soruyordu — "çalışıyor mu". Sağlık kontrolleri anlık durumu,
          test koşuları ise son çalıştırmaların sonucunu söylüyor. */}
      <section className="flex flex-col gap-2 border-t border-[var(--border-soft)] pt-4">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-[var(--fg-muted)]">
          Test Koşuları
        </h3>
        <TestsTab />
      </section>
    </div>
  );
}

function HealthCheckCard({ check }: { check: HealthCheckResultDto }) {
  const tone =
    check.state === 'Failing'
      ? 'border-rose-500/40 bg-rose-500/5'
      : check.state === 'Passive'
        ? 'border-[var(--border)] bg-[var(--bg-subtle)]/40'
        : 'border-emerald-500/30 bg-emerald-500/5';

  const Icon = check.state === 'Failing' ? TriangleAlert : check.state === 'Passive' ? CircleSlash : CircleCheck;
  const iconTone =
    check.state === 'Failing'
      ? 'text-rose-500'
      : check.state === 'Passive'
        ? 'text-[var(--fg-muted)]'
        : 'text-emerald-500';

  return (
    <div className={`flex flex-col gap-1 rounded-[4px] border p-3 ${tone}`}>
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 shrink-0 ${iconTone}`} />
        <span className="truncate text-xs font-semibold text-[var(--fg)]">{check.name}</span>
      </div>
      {check.message ? (
        <p className="line-clamp-2 text-[11px] text-[var(--fg-muted)]">{check.message}</p>
      ) : null}
      <p className="text-[10.5px] text-[var(--fg-muted)]">
        {new Date(check.lastRunUtc).toLocaleString('tr-TR')}
        {check.consecutiveFailures > 1 ? ` · ${check.consecutiveFailures} turdur hatalı` : ''}
      </p>
    </div>
  );
}
