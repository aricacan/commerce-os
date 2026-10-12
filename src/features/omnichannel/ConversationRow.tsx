'use client';

import type { ConversationSummaryDto } from '../../lib/api/omnichannel';
import { focusRing, motionFast } from '../shared/design';
import { ChannelPlatformIcon } from './ChannelPlatformIcon';
import type { ChannelIdentity } from './channelIdentity';
import { ConversationAvatar } from './ConversationAvatar';
import { contactTitle } from './contactTitle';
import { ConversationBadges } from './ConversationBadges';
import { ConversationCountry } from './ConversationCountry';
import { isDormant } from './conversationAge';
import { conversationSurface } from './conversationTone';
import { formatRelativeTime } from './relativeTime';

const MAX_UNREAD_LABEL = 99;
const CHANNEL_ICON_SIZE = 12;
const SELECTED_ROW_CLASS = 'bg-bg-subtle shadow-[inset_3px_0_0_0_var(--fg)]';

interface Props {
  conversation: ConversationSummaryDto;
  // "Facebook · Inthermform": konuşmanın geldiği platform + hesap. null = kanal filtresi tek kanal, gösterme.
  identity: ChannelIdentity | null;
  selected: boolean;
  onSelect: (conversation: ConversationSummaryDto) => void;
}

// Liste satırı, üç kat: kim + ne zaman · son mesaj + okunmamış · rozetler + kanal.
// Durum satırın çok soluk arka plan tonuyla anlatılır (conversationTone); seçili satır nötr zemin +
// soldaki koyu çizgiyle her tonun üstünde ayırt edilir. Okunmamış satır kalın yazıyla öne çıkar.
export function ConversationRow({ conversation: c, identity, selected, onSelect }: Props) {
  const title = contactTitle(c);
  const unread = c.unreadCount > 0;

  return (
    <button
      type="button"
      onClick={() => onSelect(c)}
      aria-current={selected ? 'true' : undefined}
      className={`flex w-full cursor-pointer items-start gap-3 border-0 border-b border-border-soft px-4 py-3 text-left ${motionFast} ${focusRing} focus-visible:ring-inset ${
        selected ? SELECTED_ROW_CLASS : conversationSurface(c)
      } ${isDormant(c) && !selected ? 'opacity-60 hover:opacity-100' : ''}`}
    >
      <ConversationAvatar name={title} channelType={c.channelType} />

      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex items-baseline gap-2">
          <span className={`min-w-0 flex-1 truncate text-ui-md ${unread ? 'font-bold text-fg' : 'font-semibold text-fg'}`}>
            {title}
          </span>
          <time
            dateTime={c.lastMessageAt ?? undefined}
            className={`shrink-0 text-ui-xs tabular-nums ${unread ? 'font-semibold text-fg' : 'text-fg-muted'}`}
          >
            {formatRelativeTime(c.lastMessageAt)}
          </time>
        </span>

        <span className="flex items-center gap-2">
          <span className={`min-w-0 flex-1 truncate text-ui-sm ${unread ? 'text-fg' : 'text-fg-muted'}`}>
            {c.lastMessagePreview ?? '—'}
          </span>
          {unread && (
            <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-fg px-1.5 text-ui-2xs font-bold tabular-nums text-bg">
              {c.unreadCount > MAX_UNREAD_LABEL ? `${MAX_UNREAD_LABEL}+` : c.unreadCount}
              <span className="sr-only"> okunmamış mesaj</span>
            </span>
          )}
        </span>

        <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
          <span className="flex min-w-0 flex-wrap items-center gap-1 empty:hidden">
            <ConversationBadges conversation={c} tinted />
          </span>
          {(identity !== null || c.country) && (
            <span className="ml-auto flex min-w-0 max-w-full items-center gap-1.5">
              {identity !== null && (
                <span className="flex min-w-0 items-center gap-1 text-ui-2xs text-fg-muted" title={identity.tooltip}>
                  <ChannelPlatformIcon type={c.channelType} size={CHANNEL_ICON_SIZE} />
                  <span className="min-w-0 truncate">{identity.label}</span>
                </span>
              )}
              <ConversationCountry code={c.country} />
            </span>
          )}
        </span>
      </span>
    </button>
  );
}
