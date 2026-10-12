import { useQuery } from '@tanstack/react-query';
import { radarApi } from '../../lib/api';

export function useRadarAnalytics(country?: string) {
  return useQuery({
    queryKey: ['radar-analytics', country],
    queryFn: () => radarApi.analytics(country),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
}
