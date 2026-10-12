// ANA SISTEM (kiraci ustu) hesabinin arayuzdeki yeri.
//
// NEDEN TEK DOSYA: bu karar IKI yerde birden gerekiyor — giris sonrasi yonlendirme
// (app/login/page.tsx) ve DEMO kabugunun kapisi (app/(app)/layout.tsx). Rol adini ve kurali
// iki dosyada ayri ayri tutmak, bu oturumda uc kez isiran hata sinifinin ta kendisiydi
// (uc ayri sayi parse'i, iki ayri durum sozlugu, alti ayri ciro sorgusu). Birinde "SystemAdmin"
// digerinde "SystemAdmın" yazilsa hicbir sey hata VERMEZ; sistem hesabi sessizce DEMO paneline
// duser.

/** Backend'deki TenantConfiguration.SystemAdminRole ile AYNI olmak zorunda. */
export const SYSTEM_ADMIN_ROLE = 'SystemAdmin';

/** Ana sistem hesabinin tek sayfasi. */
export const SYSTEM_ADMIN_HOME = '/ana-sistem';

/** Normal kullanicilarin giris sonrasi acilis sayfasi. */
export const TENANT_HOME = '/dashboard';

export function isSystemAdmin(roles: string[] | undefined | null): boolean {
  return roles?.includes(SYSTEM_ADMIN_ROLE) ?? false;
}

/**
 * Giris sonrasi (ve kabuk korumasinda) hangi sayfaya gidilecegi.
 *
 * Ana sistem hesabinin kiraci baglami YOKTUR: magaza secici, moduller ve tum KPI'lar onun
 * icin anlamsizdir. Backend zaten kiraci uclarini 403'ler ama bu yalnizca VERIYI engeller —
 * arayuz kabugu yine de acilir ve kullanici bombos bir ciro/siparis paneli gorurdu.
 */
export function landingPathFor(roles: string[] | undefined | null): string {
  return isSystemAdmin(roles) ? SYSTEM_ADMIN_HOME : TENANT_HOME;
}
