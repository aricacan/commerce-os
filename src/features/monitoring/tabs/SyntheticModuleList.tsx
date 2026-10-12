'use client';

import { ChevronDown } from 'lucide-react';
import { useRunSyntheticChecks } from '../../../hooks/monitoring/useSyntheticChecks';
import { rowLabel, type ModuleGroup } from '../synthetic-groups';
import { Pill, useNow } from '../ui';
import { SyntheticCheckRow } from './SyntheticCheckRow';

export interface HistoryTarget {
  key: string;
  label: string;
}

// Sonuçlar modül → iç sekme olarak: "Radar ▸ Şirketler: sayfa verisi · tarayıcı · senaryo".
// Bozuk kontrolü olan modül açık gelir; sağlamlar kapalı (ekran kalabalıklaşmasın).
export function SyntheticModuleList({ groups, onOpen }: {
  groups: ModuleGroup[];
  onOpen: (target: HistoryTarget) => void;
}) {
  if (groups.length === 0) {
    return <p className="px-1 py-3 text-xs text-[var(--fg-muted)]">Süzgece uyan kontrol yok.</p>;
  }
  return (
    <div className="flex min-w-0 flex-col gap-2">
      {groups.map((group) => <ModuleSection key={group.key} group={group} onOpen={onOpen} />)}
    </div>
  );
}

function ModuleSection({ group, onOpen }: { group: ModuleGroup; onOpen: (target: HistoryTarget) => void }) {
  const now = useNow();
  const run = useRunSyntheticChecks();

  return (
    <details
      open={group.failedCount > 0}
      className="group min-w-0 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)]"
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-2.5">
        <ChevronDown size={13} className="shrink-0 -rotate-90 text-[var(--fg-muted)] transition-transform group-open:rotate-0" />
        <span className="min-w-0 flex-1 truncate text-xs font-bold text-[var(--fg)]">{group.label}</span>
        {group.failedCount > 0 ? <Pill tone="danger">{group.failedCount} kaldı</Pill> : <Pill tone="success">Sağlam</Pill>}
        <span className="shrink-0 text-ui-2xs text-[var(--fg-muted)]">{group.total} kontrol</span>
      </summary>
      <div className="flex min-w-0 flex-col border-t border-[var(--border-soft)]">
        {group.tabs.map((tab) => (
          <div key={tab.key} className="min-w-0 border-b border-[var(--border-soft)] last:border-b-0">
            <h4 className="bg-[var(--bg-subtle)] px-4 py-1.5 text-ui-2xs font-semibold uppercase tracking-wider text-[var(--fg-muted)]">
              {tab.label}
            </h4>
            <ul className="divide-y divide-[var(--border-soft)]">
              {tab.checks.map((check) => {
                const label = rowLabel(check);
                return (
                  <SyntheticCheckRow
                    key={check.key}
                    check={check}
                    label={label}
                    now={now}
                    isRunning={run.isPending && run.variables?.key === check.key}
                    onOpen={() => onOpen({ key: check.key, label: `${group.label} › ${tab.label} — ${label}` })}
                    onRun={() => run.mutate({ key: check.key })}
                  />
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </details>
  );
}
