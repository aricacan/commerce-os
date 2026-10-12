'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Sparkles } from 'lucide-react';
import type { GoldCandidateDto } from '../../lib/api/omnichannel-gold';
import { describeError } from '../../lib/errors';
import { useFeedback } from '../shared/Feedback';
import { primaryButtonClass } from './formClasses';
import { GOLD_CANDIDATE_DAYS, goldLanguageLabel } from './goldSetRules';
import { useGoldCandidates } from './useGoldCandidates';

const badgeClass = 'rounded bg-bg-subtle px-1.5 py-0.5 text-[10.5px] font-semibold text-fg-muted';

// "Aday öner" (P35): son günlerin gerçek temsilci cevapları, en faydalıdan başlayarak ve dil/ülke dengeli.
// Önizleme sunucuda maskelenmiştir. Varsayılan kapalıdır; ilk açılışta yüklenir.
export function GoldCandidatesSection({ onAdded }: { onAdded: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const { candidates, selected, loading, adding, error, load, toggle, addSelected } = useGoldCandidates(onAdded);
  const { notify } = useFeedback();

  const handleOpen = () => {
    setOpen((wasOpen) => !wasOpen);
    if (candidates === null && !loading) void load();
  };

  const handleAdd = async () => {
    try {
      const summary = await addSelected();
      if (summary) notify.success(summary);
    } catch (e) {
      notify.error(describeError(e));
    }
  };

  const Chevron = open ? ChevronDown : ChevronRight;

  return (
    <section className="flex min-w-0 flex-col gap-2">
      <button
        type="button" onClick={handleOpen} aria-expanded={open}
        className="flex w-fit cursor-pointer items-center gap-1.5 bg-transparent p-0 text-ui-sm font-bold text-fg"
      >
        <Chevron size={14} aria-hidden />
        <Sparkles size={14} className="text-fg-muted" aria-hidden />
        Aday öner
      </button>

      {open && (
        <div className="flex min-w-0 flex-col gap-2">
          <p className="m-0 text-ui-xs text-fg-muted">
            Son {GOLD_CANDIDATE_DAYS} günün temsilci cevapları. Müşterinin şikâyet ettiği cevaplar ve sette olanlar çıkmaz;
            kişisel veri maskelenmiştir.
          </p>
          {loading && <p className="m-0 text-ui-xs text-fg-muted">Adaylar aranıyor…</p>}
          {error && <p className="m-0 text-ui-xs text-danger">{error}</p>}
          {candidates?.length === 0 && <p className="m-0 text-ui-xs text-fg-muted">Önerilecek aday bulunamadı.</p>}

          {candidates && candidates.length > 0 && (
            <>
              <CandidateList candidates={candidates} selected={selected} onToggle={toggle} />
              <button
                type="button" onClick={() => void handleAdd()} disabled={adding || selected.length === 0}
                className={`${primaryButtonClass} w-fit`}
              >
                {adding ? 'Ekleniyor…' : `Seçilenleri senaryolara ekle (${selected.length})`}
              </button>
            </>
          )}
        </div>
      )}
    </section>
  );
}

interface ListProps {
  candidates: readonly GoldCandidateDto[];
  selected: readonly number[];
  onToggle: (messageId: number) => void;
}

function CandidateList({ candidates, selected, onToggle }: ListProps) {
  return (
    <ul className="m-0 flex list-none flex-col divide-y divide-border-soft rounded-lg border border-border-soft bg-card p-0">
      {candidates.map((candidate) => (
        <li key={candidate.messageId}>
          <label className="flex cursor-pointer items-start gap-2.5 px-3 py-2">
            <input
              type="checkbox" checked={selected.includes(candidate.messageId)}
              onChange={() => onToggle(candidate.messageId)} className="mt-1 h-4 w-4 rounded-[3px]"
            />
            <span className="flex min-w-0 flex-col gap-1">
              <span className="text-ui-sm font-semibold text-fg">{candidate.customerPreview}</span>
              <span className="line-clamp-2 text-ui-xs text-fg-muted">{candidate.replyPreview}</span>
              <span className="flex flex-wrap gap-1">
                <span className={badgeClass}>{goldLanguageLabel(candidate.language)}</span>
                <span className={badgeClass}>{candidate.countryCode}</span>
              </span>
            </span>
          </label>
        </li>
      ))}
    </ul>
  );
}
