import { useQuery } from '@tanstack/react-query';
import { intelligentApi } from '../../lib/api';

// Herhangi bir belge "Processing" durumundayken 3sn'de bir otomatik yeniler (canlı ilerleme
// takibi) — hepsi Ready/Failed olduğunda polling durur, gereksiz istek atılmaz.
export function useIntelligentDocuments() {
  return useQuery({
    queryKey: ['intelligent-documents'],
    queryFn: () => intelligentApi.listDocuments(),
    refetchInterval: (query) => {
      const documents = query.state.data;
      const hasProcessing = documents?.some((d) => d.status === 'Processing') ?? false;
      return hasProcessing ? 3_000 : false;
    },
  });
}
