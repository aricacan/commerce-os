'use client';

import { useCallback, useEffect, useState } from 'react';
import { omnichannelApi, type PaymentOptionDto } from '../../lib/api/omnichannel';
import { describeError } from '../../lib/errors';

// Ödeme yöntemleri listesi (P15). Uç yalnız yöneticiye açık — yetkisiz kullanıcı hata metnini görür.
export function usePaymentOptions() {
  const [options, setOptions] = useState<PaymentOptionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setOptions(await omnichannelApi.getPaymentOptions());
    } catch (e) {
      setOptions([]);
      setError(describeError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  return { options, loading, error, reload };
}
