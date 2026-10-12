'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  omnichannelCatalogApi, type CatalogProfileDto, type CatalogSiteSourceDto, type CatalogSourceDto,
} from '../../lib/api/omnichannel-catalog';
import { describeError } from '../../lib/errors';

// Kaynak profilleri + seçilebilir veri kaynakları. Kanal formu, kanal kartı, Test Alanı ve
// Sistem ekranları aynı listeyi okur.
//
// Liste alınamazsa (ör. ön yüz arka yüzden önce yayına çıktı ve uç henüz yok) boş liste
// + hata metni döner: kanal formu yine çalışır, profil seçimi yalnızca "ülke varsayılanı"
// olarak kalır.
export function useCatalogProfiles() {
  const [profiles, setProfiles] = useState<CatalogProfileDto[]>([]);
  const [sources, setSources] = useState<CatalogSourceDto[]>([]);
  const [siteSources, setSiteSources] = useState<CatalogSiteSourceDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [profileList, sourceList] = await Promise.all([
        omnichannelCatalogApi.getProfiles(),
        omnichannelCatalogApi.getSources(),
      ]);
      setProfiles(profileList);
      setSources(sourceList);
    } catch (e) {
      setProfiles([]);
      setSources([]);
      setError(describeError(e));
    } finally {
      setLoading(false);
    }
    // Site kaynakları ayrı: uç yoksa (eski backend) profil ekranı yine çalışsın.
    try {
      setSiteSources(await omnichannelCatalogApi.getSiteSources());
    } catch {
      setSiteSources([]);
    }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  return { profiles, sources, siteSources, loading, error, reload };
}
