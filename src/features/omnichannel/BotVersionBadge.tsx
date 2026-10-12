'use client';

import { useId, useRef, type ToggleEvent } from 'react';
import { ChevronRight } from 'lucide-react';
import type { BotPipelineChannelDto } from '../../lib/api/omnichannel-pipelines';
import { focusRing, motionFast } from '../shared/design';
import { channelVersionLine, summarizeVersionBadge } from './botVersionBadgeRules';
import { useOmnichannelNav } from './OmnichannelNavContext';
import { useBotVersionOverview } from './useBotVersionOverview';

// "Omnichannel" başlığının yanındaki sürüm rozeti: botun cevap verdiği sürüm. Kanallar farklıysa sarı nokta ve
// "v4 · 1 kanal v3" ipucu; tıklayınca kanal kanal canlı/gölge sürümler. Kart tarayıcının popover katmanında açılır
// (kenar çubuğu taşanı kırptığı için); dışarı tıklama ve Esc kendiliğinden kapatır.
export function BotVersionBadge() {
  const overview = useBotVersionOverview();
  const popoverId = useId();
  const popoverRef = useRef<HTMLDivElement>(null);
  const { go } = useOmnichannelNav();
  const summary = summarizeVersionBadge(overview.pipelines, overview.channels);
  if (summary === null) return null;

  const mixed = summary.exceptions.length > 0;
  const openChannel = (channel: BotPipelineChannelDto) => {
    popoverRef.current?.hidePopover();
    go({ tab: 'channels', channelId: channel.channelId, sub: 'bot' });
  };
  // Açılışta tazelenir: başka sekmede değiştirilen kanal sürümü burada eski kalmasın.
  const refreshOnOpen = (event: ToggleEvent<HTMLDivElement>) => {
    if (event.newState === 'open') overview.reload();
  };

  return (
    <>
      <button
        type="button"
        popoverTarget={popoverId}
        title={`Bot sürümü: ${summary.label}`}
        aria-label={`Bot sürümü: ${summary.label}`}
        className={`inline-flex h-5 shrink-0 cursor-pointer items-center gap-1 rounded-full border border-border-soft bg-bg-subtle px-2 text-ui-2xs font-semibold tabular-nums text-fg-muted hover:text-fg ${motionFast} ${focusRing}`}
      >
        {summary.version}
        {mixed && <span aria-hidden className="size-1.5 rounded-full bg-warning" />}
      </button>
      <div
        ref={popoverRef}
        id={popoverId}
        popover="auto"
        onToggle={refreshOnOpen}
        className="m-auto w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-border-soft bg-card p-0 text-fg shadow-lg backdrop:bg-black/10"
      >
        <BadgeDetails label={summary.label} channels={overview.channels} onOpenChannel={openChannel} />
      </div>
    </>
  );
}

interface DetailsProps {
  label: string;
  channels: BotPipelineChannelDto[] | null;
  onOpenChannel: (channel: BotPipelineChannelDto) => void;
}

function BadgeDetails({ label, channels, onOpenChannel }: DetailsProps) {
  return (
    <div className="flex flex-col gap-2 p-3">
      <div className="flex flex-col gap-0.5 px-1">
        <p className="m-0 text-ui-sm font-bold">Bot sürümü · {label}</p>
        <p className="m-0 text-ui-xs text-fg-muted">
          Kanalda sürüm seçilmemişse Hesap geneli › Bot varsayılanları&apos;ndaki sürüm çalışır.
        </p>
      </div>
      {channels === null ? (
        <p className="m-0 px-1 text-ui-xs text-fg-muted">Kanal listesi sunucu güncellenince görünecek.</p>
      ) : (
        <ul className="m-0 flex max-h-72 list-none flex-col overflow-y-auto p-0">
          {channels.map((channel) => (
            <li key={channel.channelId}>
              <button
                type="button"
                onClick={() => onOpenChannel(channel)}
                className={`flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-bg-subtle ${motionFast} ${focusRing}`}
              >
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-ui-sm font-semibold">{channel.name}</span>
                  <span className="text-ui-xs text-fg-muted">{channelVersionLine(channel)}</span>
                </span>
                <ChevronRight size={14} className="shrink-0 text-fg-muted" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
