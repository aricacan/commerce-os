'use client';

import { useQuery } from '@tanstack/react-query';
import { moduleAccessApi, settingsApi } from '../lib/api';
import { useAuthStore } from '../stores/auth';
import type { WorkspaceKey } from '../stores/workspace-panel';
import { moduleKeyOfWorkspace } from '../lib/workspace-routes';

// Modül erişim kuralı TEK YERDE. İki ayrı kavram birleşir:
//   1. moduleFlags  — Ayarlar > Modüller'den global aç/kapa. Kapalıysa HERKESE (SuperAdmin
//      dahil) gizli; backend de 403/no-op döndüğü için tutarlı.
//   2. moduleAccess — Ayarlar > Yetki Yönetimi'nden üye bazlı erişim.
//
// ⚠️ "KAYIT YOKSA SERBEST" DEĞİL — gerçek kural DENY-BY-DEFAULT (SuperAdmin hariç):
// GET /module-access katalogdaki HER modül için bir satır döner (hiç atama yoksa boş
// userIds ile). Yani katalogdaki bir modüle kimse atanmamışsa, SuperAdmin olmayan HERKES
// için kilitlidir. `!entry → true` dalı yalnızca katalog DIŞI anahtarlar içindir.
//
// Bu yorum eskiden "kayıt yoksa serbest" diyordu ve yanlıştı: canlıda (11 Eyl 2026) atama
// satırı yalnızca connect/nexus/radar/intelligent için vardı; omnichannel, vibe, kargo vb.
// SuperAdmin olmayan kullanıcıya zaten kilitliydi. Sonar/Depo/SellingView/PartnerHub ise
// yalnızca katalog listesinde UNUTULDUKLARI için açıktı — kataloğa girince onlar da bu
// kurala uydu. Kural bilinçli olarak gevşetilmedi: "boş = açık" yapmak, kimsenin
// istemediği bir anda 17 modülü herkese açardı.
//
// Topbar bu mantığı kendi içinde taşıyordu; modüllerin artık gerçek rotaları olduğu için
// (bkz. workspace-routes.ts) doğrudan adres yazarak da girilebiliyor ve aynı kontrolün rota
// tarafında da uygulanması gerekiyor. İki kopya kaçınılmaz olarak ayrışırdı.

export { moduleKeyOfWorkspace as moduleKeyOf } from '../lib/workspace-routes';

export interface ModuleAccess {
  /** Sorgular yüklenene kadar true — yükleme sırasında yanlışlıkla "erişim yok" gösterilmesin. */
  isLoading: boolean;
  /** Ayarlar > Modüller bayrakları — menüden TAMAMEN gizleme (kilit değil) için ham hâli. */
  moduleFlags: Record<string, boolean>;
  isModuleAllowed: (moduleKey: string) => boolean;
  isWorkspaceAllowed: (workspace: WorkspaceKey) => boolean;
}

export function useModuleAccess(): ModuleAccess {
  const user = useAuthStore((state) => state.user);

  const { data: moduleAccessList = [], isLoading: accessLoading } = useQuery({
    queryKey: ['module-access'],
    queryFn: moduleAccessApi.list,
    staleTime: 60_000,
  });

  const { data: moduleFlags = {}, isLoading: flagsLoading } = useQuery({
    queryKey: ['module-flags'],
    queryFn: settingsApi.getModuleFlags,
    staleTime: 30_000,
  });

  function isModuleAllowed(moduleKey: string): boolean {
    if (moduleFlags[moduleKey] === false) return false;
    if (user?.roles?.includes('SuperAdmin')) return true;
    const entry = moduleAccessList.find((m) => m.moduleKey === moduleKey);
    if (!entry) return true;
    return user?.id != null && entry.userIds.includes(user.id);
  }

  return {
    isLoading: accessLoading || flagsLoading,
    moduleFlags,
    isModuleAllowed,
    isWorkspaceAllowed: (workspace) => isModuleAllowed(moduleKeyOfWorkspace(workspace)),
  };
}
