'use client';

import { RotateCcw } from 'lucide-react';
import { channelBotOverrideApi } from '../../lib/api/omnichannel-channel-bot';
import { useFeedback } from '../shared/Feedback';
import { ChannelBotMenuSection } from './ChannelBotMenuSection';
import { ChannelBotTextsSection } from './ChannelBotTextsSection';
import { channelVersionsOf } from './channelBotRules';
import { ChannelBotThresholds } from './ChannelBotThresholds';
import { ChannelBotVersions } from './ChannelBotVersions';
import { secondaryButtonClass } from './formClasses';
import { useChannelBotOverride } from './useChannelBotOverride';

interface Props {
  channelId: number;
  onChanged: () => Promise<void>;
}

// Kanal Merkezi › Bot: eşik, menü ve metinlerin KANAL bazlı geçersiz kılınması. Sunucudaki çözümleme sırası:
// kanalın kendi değeri → hesap geneli → kod varsayılanı. Bölümlerin hepsi aynı kayıttan beslenir. Sürüm bölümü
// yalnız sunucu sürüm alanlarını gönderiyorsa görünür (ön yüz backend'den önce yayına çıkar).
export function ChannelBotOverrides({ channelId, onChanged }: Props) {
  const { confirm } = useFeedback();
  const { data, loading, error, busy, write } = useChannelBotOverride(channelId, onChanged);

  if (loading) return <p className="m-0 text-[11px] text-[var(--fg-muted)]">Bot ayarları yükleniyor…</p>;
  if (!data) return <p className="m-0 text-[11px] text-rose-500">{error ?? 'Bot ayarları okunamadı.'}</p>;

  const versions = channelVersionsOf(data);

  const resetAll = async () => {
    const ok = await confirm({
      title: 'Tüm kanala özel bot ayarları silinsin mi?',
      body: 'Eşikler, menü ve metinler hesap genelindeki değerlere döner.',
      confirmLabel: 'Hepsini genele döndür',
    });
    if (ok) await write(() => channelBotOverrideApi.clearAll(channelId), 'Kanal hesap genelini izliyor.');
  };

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="m-0 text-[11px] text-[var(--fg-muted)]">
          Varsayılan değerler hesap geneldir. Bir bölümü bu kanal için özelleştirdiğinizde hesap genelindeki
          değişiklikler o bölümü etkilemez.
        </p>
        {data.hasAny && (
          <button type="button" className={secondaryButtonClass} disabled={busy} onClick={() => void resetAll()}>
            <RotateCcw size={13} aria-hidden /> Hepsini genele döndür
          </button>
        )}
      </div>
      {versions && (
        <ChannelBotVersions
          channelId={channelId} versions={versions} overrides={data.thresholds.overrides} busy={busy} write={write}
        />
      )}
      <ChannelBotThresholds channelId={channelId} thresholds={data.thresholds} versions={versions} busy={busy} write={write} />
      <ChannelBotMenuSection channelId={channelId} menu={data.menu} busy={busy} write={write} />
      <ChannelBotTextsSection channelId={channelId} texts={data.texts} busy={busy} write={write} />
    </div>
  );
}
