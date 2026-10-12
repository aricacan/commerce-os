'use client';

import { useAuthStore } from '../../stores/auth';

// Backend'deki yönetici rolleriyle birebir ([Authorize(Roles = "SuperAdmin,Admin,Omnichannel.Admin")]):
// SSS yazmak/onaylamak gibi müşteriye giden metni belirleyen işler. Asıl denetim sunucuda;
// burada yalnız yetkisiz kullanıcıya 403 veren düğme gösterilmez.
const OMNICHANNEL_ADMIN_ROLES = ['SuperAdmin', 'Admin', 'Omnichannel.Admin'];

export function useIsOmnichannelAdmin(): boolean {
  const roles = useAuthStore((state) => state.user?.roles);
  return OMNICHANNEL_ADMIN_ROLES.some((role) => roles?.includes(role) ?? false);
}
