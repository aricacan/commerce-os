'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  omnichannelCatalogApi, type CatalogPriceRuleDto, type CatalogPriceRuleSaveBody,
} from '../../lib/api/omnichannel-catalog';
import { describeError } from '../../lib/errors';

// Profil fiyat listesi. Kurallar profil kaydından bağımsız, anında kaydedilir; her değişiklikten
// sonra liste sunucudan yeniden okunur (sıralama sunucuda).
export function useCatalogPriceRules(profileId: number) {
  const [rules, setRules] = useState<CatalogPriceRuleDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRules(await omnichannelCatalogApi.getPriceRules(profileId));
    } catch (e) {
      setRules([]);
      setError(describeError(e));
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => { void reload(); }, [reload]);

  // Hata çağırana fırlatılır: satır formu açık kalır, kullanıcı düzeltip yeniden dener.
  const save = async (ruleId: number | null, body: CatalogPriceRuleSaveBody) => {
    if (ruleId === null) await omnichannelCatalogApi.createPriceRule(profileId, body);
    else await omnichannelCatalogApi.updatePriceRule(profileId, ruleId, body);
    await reload();
  };

  const remove = async (ruleId: number) => {
    await omnichannelCatalogApi.deletePriceRule(profileId, ruleId);
    await reload();
  };

  return { rules, loading, error, save, remove };
}
