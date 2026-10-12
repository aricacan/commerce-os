'use client';

import { useState } from 'react';
import { ArrowRight, Check, X } from 'lucide-react';
import { learningApi, type AliasLearningDto } from '../../lib/api/omnichannel-learning';
import { EvidenceCount, LearningButton } from './LearningParts';
import { useLearningAction } from './useLearningAction';

const PERCENT = 100;

// Düşük güvenli sözlük önerisi: birden çok katalog adayı var ya da kelime henüz az görüldü.
// Temsilci doğru karşılığı adaylardan seçer; onay Ürün Sözlüğü'ne kayıt açar.
export function AliasSuggestionItem({ suggestion, onChanged }: { suggestion: AliasLearningDto; onChanged: () => void }) {
  const [choice, setChoice] = useState(suggestion.correctTerm ?? suggestion.candidates[0] ?? '');
  const { busy, run } = useLearningAction(onChanged);

  return (
    <article className="flex flex-col gap-2 border-b border-[var(--border-soft)] py-3 last:border-b-0">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-2">
          <strong className="font-mono text-[var(--fg)]">{suggestion.wrongTerm}</strong>
          <ArrowRight size={12} className="text-[var(--fg-muted)]" />
          <EvidenceCount count={suggestion.evidenceCount} />
        </span>
        <span className="shrink-0 font-mono text-[10px] text-[var(--fg-muted)]">
          güven %{Math.round(suggestion.confidence * PERCENT)}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Doğru karşılık">
        {suggestion.candidates.map((candidate) => (
          <button
            key={candidate} type="button" role="radio" aria-checked={choice === candidate}
            onClick={() => setChoice(candidate)}
            className={`rounded-[4px] border px-2 py-1 font-mono text-[11px] transition cursor-pointer ${
              choice === candidate
                ? 'border-[var(--fg)] bg-[var(--fg)] text-[var(--bg)]'
                : 'border-[var(--border-soft)] text-[var(--fg)] hover:bg-[var(--bg-subtle)]'
            }`}
          >
            {candidate}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <LearningButton
          tone="primary" disabled={busy || choice.length === 0}
          onClick={() => void run(() => learningApi.approveAlias(suggestion.id, choice), `"${suggestion.wrongTerm}" → "${choice}" sözlüğe eklendi.`)}
        >
          <Check size={12} /> Onayla
        </LearningButton>
        <LearningButton
          tone="danger" disabled={busy}
          onClick={() => void run(() => learningApi.reject(suggestion.id), 'Öneri reddedildi.')}
        >
          <X size={12} /> Reddet
        </LearningButton>
      </div>
    </article>
  );
}
