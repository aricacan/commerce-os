import { useQuery } from '@tanstack/react-query';
import { radarApi } from '../../lib/api';

export function useRadarAlerts() {
  return useQuery({
    queryKey: ['radar-alerts'],
    queryFn: () => radarApi.alerts(),
    staleTime: 60_000,
    refetchInterval: 120_000,
  });
}
