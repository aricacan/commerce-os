// İzleme paneli için kurgusal denetim, olay ve hata kayıtları (deterministik, bugüne göre göreli).
import type { AppEventDto, AuditLogEntryDto, BusinessEventDto } from '../../api/monitoring';
import { DEMO_MANAGED_USERS } from './system-people';
import { ago, createRng } from '../seed';

const AUDIT_COUNT = 160;
const SECURITY_COUNT = 70;
const BUSINESS_EVENT_COUNT = 90;
const EXCEPTION_COUNT = 60;
const LOG_HISTORY_DAYS = 14;
const MINUTES_PER_DAY = 24 * 60;
const TEST_NET_IP_PREFIX = '203.0.113.';
const MAX_IP_SUFFIX = 120;

const rng = createRng(77031);
const activeUsers = DEMO_MANAGED_USERS.filter((user) => user.isActive);

/** i. kayıt için "kaç dakika önce" — eskiye doğru, sona doğru seyrekleşen dağılım. */
const minutesAgo = (index: number, count: number): number =>
  Math.round((index / count) * LOG_HISTORY_DAYS * MINUTES_PER_DAY) + rng.int(0, 90);

const isoMinutesAgo = (minutes: number): string => ago(0, 0, minutes);
const correlation = (): string => `c${rng.int(100000, 999999).toString(16)}${rng.int(1000, 9999)}`;
const clientIp = (): string => `${TEST_NET_IP_PREFIX}${rng.int(2, MAX_IP_SUFFIX)}`;

// ─── Denetim kaydı ───────────────────────────────────────────────────────────
type AuditSeverity = AuditLogEntryDto['severity'];
type AuditSeed = [action: string, entityType: string, severity: AuditSeverity, details: string];

const AUDIT_SEEDS: AuditSeed[] = [
  ['OrderStatusChanged', 'Order', 'Info', 'Sipariş durumu "Hazırlanıyor" olarak güncellendi.'],
  ['ProductPriceUpdated', 'Product', 'Info', 'Satış fiyatı güncellendi: ₺649 → ₺689.'],
  ['ProductCostImported', 'ProductCost', 'Info', 'Alış fiyatı Excel dosyasından 84 satır içe aktarıldı.'],
  ['SystemSettingUpdated', 'SystemSetting', 'Warning', 'Finans ayarı değiştirildi: varsayılan KDV oranı.'],
  ['PagePermissionUpdated', 'PagePermission', 'Warning', 'Sayfa yetkisi güncellendi: Finans.'],
  ['UserCreated', 'User', 'Info', 'Yeni kullanıcı oluşturuldu.'],
  ['RoleAssigned', 'User', 'Warning', 'Kullanıcıya "Moderator" rolü atandı.'],
  ['ShipmentCreated', 'Shipment', 'Info', 'Sevkiyat kaydı oluşturuldu.'],
  ['IntegrationTested', 'IntegrationConnection', 'Info', 'ERP bağlantısı test edildi: başarılı.'],
  ['CredentialRevealed', 'Credential', 'Critical', 'Şifre kasasındaki parola görüntülendi.'],
  ['ReturnApproved', 'Return', 'Info', 'İade talebi onaylandı.'],
  ['ExportGenerated', 'Export', 'Info', 'Sipariş listesi Excel olarak dışa aktarıldı.'],
];

function buildAuditEntry(seed: AuditSeed, id: number, userIndex: number, minutes: number): AuditLogEntryDto {
  const [action, entityType, severity, details] = seed;
  const user = activeUsers[userIndex % activeUsers.length];
  return {
    id,
    action,
    entityType,
    entityId: String(rng.int(100, 9999)),
    userId: user.id,
    userEmail: user.email,
    ipAddress: clientIp(),
    details,
    severity,
    createdAt: isoMinutesAgo(minutes),
    correlationId: correlation(),
  };
}

export const DEMO_AUDIT_LOG: AuditLogEntryDto[] = Array.from({ length: AUDIT_COUNT }, (_, index) =>
  buildAuditEntry(AUDIT_SEEDS[index % AUDIT_SEEDS.length], AUDIT_COUNT - index, rng.int(0, 20), minutesAgo(index, AUDIT_COUNT)),
);

// ─── Güvenlik kaydı ──────────────────────────────────────────────────────────
const SECURITY_SEEDS: AuditSeed[] = [
  ['LoginSucceeded', 'Auth', 'Info', 'Oturum açıldı.'],
  ['LoginSucceeded', 'Auth', 'Info', 'Oturum açıldı.'],
  ['Logout', 'Auth', 'Info', 'Oturum kapatıldı.'],
  ['LoginFailed', 'Auth', 'Warning', 'Hatalı parola denemesi.'],
  ['PermissionDenied', 'Permission', 'Warning', 'Yetkisiz erişim denemesi: sistem ayarları.'],
  ['RoleChanged', 'User', 'Warning', 'Kullanıcı rolü değiştirildi.'],
  ['PasswordChanged', 'User', 'Info', 'Parola değiştirildi.'],
];

