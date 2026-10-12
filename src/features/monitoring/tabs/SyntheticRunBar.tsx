'use client';

import { Play, TriangleAlert } from 'lucide-react';
import type { SyntheticOverviewDto } from '../../../lib/api';
import { useRunSyntheticChecks } from '../../../hooks/monitoring/useSyntheticChecks';
import { formatRelative } from '../format';
import { isRunnableLayer, LAYER_LABELS, LAYER_ORDER, lastRunFor, layerSettingKey } from '../synthetic';
import { Panel, Pill, useNow } from '../ui';

// Katmanların son turu ve elle "Şimdi çalıştır". Tarayıcı katmanı GitHub'dan koşar: yalnız
// son turu görünür. Mesai saatindeyse elle çalıştırma serbest ama uyarı gösterilir.
export function SyntheticRunBar({ overview }: { overview: SyntheticOverviewDto }) {
  const now = useNow();
  const run = useRunSyntheticChecks();
  const { settings } = overview;

  return (
    <Panel title="Katmanlar">
      {overview.inQuietHours ? (
        <p className="flex items-start gap-2 border-b border-[var(--border-soft)] bg-[rgba(var(--warning-rgb),0.08)] px-4 py-2 text-ui-2xs text-[var(--warning)]">
          <TriangleAlert size={13} className="mt-px shrink-0" />
          <span className="min-w-0 break-words">
            Şu an mesai saati: zamanlanmış kontroller çalışmıyor. Elle çalıştırma yapılabilir ama canlı
            sisteme kullanıcılarla aynı anda yük bindirir.
          </span>
        </p>
      ) : null}
      <ul className="divide-y divide-[var(--border-soft)]">
        {LAYER_ORDER.map((layer) => {
          const lastRun = lastRunFor(overview.lastRuns, layer);
          const runnable = isRunnableLayer(layer) ? layer : null;
          const enabled = runnable ? settings.enabled && settings[layerSettingKey(runnable)] : true;
          const note = lastRun
            ? `${lastRun.skipReason ? `Atlandı: ${lastRun.skipReason}` : 'Son tur'} · ${formatRelative(lastRun.startedAt, now)}`
            : 'Henüz tur yok';
          return (
            <li key={layer} className="flex min-w-0 flex-wrap items-center gap-2 px-4 py-2.5">
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-semibold text-[var(--fg)]">{LAYER_LABELS[layer]}</span>
                <span className={`block truncate text-ui-2xs ${lastRun?.skipReason ? 'text-[var(--warning)]' : 'text-[var(--fg-muted)]'}`}>
                  {runnable ? note : `${note} · GitHub Actions (gece)`}
                </span>
              </span>
              {!enabled ? <Pill tone="muted">Kapalı</Pill> : null}
              {runnable ? (
                <button
                  type="button"
                  onClick={() => run.mutate({ layer: runnable })}
                  disabled={run.isPending}
                  title={overview.inQuietHours ? 'Mesai saati — elle çalıştırma sisteme yük bindirir' : 'Şimdi çalıştır'}
                  className="flex shrink-0 items-center gap-1.5 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-2.5 py-1 text-ui-2xs font-semibold text-[var(--fg)] hover:bg-[var(--bg-subtle)] disabled:opacity-60"
                >
                  {overview.inQuietHours ? <TriangleAlert size={11} className="text-[var(--warning)]" /> : <Play size={11} />}
                  Şimdi çalıştır
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
