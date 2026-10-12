import { UserRound } from 'lucide-react';
import type { ChannelType } from '../../lib/api/omnichannel';
import { ChannelPlatformIcon } from './ChannelPlatformIcon';
import { channelTypeMeta } from './shared';
import { senderInitials } from './messageSender';

type AvatarSize = 'sm' | 'md';

interface Props {
  // Müşteri adı; yoksa numara gelir ve simge gösterilir.
  name: string;
  channelType: ChannelType;
  size?: AvatarSize;
}

const SIZE_CLASS: Record<AvatarSize, { box: string; text: string; badge: string; badgeIcon: number; userIcon: number }> = {
  sm: { box: 'size-8', text: 'text-ui-xs', badge: 'size-4', badgeIcon: 10, userIcon: 16 },
  md: { box: 'size-10', text: 'text-ui-md', badge: 'size-5', badgeIcon: 13, userIcon: 20 },
};

// Adın içinde harf yoksa ("+90 532 …") baş harf anlamsızdır; simge çizilir.
const hasLetters = (value: string) => /\p{L}/u.test(value);

// Müşteri avatarı: nötr yüzey + baş harfler, köşede kanalın marka renkli logosu. Renk yalnız kanal kimliğinden gelir.
export function ConversationAvatar({ name, channelType, size = 'md' }: Props) {
  const typeMeta = channelTypeMeta(channelType);
  const look = SIZE_CLASS[size];

  return (
    <span className={`relative flex ${look.box} shrink-0 items-center justify-center rounded-full bg-bg-subtle font-semibold text-fg-muted ${look.text}`}>
      {hasLetters(name) ? senderInitials(name) : <UserRound size={look.userIcon} aria-hidden />}
      <span
        title={typeMeta.label}
        role="img"
        aria-label={typeMeta.label}
        className={`absolute -bottom-0.5 -right-0.5 flex ${look.badge} items-center justify-center rounded-full bg-card ring-2 ring-card`}
      >
        <ChannelPlatformIcon type={channelType} size={look.badgeIcon} />
      </span>
    </span>
  );
}
