'use client';

import { useCallback, useState } from 'react';
import { goldApi } from '../../lib/api/omnichannel-gold';
import { describeError } from '../../lib/errors';
import { useFeedback } from '../shared/Feedback';

// Temsilci mesajını Kalite Merkezi senaryolarına ekler (P35). Sunucu aynı mesajı ikinci kez eklemez (mevcut senaryoyu döner);
// burada da eklenen mesaj hatırlanır ki düğme "Senaryoda"ya dönsün ve ikinci tıklama gitmesin.
export function useAddToGoldSet() {
  const [addedIds, setAddedIds] = useState<ReadonlySet<number>>(new Set());
  const { notify } = useFeedback();

  const add = useCallback(async (messageId: number) => {
    try {
      await goldApi.addFromMessage(messageId);
      setAddedIds((prev) => new Set(prev).add(messageId));
      notify.success('Kalite Merkezi senaryolarına eklendi; kişisel veriler maskelendi.');
    } catch (e) {
      notify.error(describeError(e));
    }
  }, [notify]);

  return { addedIds, add };
}