export const DEMO_SECURITY_LOG: AuditLogEntryDto[] = Array.from({ length: SECURITY_COUNT }, (_, index) =>
  buildAuditEntry(SECURITY_SEEDS[index % SECURITY_SEEDS.length], SECURITY_COUNT - index, rng.int(0, 20), minutesAgo(index, SECURITY_COUNT)),
);

// ─── İş olayları ─────────────────────────────────────────────────────────────
const BUSINESS_EVENT_SEEDS: Array<[string, string]> = [
  ['OrderImported', 'Pazaryerinden yeni siparişler alındı.'],
  ['StockSynced', 'Stok bilgileri ERP ile eşitlendi.'],
  ['PriceSynced', 'Fiyat güncellemeleri pazaryerlerine gönderildi.'],
  ['InvoiceGenerated', 'Günlük faturalar oluşturuldu.'],
  ['ShipmentDispatched', 'Kargo gönderimleri toplu olarak çıkarıldı.'],
  ['TestRunCompleted', 'Otomatik test turu tamamlandı: tüm kontroller başarılı.'],
  ['CurrencyRatesUpdated', 'Döviz kurları güncellendi.'],
];

export const DEMO_BUSINESS_EVENTS: BusinessEventDto[] = Array.from({ length: BUSINESS_EVENT_COUNT }, (_, index) => {
  const [eventType, description] = BUSINESS_EVENT_SEEDS[index % BUSINESS_EVENT_SEEDS.length];
  return {
    id: BUSINESS_EVENT_COUNT - index,
    eventType,
    description,
    payloadJson: JSON.stringify({ count: rng.int(3, 240), durationMs: rng.int(200, 9000) }),
    storeId: rng.int(1, 3),
    createdAt: isoMinutesAgo(minutesAgo(index, BUSINESS_EVENT_COUNT)),
    correlationId: correlation(),
  };
});

// ─── Hata ve yavaş istek olayları ────────────────────────────────────────────
type ExceptionSeed = [level: AppEventDto['level'], category: string, message: string, path: string, method: string, status: number, durationMs: number | null];

const EXCEPTION_SEEDS: ExceptionSeed[] = [
  ['Warning', 'SlowRequest', 'İstek 3,4 sn sürdü (bütçe 1,5 sn).', '/api/orders', 'GET', 200, 3400],
  ['Error', 'MarketplaceSync', 'Pazaryeri API isteği zaman aşımına uğradı.', '/api/integration-connections/6/discover', 'POST', 504, 25000],
  ['Warning', 'Validation', 'Geçersiz tarih aralığı gönderildi.', '/api/dashboard/summary', 'GET', 400, 12],
  ['Error', 'Database', 'Bağlantı havuzu geçici olarak doldu; istek yeniden denendi.', '/api/products', 'GET', 500, 8200],
  ['Warning', 'SlowRequest', 'İstek 2,1 sn sürdü (bütçe 1,5 sn).', '/api/finance/pnl', 'GET', 200, 2100],
  ['Critical', 'ExternalService', 'Kargo servisi 3 denemede de yanıt vermedi.', '/api/shipping/rates', 'GET', 502, 30000],
];

export const DEMO_EXCEPTIONS: AppEventDto[] = Array.from({ length: EXCEPTION_COUNT }, (_, index) => {
  const [level, category, message, requestPath, httpMethod, statusCode, durationMs] = EXCEPTION_SEEDS[index % EXCEPTION_SEEDS.length];
  return {
    id: EXCEPTION_COUNT - index,
    occurredAtUtc: isoMinutesAgo(minutesAgo(index, EXCEPTION_COUNT)),
    level,
    category,
    message,
    stackTrace: category === 'SlowRequest' ? null : `   at Demo.Application.Services.RequestHandler.ExecuteAsync()\n   at Demo.Api.Controllers.BaseController.Invoke()`,
    requestPath,
    httpMethod,
    statusCode,
    durationMs,
    correlationId: correlation(),
    userId: activeUsers[index % activeUsers.length].id,
  };
});

/** from/to (yyyy-MM-dd veya ISO) aralığında mı; sınırlar yoksa her kayıt geçer. */
export function inDateRange(iso: string, from: string | null, to: string | null): boolean {
  if (from && iso < from) return false;
  if (to && iso.slice(0, to.length) > to) return false;
  return true;
}
