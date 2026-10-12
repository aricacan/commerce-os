import { useQuery } from '@tanstack/react-query';
import { radarApi } from '../../lib/api';

export function useRadarSicCodes(activeOnly = false) {
  return useQuery({
    queryKey: ['radar-sic-codes', activeOnly],
    queryFn: () => radarApi.sicCodes.list(activeOnly),
    staleTime: 60_000,
  });
}
