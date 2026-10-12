'use client';

import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import type { BotTextEntryDto } from '../../lib/api/omnichannel';
import { channelBotOverrideApi, type ChannelTextsDto } from '../../lib/api/omnichannel-channel-bot';
import { useFeedback } from '../shared/Feedback';
import { toTextOverride } from './botTextRules';
import { BotTextsEditor } from './BotTextsEditor';
import { ChannelBotSection } from './ChannelBotSection';
import { primaryButtonClass, secondaryButtonClass } from './formClasses';
import type { useChannelBotOverride } from './useChannelBotOverride';

interface Props {
  channelId: number;
  texts: ChannelTextsDto;
  busy: boolean;
  write: ReturnType<typeof useChannelBotOverride>['write'];
}

// Kanalın metinleri: hesap genelindeki (yoksa kod varsayılanı) metinle dolu gelir; yalnız değiştirilen dil
// kanala özel saklanır ve “Değiştirildi” rozeti alır. Aynı editör hesap geneli sayfada da kullanılır.
export function ChannelBotTextsSection({ channelId, texts, busy, write }: Props) {
  const { confirm } = useFeedback();
  const [entries, setEntries] = useState<BotTextEntryDto[]>(texts.entries);

  useEffect(() => { setEntries(texts.entries); }, [texts]);

  const update = (key: BotTextEntryDto['key'], patch: Partial<BotTextEntryDto>) =>
    setEntries((current) => current.map((e) => (e.key === key ? { ...e, ...patch } : e)));

  const save = () => write(
    () => channelBotOverrideApi.saveTexts(channelId, entries.map(toTextOverride)),
    'Bu kanalın metinleri kaydedildi.',
  );

  const backToAccount = async () => {
    const ok = await confirm({
      title: 'Metinler hesap genelini izlesin mi?',
      body: 'Bu kanalda değiştirilmiş tüm bot metinleri silinir.',
      confirmLabel: 'Genele dön',
    });
    if (ok) await write(() => channelBotOverrideApi.clearTexts(channelId), 'Metinler hesap genelini izliyor.');
  };

  const actions = (
    <>
      <button type="button" className={primaryButtonClass} disabled={busy} onClick={() => void save()}>
        <Save size={13} aria-hidden /> Metinleri kaydet
      </button>
      {texts.customCount > 0 && (
        <button type="button" className={secondaryButtonClass} disabled={busy} onClick={() => void backToAccount()}>
          Genele dön
        </button>
      )}
    </>
  );

  return (
    <ChannelBotSection
      title="Metinler"
      description="Karşılama, menü ipucu ve devir mesajları. Alanlar hesap genelindeki metinle dolu gelir; değiştirdiğiniz metin yalnız bu kanalda geçerli olur."
      custom={texts.customCount > 0}
      customLabel={`${texts.customCount} metin kanala özel`}
      actions={actions}
    >
      <BotTextsEditor entries={entries} onChange={update} />
    </ChannelBotSection>
  );
}
