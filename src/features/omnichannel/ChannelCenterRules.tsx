'use client';

import type { ChannelEffectiveSettingsDto } from '../../lib/api/omnichannel-channel-settings';
import { CrossSellTab } from './CrossSellTab';
import { HandoffRoutesTab } from './HandoffRoutesTab';
import type { ChannelRuleScope } from './ruleScope';

interface Props {
  settings: ChannelEffectiveSettingsDto;
  onChanged: () => Promise<void>;
}

const sectionClass = 'flex min-w-0 flex-col gap-2 rounded-xl border border-[var(--border-soft)] bg-[var(--card)] p-4 shadow-xs';

// Kanal Merkezi › Kurallar: bu kanala uyan çapraz satış ve devir/sipariş bildirim kuralları. Oluşturma ve düzenleme
// Hesap geneli'ndekiyle AYNI bileşenlerdir (tek kod); burada yalnız bu kanala uyanlar görünür, yeni kural kanalın
// markası/ülkesiyle başlar.
export function ChannelCenterRules({ settings, onChanged }: Props) {
  const { rules, brandId, country } = settings;
  const crossSellScope: ChannelRuleScope = {
    brandId, country, onChanged, visibleIds: new Set(rules.crossSell.map((rule) => rule.id)),
  };
  const handoffScope: ChannelRuleScope = {
    brandId, country, onChanged, visibleIds: new Set(rules.handoff.map((rule) => rule.id)),
  };

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <section className={sectionClass}>
        <CrossSellTab scope={crossSellScope} />
      </section>
      <section className={sectionClass}>
        {country === null && (
          <p className="m-0 rounded-lg border border-amber-500/40 bg-amber-500/10 p-2.5 text-[11px] text-[var(--fg)]">
            Devir kuralları ülkeye göre eşleşir; bu kanala ülke atanmamış. Genel sekmesinden ülke seçin.
          </p>
        )}
        <HandoffRoutesTab scope={handoffScope} />
      </section>
    </div>
  );
}
