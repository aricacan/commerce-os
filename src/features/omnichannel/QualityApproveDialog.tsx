'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import type { ApproveCandidateInput, QualityCandidateDto } from '../../lib/api/omnichannel-quality';
import { describeError } from '../../lib/errors';
import { dialogCloseButtonClass, labelClass, primaryButtonClass, secondaryButtonClass, textareaClass } from './formClasses';
import { OmniDialogShell } from './OmniDialogShell';
import { splitTokens } from './qualityCenterRules';

interface Props {
  candidate: QualityCandidateDto;
  onClose: () => void;
  onApprove: (input: ApproveCandidateInput) => Promise<void>;
}

// Adayı onaylama penceresi: doğru cevap (temsilcinin gönderdiği cevapla dolu gelir, düzenlenebilir), beklenen davranış
// (cevapta geçmeli / geçmemeli) ve onaylı cevap kütüphanesine ekleme. Onay altın senaryo üretir.
export function QualityApproveDialog({ candidate, onClose, onApprove }: Props) {
  const [answer, setAnswer] = useState(candidate.suggestedAnswer ?? '');
  const [mustContain, setMustContain] = useState('');
  const [mustNotContain, setMustNotContain] = useState('');
  const [addToLibrary, setAddToLibrary] = useState(candidate.suggestedAnswer !== null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      await onApprove({
        expectedAnswer: answer.trim(), mustContain: splitTokens(mustContain), mustNotContain: splitTokens(mustNotContain), addToLibrary,
      });
    } catch (e) {
      setError(describeError(e));
      setSaving(false);
    }
  };

  return (
    <OmniDialogShell
      onClose={onClose} ariaLabel="Adayı onayla" closeOnEscape
      panelClassName="flex max-h-[90vh] w-full max-w-xl flex-col gap-3 overflow-y-auto rounded-xl border border-border bg-card p-5 shadow-lg"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <h3 className="m-0 text-ui-sm font-bold text-fg">Adayı onayla</h3>
          <p className="m-0 text-ui-xs text-fg-muted">Senaryo, konuşmanın bu turundaki müşteri mesajlarından kurulur.</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Kapat" className={dialogCloseButtonClass}><X size={16} aria-hidden /></button>
      </div>

      <p className="m-0 whitespace-pre-wrap break-words rounded-lg bg-bg-subtle px-3 py-2 text-ui-xs text-fg">
        <span className="font-semibold text-fg-muted">Müşteri: </span>{candidate.customerText || '—'}
      </p>

      <label className="flex flex-col">
        <span className={labelClass}>Doğru cevap</span>
        <textarea rows={5} value={answer} onChange={(e) => setAnswer(e.target.value)} className={textareaClass} />
      </label>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="flex flex-col">
          <span className={labelClass}>Cevapta geçmeli</span>
          <textarea rows={2} value={mustContain} onChange={(e) => setMustContain(e.target.value)} placeholder="virgülle ayırın" className={textareaClass} />
        </label>
        <label className="flex flex-col">
          <span className={labelClass}>Cevapta geçmemeli</span>
          <textarea rows={2} value={mustNotContain} onChange={(e) => setMustNotContain(e.target.value)} placeholder="virgülle ayırın" className={textareaClass} />
        </label>
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-ui-xs text-fg">
        <input type="checkbox" checked={addToLibrary} onChange={(e) => setAddToLibrary(e.target.checked)} />
        Onaylı cevaplar kütüphanesine de ekle (bot benzer soruda bu cevabı kullanabilir)
      </label>

      {error && <p role="alert" className="m-0 text-ui-xs text-danger">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" className={secondaryButtonClass} onClick={onClose} disabled={saving}>Vazgeç</button>
        <button type="button" className={primaryButtonClass} onClick={() => void submit()} disabled={saving || !answer.trim()}>
          {saving ? 'Kaydediliyor…' : 'Onayla ve senaryo oluştur'}
        </button>
      </div>
    </OmniDialogShell>
  );
}
