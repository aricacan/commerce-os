import { ExternalLink } from 'lucide-react';
import type { DatasetConversationDto } from '../../lib/api/omnichannel-quality';
import { formatTraceTime } from './botTraceRules';

interface Props {
  conversation: DatasetConversationDto;
  selected: boolean;
  onToggle: () => void;
  onOpen: () => void;
}

// Veri setine eklenebilecek tek canlı konuşma: seçim kutusu, son müşteri mesajı (maskeli) ve kısa künye.
export function QualityDatasetConversationItem({ conversation: c, selected, onToggle, onOpen }: Props) {
  const facts = [
    `#${c.conversationId}`, c.channelName, c.country, `${c.messageCount} mesaj`,
    c.lastMessageAt ? formatTraceTime(c.lastMessageAt) : null, c.hasHandoff ? 'devir' : null, c.flagged ? 'yanlış işaretli' : null,
  ].filter(Boolean).join(' · ');

  return (
    <li className="flex min-w-0 items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-bg-subtle">
      <input
        type="checkbox" className="mt-0.5 shrink-0" checked={selected} onChange={onToggle}
        aria-label={`Konuşma ${c.conversationId} seç`}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-ui-xs text-fg">{c.preview || '—'}</span>
        <span className="text-ui-2xs text-fg-subtle">{facts}</span>
      </div>
      <button
        type="button" aria-label="Konuşmayı aç" title="Konuşmayı aç" onClick={onOpen}
        className="shrink-0 cursor-pointer bg-transparent p-0 text-fg-muted hover:text-fg"
      >
        <ExternalLink size={13} aria-hidden />
      </button>
    </li>
  );
}
