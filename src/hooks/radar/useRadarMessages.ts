import { useQuery } from '@tanstack/react-query';
import { radarApi } from '../../lib/api';

export function useRadarMessages(companyId: number | null, page = 1, pageSize = 30) {
  return useQuery({
    queryKey: ['radar-messages', companyId, page, pageSize],
    queryFn: () => radarApi.companies.messages(companyId as number, page, pageSize),
    enabled: companyId !== null,
  });
}
