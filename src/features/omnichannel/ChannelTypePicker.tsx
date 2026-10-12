'use client';

import { CHANNEL_TYPE, type ChannelType } from '../../lib/api/omnichannel';
import { focusRing, motionFast } from '../shared/design';
import { CHANNEL_TYPE_META } from './shared';

interface Props {
  onPick: (type: ChannelType) => void;
}

const TYPE_CARDS: { type: ChannelType; description: string }[] = [
  { type: CHANNEL_TYPE.WhatsApp, description: 'WhatsApp Business numaranızdan müşteri mesajlarını alın ve yanıtlayın.' },
  { type: CHANNEL_TYPE.Instagram, description: 'Instagram profesyonel hesabınızın doğrudan mesajlarını toplayın.' },
  { type: CHANNEL_TYPE.Facebook, description: 'Facebook sayfanızın Messenger konuşmalarını gelen kutusuna alın.' },
  { type: CHANNEL_TYPE.Email, description: 'Destek posta kutunuzu (IMAP/SMTP) bağlayın; e-postalar konuşma olur.' },
  { type: CHANNEL_TYPE.TikTok, description: 'TikTok Shop mağazanızın müşteri mesajlarını yönetin.' },
];

// Kanal ekleme 1. adım: tür seçimi. Tür seçilince 2. adımda yalnız o türe özel form açılır.
export function ChannelTypePicker({ onPick }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <p className="m-0 text-xs text-[var(--fg-muted)]">Hangi iletişim kanalını eklemek istiyorsunuz?</p>
      {TYPE_CARDS.map(({ type, description }) => {
        const { label, Icon, color } = CHANNEL_TYPE_META[type];
        return (
          <button
            key={type}
            type="button"
            onClick={() => onPick(type)}
            className={`flex w-full cursor-pointer items-center gap-3 rounded-[6px] border border-[var(--border)] bg-[var(--card)] p-3 text-left hover:bg-[var(--bg-subtle)] ${motionFast} ${focusRing}`}
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--bg-subtle)]">
              <Icon size={18} color={color} />
            </span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-xs font-bold text-[var(--fg)]">{label}</span>
              <span className="text-[11px] text-[var(--fg-muted)]">{description}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
