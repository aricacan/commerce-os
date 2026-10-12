'use client';

import { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { customerCrmApi, type CustomerMergeSuggestionDto } from '../../lib/api/customer-crm';
import type { CustomerProfileDto } from '../../lib/api/customers';
import { MergeSuggestionCard } from './MergeSuggestionCard';
import { useMergeSuggestionActions } from './useMergeSuggestionActions';

interface Props {
  profile: CustomerProfileDto;
  onChanged: () => Promise<void>;
  // Birleşmede açık profil silinmiş olabilir; panel kalan profile geçer.
  onReplaced: (survivor: CustomerProfileDto) => void;
}

// Profili içeren bekleyen "Aynı kişi mi?" önerileri. Yalnız sayı > 0 iken yüklenir; uç yoksa
// (eski backend) ya da hata olursa bant sessizce gizlenir — panelin geri kalanı çalışır.
export function CustomerMergeBanner({ profile, onChanged, onReplaced }: Props) {
  const [suggestions, setSuggestions] = useState<CustomerMergeSuggestionDto[]>([]);
  const pending = profile.pendingMergeSuggestions;

  useEffect(() => {
    if (pending === 0) return;
    let cancelled = false;
    customerCrmApi.profileMergeSuggestions(profile.id)
      .then((items) => { if (!cancelled) setSuggestions(items); })
      .catch(() => { if (!cancelled) setSuggestions([]); });
    return () => { cancelled = true; };
  }, [profile.id, pending]);

  const { accept, reject, busyId } = useMergeSuggestionActions({
    onAccepted: (survivor) => onReplaced(survivor),
    onRejected: async (suggestion) => {
      setSuggestions((prev) => prev.filter((s) => s.id !== suggestion.id));
      await onChanged();
    },
  });

  if (pending === 0 || suggestions.length === 0) return null;

  return (
    <section className="flex flex-col gap-3 border-b border-amber-500/30 bg-amber-500/5 px-4 py-3">
      <div className="flex items-start gap-2 text-xs">
        <Users size={14} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
        <div className="flex flex-col gap-0.5">
          <span className="font-bold text-[var(--fg)]">Aynı kişi olabilir</span>
          <span className="text-[10.5px] text-[var(--fg-muted)]">
            Benzer profil bulundu. Aynı kişiyse birleştir, değilse &quot;Farklı kişiler&quot; de.
          </span>
        </div>
      </div>
      {suggestions.map((suggestion) => (
        <MergeSuggestionCard key={suggestion.id} suggestion={suggestion} currentProfileId={profile.id}
          busy={busyId === suggestion.id}
          onAccept={(targetId) => void accept(suggestion, targetId)}
          onReject={() => void reject(suggestion)} />
      ))}
    </section>
  );
}
