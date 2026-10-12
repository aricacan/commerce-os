'use client';

import { useState } from 'react';
import { Info } from 'lucide-react';
import { featureFlagsApi } from '../../lib/api/omnichannel-flags';
import type { ChannelEffectiveSettingsDto, ChannelFlagDto } from '../../lib/api/omnichannel-channel-settings';
import { describeError } from '../../lib/errors';
import { useFeedback } from '../shared/Feedback';
import {
  flagCellMode, flagSourceText, FLAG_SCOPE_LABELS, ownFlagScope, sharedScopeWarning,
} from './channelScopeRules';
import { BotSkillsCard } from './BotSkillsCard';
import { ChannelBotOverrides } from './ChannelBotOverrides';
import { FeatureFlagCell } from './FeatureFlagCell';
import { FLAG_TEXTS, valueText, type CellMode } from './featureFlagMatrix';
import { ScopeBadge } from './ScopeBadge';
import { SettingsLink } from './SettingsLink';

interface Props {
  settings: ChannelEffectiveSettingsDto;
  onChanged: () => Promise<void>;
}

// Kanal Merkezi › Bot: sekiz özellik bayrağının bu kanaldaki etkin değeri, değerin kaynağı ve kanalın
// marka + ülkesi için geçersiz kılma; altında eşik, menü ve metinlerin kanala özel geçersiz kılınması. Bu sekme
// botla ilgili her kanal ayarının tek düzenleme yeridir (Hesap geneli yalnız varsayılanı ve toplu görünümü taşır).
export function ChannelCenterBot({ settings, onChanged }: Props) {
  const [busyFlag, setBusyFlag] = useState<string | null>(null);
  const { notify, confirm } = useFeedback();
  const own = ownFlagScope(settings);
  const warning = sharedScopeWarning(settings.flags.otherChannelsInScope);

  const change = async (flag: ChannelFlagDto, mode: CellMode) => {
    if (warning) {
      const ok = await confirm({
        title: `${FLAG_TEXTS[flag.flag].label} değişsin mi?`,
        body: warning,
        confirmLabel: 'Değiştir',
      });
      if (!ok) return;
    }
    setBusyFlag(flag.flag);
    try {
      if (mode === 'inherit') {
        if (flag.overrideId !== null) await featureFlagsApi.remove(flag.overrideId);
      } else {
        await featureFlagsApi.save({ flag: flag.flag, brandId: settings.brandId, country: settings.country, enabled: mode === 'on' });
      }
      notify.success(`${FLAG_TEXTS[flag.flag].label} güncellendi.`);
      await onChanged();
    } catch (e) {
      notify.error(describeError(e));
    } finally {
      setBusyFlag(null);
    }
  };

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <SettingsLink target={{ tab: 'account', sub: 'thresholds' }}>Hesap geneli varsayılanlar</SettingsLink>
      <p className="m-0 flex items-start gap-1.5 text-[11px] text-[var(--fg-muted)]">
        <Info size={12} className="mt-px shrink-0" aria-hidden />
        <span>
          Değer bu kanalın markası ve ülkesi için aranır: Marka + ülke &gt; Marka &gt; Ülke &gt; Genel. Aşağıdaki
          seçim yalnızca bu kanalın marka/ülke kapsamına yazılır. Eşik, menü ve metinler önce kanalın kendi değerine,
          yoksa hesap geneli varsayılana bakar.
        </span>
      </p>
      {own === null && (
        <p className="m-0 rounded-lg border border-amber-500/40 bg-amber-500/10 p-2.5 text-[11px] text-[var(--fg)]">
          Bu kanala marka ya da ülke atanmamış; yalnızca Genel ayar geçerli. Geçersiz kılmak için Genel sekmesinden marka/ülke seçin.
        </p>
      )}
      {warning && <p className="m-0 text-[11px] text-[var(--fg-muted)]">{warning}</p>}

      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {settings.flags.items.map((flag) => (
          <li
            key={flag.flag}
            className="flex min-w-0 flex-col gap-2 rounded-xl border border-[var(--border-soft)] bg-[var(--card)] p-3.5 shadow-xs sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="m-0 text-xs font-bold text-[var(--fg)]">{FLAG_TEXTS[flag.flag].label}</h3>
                <ScopeBadge label={`${FLAG_SCOPE_LABELS[flag.scope]}: ${valueText(flag.value)}`} tone={flag.value ? 'success' : 'neutral'} />
              </div>
              <p className="m-0 mt-0.5 break-words text-[11px] text-[var(--fg-muted)]">{FLAG_TEXTS[flag.flag].hint}</p>
              <p className="m-0 mt-0.5 text-[10.5px] text-[var(--fg-muted)]">{flagSourceText(flag)}</p>
            </div>
            {flag.overridable && own !== null && (
              <FeatureFlagCell
                mode={flagCellMode(flag, own)}
                effective={flag.value}
                busy={busyFlag === flag.flag}
                inheritLabel="Devral"
                onChange={(mode) => void change(flag, mode)}
              />
            )}
          </li>
        ))}
      </ul>

      <ChannelBotOverrides channelId={settings.channelId} onChanged={onChanged} />
      <BotSkillsCard />
    </div>
  );
}
