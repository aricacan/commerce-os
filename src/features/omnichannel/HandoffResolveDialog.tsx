'use client';

import { useId, useState, type FormEvent } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { HANDOFF_OUTCOME, type HandoffOutcome } from '../../lib/api/handoff';
import { focusRing, motionFast, surfaceCard } from '../shared/design';
import { OmniDialogShell } from './OmniDialogShell';
import { RESOLVE_OUTCOMES } from './handoffRules';

interface Props {
  // Kaç devir kapatılıyor (toplu işlemde > 1).
  count: number;
  busy: boolean;
  onConfirm: (outcome: HandoffOutcome, note: string) => void;
  onClose: () => void;
}

const NOTE_MAX_LENGTH = 2000;

// Devri kapatırken sonuç zorunlu (Çözüldü / Bota geri ver / Kapat), not isteğe bağlı. Sonucun konuşmaya ve bota
// etkisi seçeneğin altında yazar — temsilci neyi tetiklediğini bilsin.
export function HandoffResolveDialog({ count, busy, onConfirm, onClose }: Props) {
  const [outcome, setOutcome] = useState<HandoffOutcome>(HANDOFF_OUTCOME.Solved);
  const [note, setNote] = useState('');
  const noteId = useId();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!busy) onConfirm(outcome, note);
  };

  return (
    <OmniDialogShell onClose={onClose} ariaLabel="Devri sonuçlandır" closeOnEscape
      panelClassName={`${surfaceCard} w-full max-w-md p-5`}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 size={16} className="text-fg-muted" aria-hidden />
          <h2 className="m-0 flex-1 text-ui-md font-bold text-fg">
            {count > 1 ? `${count} devri sonuçlandır` : 'Devri sonuçlandır'}
          </h2>
          <button type="button" onClick={onClose} aria-label="Kapat"
            className={`flex size-8 items-center justify-center rounded-lg text-fg-muted hover:bg-bg-subtle ${motionFast} ${focusRing}`}>
            <X size={14} aria-hidden />
          </button>
        </div>

        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
          <legend className="mb-1 text-ui-xs font-semibold text-fg-muted">Sonuç</legend>
          {RESOLVE_OUTCOMES.map((option) => (
            <label key={option.value}
              className={`flex cursor-pointer gap-3 rounded-xl border p-3 ${motionFast} ${
                outcome === option.value ? 'border-fg/40 bg-bg-subtle' : 'border-border-soft hover:bg-bg-subtle'}`}>
              <input type="radio" name="outcome" checked={outcome === option.value}
                onChange={() => setOutcome(option.value)} className="mt-0.5 size-4 accent-[var(--fg)]" />
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-ui-sm font-semibold text-fg">{option.label}</span>
                <span className="text-ui-xs text-fg-muted">{option.hint}</span>
              </span>
            </label>
          ))}
        </fieldset>

        <div className="flex flex-col gap-1">
          <label htmlFor={noteId} className="text-ui-xs font-semibold text-fg-muted">Not (isteğe bağlı)</label>
          <textarea id={noteId} value={note} onChange={(e) => setNote(e.target.value)} maxLength={NOTE_MAX_LENGTH} rows={3}
            placeholder="örn. Telefonla görüşüldü, sipariş alındı."
            className="w-full resize-y rounded-xl border border-border bg-card px-3 py-2 text-ui-sm text-fg outline-none focus:border-fg/40 focus:ring-2 focus:ring-fg/10" />
        </div>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose}
            className={`h-9 rounded-lg border border-border px-3 text-ui-sm font-semibold text-fg hover:bg-bg-subtle ${motionFast} ${focusRing}`}>
            Vazgeç
          </button>
          <button type="submit" disabled={busy}
            className={`h-9 rounded-lg bg-fg px-3 text-ui-sm font-semibold text-bg hover:opacity-85 disabled:opacity-40 ${motionFast} ${focusRing}`}>
            {busy ? 'Kaydediliyor…' : 'Sonuçlandır'}
          </button>
        </div>
      </form>
    </OmniDialogShell>
  );
}
