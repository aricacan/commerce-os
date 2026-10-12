import { request } from './core';
import type { LoginSuccess } from './auth';

export interface TwoFactorSetup {
  secretBase32: string;
  /** `otpauth://` URI — QR kodu bundan üretilir. */
  otpAuthUri: string;
}

export interface TwoFactorEnabled {
  /** YALNIZCA bir kez döner; sonradan gösterilemez (sunucuda hash'li saklanır). */
  recoveryCodes: string[];
}

// ─── İki adımlı doğrulama (FAZ 10) ────────────────────────────────────────────
export const twoFactorApi = {
  setup: () => request<TwoFactorSetup>('/two-factor/setup', { method: 'POST' }),

  enable: (code: string) =>
    request<TwoFactorEnabled>('/two-factor/enable', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),

  disable: (code: string) =>
    request<void>('/two-factor/disable', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),

  /** Giriş ikinci adımı. Girişin ilk adımıyla AYNI şekli döner (token + kullanıcı). */
  completeLogin: (challengeToken: string, code: string) =>
    request<LoginSuccess>('/two-factor/login', {
      method: 'POST',
      body: JSON.stringify({ challengeToken, code }),
    }),
};
