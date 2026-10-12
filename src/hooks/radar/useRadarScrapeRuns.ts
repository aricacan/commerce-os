import { useQuery } from '@tanstack/react-query';
import { radarApi } from '../../lib/api';

// Bir koşu "Running" durumundayken 5sn'de bir yenile (canlı ilerleme görünsün — bkz.
// takip paneli), aksi halde 30sn'lik normal staleTime'a geri döner. refetchInterval'ın
// fonksiyon formu her poll'da en güncel veriyi görür, tek seferlik bir karar değil.
export function useRadarScrapeRuns(limit = 10) {
  return useQuery({
    queryKey: ['radar-scrape-runs', limit],
    queryFn: () => radarApi.scrapeRuns.list(limit),
    staleTime: 30_000,
    refetchInterval: (query) => {
      const hasRunningEntry = query.state.data?.some((r) => r.status === 'Running') ?? false;
      return hasRunningEntry ? 5_000 : false;
    },
  });
}
