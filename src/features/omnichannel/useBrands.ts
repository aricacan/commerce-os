'use client';

import { useCallback, useEffect, useState } from 'react';
import { omnichannelApi, type BrandDto } from '../../lib/api/omnichannel';
import { describeError } from '../../lib/errors';

// Marka listesi (P07) — Kanallar ekranındaki Markalar bölümü ve kanal formu aynı listeyi okur.
// Uç yoksa (ön yüz arka yüzden önce yayına çıktı) boş liste + hata döner; kanal formu
// yine çalışır, marka yalnız "Markasız" seçilebilir.
export function useBrands() {
  const [brands, setBrands] = useState<BrandDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setBrands(await omnichannelApi.getBrands());
    } catch (e) {
      setBrands([]);
      setError(describeError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  return { brands, loading, error, reload };
}
