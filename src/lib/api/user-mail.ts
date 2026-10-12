import { request } from './core';

// DİKKAT: Aşağıdaki sayılar backend enum'larının BİREBİR karşılığıdır
// (DemoDashboard.Core.Entities.UserMail*). Sıra değiştirilirse kullanıcı "Günlük" seçip
// "Haftalık" kaydeden bir arayüzle karşılaşır — bu modülde bir kez yaşandı.
export type UserMailAuthType = 0 | 1; // 0: SmtpPassword, 1: OAuth2Token
export type UserMailOAuthProvider = 0 | 1 | 2; // 0: None, 1: Google, 2: Microsoft
export type UserMailReportType = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0: DailySummary (V1), 1: WeeklySummary, 2: MonthlyPnl, 3: OrderShippedCustomer, 4: CustomTemplate, 5: DailySummaryV2, 6: DailySummaryV3
export type UserMailScheduleInterval = 0 | 1 | 2 | 3; // 0: Daily, 1: Weekly, 2: Hourly, 3: Monthly
export type UserMailDeliveryStatus = 0 | 1 | 2; // 0: Sent, 1: Failed, 2: SkippedLimit

export const MAIL_AUTH_SMTP_PASSWORD: UserMailAuthType = 0;
export const MAIL_AUTH_OAUTH2: UserMailAuthType = 1;

export const MAIL_INTERVAL_DAILY: UserMailScheduleInterval = 0;
export const MAIL_INTERVAL_WEEKLY: UserMailScheduleInterval = 1;
export const MAIL_INTERVAL_HOURLY: UserMailScheduleInterval = 2;
export const MAIL_INTERVAL_MONTHLY: UserMailScheduleInterval = 3;

export const MAIL_STATUS_SENT: UserMailDeliveryStatus = 0;
export const MAIL_STATUS_FAILED: UserMailDeliveryStatus = 1;
export const MAIL_STATUS_SKIPPED: UserMailDeliveryStatus = 2;

export const MAIL_REPORT_CUSTOM_TEMPLATE: UserMailReportType = 4;

/** Sağlayıcı hazır ayarları — kullanıcı host/port/SSL üçlüsünü elle bilmek zorunda kalmasın. */
export interface SmtpPreset {
  key: string;
  label: string;
  host: string;
  port: number;
  useSsl: boolean;
  hint: string;
}

export const SMTP_PRESETS: readonly SmtpPreset[] = [
  { key: 'gmail', label: 'Gmail / Google Workspace', host: 'smtp.gmail.com', port: 587, useSsl: true, hint: '2 Adımlı Doğrulama açıkken Uygulama Şifresi üretin (16 hane).' },
  { key: 'outlook', label: 'Outlook / Microsoft 365', host: 'smtp.office365.com', port: 587, useSsl: true, hint: 'Kiracınızda SMTP AUTH açık olmalıdır.' },
  { key: 'yandex', label: 'Yandex Mail', host: 'smtp.yandex.com.tr', port: 465, useSsl: true, hint: 'Yandex uygulama parolası gerekir; port 465 (örtük TLS).' },
  { key: 'yandex-kurumsal', label: 'Yandex 360 (Kurumsal)', host: 'smtp.yandex.com', port: 465, useSsl: true, hint: 'Kurumsal alan adları için Yandex 360 sunucusu.' },
  { key: 'custom', label: 'Özel SMTP Sunucusu', host: '', port: 587, useSsl: true, hint: 'Sunucu adresini ve portunu sağlayıcınızdan alın.' },
] as const;

export interface UserMailAccountDto {
  id: number;
  userId: number;
  emailAddress: string;
  senderDisplayName: string;
  authType: UserMailAuthType;
  oAuthProvider: UserMailOAuthProvider;
  smtpHost: string;
  smtpPort: number;
  useSsl: boolean;
  hasSecret: boolean;
  accessTokenExpiresAtUtc: string | null;
  dailySendingLimit: number;
  currentDailyCount: number;
  lastTestedAt: string | null;
  lastTestStatus: string | null;
  lastTestSucceeded: boolean;
  isActive: boolean;
  updatedAt: string;
}

export interface SaveUserMailAccountDto {
  emailAddress: string;
  senderDisplayName: string;
  authType: UserMailAuthType;
  smtpHost: string;
  smtpPort: number;
  useSsl: boolean;
  secret?: string;
  dailySendingLimit: number;
}

