import type { CustomerChannelDto } from '../../lib/api/customers';
import { channelTypeMeta } from './shared';

// Profile bağlı kanallar tek bakışta: her kanal kaydı bir çip (ikon + kanal adı).
export function CustomerChannelChips({ channels }: { channels: CustomerChannelDto[] }) {
  if (channels.length === 0) return null;

  return (
    <ul className="flex flex-wrap gap-1">
      {channels.map((channel) => {
        const meta = channelTypeMeta(channel.channelType);
        return (
          <li key={channel.contactId} title={`${meta.label} · ${channel.externalId}`}
            className="inline-flex max-w-full items-center gap-1 rounded-full bg-[var(--bg-subtle)] px-2 py-0.5 text-[10.5px] text-[var(--fg)]">
            <meta.Icon size={11} color={meta.color} />
            <span className="truncate">{channel.channelName}</span>
          </li>
        );
      })}
    </ul>
  );
}
