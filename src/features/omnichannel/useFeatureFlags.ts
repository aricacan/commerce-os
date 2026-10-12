'use client';

import { useCallback, useEffect, useState } from 'react';
import { featureFlagsApi, type FeatureFlagMatrixDto } from '../../lib/api/omnichannel-flags';
import { describeError } from '../../lib/errors';

// Marka × ülke bayrak matrisi (P32). Uç yalnız yöneticiye açık. Yenileme tabloyu boşaltmaz:
// hücre kaydedilince yalnız veri tazelenir, ekran yerinde kalır.
export function useFeatureFlags() {
  const [matrix, setMatrix] = useState<FeatureFlagMatrixDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setError(null);
    try {
      setMatrix(await featureFlagsApi.get());
    } catch (e) {
      setError(describeError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  return { matrix, loading, error, reload };
}
