'use client';

import { useState } from 'react';
import { Check, X } from 'lucide-react';
import type { QualityBulkItemResultDto } from '../../lib/api/omnichannel-quality';
import { describeError } from '../../lib/errors';
import { useFeedback } from '../shared/Feedback';
import { primaryButtonClass, secondaryButtonClass } from './formClasses';

interface Props {
  count: number;
  onRun: (approve: boolean, addToLibrary: boolean) => Promise<QualityBulkItemResultDto[]>;
}

// Seçili adaylar için toplu karar. Toplu onayda doğru cevap adayın temsilci cevabıdır; cevabı olmayan aday atlanır
// ve sayısı bildirilir (tek tek onaylanmalı).
export function QualityBulkBar({ count, onRun }: Props) {
  const { notify, confirm } = useFeedback();
  const [addToLibrary, setAddToLibrary] = useState(false);
  const [busy, setBusy] = useState(false);

  const run = async (approve: boolean) => {
    if (!approve && !await confirm({ title: `${count} aday reddedilsin mi?`, confirmLabel: 'Reddet', danger: true })) return;
    setBusy(true);
    try {
      const results = await onRun(approve, addToLibrary);
      const done = results.filter((r) => r.outcome === 'Approved' || r.outcome === 'Rejected').length;
      const needsAnswer = results.filter((r) => r.outcome === 'NeedsAnswer').length;
      notify.success(needsAnswer > 0
        ? `${done} aday işlendi; ${needsAnswer} adayda doğru cevap yok, tek tek onaylayın.`
        : `${done} aday işlendi.`);
    } catch (e) {
      notify.error(describeError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div role="region" aria-label="Toplu işlem" className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-bg-subtle px-3 py-2">
      <span className="text-ui-xs font-semibold text-fg">{count} aday seçildi</span>
      <label className="flex cursor-pointer items-center gap-1.5 text-ui-xs text-fg-muted">
        <input type="checkbox" checked={addToLibrary} onChange={(e) => setAddToLibrary(e.target.checked)} />
        Kütüphaneye de ekle
      </label>
      <div className="ml-auto flex gap-2">
        <button type="button" className={secondaryButtonClass} disabled={busy} onClick={() => void run(false)}>
          <X size={13} aria-hidden /> Reddet
        </button>
        <button type="button" className={primaryButtonClass} disabled={busy} onClick={() => void run(true)}>
          <Check size={13} aria-hidden /> Temsilci cevabıyla onayla
        </button>
      </div>
    </div>
  );
}
