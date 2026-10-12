'use client';

import { useState } from 'react';
import type { LexiconKind } from '../../lib/api/omnichannel-lexicon';
import { describeError } from '../../lib/errors';
import { compactInputClass, labelClass, primaryButtonClass, secondaryButtonClass } from './formClasses';
import {
  draftError, KIND_OPTIONS, LANGUAGE_OPTIONS, LEXICON_MAKE_MAX_LENGTH, LEXICON_MEANING_MAX_LENGTH, LEXICON_TERM_MAX_LENGTH,
  needsMake, type TermDraft,
} from './lexiconRules';

interface Props {
  label: string;
  initial: TermDraft;
  submitLabel: string;
  // Terim yalnız yeni terim formunda yazılır; onay ve düzenlemede sabittir.
  termEditable?: boolean;
  // Ortak satır seçeneği yalnız platform yöneticisine gösterilir (yeni terim formu).
  offerGlobal?: boolean;
  onSubmit: (draft: TermDraft, isGlobal: boolean) => Promise<void>;
  onCancel: () => void;
}

// Sözlük satırı formu: terim, anlam, tür, marka (yalnız araç modeli) ve dil. Onay, düzenleme ve yeni terim aynı formu kullanır.
// Sunucu reddederse (403 yetki, 409 çakışma, 400 kural) mesaj formda görünür.
export function LexiconTermForm({ label, initial, submitLabel, termEditable = false, offerGlobal = false, onSubmit, onCancel }: Props) {
  const [draft, setDraft] = useState<TermDraft>(initial);
  const [isGlobal, setIsGlobal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const error = draftError(draft, termEditable);
  const edited = draft.meaning !== initial.meaning || draft.term !== initial.term;
  const shownError = serverError ?? (edited ? error : null);
  const set = <K extends keyof TermDraft>(field: K, value: TermDraft[K]) => {
    setServerError(null);
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const submit = async () => {
    if (error || busy) return;
    setBusy(true);
    try {
      await onSubmit(draft, isGlobal);
    } catch (e) {
      setServerError(describeError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      aria-label={label}
      onSubmit={(e) => { e.preventDefault(); void submit(); }}
      className="flex flex-col gap-3 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {termEditable && (
          <label className="min-w-0">
            <span className={labelClass}>Terim (müşterinin yazımı)</span>
            <input value={draft.term} maxLength={LEXICON_TERM_MAX_LENGTH} onChange={(e) => set('term', e.target.value)} className={compactInputClass} />
          </label>
        )}
        <label className="min-w-0">
          <span className={labelClass}>Anlam (doğru karşılığı)</span>
          <input value={draft.meaning} maxLength={LEXICON_MEANING_MAX_LENGTH} onChange={(e) => set('meaning', e.target.value)} className={compactInputClass} />
        </label>
        <label className="min-w-0">
          <span className={labelClass}>Tür</span>
          <select value={draft.kind} onChange={(e) => set('kind', Number(e.target.value) as LexiconKind)} className={compactInputClass}>
            {KIND_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        {needsMake(draft.kind) && (
          <label className="min-w-0">
            <span className={labelClass}>Marka</span>
            <input value={draft.make} maxLength={LEXICON_MAKE_MAX_LENGTH} onChange={(e) => set('make', e.target.value)} className={compactInputClass} />
          </label>
        )}
        <label className="min-w-0">
          <span className={labelClass}>Dil</span>
          <select value={draft.language} onChange={(e) => set('language', e.target.value)} className={compactInputClass}>
            {LANGUAGE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
      </div>
      {offerGlobal && (
        <label className="flex cursor-pointer items-center gap-2 text-ui-xs text-fg-muted">
          <input type="checkbox" checked={isGlobal} onChange={(e) => setIsGlobal(e.target.checked)} />
          Tüm hesaplara ortak satır olarak ekle
        </label>
      )}
      {shownError && <p role="alert" className="m-0 text-[11px] text-rose-500">{shownError}</p>}
      <div className="flex items-center gap-2">
        <button type="submit" disabled={busy || error !== null} className={primaryButtonClass}>{submitLabel}</button>
        <button type="button" onClick={onCancel} className={secondaryButtonClass}>Vazgeç</button>
      </div>
    </form>
  );
}
