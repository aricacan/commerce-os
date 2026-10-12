'use client';

import { useState } from 'react';
import { Pencil, Power } from 'lucide-react';
import type { LexiconTermDto, LexiconTermFields } from '../../lib/api/omnichannel-lexicon';
import { secondaryButtonClass } from './formClasses';
import { canEditTerm, draftFromTerm, kindLabel, sourceLabel, toFields } from './lexiconRules';
import { LexiconTermForm } from './LexiconTermForm';
import { ToneChip } from './ToneChip';

interface Props {
  term: LexiconTermDto;
  isSuperAdmin: boolean;
  onSave: (fields: LexiconTermFields) => Promise<void>;
  onToggleActive: () => void;
}

const GLOBAL_LOCKED_HINT = 'Ortak satırı yalnızca platform yöneticisi değiştirebilir.';

// Sözlükte tek satır: terim → anlam, tür/marka/dil, kaynak ve ortak rozeti. Ortak satır yalnız platform yöneticisinde
// düzenlenir (sunucu da 403 verir). Pasif satır soluk görünür; silme yoktur (tohum yeniden eklemesin diye pasifleştirilir).
export function LexiconTermRow({ term, isSuperAdmin, onSave, onToggleActive }: Props) {
  const [editing, setEditing] = useState(false);
  const editable = canEditTerm(term, isSuperAdmin);
  const details = [kindLabel(term.kind), term.make, term.language?.toUpperCase(), sourceLabel(term.source)].filter(Boolean).join(' · ');

  return (
    <li className={`flex min-w-0 flex-col gap-2 rounded-xl border border-border-soft bg-card p-3 ${term.isActive ? '' : 'opacity-60'}`}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-ui-sm font-bold text-fg">{term.term}</span>
        <span className="text-ui-xs text-fg-muted" aria-hidden>→</span>
        <span className="min-w-0 break-words text-ui-sm text-fg">{term.meaning}</span>
        {term.isGlobal && <ToneChip chip={{ label: 'Ortak', tone: 'info' }} />}
        {!term.isActive && <ToneChip chip={{ label: 'Pasif', tone: 'neutral' }} />}
      </div>
      <p className="m-0 text-ui-2xs text-fg-muted">{details}</p>

      {editing ? (
        <LexiconTermForm
          label={`${term.term} terimini düzenle`} initial={draftFromTerm(term)} submitLabel="Kaydet"
          onCancel={() => setEditing(false)}
          onSubmit={async (draft) => { await onSave(toFields(draft)); setEditing(false); }}
        />
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={secondaryButtonClass} disabled={!editable} title={editable ? undefined : GLOBAL_LOCKED_HINT} onClick={() => setEditing(true)}>
            <Pencil size={13} aria-hidden /> Düzenle
          </button>
          <button type="button" className={secondaryButtonClass} disabled={!editable} title={editable ? undefined : GLOBAL_LOCKED_HINT} onClick={onToggleActive}>
            <Power size={13} aria-hidden /> {term.isActive ? 'Pasifleştir' : 'Etkinleştir'}
          </button>
        </div>
      )}
    </li>
  );
}
