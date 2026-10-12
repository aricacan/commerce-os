'use client';

import { Bot, BookOpen, Globe, Settings2 } from 'lucide-react';
import { CHANNEL_TYPE, type ChannelDto } from '../../lib/api/omnichannel';
import { channelTypeMeta } from './shared';
import { ChannelActionsMenu, buildChannelMenuActions } from './ChannelActionsMenu';
import { ChannelChip } from './ChannelChip';
import { ChannelStatusBadge } from './ChannelStatusBadge';
import { HistoryImportStatus } from './HistoryImportStatus';
import { useHistoryImport } from './useHistoryImport';
import type { TestOutcome } from './useChannelActions';

const CHAT_ICON_SIZE = 12;
const LOGO_ICON_SIZE = 20;
const DEFAULT_CATALOG_LABEL = 'Ülke varsayılanı';

interface Props {
  channel: ChannelDto;
  // Katalog profilinin adı; null = ülke varsayılanı kullanılıyor.
  catalogName: string | null;
  testing: boolean;
  testResult: TestOutcome | null;
  onOpenCenter: () => void;
  onTest: () => void;
  onDiagnose: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
  onOpenTemplates: () => void;
}

const supportsHistoryImport = (type: number) => type === CHANNEL_TYPE.Facebook || type === CHANNEL_TYPE.Instagram;

export function ChannelCard({
  channel, catalogName, testing, testResult,
  onOpenCenter, onTest, onDiagnose, onToggleActive, onDelete, onOpenTemplates,
}: Props) {
  const { Icon, color, label } = channelTypeMeta(channel.type);
  const history = useHistoryImport(channel.id);

  const actions = buildChannelMenuActions({
    isActive: channel.isActive,
    testing,
    importingHistory: history.state.kind === 'running',
    onTest,
    onDiagnose,
    onToggleActive,
    onDelete,
    onImportHistory: supportsHistoryImport(channel.type) ? () => void history.start() : undefined,
    onOpenTemplates: channel.type === CHANNEL_TYPE.WhatsApp ? onOpenTemplates : undefined,
  });

  return (
    <article className="flex flex-col gap-3 rounded-md border border-[var(--border-soft)] bg-[var(--card)] p-4 shadow-xs transition-all duration-200 motion-safe:hover:-translate-y-0.5 hover:shadow-md focus-within:border-[var(--border)]">
      <header className="flex items-start gap-3">
        <span
          role="img"
          aria-label={label}
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[var(--bg-subtle)] ${channel.isActive ? '' : 'opacity-50'}`}
        >
          <Icon size={LOGO_ICON_SIZE} color={color} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <button
            type="button"
            onClick={onOpenCenter}
            title="Kanal Merkezi: bu kanalın tüm ayarları"
            className="cursor-pointer truncate rounded text-left text-ui-md font-bold text-[var(--fg)] outline-none hover:underline focus-visible:ring-2 focus-visible:ring-[var(--fg)]"
          >
            {channel.displayName}
          </button>
          <span className="truncate font-mono text-ui-xs text-[var(--fg-subtle)]" title={channel.externalIdentifier}>
            {label} · {channel.externalIdentifier}
          </span>
        </div>
        <ChannelActionsMenu actions={actions} channelName={channel.displayName} />
      </header>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <ChannelStatusBadge channel={channel} />
        <ChannelChip icon={<Bot size={CHAT_ICON_SIZE} />} title="Otomatik cevap botu">
          {channel.botEnabled ? 'Bot açık' : 'Bot kapalı'}
        </ChannelChip>
        {channel.country && <ChannelChip icon={<Globe size={CHAT_ICON_SIZE} />} title="Ülke">{channel.country}</ChannelChip>}
        <ChannelChip icon={<BookOpen size={CHAT_ICON_SIZE} />} title="Katalog profili">
          {catalogName ?? DEFAULT_CATALOG_LABEL}
        </ChannelChip>
      </div>

      {testResult && (
        <p
          role="status"
          className={`rounded-md bg-[var(--bg-subtle)] p-2 font-mono text-ui-xs ${testResult.ok ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}
        >
          {testResult.text}
        </p>
      )}
      <HistoryImportStatus state={history.state} />

      <button
        type="button"
        onClick={onOpenCenter}
        className="inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-md bg-[var(--fg)] text-ui-sm font-bold text-[var(--bg)] outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--fg)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--card)]"
      >
        <Settings2 size={14} />
        Kanal Merkezi
      </button>
    </article>
  );
}
