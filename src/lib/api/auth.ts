import { request } from './core';
import { endTelemetrySession } from '../telemetry';

// ─── Auth ─────────────────────────────────────────────────────────────────────
// Refresh token gövdede taşınmaz; HttpOnly cookie ile gider/gelir (bkz. core.ts tryRefresh +
// backend AuthController). Bu yüzden login yanıtı refreshToken içermez, logout argüman almaz,
// ve eski authApi.refresh() kaldırıldı (rotasyon/cookie akışını core.ts tryRefresh yönetir).
export interface LoginSuccess {
  accessToken: string;
  accessTokenExpiresAt: string;
  user: import('../../types/api').UserInfo;
}

/** Parola dogru ama iki adimli dogrulama acik: token YOK, ikinci adim gerekiyor. */
export interface LoginTwoFactorChallenge {
  requiresTwoFactor: true;
  challengeToken: string;
}

export type LoginResult = LoginSuccess | LoginTwoFactorChallenge;

/** Ayrimi TEK yerde yap: her cagiran kendi kontrolunu yazarsa biri unutur. */
export function isTwoFactorChallenge(result: LoginResult): result is LoginTwoFactorChallenge {
  return 'requiresTwoFactor' in result && result.requiresTwoFactor === true;
}

export const authApi = {
  // Yanit IKI SEKILDEN biri olabilir: ya token, ya 2FA meydan okumasi. Tek sekil
  // varsaymak, 2FA acan kullanicinin BIR DAHA GIREMEMESI demekti.
  //
  // retry=false: yanlış şifrenin 401'i "oturum süresi doldu" DEĞİL. Önceden 401'de otomatik
  // oturum yenileme + çıkış çağrılıyordu; tek yanlış deneme dakikada 10'luk giriş kotasından
  // 3 hak yiyordu ve üçüncü denemeden sonra DOĞRU şifre de 429 alıp "hatalı" görünüyordu.
  login: (email: string, password: string) =>
    request<LoginResult>(
      '/auth/login', { method: 'POST', body: JSON.stringify({ email: email.trim(), password }) }, false
    ),
  // Oturum telemetrisi token geçerliyken kapatılır — sonra kimliksiz istek 401 alırdı.
  logout: async () => {
    await endTelemetrySession();
    await request<void>('/auth/logout', { method: 'POST' });
  },
  me: () => request<import('../../types/api').UserInfo>('/auth/me'),
  verifySecureAction: (password: string) =>
    request<{ success: boolean }>('/auth/verify-secure-action', { method: 'POST', body: JSON.stringify({ password }) }),
  updateProfilePhoto: (photoUrl: string | null) =>
    request<void>('/auth/profile-photo', { method: 'PUT', body: JSON.stringify({ photoUrl }) }),
  updateSlackMemberId: (slackMemberId: string | null) =>
    request<void>('/auth/slack-member-id', { method: 'PUT', body: JSON.stringify({ slackMemberId }) }),
  // Backend her koşulda aynı genel mesajla 200 döner (e-posta kayıtlı olsun ya da olmasın) —
  // hesap numaralandırma saldırısını engellemek için (bkz. AuthController.ForgotPassword).
  forgotPassword: (email: string) =>
    request<{ message: string }>('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (token: string, newPassword: string) =>
    request<{ message: string }>('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, newPassword }) }),
};
