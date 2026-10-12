'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ListChecks, Play } from 'lucide-react';
import { GoldCandidatesSection } from './GoldCandidatesSection';
import { GoldRunDetail } from './GoldRunDetail';
import { GoldRunsTable } from './GoldRunsTable';
import { GoldScenarioList } from './GoldScenarioList';
import { formatGoldScore, GOLD_GATE_THRESHOLD, goldProgressLabel } from './goldSetRules';
import { primaryButtonClass } from './formClasses';
import { useGoldRunner } from './useGoldRunner';
import { useGoldSet } from './useGoldSet';

// Kalite Merkezi › Senaryolar (P35, eski Altın Set): temsilcinin onayladığı gerçek cevaplardan senaryolar; her deploy
// öncesi Test Alanı'ndan geçirilip yargıç puanıyla önceki koşuya kıyaslanır (deploy kapısı).
export function GoldScenarioPanel() {
  const { scenarios, runs, loading, error, reload, toggleActive, remove } = useGoldSet();
  const runner = useGoldRunner(reload);
  const requestedRun = Number(useSearchParams().get('run'));
  const [selectedRunId, setSelectedRunId] = useState<number | null>(Number.isInteger(requestedRun) && requestedRun > 0 ? requestedRun : null);

  const activeCount = scenarios.filter((s) => s.isActive).length;

  return (
    <section className="flex min-w-0 flex-col gap-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex items-center gap-2">
            <ListChecks size={14} className="text-fg-muted" aria-hidden />
            <h3 className="m-0 text-ui-sm font-bold text-fg">Senaryolar ve deploy kapısı</h3>
          </div>
          <p className="m-0 text-ui-xs text-fg-muted">
            Ortalama puan önceki koşudan {formatGoldScore(GOLD_GATE_THRESHOLD)} puandan fazla düşerse deploy kapısı kapanır.
            Yargıcı cevap vermeyen senaryo ortalamaya girmez. Koşu, sizin Test Alanı konuşmanızı sıfırlar.
          </p>
        </div>
        <button
          type="button" onClick={() => void runner.run()} disabled={runner.running || loading || activeCount === 0}
          className={primaryButtonClass}
        >
          <Play size={13} aria-hidden /> {runner.running ? 'Koşuyor…' : 'Şimdi koştur'}
        </button>
      </header>

      {runner.progress && <RunProgress done={runner.progress.done} total={runner.progress.total} />}
      {error && <p className="m-0 text-ui-xs text-danger">{error}</p>}
      {loading && <p className="m-0 text-ui-xs text-fg-muted">Yükleniyor…</p>}

      {!loading && (
        <>
          <section className="flex min-w-0 flex-col gap-2">
            <h4 className="m-0 text-ui-sm font-bold text-fg">Son senaryo koşuları</h4>
            <GoldRunsTable runs={runs} selectedRunId={selectedRunId} onSelect={setSelectedRunId} />
          </section>

          {selectedRunId !== null && (
            <section className="flex min-w-0 flex-col gap-2">
              <h4 className="m-0 text-ui-sm font-bold text-fg">Koşu ayrıntısı</h4>
              <GoldRunDetail key={selectedRunId} runId={selectedRunId} />
            </section>
          )}

          <GoldCandidatesSection onAdded={reload} />

          <GoldScenarioList scenarios={scenarios} onToggle={toggleActive} onDelete={remove} />
        </>
      )}
    </section>
  );
}

function RunProgress({ done, total }: { done: number; total: number }) {
  return (
    <div className="flex flex-col gap-1" role="status">
      <progress
        value={done} max={Math.max(total, 1)}
        className="h-1.5 w-full overflow-hidden rounded-full bg-bg-subtle [&::-moz-progress-bar]:bg-fg [&::-webkit-progress-bar]:bg-bg-subtle [&::-webkit-progress-value]:bg-fg"
      />
      <span className="text-ui-xs text-fg-muted">{goldProgressLabel({ done, total })}</span>
    </div>
  );
}
