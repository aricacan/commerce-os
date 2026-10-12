import type { ChannelDto } from '../../lib/api/omnichannel';
import { channelStatusView, type ChannelStatusTone } from './channelCardRules';

const TONE_CLASS: Record<ChannelStatusTone, { dot: string; text: string }> = {
  ok: { dot: 'bg-[var(--success)]', text: 'text-[var(--fg)]' },
  error: { dot: 'bg-[var(--danger)]', text: 'text-[var(--danger)]' },
  idle: { dot: 'bg-[var(--fg-subtle)]', text: 'text-[var(--fg-muted)]' },
};

// Tek durum noktası: bağlantı durumu ile Aktif/Pasif birlikte.
export function ChannelStatusBadge({ channel }: { channel: Pick<ChannelDto, 'status' | 'isActive' | 'lastError'> }) {
  const view = channelStatusView(channel);
  const tone = TONE_CLASS[view.tone];
  return (
    <span
      title={view.tone === 'error' ? channel.lastError ?? undefined : undefined}
      className={`inline-flex items-center gap-1.5 text-ui-xs font-semibold ${tone.text}`}
    >
      <span aria-hidden className={`h-2 w-2 rounded-full ${tone.dot}`} />
      {view.label}
    </span>
  );
}
