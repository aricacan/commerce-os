'use client';

import { useState } from 'react';
import { customerCrmApi, type CustomerMergeSuggestionDto } from '../../lib/api/customer-crm';
import type { CustomerProfileDto } from '../../lib/api/customers';
import { describeError } from '../../lib/errors';
import { useFeedback } from '../shared/Feedback';

interface Options {
  onAccepted: (survivor: CustomerProfileDto, suggestion: CustomerMergeSuggestionDto) => void | Promise<void>;
  onRejected: (suggestion: CustomerMergeSuggestionDto) => void | Promise<void>;
}

const displayName = (name: string | null) => name ?? 'İsimsiz müşteri';

// "Aynı kişi mi?" önerisinin onay/ret akışı — panel bandı ve öneri kuyruğu aynı kuralı kullanır.
// Birleşme kolay geri alınmadığı için onay HER ZAMAN açık bir doğrulama penceresinden geçer.
export function useMergeSuggestionActions({ onAccepted, onRejected }: Options) {
  const [busyId, setBusyId] = useState<number | null>(null);
  const { notify, confirm } = useFeedback();

  const run = async (suggestionId: number, action: () => Promise<void>) => {
    setBusyId(suggestionId);
    try {
      await action();
    } catch (e) {
      notify.error(describeError(e));
    } finally {
      setBusyId(null);
    }
  };

  const accept = async (suggestion: CustomerMergeSuggestionDto, targetProfileId: number) => {
    const [keeper, source] = targetProfileId === suggestion.profileB.profileId
      ? [suggestion.profileB, suggestion.profileA]
      : [suggestion.profileA, suggestion.profileB];
    const ok = await confirm({
      title: 'Bu iki profil birleştirilsin mi?',
      body: `"${displayName(source.displayName)}" profili "${displayName(keeper.displayName)}" içine taşınır: kanallar, `
        + 'konuşmalar, notlar, araçlar ve siparişler tek profilde toplanır. Birleşme tek tıkla geri alınamaz; '
        + 'yanlışsa kanal kayıtları tek tek "Ayrı müşteri yap" ile ayrılmalıdır.',
      confirmLabel: 'Birleştir',
    });
    if (!ok) return;
    await run(suggestion.id, async () => {
      const survivor = await customerCrmApi.acceptMergeSuggestion(suggestion.id, keeper.profileId);
      notify.success('Profiller birleştirildi.');
      await onAccepted(survivor, suggestion);
    });
  };

  const reject = (suggestion: CustomerMergeSuggestionDto) => run(suggestion.id, async () => {
    await customerCrmApi.rejectMergeSuggestion(suggestion.id);
    notify.success('Öneri reddedildi; bu ikili bir daha önerilmez.');
    await onRejected(suggestion);
  });

  return { accept, reject, busyId };
}
