'use client';

import { Sparkles } from 'lucide-react';
import type { LearningSuggestionsDto } from '../../lib/api/omnichannel-learning';
import { LearningCard, LearningEmpty } from './LearningParts';
import { FaqDraftItem } from './FaqDraftItem';
import { AliasSuggestionItem } from './AliasSuggestionItem';
import { AutoLearnedItem } from './AutoLearnedItem';

// Sunucudaki AliasConfidence.AutoApplyMinOccurrences ile aynı.
const AUTO_APPLY_MIN_OCCURRENCES = 3;

// Öğrenme v2 — "önerir + emin olunca uygular": özet satırı, onay kuyruğu ve botun kendi
// öğrendikleri (geri alınabilir).
export function LearningQueue({ data, onChanged }: { data: LearningSuggestionsDto; onChanged: () => void }) {
  const hasPending = data.faqDrafts.length > 0 || data.aliasSuggestions.length > 0;

  return (
    <>
      <p className="inline-flex items-center gap-1.5 rounded-[4px] bg-[var(--bg-subtle)] px-3 py-2 text-[var(--fg)]">
        <Sparkles size={13} className="text-[var(--fg-muted)]" />
        <span>
          Bu hafta <strong>{data.autoAppliedThisWeek}</strong> kelime otomatik öğrenildi,{' '}
          <strong>{data.pendingCount}</strong> öneri onay bekliyor.
        </span>
      </p>

      <LearningCard
        title={`Onay bekleyen öğrenmeler (${data.pendingCount})`}
        hint="Temsilci cevaplarından çıkan SSS taslakları ve emin olunamayan sözlük önerileri. SSS taslakları onaylanmadan müşteriye gitmez."
      >
        {!hasPending && <LearningEmpty text="Onay bekleyen öneri yok." />}
        {data.faqDrafts.map((d) => <FaqDraftItem key={d.id} draft={d} onChanged={onChanged} />)}
        {data.aliasSuggestions.map((s) => <AliasSuggestionItem key={s.id} suggestion={s} onChanged={onChanged} />)}
      </LearningCard>

      <LearningCard
        title="Bot kendisi öğrendi"
        hint={`Aynı kelime en az ${AUTO_APPLY_MIN_OCCURRENCES} kez geçti ve katalogda tek karşılığı vardı; bot eşlemeyi kendisi ekledi.`}
      >
        {data.autoApplied.length === 0 && <LearningEmpty text="Henüz otomatik öğrenilen kelime yok." />}
        {data.autoApplied.map((a) => <AutoLearnedItem key={a.id} item={a} onChanged={onChanged} />)}
      </LearningCard>
    </>
  );
}
