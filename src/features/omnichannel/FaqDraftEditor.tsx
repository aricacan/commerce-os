'use client';

import { useState, type ReactNode } from 'react';
import type { FaqDraftDto, FaqDraftUpdateBody } from '../../lib/api/omnichannel-learning';
import { LearningButton } from './LearningParts';
import { textareaClass } from './formClasses';

// Sunucudaki sınırlarla aynı (FaqDraftUpdateDto).
const TITLE_MAX = 128;
const ANSWER_MAX = 2000;
const MIN_TEXT = 2;

// SSS taslağını onaydan önce düzeltme formu. Cevap temsilcinin dilinde gelir; diğer dili
// eklemek isteğe bağlı (boş dil o dildeki müşteride eşleşmez; Arnavutça boşsa İngilizceye düşer).
export function FaqDraftEditor({ draft, busy, onSave, onCancel }: {
  draft: FaqDraftDto; busy: boolean; onSave: (body: FaqDraftUpdateBody) => void; onCancel: () => void;
}) {
  const [title, setTitle] = useState(draft.title);
  const [triggers, setTriggers] = useState(draft.triggers.join('\n'));
  const [answerTr, setAnswerTr] = useState(draft.answerTr ?? '');
  const [answerEn, setAnswerEn] = useState(draft.answerEn ?? '');
  const [answerSq, setAnswerSq] = useState(draft.answerSq ?? '');

  const hasAnswer = [answerTr, answerEn, answerSq].some((answer) => answer.trim().length >= MIN_TEXT);
  const valid = title.trim().length >= MIN_TEXT && triggers.trim().length >= MIN_TEXT && hasAnswer;

  const save = () => onSave({
    title: title.trim(),
    triggers,
    answerTr: answerTr.trim() || null,
    answerEn: answerEn.trim() || null,
    answerSq: answerSq.trim() || null,
  });

  return (
    <div className="flex flex-col gap-2">
      <Field label="Başlık">
        <input value={title} maxLength={TITLE_MAX} onChange={(e) => setTitle(e.target.value)} className={textareaClass} />
      </Field>
      <Field label="Tetikleyiciler (satır başına bir)">
        <textarea rows={3} value={triggers} onChange={(e) => setTriggers(e.target.value)} className={textareaClass} />
      </Field>
      <Field label="Cevap (Türkçe)">
        <textarea rows={3} value={answerTr} maxLength={ANSWER_MAX} onChange={(e) => setAnswerTr(e.target.value)} className={textareaClass} />
      </Field>
      <Field label="Cevap (İngilizce)">
        <textarea rows={3} value={answerEn} maxLength={ANSWER_MAX} onChange={(e) => setAnswerEn(e.target.value)} className={textareaClass} />
      </Field>
      <Field label="Arnavutça cevap (Kosova)">
        <textarea rows={3} value={answerSq} maxLength={ANSWER_MAX} onChange={(e) => setAnswerSq(e.target.value)} className={textareaClass} />
      </Field>
      <div className="flex gap-2">
        <LearningButton tone="primary" disabled={!valid || busy} onClick={save}>Kaydet</LearningButton>
        <LearningButton disabled={busy} onClick={onCancel}>Vazgeç</LearningButton>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold text-[var(--fg-muted)]">{label}</span>
      {children}
    </label>
  );
}
