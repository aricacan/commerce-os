import { request } from './core';
import type { HandoffRouteTestResultDto } from './omnichannel-handoff-routes';

// ─── Omnichannel › Devir Yönlendirme › Bağlantılar ──────────────────────────────
//
// Devir bildirimlerinin KENDİ SMTP / Slack ayarı. Boş bırakılan kısım için sistemin genel
// e-posta / Slack ayarı kullanılır. Şifre ve token asla geri dönmez (yalnız has* bayrakları).

// Backend HandoffSmtpSecurity ile birebir.
export const HANDOFF_SMTP_SECURITY = { StartTls: 0, SslOnConnect: 1, None: 2 } as const;
export type HandoffSmtpSecurity = (typeof HANDOFF_SMTP_SECURITY)[keyof typeof HANDOFF_SMTP_SECURITY];

export const HANDOFF_SMTP_SECURITY_LABELS: Record<HandoffSmtpSecurity, string> = {
  [HANDOFF_SMTP_SECURITY.StartTls]: 'STARTTLS (587)',
  [HANDOFF_SMTP_SECURITY.SslOnConnect]: 'SSL (465)',
  [HANDOFF_SMTP_SECURITY.None]: 'Yok',
};

export interface HandoffDeliverySettingsDto {
  smtpHost: string | null;
  smtpPort: number;
  smtpSecurity: HandoffSmtpSecurity;
  smtpUsername: string | null;
  hasSmtpPassword: boolean;
  smtpFromAddress: string | null;
  smtpFromName: string | null;
  // Güvenilen sertifikanın SHA-256 parmak izi (64 hane hex); null = tam doğrulama.
  smtpTrustedCertificateSha256: string | null;
  hasSlackToken: boolean;
  slackDefaultChannelId: string | null;
  usesCustomSmtp: boolean;
  usesCustomSlack: boolean;
}

// Gizli alan boş/null = kayıtlı değer korunur; silmek için clear* bayrağı.
export interface HandoffDeliverySettingsSaveBody {
  smtpHost: string | null;
  smtpPort: number;
  smtpSecurity: HandoffSmtpSecurity;
  smtpUsername: string | null;
  smtpPassword: string | null;
  clearSmtpPassword: boolean;
  smtpFromAddress: string | null;
  smtpFromName: string | null;
  smtpTrustedCertificateSha256: string | null;
  slackBotToken: string | null;
  clearSlackToken: boolean;
  slackDefaultChannelId: string | null;
}

// Backend HandoffDeliveryLimits ile birebir.
export const HANDOFF_SMTP_PORT_MIN = 1;
export const HANDOFF_SMTP_PORT_MAX = 65535;

// Kayıtlı ayarı "değişiklik yok" gövdesine çevirir: gizli alanlar null (korunur), silme yok.
// Her kart yalnız kendi alanlarını bunun üstüne yazar.
export function toSaveBody(dto: HandoffDeliverySettingsDto): HandoffDeliverySettingsSaveBody {
  return {
    smtpHost: dto.smtpHost,
    smtpPort: dto.smtpPort,
    smtpSecurity: dto.smtpSecurity,
    smtpUsername: dto.smtpUsername,
    smtpPassword: null,
    clearSmtpPassword: false,
    smtpFromAddress: dto.smtpFromAddress,
    smtpFromName: dto.smtpFromName,
    smtpTrustedCertificateSha256: dto.smtpTrustedCertificateSha256,
    slackBotToken: null,
    clearSlackToken: false,
    slackDefaultChannelId: dto.slackDefaultChannelId,
  };
}

// Test e-postası sonucu: sunucunun sunduğu sertifikanın parmak izi (başarısız olsa da) kopyalanabilsin diye döner.
export interface HandoffSmtpTestResultDto extends HandoffRouteTestResultDto {
  certificateSha256: string | null;
}

const BASE = '/omnichannel/handoff-delivery-settings';

export const handoffDeliveryApi = {
  get: () => request<HandoffDeliverySettingsDto>(BASE),
  save: (body: HandoffDeliverySettingsSaveBody) =>
    request<HandoffDeliverySettingsDto>(BASE, { method: 'PUT', body: JSON.stringify(body) }),
  testEmail: (to: string) =>
    request<HandoffSmtpTestResultDto>(`${BASE}/test-email`, { method: 'POST', body: JSON.stringify({ to }) }),
  // Kanal boşsa kayıtlı varsayılan kanal kullanılır.
  testSlack: (channel: string | null) =>
    request<HandoffRouteTestResultDto>(`${BASE}/test-slack`, { method: 'POST', body: JSON.stringify({ channel }) }),
};
