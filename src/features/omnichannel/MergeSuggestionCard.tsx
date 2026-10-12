'use client';

import { useState } from 'react';
import { GitMerge, X } from 'lucide-react';
import type { CustomerMergeSuggestionDto } from '../../lib/api/customer-crm';
import { ToneBadge, ghostButtonClass, primaryButtonClass } from './CustomerPanelParts';
import { MergeCandidateCard } from './MergeCandidateCard';
import { mergeReasons, mergeScorePercent } from './customerProfileRules';

interface Props {
  suggestion: CustomerMergeSuggestionDto;
  busy: boolean;
  // Panelden açıldıysa açık olan profil "Bu profil" diye işaretlenir.
  currentProfileId?: number;
  onAccept: (targetProfileId: number) => void;
  onReject: () => void;
  onOpenProfile?: (profileId: number) => void;
}

// "Aynı kişi mi?" önerisi: benzerlik, gerekçeler ve iki profil yan yana. Varsayılan olarak eski
// profil (A) kalır; temsilci diğerini seçebilir.
export function MergeSuggestionCard({ suggestion, busy, currentProfileId, onAccept, onReject, onOpenProfile }: Props) {
  const [targetId, setTargetId] = useState(suggestion.profileA.profileId);
  const candidates = [suggestion.profileA, suggestion.profileB];

  return (
    <article className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1">
        <ToneBadge tone="amber">%{mergeScorePercent(suggestion.score)} benzer</ToneBadge>
        {mergeReasons(suggestion).map((reason) => <ToneBadge key={reason} tone="neutral">{reason}</ToneBadge>)}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {candidates.map((candidate) => (
          <MergeCandidateCard key={candidate.profileId} candidate={candidate} keep={candidate.profileId === targetId}
            isCurrent={candidate.profileId === currentProfileId} disabled={busy}
            onKeep={() => setTargetId(candidate.profileId)} onOpenProfile={onOpenProfile} />
        ))}
      </div>
      <div className="flex justify-end gap-1.5">
        <button type="button" className={ghostButtonClass} disabled={busy} onClick={onReject}>
          <X size={12} /> Farklı kişiler
        </button>
        <button type="button" className={primaryButtonClass} disabled={busy} onClick={() => onAccept(targetId)}>
          <GitMerge size={12} /> Birleştir
        </button>
      </div>
    </article>
  );
}