export interface TestMailRequestDto {
  targetEmail?: string;
}

export interface SendPreviewRequestDto {
  reportType: UserMailReportType;
  customTemplateId?: number | null;
  targetEmail?: string;
}

export interface TestMailResultDto {
  success: boolean;
  message: string;
  testedAt: string;
}

export interface OAuthProvidersDto {
  google: boolean;
  microsoft: boolean;
}

export interface UserMailAutomationRuleDto {
  id: number;
  userId: number;
  name: string;
  reportType: UserMailReportType;
  reportTypeLabel: string;
  customTemplateId: number | null;
  customTemplateName: string | null;
  recipients: string;
  scheduleInterval: UserMailScheduleInterval;
  scheduleTime: string;
  batchSizePerRun: number;
  isEnabled: boolean;
  lastRunAtUtc: string | null;
  nextRunAtUtc: string | null;
}

export interface SaveUserMailAutomationRuleDto {
  id?: number;
  name: string;
  reportType: UserMailReportType;
  customTemplateId?: number | null;
  recipients: string;
  scheduleInterval: UserMailScheduleInterval;
  scheduleTime: string;
  batchSizePerRun: number;
  isEnabled: boolean;
}

export interface SendRuleResultDto {
  success: boolean;
  sentCount: number;
  failedCount: number;
  message: string;
}

export interface UserMailDeliveryLogDto {
  id: number;
  ruleId: number | null;
  ruleName: string | null;
  recipientEmail: string;
  subject: string;
  sentAtUtc: string;
  status: UserMailDeliveryStatus;
  errorMessage: string | null;
}

export interface ReportEmailPreviewDto {
  subject: string;
  htmlBody: string;
  reportType: UserMailReportType;
}

// Zamanlayıcının son turu. Kural doğru kurulduğu hâlde mail gitmiyorsa, sorunun arka plan
// işçisinde mi kuralda mı olduğunu ayırt eden tek bilgi.
export interface UserMailSchedulerStatusDto {
  lastTickUtc: string | null;
  isStale: boolean;
}

export const userMailApi = {
  getAccount: () => request<UserMailAccountDto | null>('/user-mail/account'),
  saveAccount: (dto: SaveUserMailAccountDto) =>
    request<UserMailAccountDto>('/user-mail/account', {
      method: 'PUT',
      body: JSON.stringify(dto),
    }),
  disconnectAccount: () => request<void>('/user-mail/account', { method: 'DELETE' }),
  testAccount: (dto?: TestMailRequestDto) =>
    request<TestMailResultDto>('/user-mail/account/test', {
      method: 'POST',
      body: JSON.stringify(dto ?? {}),
    }),
  oauthProviders: () => request<OAuthProvidersDto>('/user-mail/oauth/providers'),
  oauthStart: (provider: 'google' | 'microsoft') =>
    request<{ authorizationUrl: string }>(`/user-mail/oauth/${provider}/start`),
  listRules: () => request<UserMailAutomationRuleDto[]>('/user-mail/rules'),
  saveRule: (dto: SaveUserMailAutomationRuleDto) =>
    request<UserMailAutomationRuleDto>('/user-mail/rules', {
      method: 'POST',
      body: JSON.stringify(dto),
    }),
  deleteRule: (id: number) =>
    request<void>(`/user-mail/rules/${id}`, {
      method: 'DELETE',
    }),
  toggleRule: (id: number, isEnabled: boolean) =>
    request<{ isEnabled: boolean }>(`/user-mail/rules/${id}/toggle`, {
      method: 'POST',
      body: JSON.stringify({ isEnabled }),
    }),
  runRuleNow: (id: number) =>
    request<SendRuleResultDto>(`/user-mail/rules/${id}/run-now`, {
      method: 'POST',
    }),
  previewReport: (reportType: UserMailReportType, customTemplateId?: number | null) =>
    request<ReportEmailPreviewDto>(
      `/user-mail/preview/${reportType}${customTemplateId ? `?customTemplateId=${customTemplateId}` : ''}`
    ),
  sendPreview: (dto: SendPreviewRequestDto) =>
    request<TestMailResultDto>('/user-mail/preview/send', {
      method: 'POST',
      body: JSON.stringify(dto),
    }),
  schedulerStatus: () => request<UserMailSchedulerStatusDto>('/user-mail/scheduler-status'),
  listLogs: (limit = 100) => request<UserMailDeliveryLogDto[]>(`/user-mail/logs?limit=${limit}`),
};
