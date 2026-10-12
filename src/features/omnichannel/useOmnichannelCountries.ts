'use client';

import { useCallback, useEffect, useState } from 'react';
import { omnichannelApi, type CountryDto } from '../../lib/api/omnichannel';
import { describeError } from '../../lib/errors';

// Ülke listesi tek kaynaktan (ülke tablosu) — kanal formu, test alanı ve Ülkeler sekmesi
// aynı listeyi kullanır; hiçbir bileşen "TR/UK" sabitini kendi içinde tutmaz.
export function useOmnichannelCountries() {
  const [countries, setCountries] = useState<CountryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setCountries(await omnichannelApi.getCountries());
    } catch (e) {
      setError(describeError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  return { countries, loading, error, reload };
}

// Seçim listeleri için düz metin. Bayrak emojisi eklenmez: Windows'ta harf olarak
// görünüyor ("🇹🇷" → "TR"); görsel bayrak için CountryFlag bileşeni kullanılır.
export function countryLabel(country: Pick<CountryDto, 'code' | 'name'>): string {
  return `${country.name} (${country.code})`;
}
