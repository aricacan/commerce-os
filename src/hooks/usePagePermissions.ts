'use client';

import { useQuery } from '@tanstack/react-query';
import { permissionsApi } from '../lib/api';
import { useAuthStore } from '../stores/auth';

// Sayfa yetkileri tek kaynaktan. Sidebar ve komut paleti aynı kuralı kullanmalı —
// aksi halde palet, panelde kilitli görünen bir sayfaya kestirme yol açar.
//
// Kural: bir pageKey için kayıt yoksa veya rol listesi boşsa sayfa HERKESE açıktır
// (mevcut Sidebar davranışı; yetki tablosu eksik doldurulmuş sayfalar kilitlenmesin diye).
export function usePagePermissions() {
  const user = useAuthStore((s) => s.user);

  const { data: permMap = {} } = useQuery({
    queryKey: ['page-permissions-map'],
    queryFn: async () => {
      const perms = await permissionsApi.list();
      const map: Record<string, string[]> = {};
      for (const p of perms) {
        map[p.pageKey] = p.allowedRoles.split(',').map((r) => r.trim()).filter(Boolean);
      }
      return map;
    },
    staleTime: 5 * 60_000,
  });

  function isAllowed(pageKey: string): boolean {
    const allowed = permMap[pageKey];
    if (!allowed || allowed.length === 0) return true;
    const roles = user?.roles ?? [];
    return roles.some((r) => allowed.includes(r));
  }

  return { isAllowed };
}
