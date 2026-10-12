'use client';

import { useState } from 'react';
import { Check, Pencil, X } from 'lucide-react';
import { learningApi, type FaqDraftDto, type FaqDraftUpdateBody } from '../../lib/api/omnichannel-learning';
import { EvidenceCount, LearningButton } from './LearningParts';
import { FaqDraftEditor } from './FaqDraftEditor';
import { useLearningAction } from './useLearningAction';
import { useIsOmnichannelAdmin } from './useIsOmnichannelAdmin';

// Temsilcinin cevabından çıkarılmış SSS taslağı. Onaylanınca gerçek SSS kaydı olur ve bot
// answer_faq aracıyla bu cevabı vermeye başlar — o yüzden metin önce burada okunur.
export function FaqDraftItem({ draft, onChanged }: { draft: FaqDraftDto; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const { busy, run } = useLearningAction(onChanged);
  // Onay/düzenleme yalnız yönetici rollerinde (backend FaqEditorRoles); diğerleri okur ve reddedebilir.
  const canEdit = useIsOmnichannelAdmin();

  const save = (body: FaqDraftUpdateBody) =>
    void run(async () => {
      await learningApi.updateFaqDraft(draft.id, body);
      setEditing(false);
    }, 'Taslak güncellendi.');

  return (
    <article className="flex flex-col gap-2 border-b border-[var(--border-soft)] py-3 last:border-b-0">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[var(--fg-muted)]">
          Müşteri: <span className="text-[var(--fg)]">&ldquo;{draft.question}&rdquo;</span> <EvidenceCount count={draft.evidenceCount} />
        </span>
        <span className="shrink-0 rounded-[3px] border border-[var(--border-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--fg-muted)]">SSS taslağı</span>
      </div>

      {editing
        ? <FaqDraftEditor draft={draft} busy={busy} onSave={save} onCancel={() => setEditing(false)} />
        : <DraftPreview draft={draft} />}

      {!editing && (
        <div className="flex flex-wrap gap-2">
          {canEdit && (
            <>
              <LearningButton
                tone="primary" disabled={busy}
                onClick={() => void run(() => learningApi.approveFaqDraft(draft.id), 'SSS eklendi; bot bu soruya artık bu cevabı verebilir.')}
              >
                <Check size={12} /> Onayla
              </LearningButton>
              <LearningButton disabled={busy} onClick={() => setEditing(true)}><Pencil size={12} /> Düzenle</LearningButton>
            </>
          )}
          <LearningButton
            tone="danger" disabled={busy}
            onClick={() => void run(() => learningApi.reject(draft.id), 'Taslak reddedildi.')}
          >
            <X size={12} /> Reddet
          </LearningButton>
        </div>
      )}
    </article>
  );
}

function DraftPreview({ draft }: { draft: FaqDraftDto }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-[4px] bg-[var(--bg-subtle)] p-3">
      <span className="font-semibold text-[var(--fg)]">{draft.title}</span>
      {draft.answerTr && <p className="whitespace-pre-line text-[var(--fg)]">{draft.answerTr}</p>}
      {draft.answerEn && <p className="whitespace-pre-line text-[var(--fg)]"><span className="font-mono text-[10px] text-[var(--fg-muted)]">EN </span>{draft.answerEn}</p>}
      {draft.answerSq && <p className="whitespace-pre-line text-[var(--fg)]"><span className="font-mono text-[10px] text-[var(--fg-muted)]">SQ </span>{draft.answerSq}</p>}
      <div className="flex flex-wrap gap-1">
        {draft.triggers.map((t) => (
          <span key={t} className="rounded-[3px] border border-[var(--border-soft)] bg-[var(--card)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--fg-muted)]">{t}</span>
        ))}
      </div>
    </div>
  );
}
