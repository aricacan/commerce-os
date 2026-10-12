import { useQuery } from '@tanstack/react-query';
import { radarApi } from '../../lib/api';

interface UseRadarCompaniesParams {
  page: number;
  pageSize?: number;
  isActive?: boolean;
  status?: string;
  search?: string;
  category?: string;
  country?: string;
  city?: string;
  tag?: string;
}

export function useRadarCompanies({
  page, pageSize = 30, isActive, status, search, category, country, city, tag,
}: UseRadarCompaniesParams) {
  return useQuery({
    queryKey: ['radar-companies', page, pageSize, isActive, status, search, category, country, city, tag],
    queryFn: () => radarApi.companies.list({ page, pageSize, isActive, status, search, category, country, city, tag }),
    staleTime: 30_000,
  });
}

export function useRadarCities() {
  return useQuery({
    queryKey: ['radar-cities'],
    queryFn: () => radarApi.companies.cities(),
    staleTime: 5 * 60_000,
  });
}

export function useRadarTags() {
  return useQuery({
    queryKey: ['radar-tags'],
    queryFn: () => radarApi.companies.tags(),
    staleTime: 5 * 60_000,
  });
}

export function useRadarCompanyDetail(id: number | null) {
  return useQuery({
    queryKey: ['radar-company-detail', id],
    queryFn: () => radarApi.companies.detail(id as number),
    enabled: id !== null,
  });
}
