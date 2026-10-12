'use client';

import { useState } from 'react';
import { Check, X } from 'lucide-react';
import { LEXICON_CANDIDATE_STATUS, type LexiconCandidateDto, type LexiconTermFields } from '../../lib/api/omnichannel-lexicon';
import { formatTraceTime } from './botTraceRules';
import { primaryButtonClass, secondaryButtonClass } from './formClasses';
import { candidateStats, draftFromCandidate, kindLabel, toFields } from './lexiconRules';
import { LexiconTermForm } from './LexiconTermForm';

interface Props {
  candidate: LexiconCandidateDto;
  selected: boolean;
  onToggle: () => void;
  onApprove: (fields: LexiconTermFields) => Promise<void>;
  onReject: () => void;
}

// Tek aday: müşterinin yazdığı kelime, görülme sayıları, örnek cümle ve (varsa) önerilen anlam. Bekleyen aday seçilebilir,
// "Onayla" ile küçük forma açılır (anlam öneriyle dolu) ya da reddedilir.
export function LexiconCandidateRow({ candidate, selected, onToggle, onApprove, onReject }: Props) {
  const [approving, setApproving] = useState(false);
  const pending = candidate.status === LEXICON_CANDIDATE_STATUS.Pending;
  const suggestion = candidate.suggestedMeaning
    ? `${candidate.suggestedMeaning}${candidate.suggestedKind !== null ? ` (${kindLabel(candidate.suggestedKind)})` : ''}`
    : null;

  return (
    <li className={`flex min-w-0 gap-3 rounded-xl border bg-card p-3 ${selected ? 'border-fg' : 'border-border-soft'}`}>
      {pending && (
        <input type="checkbox" checked={selected} onChange={onToggle} aria-label={`${candidate.token} adayını seç`} className="mt-1 shrink-0" />
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-ui-sm font-bold text-fg">{candidate.token}</span>
          <span className="text-ui-2xs text-fg-muted">{candidateStats(candidate)}</span>
          <span className="text-ui-2xs text-fg-subtle">Son: {formatTraceTime(candidate.lastSeenAt)}</span>
        </div>
        {candidate.exampleText && <p className="m-0 break-words text-ui-xs text-fg-muted">“{candidate.exampleText}”</p>}
        {suggestion && <p className="m-0 text-ui-xs text-fg">Öneri: {suggestion}</p>}

        {pending && approving && (
          <LexiconTermForm
            label={`${candidate.token} adayını onayla`} initial={draftFromCandidate(candidate)} submitLabel="Sözlüğe ekle"
            onCancel={() => setApproving(false)}
            onSubmit={async (draft) => { await onApprove(toFields(draft)); }}
          />
        )}
        {pending && !approving && (
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className={primaryButtonClass} onClick={() => setApproving(true)}>
              <Check size={13} aria-hidden /> Onayla
            </button>
            <button type="button" className={secondaryButtonClass} onClick={onReject}>
              <X size={13} aria-hidden /> Reddet
            </button>
          </div>
        )}
      </div>
    </li>
  );
}
