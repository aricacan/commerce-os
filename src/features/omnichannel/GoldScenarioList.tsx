'use client';

import { useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { FilterSelect, type FilterSelectOption } from '../../components/ui/FilterSelect';
import type { GoldScenarioDto } from '../../lib/api/omnichannel-gold';
import { describeError } from '../../lib/errors';
import { useFeedback } from '../shared/Feedback';
import {
  ALL_FILTER, distinctCountries, filterGoldScenarios, GOLD_LANGUAGE_LABELS, goldLanguageLabel, goldScenarioSummary,
} from './goldSetRules';

interface Props {
  scenarios: readonly GoldScenarioDto[];
  onToggle: (scenario: GoldScenarioDto) => Promise<void>;
  onDelete: (scenario: GoldScenarioDto) => Promise<void>;
}

const LANGUAGE_OPTIONS: FilterSelectOption[] = Object.entries(GOLD_LANGUAGE_LABELS)
  .map(([value, label]) => ({ value, label }));

const badgeClass = 'rounded bg-bg-subtle px-1.5 py-0.5 text-[10.5px] font-semibold text-fg-muted';

// Altın senaryo listesi: dil/ülke rozeti, aktif anahtarı, silme. Dil ve ülkeye göre süzülür (P35).
export function GoldScenarioList({ scenarios, onToggle, onDelete }: Props) {
  const [language, setLanguage] = useState(ALL_FILTER);
  const [country, setCountry] = useState(ALL_FILTER);
  const { notify, confirm } = useFeedback();

  const countryOptions = useMemo<FilterSelectOption[]>(
    () => distinctCountries(scenarios).map((code) => ({ value: code, label: code })), [scenarios]);
  const visible = useMemo(() => filterGoldScenarios(scenarios, { language, country }), [scenarios, language, country]);

  const guarded = async (action: () => Promise<void>) => {
    try { await action(); } catch (e) { notify.error(describeError(e)); }
  };

  const handleDelete = async (scenario: GoldScenarioDto) => {
    const ok = await confirm({
      title: 'Senaryo silinsin mi?', body: scenario.title, confirmLabel: 'Sil', danger: true,
    });
    if (ok) await guarded(() => onDelete(scenario));
  };

  return (
    <section className="flex min-w-0 flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="m-0 text-ui-sm font-bold text-fg">Senaryolar</h3>
        <div className="flex flex-wrap items-center gap-2">
          <FilterSelect value={language} options={LANGUAGE_OPTIONS} placeholder="Tüm diller" onChange={setLanguage} minWidth={130} ariaLabel="Dile göre süz" />
          <FilterSelect value={country} options={countryOptions} placeholder="Tüm ülkeler" onChange={setCountry} minWidth={130} ariaLabel="Ülkeye göre süz" />
        </div>
      </div>
      <p className="m-0 text-ui-xs text-fg-muted">{goldScenarioSummary(scenarios)}</p>

      {visible.length > 0 && (
        <ul className="m-0 flex list-none flex-col divide-y divide-border-soft rounded-lg border border-border-soft bg-card p-0">
          {visible.map((scenario) => (
            <li key={scenario.id} className="flex items-start justify-between gap-3 px-3 py-2">
              <div className="flex min-w-0 flex-col gap-1">
                <span className="truncate text-ui-sm font-semibold text-fg">{scenario.title}</span>
                <span className="line-clamp-2 text-ui-xs text-fg-muted">{scenario.referenceReply}</span>
                <span className="flex flex-wrap gap-1">
                  <span className={badgeClass}>{goldLanguageLabel(scenario.language)}</span>
                  <span className={badgeClass}>{scenario.countryCode}</span>
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button" role="switch" aria-checked={scenario.isActive}
                  onClick={() => void guarded(() => onToggle(scenario))}
                  title={scenario.isActive ? 'Koşuya dahil — pasifleştir' : 'Koşuya dahil değil — aktifleştir'}
                  className={`min-h-7 cursor-pointer rounded px-2 text-ui-xs font-semibold ${
                    scenario.isActive ? 'bg-success-soft text-success' : 'bg-bg-subtle text-fg-muted'
                  }`}
                >
                  {scenario.isActive ? 'Aktif' : 'Pasif'}
                </button>
                <button
                  type="button" title="Sil" aria-label="Senaryoyu sil" onClick={() => void handleDelete(scenario)}
                  className="flex h-7 w-7 cursor-pointer items-center justify-center rounded text-fg-muted hover:bg-bg-subtle hover:text-danger"
                >
                  <Trash2 size={14} aria-hidden />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
