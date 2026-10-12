import { useQuery } from '@tanstack/react-query';
import { radarApi } from '../../lib/api';

export function useRadarEmailTemplates() {
  return useQuery({
    queryKey: ['radar-email-templates'],
    queryFn: () => radarApi.emailTemplates.list(),
    staleTime: 60_000,
  });
}
