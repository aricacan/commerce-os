'use client';

import { TriangleAlert } from 'lucide-react';
import type { SyntheticOverviewDto } from '../../../lib/api';
import { useUpdateSyntheticSettings } from '../../../hooks/monitoring/useSyntheticChecks';
import { formatRelative } from '../format';
import { LAYER_LABELS, layerSettingKey, type SyntheticSwitchKey } from '../synthetic';
import { Panel, useNow } from '../ui';
import { SyntheticToggle } from './SyntheticToggle';

const LAYER_TOGGLES = (['pages', 'workflows', 'modules'] as const).map((layer) => ({
  key: layerSettingKey(layer),
  label: LAYER_LABELS[layer],
}));

// Sekmenin başı: kaçı geçti, en son ne zaman koştu, bot hazır mı ve hangi katman açık.
export function SyntheticSummary({ overview }: { overview: SyntheticOverviewDto }) {
  const now = useNow();
  const update = useUpdateSyntheticSettings();
  const { settings } = overview;

  const change = (key: SyntheticSwitchKey, value: boolean) => update.mutate({ ...settings, [key]: value });

  return (
    <Panel>
      <div className="flex min-w-0 flex-col gap-3 p-4">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className={`text-ui-2xl font-bold tracking-tight ${overview.passed < overview.total ? 'text-[var(--danger)]' : 'text-[var(--fg)]'}`}>
            {overview.passed}/{overview.total} geçti
          </span>
          <span className="text-xs text-[var(--fg-muted)]">
            Son çalışma: {overview.lastRunAt ? formatRelative(overview.lastRunAt, now) : 'henüz yok'}
          </span>
        </div>

        {!overview.botReady ? (
          <p className="flex items-start gap-2 rounded-[4px] border border-[rgba(var(--warning-rgb),0.3)] bg-[rgba(var(--warning-rgb),0.08)] px-3 py-2 text-xs text-[var(--warning)]">
            <TriangleAlert size={14} className="mt-px shrink-0" />
            <span className="min-w-0 break-words">
              Bot hesabı hazır değil — kontroller giriş yapamadığı için koşamıyor. Sunucu ayarlarını kontrol edin.
            </span>
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <SyntheticToggle label="Kontroller açık" checked={settings.enabled} onChange={(value) => change('enabled', value)} />
          {LAYER_TOGGLES.map((toggle) => (
            <SyntheticToggle
              key={toggle.key}
              label={toggle.label}
              checked={settings[toggle.key]}
              disabled={!settings.enabled}
              onChange={(value) => change(toggle.key, value)}
            />
          ))}
        </div>
      </div>
    </Panel>
  );
}
