'use client';

import { useQuery } from '@tanstack/react-query';
import { tenantLinksApi, type TenantPublicLinks } from '../lib/api/settings';
import { QUERY_STALE_TIME } from '../lib/query-policy';

const NO_LINKS: TenantPublicLinks = { slackWorkspaceUrl: null, trelloBoardUrl: null };

// Şirketin (kiracının) Slack çalışma alanı ve Trello panosu — Topbar kısayolları. Tanımlı
// değilse kısayol hiç gösterilmez; başka şirketin adresine düşülmez. Uç henüz yoksa (frontend
// backend'den önce yayına çıkar) sorgu hata verir ve kısayollar yine gizli kalır.
export function useTenantLinks(): TenantPublicLinks {
  const { data } = useQuery({
    queryKey: ['tenant-links', 'public'],
    queryFn: tenantLinksApi.getPublic,
    staleTime: QUERY_STALE_TIME.reference,
    retry: false,
  });
  return data ?? NO_LINKS;
}
