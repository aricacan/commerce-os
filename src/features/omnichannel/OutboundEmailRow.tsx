import { MessageSquare } from 'lucide-react';
import { OUTBOUND_EMAIL_STATUS, type OutboundEmailDto } from '../../lib/api/omnichannel-email-outbound';
import { formatSentAgo, formatSentFull, outboundKindLabel, outboundStatusLabel } from './outboundEmailRules';

interface Props {
  email: OutboundEmailDto;
  channelName: string | null;
  onOpenConversation?: (conversationId: number) => void;
}

export const OUTBOUND_ROW_GRID = 'md:grid md:grid-cols-[9rem_5rem_minmax(0,1.2fr)_minmax(0,1.6fr)_minmax(0,1fr)_6.5rem_2rem] md:items-center md:gap-3';

function StatusCell({ email }: { email: OutboundEmailDto }) {
  const failed = email.status === OUTBOUND_EMAIL_STATUS.Failed;
  return (
    <span
      title={failed ? email.errorSummary ?? undefined : undefined}
      className={`inline-flex items-center gap-1.5 font-semibold ${failed ? 'text-[var(--danger)]' : 'text-[var(--fg)]'}`}
    >
      <span aria-hidden className={`h-2 w-2 rounded-full ${failed ? 'bg-[var(--danger)]' : 'bg-[var(--success)]'}`} />
      {outboundStatusLabel(email.status)}
    </span>
  );
}

// Tek gönderim satırı: geniş ekranda sütunlar, dar ekranda alt alta kart.
export function OutboundEmailRow({ email, channelName, onOpenConversation }: Props) {
  const conversationId = email.conversationId;
  return (
    <li className={`flex flex-col gap-1 px-3 py-2.5 text-xs ${OUTBOUND_ROW_GRID}`}>
      <span title={formatSentFull(email.sentAtUtc)} className="flex flex-col leading-tight">
        <span className="font-semibold text-[var(--fg)]">{formatSentAgo(email.sentAtUtc)}</span>
        <span className="text-[10.5px] text-[var(--fg-muted)]">{formatSentFull(email.sentAtUtc)}</span>
      </span>
      <span>
        <span className="inline-flex rounded-[4px] bg-[var(--bg-subtle)] px-2 py-0.5 text-[10.5px] font-semibold text-[var(--fg)]">
          {outboundKindLabel(email.kind)}
        </span>
      </span>
      <span title={email.toAddress} className="truncate text-[var(--fg)]">{email.toAddress}</span>
      <span title={email.subject} className="truncate text-[var(--fg)]">{email.subject}</span>
      <span className="truncate text-[var(--fg-muted)]">{channelName ?? '—'}</span>
      <StatusCell email={email} />
      <span className="md:flex md:justify-end">
        {conversationId !== null && onOpenConversation && (
          <button
            type="button"
            aria-label="Konuşmaya git"
            title="Konuşmaya git"
            onClick={() => onOpenConversation(conversationId)}
            className="inline-flex cursor-pointer items-center gap-1 rounded-[4px] p-1 text-[var(--fg-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--fg)]"
          >
            <MessageSquare size={14} />
            <span className="md:hidden">Konuşmaya git</span>
          </button>
        )}
      </span>
    </li>
  );
}
