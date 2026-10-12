'use client';

import { useState } from 'react';
import { Pin, PinOff, Trash2 } from 'lucide-react';
import { customersApi, type CustomerProfileDto } from '../../lib/api/customers';
import { describeError } from '../../lib/errors';
import { useFeedback } from '../shared/Feedback';
import { EmptyLine, PanelSection, formatPanelDate, iconButtonClass, primaryButtonClass } from './CustomerPanelParts';

interface Props {
  profile: CustomerProfileDto;
  readOnly: boolean;
  onChanged: () => Promise<void>;
}

const MAX_NOTE_LENGTH = 4000;

// Temsilci notları — ekip içi, müşteriye gitmez. Sabitlenen not en üstte durur.
export function CustomerNotesSection({ profile, readOnly, onChanged }: Props) {
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const { notify, confirm } = useFeedback();

  const run = async (action: () => Promise<unknown>) => {
    try {
      await action();
      await onChanged();
    } catch (e) {
      notify.error(describeError(e));
    }
  };

  const add = async () => {
    setSaving(true);
    await run(async () => {
      await customersApi.addNote(profile.id, body.trim());
      setBody('');
    });
    setSaving(false);
  };

  const remove = async (noteId: number) => {
    if (!await confirm({ title: 'Not silinsin mi?', confirmLabel: 'Sil', danger: true })) return;
    await run(() => customersApi.deleteNote(profile.id, noteId));
  };

  return (
    <PanelSection title="Notlar" count={profile.notes.length}>
      {!readOnly && (
        <div className="flex flex-col gap-1.5">
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={2} maxLength={MAX_NOTE_LENGTH}
            placeholder="Ekip içi not (müşteriye gitmez)…"
            className="w-full resize-y rounded-[4px] border border-[var(--border)] bg-[var(--bg)] p-2 text-xs text-[var(--fg)] outline-none focus:border-[var(--fg)]" />
          <div className="flex justify-end">
            <button type="button" className={primaryButtonClass} disabled={saving || !body.trim()} onClick={() => void add()}>
              Not ekle
            </button>
          </div>
        </div>
      )}
      {profile.notes.length === 0 && <EmptyLine>Henüz not yok.</EmptyLine>}
      <ul className="flex flex-col gap-2">
        {profile.notes.map((n) => (
          <li key={n.id} className={`flex flex-col gap-1 rounded-[4px] border p-2 ${
            n.isPinned ? 'border-amber-500/40 bg-amber-500/5' : 'border-[var(--border-soft)]'
          }`}>
            <p className="whitespace-pre-wrap break-words text-xs text-[var(--fg)]">{n.body}</p>
            <div className="flex items-center gap-1 text-[10.5px] text-[var(--fg-muted)]">
              <span className="min-w-0 flex-1 truncate">{n.authorName ?? 'Bilinmeyen'} · {formatPanelDate(n.createdAt, true)}</span>
              {!readOnly && (
                <>
                  <button type="button" className={iconButtonClass} title={n.isPinned ? 'Sabitlemeyi kaldır' : 'Sabitle'}
                    onClick={() => void run(() => customersApi.pinNote(profile.id, n.id, !n.isPinned))}>
                    {n.isPinned ? <PinOff size={12} /> : <Pin size={12} />}
                  </button>
                  <button type="button" className={iconButtonClass} title="Sil" onClick={() => void remove(n.id)}>
                    <Trash2 size={12} />
                  </button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
    </PanelSection>
  );
}
