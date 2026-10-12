'use client';

import { useCallback, useState } from 'react';
import { learningApi } from '../../lib/api/omnichannel-learning';
import { describeError } from '../../lib/errors';
import { useFeedback } from '../shared/Feedback';

// Bot mesajını "yanlış" işaretler (P36). Sunucu tekrar işaretlemeyi zararsız sayar; burada da
// işaretlenen mesaj hatırlanır ki düğme "İşaretlendi"ye dönsün ve ikinci tıklama gitmesin.
export function useFlagWrongMessage() {
  const [flaggedIds, setFlaggedIds] = useState<ReadonlySet<number>>(new Set());
  const { notify } = useFeedback();

  const flag = useCallback(async (messageId: number) => {
    try {
      await learningApi.flagWrongMessage(messageId);
      setFlaggedIds((prev) => new Set(prev).add(messageId));
      notify.success('İşaretlendi; bu cevap haftalık düzeltme raporuna girecek.');
    } catch (e) {
      notify.error(describeError(e));
    }
  }, [notify]);

  return { flaggedIds, flag };
}
