'use client';

import { useEffect, useState } from 'react';
import {
  omnichannelOrderDestinationsApi, type ErpChatOrderSendStateDto,
} from '../../lib/api/omnichannel-order-destinations';
import { describeError } from '../../lib/errors';

/** "ERP'ye sohbet siparişi gönderimi (test aşamasında)" anahtarının durumu. Okunamazsa `state` null, sebep `error`'da. */
export function useErpSendState() {
  const [state, setState] = useState<ErpChatOrderSendStateDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    omnichannelOrderDestinationsApi.erpSend()
      .then((result) => { if (!cancelled) { setState(result); setError(null); } })
      .catch((e: unknown) => { if (!cancelled) { setState(null); setError(describeError(e)); } });
    return () => { cancelled = true; };
  }, []);

  return { state, error };
}
