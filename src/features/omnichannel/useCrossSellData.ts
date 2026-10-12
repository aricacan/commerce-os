'use client';

import { useCallback, useEffect, useState } from 'react';
import { omnichannelApi, type CrossSellRuleDto } from '../../lib/api/omnichannel';
import { categoryApi } from '../../lib/api/products';
import type { Category } from '../../types/api';
import { describeError } from '../../lib/errors';

// Çapraz satış kuralları + kategori seçim listesi (P38). Kategoriler katalog ekranlarının kullandığı
// ortak listeden (/category/master) gelir; ayrı bir kategori sistemi yoktur.
export function useCrossSellData() {
  const [rules, setRules] = useState<CrossSellRuleDto[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [loadedRules, loadedCategories] = await Promise.all([
        omnichannelApi.getCrossSellRules(), categoryApi.master(),
      ]);
      setRules(loadedRules);
      setCategories(loadedCategories);
    } catch (e) {
      setRules([]);
      setError(describeError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  return { rules, categories, loading, error, reload };
}
