'use client';

import { useState, type KeyboardEvent } from 'react';
import { Plus, X } from 'lucide-react';
import { compactInputClass, labelClass, secondaryButtonClass } from './formClasses';

interface Props {
  id: string;
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
}

// Menü tetikleyicileri: her ifade ayrı satır (sil düğmeli), altta ekleme formu. Uzun ifade kesilmez, sarar.
export function TriggerListEditor({ id, label, value, onChange }: Props) {
  const [draft, setDraft] = useState('');
  const triggers = value.filter((t) => t.trim() !== '');

  const add = () => {
    const phrase = draft.trim();
    if (phrase === '') return;
    if (!triggers.some((t) => t.toLocaleLowerCase('tr') === phrase.toLocaleLowerCase('tr'))) onChange([...triggers, phrase]);
    setDraft('');
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    add();
  };

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className={labelClass}>{label}</label>
      {triggers.length === 0 ? (
        <p className="m-0 text-[11px] text-[var(--fg-muted)]">Henüz ifade yok.</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {triggers.map((trigger, index) => (
            <li
              key={`${trigger}-${index}`}
              className="flex min-w-0 items-start justify-between gap-2 rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)]/40 px-2.5 py-1.5"
            >
              <span className="min-w-0 break-words text-xs text-[var(--fg)]">{trigger}</span>
              <button
                type="button"
                aria-label={`"${trigger}" ifadesini sil`}
                onClick={() => onChange(triggers.filter((_, i) => i !== index))}
                className="inline-flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-[4px] text-[var(--fg-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--fg)]"
              >
                <X size={12} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex min-w-0 gap-2">
        <input
          id={id}
          value={draft}
          placeholder="Yeni ifade, Enter ile ekle"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKey}
          className={`${compactInputClass} min-w-0 flex-1`}
        />
        <button type="button" onClick={add} disabled={draft.trim() === ''} className={secondaryButtonClass}>
          <Plus size={13} aria-hidden /> Ekle
        </button>
      </div>
    </div>
  );
}
