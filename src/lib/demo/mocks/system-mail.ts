// Kullanıcı e-posta hesabı, otomatik rapor kuralları ve gönderim günlüğü.
import {
  MAIL_AUTH_SMTP_PASSWORD,
  MAIL_INTERVAL_DAILY,
  MAIL_INTERVAL_MONTHLY,
  MAIL_INTERVAL_WEEKLY,
  MAIL_STATUS_FAILED,
  MAIL_STATUS_SENT,
  type OAuthProvidersDto,
  type UserMailAccountDto,
  type UserMailAutomationRuleDto,
  type UserMailDeliveryLogDto,
  type UserMailSchedulerStatusDto,
} from '../../api/user-mail';
import { DEMO_USER } from '../config';
import { get, type DemoRoute } from '../router';
import { ago } from '../seed';

const DEFAULT_LOG_LIMIT = 100;
const DAILY_SENDING_LIMIT = 500;
const SMTP_PORT = 587;

const ACCOUNT: UserMailAccountDto = {
  id: 1,
  userId: DEMO_USER.id,
  emailAddress: 'rapor@example.com',
  senderDisplayName: 'Demo Oto Aksesuar',
  authType: MAIL_AUTH_SMTP_PASSWORD,
  oAuthProvider: 0,
  smtpHost: 'smtp.example.com',
  smtpPort: SMTP_PORT,
  useSsl: true,
  hasSecret: true,
  accessTokenExpiresAtUtc: null,
  dailySendingLimit: DAILY_SENDING_LIMIT,
  currentDailyCount: 14,
  lastTestedAt: ago(3),
  lastTestStatus: 'Bağlantı başarılı.',
  lastTestSucceeded: true,
  isActive: true,
  updatedAt: ago(3),
};

// [ad, rapor tipi, etiket, alıcılar, aralık, saat]
const RULE_SEEDS: Array<[string, UserMailAutomationRuleDto['reportType'], string, string, UserMailAutomationRuleDto['scheduleInterval'], string]> = [
  ['Günlük satış özeti', 5, 'Günlük Özet v2', 'yonetim@example.com', MAIL_INTERVAL_DAILY, '08:30'],
  ['Haftalık performans', 1, 'Haftalık Özet', 'yonetim@example.com, ortaklar@example.com', MAIL_INTERVAL_WEEKLY, '09:00'],
  ['Aylık kâr-zarar', 2, 'Aylık P&L', 'muhasebe@example.com', MAIL_INTERVAL_MONTHLY, '10:00'],
];

const RULES: UserMailAutomationRuleDto[] = RULE_SEEDS.map(([name, reportType, reportTypeLabel, recipients, scheduleInterval, scheduleTime], index) => ({
  id: index + 1,
  userId: DEMO_USER.id,
  name,
  reportType,
  reportTypeLabel,
  customTemplateId: null,
  customTemplateName: null,
  recipients,
  scheduleInterval,
  scheduleTime,
  batchSizePerRun: 50,
  isEnabled: index !== 2,
  lastRunAtUtc: ago(index, 6),
  nextRunAtUtc: ago(-1, 6),
}));

const LOG_COUNT = 14;

const LOGS: UserMailDeliveryLogDto[] = Array.from({ length: LOG_COUNT }, (_, index) => {
  const rule = RULES[index % RULES.length];
  const failed = index === 5;
  return {
    id: LOG_COUNT - index,
    ruleId: rule.id,
    ruleName: rule.name,
    recipientEmail: rule.recipients.split(',')[0].trim(),
    subject: `${rule.name} — ${rule.reportTypeLabel}`,
    sentAtUtc: ago(index, index % 5),
    status: failed ? MAIL_STATUS_FAILED : MAIL_STATUS_SENT,
    errorMessage: failed ? 'Alıcı sunucusu geçici olarak yanıt vermedi (demo).' : null,
  };
});

const OAUTH_PROVIDERS: OAuthProvidersDto = { google: false, microsoft: false };
const SCHEDULER_STATUS: UserMailSchedulerStatusDto = { lastTickUtc: ago(0, 0, 1), isStale: false };

const PREVIEW_BODY = `<div style="font-family:Arial,sans-serif;padding:24px;color:#1f2937">
  <h2>Günlük Satış Özeti</h2>
  <p>Dün toplam <b>128 sipariş</b> alındı; net ciro <b>₺184.620</b>.</p>
  <ul><li>Mağaza A: 74 sipariş</li><li>Mağaza B: 41 sipariş</li><li>Store C (UK): 13 sipariş</li></ul>
  <p style="color:#6b7280">Bu e-posta demo verileriyle üretilmiştir.</p>
</div>`;

export const systemMailRoutes: DemoRoute[] = [
  get('/user-mail/preview/:type', (req) => ({
    subject: 'Günlük Satış Özeti — Demo Oto Aksesuar',
    htmlBody: PREVIEW_BODY,
    reportType: Number(req.params.type),
  })),
  get('/user-mail/account', () => ACCOUNT),
  get('/user-mail/oauth/providers', () => OAUTH_PROVIDERS),
  get('/user-mail/rules', () => RULES),
  get('/user-mail/scheduler-status', () => SCHEDULER_STATUS),
  get('/user-mail/logs', (req) => LOGS.slice(0, Number(req.query.get('limit') ?? DEFAULT_LOG_LIMIT))),
];
