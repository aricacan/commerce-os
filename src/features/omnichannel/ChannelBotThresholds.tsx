'use client';

import { channelBotOverrideApi, type ChannelBotVersions, type ChannelThresholdsDto } from '../../lib/api/omnichannel-channel-bot';
import { customThresholdCount, THRESHOLD_FIELDS, withThreshold } from './channelBotRules';
import { ChannelBotSection } from './ChannelBotSection';
import { ThresholdRow } from './ThresholdRow';
import type { useChannelBotOverride } from './useChannelBotOverride';

interface Props {
  channelId: number;
  thresholds: ChannelThresholdsDto;
  // Eşik kaydı kanalın sürüm seçimini de taşır (aynı gövde); eski backend'de null.
  versions: ChannelBotVersions | null;
  busy: boolean;
  write: ReturnType<typeof useChannelBotOverride>['write'];
}

// Kanal Merkezi › Bot › Eşikler: her eşik hesap geneli değeri izler; “Özelleştir” ile yalnız bu kanal için değişir.
export function ChannelBotThresholds({ channelId, thresholds, versions, busy, write }: Props) {
  const customCount = customThresholdCount(thresholds.overrides);

  return (
    <ChannelBotSection
      title="Eşikler"
      description="Botun ne zaman doğrudan cevaplayacağı, ne zaman temsilciye devredeceği. Mesai saatleri tüm hesap için ortaktır."
      custom={customCount > 0}
      customLabel={`${customCount} eşik kanala özel`}
    >
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {THRESHOLD_FIELDS.map((field) => (
          <ThresholdRow
            key={field.key}
            field={field}
            account={thresholds.account}
            effective={thresholds.effective}
            override={thresholds.overrides[field.key]}
            busy={busy}
            onSave={(value) => write(
              () => channelBotOverrideApi.saveThresholds(channelId, withThreshold(thresholds.overrides, field.key, value), versions),
              value === null ? `${field.label} hesap genelini izliyor.` : `${field.label} bu kanala özel olarak kaydedildi.`,
            )}
          />
        ))}
      </ul>
    </ChannelBotSection>
  );
}
