'use client';

import { useEffect, useState } from 'react';
import { Layers } from 'lucide-react';
import {
  botPipelinesApi, type BotSkillDto, type BotSkillModelTier, type BotSkillsDto,
} from '../../lib/api/omnichannel-pipelines';
import { describeError } from '../../lib/errors';
import { useFeedback } from '../shared/Feedback';
import { intentLabel, tierOptions, type TierOption } from './botSkillRules';
import { isServerUpdatePending } from './botTraceRules';
import { formInputClass, labelClass } from './formClasses';
import { useIsOmnichannelAdmin } from './useIsOmnichannelAdmin';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'hidden' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; data: BotSkillsDto };

// Kanal Merkezi › Bot › Beceriler (FAZ 4.3): v4 ajanının beceri paketleri, her birinin araçları ve model seviyesi.
// Ayar hesap genelidir (tüm kanallar). Sunucu bu ucu henüz tanımıyorsa (eski backend) kart hiç görünmez.
export function BotSkillsCard() {
  const isAdmin = useIsOmnichannelAdmin();
  const { notify } = useFeedback();
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    botPipelinesApi.getSkills()
      .then((data) => { if (!cancelled) setState(data.skills.length > 0 ? { kind: 'ready', data } : { kind: 'hidden' }); })
      .catch((e: unknown) => {
        if (cancelled) return;
        setState(isServerUpdatePending(e) ? { kind: 'hidden' } : { kind: 'error', message: describeError(e) });
      });
    return () => { cancelled = true; };
  }, []);

  const changeTier = async (skill: BotSkillDto, tier: BotSkillModelTier) => {
    setSavingKey(skill.key);
    try {
      setState({ kind: 'ready', data: await botPipelinesApi.saveSkillModel(skill.key, tier) });
      notify.success(`${skill.name} modeli kaydedildi — 30 sn içinde yansır.`);
    } catch (e) {
      notify.error(describeError(e));
    } finally {
      setSavingKey(null);
    }
  };

  if (state.kind === 'hidden') return null;

  return (
    <section aria-label="Beceriler" className="flex min-w-0 flex-col gap-3 rounded-xl border border-[var(--border-soft)] bg-[var(--card)] p-3.5 shadow-xs">
      <div className="flex items-start gap-2">
        <Layers size={14} className="mt-0.5 shrink-0 text-fg-muted" aria-hidden />
        <div className="flex min-w-0 flex-col gap-0.5">
          <h3 className="m-0 text-xs font-bold text-fg">Beceriler (v4)</h3>
          <p className="m-0 text-[10.5px] text-fg-muted">
            Bot müşterinin niyetine göre bir beceri seçer ve yalnız onun araçlarını kullanır. Niyet belirsizse bütün
            araçlarla çalışır. Ayar hesap genelidir.
          </p>
        </div>
      </div>
      {state.kind === 'loading' && <p className="m-0 text-ui-xs text-fg-muted">Yükleniyor…</p>}
      {state.kind === 'error' && <p role="alert" className="m-0 text-ui-xs text-danger">{state.message}</p>}
      {state.kind === 'ready' && (
        <>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {state.data.skills.map((skill) => (
              <SkillRow
                key={skill.key} skill={skill} options={tierOptions(state.data)} editable={isAdmin}
                saving={savingKey === skill.key} onTierChange={(tier) => void changeTier(skill, tier)}
              />
            ))}
          </ul>
          {state.data.commonTools.length > 0 && (
            <p className="m-0 break-words text-[10.5px] text-fg-muted">
              Her becerideki ortak araçlar: {state.data.commonTools.join(', ')}
            </p>
          )}
        </>
      )}
    </section>
  );
}

interface RowProps {
  skill: BotSkillDto;
  options: TierOption[];
  editable: boolean;
  saving: boolean;
  onTierChange: (tier: BotSkillModelTier) => void;
}

function SkillRow({ skill, options, editable, saving, onTierChange }: RowProps) {
  return (
    <li className="flex min-w-0 flex-col gap-2 rounded-lg border border-[var(--border-soft)] p-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-xs font-bold text-fg">{skill.name}</span>
        {skill.description && <span className="text-[11px] text-fg-muted">{skill.description}</span>}
        <span className="text-[10.5px] text-fg-muted">Niyet: {skill.intents.map(intentLabel).join(', ') || '—'}</span>
        <div className="flex flex-wrap gap-1">
          {skill.tools.map((tool) => (
            <code key={tool} className="rounded-[4px] bg-bg-subtle px-1.5 py-0.5 text-[10.5px] text-fg">{tool}</code>
          ))}
        </div>
      </div>
      <label className="flex w-full shrink-0 flex-col sm:w-52">
        <span className={labelClass}>Model</span>
        <select
          value={skill.modelTier}
          disabled={!editable || saving}
          onChange={(e) => {
            const picked = options.find((option) => option.value === e.target.value);
            if (picked) onTierChange(picked.value);
          }}
          className={formInputClass}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>{option.label}</option>
          ))}
        </select>
      </label>
    </li>
  );
}
