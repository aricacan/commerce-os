'use client';

import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { channelBotOverrideApi, type ChannelMenuDto } from '../../lib/api/omnichannel-channel-bot';
import type { BotMenuOptionDto } from '../../lib/api/omnichannel';
import { useFeedback } from '../shared/Feedback';
import { ChannelBotSection } from './ChannelBotSection';
import { primaryButtonClass, secondaryButtonClass } from './formClasses';
import { activeLevel, labelFor, withIds } from './menuTree';
import { MenuTreeEditor } from './MenuTreeEditor';
import type { useChannelBotOverride } from './useChannelBotOverride';

interface Props {
  channelId: number;
  menu: ChannelMenuDto;
  busy: boolean;
  write: ReturnType<typeof useChannelBotOverride>['write'];
}

// Kanalın kendi menüsü varsa düzenleyici açık gelir; yoksa hesap genelinin menüsü özetlenir ve
// “Bu kanal için özelleştir” ile onun kopyası taslak olarak açılır. Taslak kaydedilene dek hesap geneli geçerlidir.
export function ChannelBotMenuSection({ channelId, menu, busy, write }: Props) {
  const { confirm } = useFeedback();
  const [draft, setDraft] = useState<BotMenuOptionDto[]>(() => withIds(menu.options));
  const [editing, setEditing] = useState(menu.isCustom);

  // Sunucudan yeni kayıt gelince (kaydet / genele dön) taslak onunla eşlenir.
  useEffect(() => {
    setDraft(withIds(menu.options));
    setEditing(menu.isCustom);
  }, [menu]);

  const startCustomising = () => { setDraft(withIds(menu.accountMenu)); setEditing(true); };

  const save = async () => {
    await write(() => channelBotOverrideApi.saveMenu(channelId, draft), 'Bu kanalın menüsü kaydedildi.');
  };

  const backToAccount = async () => {
    const ok = await confirm({
      title: 'Menü hesap genelini izlesin mi?',
      body: 'Bu kanala özel menü silinir; kanal hesap genelindeki menüyü kullanır.',
      confirmLabel: 'Genele dön',
    });
    if (ok) await write(() => channelBotOverrideApi.clearMenu(channelId), 'Menü hesap genelini izliyor.');
  };

  const actions = (
    <>
      {editing && (
        <button type="button" className={primaryButtonClass} disabled={busy} onClick={() => void save()}>
          <Save size={13} aria-hidden /> Menüyü kaydet
        </button>
      )}
      {editing && !menu.isCustom && (
        <button type="button" className={secondaryButtonClass} disabled={busy} onClick={() => setEditing(false)}>
          Vazgeç
        </button>
      )}
      {menu.isCustom && (
        <button type="button" className={secondaryButtonClass} disabled={busy} onClick={() => void backToAccount()}>
          Genele dön
        </button>
      )}
      {!editing && (
        <button type="button" className={secondaryButtonClass} disabled={busy} onClick={startCustomising}>
          Bu kanal için özelleştir
        </button>
      )}
    </>
  );

  return (
    <ChannelBotSection
      title="Menü"
      description={menu.isCustom
        ? 'Bu kanalın kendi menüsü kullanılıyor. Hesap geneli menü değişse de bu kanal etkilenmez.'
        : 'Bu kanal hesap genelindeki menüyü kullanıyor. Hesap genelinde yapılan değişiklikler bu kanala da yansır.'}
      custom={menu.isCustom}
      actions={actions}
    >
      {editing
        ? <MenuTreeEditor options={draft} setOptions={setDraft} />
        : <AccountMenuSummary options={menu.options} />}
    </ChannelBotSection>
  );
}

function AccountMenuSummary({ options }: { options: BotMenuOptionDto[] }) {
  return (
    <ol className="m-0 flex list-decimal flex-col gap-1 pl-5 text-xs text-[var(--fg)]">
      {activeLevel(options, null).map((option) => (
        <li key={option.id ?? option.order}>{labelFor(option, 'tr')}</li>
      ))}
    </ol>
  );
}
