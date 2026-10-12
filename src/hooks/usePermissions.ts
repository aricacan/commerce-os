'use client';

import { useEffect, useMemo, useState } from 'react';
import { request } from '@/lib/api/core';

export type PermissionAction =
  | 'view'
  | 'create'
  | 'update'
  | 'delete'
  | 'approve'
  | 'cancel'
  | 'export'
  | 'viewSensitive';

/**
 * Saf yardımcı — hook'tan BİLEREK ayrı tutuldu.
 *
 * Bu kod tabanında bileşen render testi altyapısı yok (@testing-library/react kurulu değil);
 * test edilebilirlik, mantığı saf bir fonksiyona çıkarmakla sağlanıyor (mevcut kalıp:
 * ProductErpSummary.test.ts, metrics.test.ts).
 */
export function buildCan(permissions: readonly string[]) {
  const set = new Set(permissions.map((p) => p.toLowerCase()));
  return (feature: string, action: PermissionAction): boolean =>
    set.has(`${feature}:${action}`.toLowerCase());
}

interface MeResponse {
  permissions?: string[];
}

export function usePermissions() {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    request<MeResponse>('/auth/me', { signal: controller.signal })
      .then((me) => setPermissions(me.permissions ?? []))
      // Yetki çözülemezse HİÇBİR şey yetkili sayılmaz — güvenli varsayılan.
      .catch(() => setPermissions([]))
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, []);

  const can = useMemo(() => buildCan(permissions), [permissions]);

  return { permissions, loading, can };
}
