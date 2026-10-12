'use client';

import { useState } from 'react';
import { Pencil, Power } from 'lucide-react';
import { qualityApi, type ApprovedAnswerDto, type ApprovedAnswerPatch } from '../../lib/api/omnichannel-quality';
import { describeError } from '../../lib/errors';
import { useFeedback } from '../shared/Feedback';
import { formatTraceTime } from './botTraceRules';
import { primaryButtonClass, secondaryButtonClass, textareaClass } from './formClasses';
import { QualityField } from './QualityField';

interface Props {
  answer: ApprovedAnswerDto;
  onChanged: () => void;
}

// Tek onaylı cevap: soru ve cevap (yerinde düzenlenir), kanal/ülke/dil künyesi, aç/kapat.
export function ApprovedAnswerRow({ answer, onChanged }: Props) {
  const { notify } = useFeedback();
  const [editing, setEditing] = useState(false);
  const [question, setQuestion] = useState(answer.question);
  const [text, setText] = useState(answer.answer);
  const [busy, setBusy] = useState(false);

  const save = async (patch: ApprovedAnswerPatch, success: string) => {
    setBusy(true);
    try {
      await qualityApi.updateApprovedAnswer(answer.id, patch);
      notify.success(success);
      setEditing(false);
      onChanged();
    } catch (e) {
      notify.error(describeError(e));
    } finally {
      setBusy(false);
    }
  };

  const facts = [answer.channelName ?? 'Tüm kanallar', answer.country, answer.language.toUpperCase(), formatTraceTime(answer.updatedAt)]
    .filter(Boolean).join(' · ');

  return (
    <li className={`flex min-w-0 flex-col gap-2 rounded-xl border border-border-soft bg-card p-3 ${answer.isActive ? '' : 'opacity-60'}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-ui-2xs text-fg-subtle">{facts}{answer.isActive ? '' : ' · kapalı'}</span>
        <div className="flex gap-2">
          {!editing && (
            <button type="button" className={secondaryButtonClass} onClick={() => setEditing(true)} disabled={busy}>
              <Pencil size={13} aria-hidden /> Düzenle
            </button>
          )}
          <button
            type="button" className={secondaryButtonClass} disabled={busy}
            onClick={() => void save({ isActive: !answer.isActive }, answer.isActive ? 'Cevap kapatıldı.' : 'Cevap açıldı.')}
          >
            <Power size={13} aria-hidden /> {answer.isActive ? 'Kapat' : 'Aç'}
          </button>
        </div>
      </div>

      {editing ? (
        <div className="flex flex-col gap-2">
          <QualityField label="Soru">
            <textarea rows={2} value={question} onChange={(e) => setQuestion(e.target.value)} className={textareaClass} />
          </QualityField>
          <QualityField label="Cevap">
            <textarea rows={4} value={text} onChange={(e) => setText(e.target.value)} className={textareaClass} />
          </QualityField>
          <div className="flex justify-end gap-2">
            <button type="button" className={secondaryButtonClass} disabled={busy} onClick={() => setEditing(false)}>Vazgeç</button>
            <button
              type="button" className={primaryButtonClass} disabled={busy || !question.trim() || !text.trim()}
              onClick={() => void save({ question, answer: text }, 'Cevap güncellendi.')}
            >
              Kaydet
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="m-0 whitespace-pre-wrap break-words text-ui-xs text-fg">
            <span className="font-semibold text-fg-muted">Soru: </span>{answer.question}
          </p>
          <p className="m-0 whitespace-pre-wrap break-words text-ui-xs text-fg">
            <span className="font-semibold text-fg-muted">Cevap: </span>{answer.answer}
          </p>
        </>
      )}
    </li>
  );
}
