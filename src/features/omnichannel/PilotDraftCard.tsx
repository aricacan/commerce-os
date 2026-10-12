'use client';

import { ShieldCheck, X } from 'lucide-react';
import type { BotReplyDraftDto } from '../../lib/api/omnichannel';

interface Props {
  draft: BotReplyDraftDto;
  onApprove: () => void;
  onEdit: () => void;
  onReject: () => void;
}

const actionClass =
  'inline-flex h-9 items-center gap-1 rounded-lg border border-[var(--border-soft)] px-3 text-ui-sm font-semibold transition-colors hover:bg-[var(--bg-subtle)]';

// Pilot modu: bot cevabı müşteriye gitmeden temsilci onayını bekler. Botun aktör rengiyle
// (indigo) çizilir — sohbetteki bot balonuyla aynı kimlik.
export function PilotDraftCard({ draft, onApprove, onEdit, onReject }: Props) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-[var(--bot-accent-border)] bg-[var(--bot-accent-soft)] p-2.5">
      <div className="flex items-center gap-1.5 text-ui-sm font-bold text-[var(--bot-accent)]">
        <ShieldCheck size={14} aria-hidden /> Pilot modu — bot cevabı onay bekliyor
      </div>
      <p className="whitespace-pre-wrap text-ui-sm text-[var(--fg)]">{draft.body}</p>
      <div className="flex flex-wrap gap-1.5">
        <button type="button" onClick={onApprove} className={`${actionClass} text-[var(--success)]`}>Onayla ve gönder</button>
        <button type="button" onClick={onEdit} className={`${actionClass} text-[var(--fg)]`}>Düzenle</button>
        <button type="button" onClick={onReject} className={`${actionClass} text-[var(--danger)]`}>
          <X size={12} aria-hidden /> Reddet
        </button>
      </div>
    </div>
  );
}
