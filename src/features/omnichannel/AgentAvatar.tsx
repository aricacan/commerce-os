import { UserRound } from 'lucide-react';
import { senderInitials } from './messageSender';

type AgentAvatarSize = 'sm' | 'md';

interface Props {
  // Temsilci adı; null = atanmamış (kesikli boş halka).
  name: string | null;
  size?: AgentAvatarSize;
}

const SIZE_CLASS: Record<AgentAvatarSize, { box: string; text: string; icon: number }> = {
  sm: { box: 'size-8', text: 'text-ui-xs', icon: 15 },
  md: { box: 'size-10', text: 'text-ui-sm', icon: 18 },
};

// Temsilci avatarı: baş harfler nötr yüzeyde. Atanmamış kayıtta kesikli halka + kişi simgesi, böylece "kimse yok"
// bir bakışta okunur.
export function AgentAvatar({ name, size = 'md' }: Props) {
  const look = SIZE_CLASS[size];
  if (name === null) {
    return (
      <span aria-hidden className={`flex ${look.box} shrink-0 items-center justify-center rounded-full border border-dashed border-warning/60 bg-warning-soft text-warning`}>
        <UserRound size={look.icon} />
      </span>
    );
  }

  return (
    <span aria-hidden className={`flex ${look.box} shrink-0 items-center justify-center rounded-full bg-fg font-bold text-bg ${look.text}`}>
      {senderInitials(name) || <UserRound size={look.icon} />}
    </span>
  );
}
