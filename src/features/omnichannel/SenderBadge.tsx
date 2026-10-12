import { Bot, Globe } from 'lucide-react';
import { senderInitials } from './messageSender';

interface Props {
  kind: 'bot' | 'agent' | 'platform';
  label: string;
  // Temsilci avatarının baş harfleri bu addan alınır (etiket "Temsilci · Ayşe Kaya" biçimindedir).
  avatarName?: string;
}

// Balonun üstündeki gönderen kimliği: bot ikonlu indigo avatar ya da temsilcinin baş harfleri.
// Soluk bir alt yazı değil, avatar + ad — "bot mu yazdı, insan mı?" tek bakışta okunur.
// Panel dışından yazılan cevap küre ikonuyla, soluk tonda: bizim temsilcimiz değil.
const AVATAR_CLASS: Record<Props['kind'], string> = {
  bot: 'bg-[var(--bot-accent)] text-[var(--card)]',
  agent: 'bg-[var(--fg)] text-[var(--bg)]',
  platform: 'border border-dashed border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--fg-muted)]',
};
const LABEL_CLASS: Record<Props['kind'], string> = {
  bot: 'text-[var(--bot-accent)]',
  agent: 'text-[var(--fg)]',
  platform: 'text-[var(--fg-muted)]',
};

function AvatarContent({ kind, label, avatarName }: Props) {
  if (kind === 'bot') return <Bot size={12} />;
  if (kind === 'platform') return <Globe size={12} />;
  return <>{senderInitials(avatarName ?? label)}</>;
}

export function SenderBadge({ kind, label, avatarName }: Props) {
  return (
    <span className="inline-flex items-center gap-1.5 self-end text-ui-xs font-semibold">
      <span
        aria-hidden
        className={`flex size-5 shrink-0 items-center justify-center rounded-full text-ui-2xs font-bold ${AVATAR_CLASS[kind]}`}
      >
        <AvatarContent kind={kind} label={label} avatarName={avatarName} />
      </span>
      <span className={LABEL_CLASS[kind]}>{label}</span>
    </span>
  );
}
