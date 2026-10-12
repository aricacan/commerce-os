'use client';

import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { CHANNEL_TYPE_META, StatusDot } from './shared';
import { ChannelCenterBot } from './ChannelCenterBot';
import { ChannelCenterCatalog } from './ChannelCenterCatalog';
import { ChannelCenterGeneral } from './ChannelCenterGeneral';
import { ChannelCenterOrders } from './ChannelCenterOrders';
import { ChannelCenterPayment } from './ChannelCenterPayment';
import { ChannelCenterRules } from './ChannelCenterRules';
import { botOverrideSummary } from './channelBotRules';
import { ScopeBadge } from './ScopeBadge';
import { SubTabBar } from './SubTabBar';
import { useBrands } from './useBrands';
import { useChannelRecord } from './useChannelRecord';
import { useChannelSettings } from './useChannelSettings';
import { useOmnichannelNav } from './OmnichannelNavContext';

const CENTER_TABS = [
  { key: 'general', label: 'Genel' },
  { key: 'bot', label: 'Bot' },
  { key: 'payment', label: 'Ödeme' },
  { key: 'orders', label: 'Siparişler' },
  { key: 'catalog', label: 'Katalog ve siteler' },
  { key: 'rules', label: 'Kurallar' },
] as const;

type CenterTab = (typeof CENTER_TABS)[number]['key'];

// Kanal Merkezi: bir kanalla ilgili HER ŞEY tek sayfada — genel alanlar ve bağlantı, bot (bayraklar + eşik/menü/metin),
// ödeme, sipariş hedefi, katalog/siteler ve kurallar. Her sekme etkin değeri VE nereden geldiğini gösterir; her ayarın tek düzenleme
// yeri burasıdır. Hesap geneli yalnız kanala bağlı olmayan varsayılanları ve toplu görünümü taşır.
export function ChannelCenter({ channelId }: { channelId: number }) {
  const { view, go } = useOmnichannelNav();
  // Başka ekrandan belirli sekmeye gelinebilir (ör. sürüm rozeti → ?sub=bot).
  const [tab, setTab] = useState<CenterTab>(() => CENTER_TABS.find((t) => t.key === view.sub)?.key ?? 'general');
  const record = useChannelRecord(channelId);
  const effective = useChannelSettings(channelId);
  const { brands } = useBrands();

  const reload = async () => { await Promise.all([record.reload(), effective.reload()]); };
  const backToList = () => go({ tab: 'channels', sub: 'list' });

  if (record.loading || effective.loading) {
    return <div className="p-6 text-center text-xs text-[var(--fg-muted)]">Kanal yükleniyor…</div>;
  }
  const { channel } = record;
  const { settings } = effective;
  if (!channel || !settings) {
    return (
      <div className="flex flex-col items-start gap-3 p-6 text-xs">
        <p className="m-0 text-rose-500">{record.error ?? effective.error ?? 'Kanal okunamadı.'}</p>
        <button type="button" onClick={backToList} className="font-semibold text-[var(--fg)] underline">Kanallara dön</button>
      </div>
    );
  }

  const typeMeta = CHANNEL_TYPE_META[channel.type];

  return (
    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col">
      <header className="flex min-w-0 flex-col gap-2 border-b border-[var(--border-soft)] px-4 pb-3 pt-4 sm:px-5">
        <button
          type="button"
          onClick={backToList}
          className="inline-flex w-fit cursor-pointer items-center gap-1 text-[11px] font-semibold text-[var(--fg-muted)] hover:text-[var(--fg)]"
        >
          <ArrowLeft size={12} aria-hidden /> Kanallar
        </button>
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          <h2 className="m-0 min-w-0 truncate text-sm font-bold text-[var(--fg)]">{channel.displayName}</h2>
          <span className="font-mono text-[11px] text-[var(--fg-muted)]">{typeMeta.label} · {channel.externalIdentifier}</span>
          <StatusDot status={channel.status} />
          <ScopeBadge label={channel.isActive ? 'Aktif' : 'Pasif'} tone={channel.isActive ? 'success' : 'neutral'} />
          {channel.brandName && <ScopeBadge label={channel.brandName} />}
          {channel.country && <ScopeBadge label={channel.country} />}
          {settings.bot?.hasAny && (
            <ScopeBadge label={`Özel bot ayarı: ${botOverrideSummary(settings.bot).join(', ')}`} tone="bot" />
          )}
        </div>
      </header>

      <SubTabBar tabs={CENTER_TABS} active={tab} onChange={(key) => setTab(key as CenterTab)} ariaLabel="Kanal Merkezi" />

      <div className="flex min-w-0 flex-col gap-4 p-4 text-xs sm:p-5">
        {effective.error && <p className="m-0 text-rose-500">{effective.error}</p>}
        {tab === 'general' && <ChannelCenterGeneral channel={channel} brands={brands} onChanged={reload} />}
        {tab === 'bot' && <ChannelCenterBot settings={settings} onChanged={reload} />}
        {tab === 'payment' && <ChannelCenterPayment channel={channel} settings={settings} onChanged={reload} />}
        {tab === 'orders' && <ChannelCenterOrders channel={channel} />}
        {tab === 'catalog' && <ChannelCenterCatalog channel={channel} settings={settings} onChanged={reload} />}
        {tab === 'rules' && <ChannelCenterRules settings={settings} onChanged={reload} />}
      </div>
    </div>
  );
}
