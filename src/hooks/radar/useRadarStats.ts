import { useQuery } from '@tanstack/react-query';
import { radarApi } from '../../lib/api';

export function useRadarStats(country?: string) {
  return useQuery({
    queryKey: ['radar-stats', country],
    queryFn: () => radarApi.stats(country),
    staleTime: 30_000,
    refetchInterval: 60_000, // Sender/Listener job'ları arka planda sürekli çalıştığından tazelenir.
  });
}

export function useRadarRecentActivity(limit = 20, country?: string) {
  return useQuery({
    queryKey: ['radar-recent-activity', limit, country],
    queryFn: () => radarApi.recentActivity(limit, country),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}
