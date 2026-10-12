'use client';

import { useId, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Send } from 'lucide-react';
import { focusRing, motionFast } from '../shared/design';
import { CONSULT_INSTRUCTION_MAX_LENGTH } from './consultationRules';

// Karakter sayacı yalnız sınıra yaklaşınca görünür: kart kısa kalsın.
const COUNTER_VISIBLE_FROM = 400;

interface Props {
  disabled: boolean;
  sending: boolean;
  onSubmit: (instruction: string) => void;
}

// "Diğer": temsilci kendi Türkçe talimatını yazar, bot müşterinin dilinde cevabı yazıp gönderir.
export function ConsultationFreeForm({ disabled, sending, onSubmit }: Props) {
  const [text, setText] = useState('');
  const inputId = useId();
  const instruction = text.trim();
  const canSend = instruction !== '' && !disabled;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (canSend) onSubmit(instruction);
  };

  // Enter yeni satırdır (talimat uzun olabilir); Ctrl/Cmd+Enter gönderir.
  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey) && canSend) {
      event.preventDefault();
      onSubmit(instruction);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-ui-xs font-semibold text-fg-muted">
        Diğer — kendi talimatın (bot müşterinin diliyle yazıp gönderir)
      </label>
      <div className={`flex items-end gap-1 rounded-xl border border-border bg-card p-1.5 focus-within:border-fg/40 focus-within:ring-2 focus-within:ring-fg/10 ${motionFast}`}>
        <textarea
          id={inputId}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={CONSULT_INSTRUCTION_MAX_LENGTH}
          disabled={disabled}
          rows={2}
          placeholder="örn. bu müşteriyi geçiştir, 38 euro söyle"
          className="min-h-10 min-w-0 flex-1 resize-none border-0 bg-transparent px-2 py-1.5 font-[inherit] text-base leading-snug text-fg outline-none placeholder:text-fg-subtle disabled:opacity-50 md:text-ui-md"
        />
        <button
          type="submit"
          disabled={!canSend}
          aria-label="Talimatı gönder"
          className={`flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-fg text-bg hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-40 md:size-9 ${motionFast} ${focusRing}`}
        >
          <Send size={16} aria-hidden />
        </button>
      </div>
      {(sending || text.length >= COUNTER_VISIBLE_FROM) && (
        <span className="flex justify-between gap-2 text-ui-2xs text-fg-subtle">
          <span>{sending ? 'Cevap hazırlanıyor…' : ''}</span>
          <span className="tabular-nums">{text.length}/{CONSULT_INSTRUCTION_MAX_LENGTH}</span>
        </span>
      )}
    </form>
  );
}
