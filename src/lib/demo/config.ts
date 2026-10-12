// Demo modu: backend olmadan, sahte verilerle çalışan salt-görüntü sürüm.
// Tek anahtar `NEXT_PUBLIC_DEMO=true`; kapalıyken uygulama aynen eski gibi çalışır.

export const IS_DEMO = process.env.NEXT_PUBLIC_DEMO === 'true';

export const DEMO_BLOCKED_MESSAGE = 'Demo hesabı: bu işlem devre dışı.';

export const DEMO_USER = {
  id: 1,
  email: 'demo@demo.com',
  firstName: 'Demo',
  lastName: 'Hesabı',
  roles: ['Admin'],
  profilePhotoUrl: null,
  slackMemberId: null,
} as const;

export const DEMO_ACCESS_TOKEN = 'demo-access-token';

/** Gerçek ağ gecikmesini taklit eder; yükleme iskeletleri de görünsün diye. */
export const DEMO_LATENCY_MS = 120;
