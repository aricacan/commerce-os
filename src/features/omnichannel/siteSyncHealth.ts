import type { CatalogSiteSourceDto } from '../../lib/api/omnichannel-catalog';

// Backend SiteFailureKind adları (LastFailureKind).
export const SITE_FAILURE_KIND = {
  RateLimited: 'RateLimited',
  Blocked: 'Blocked',
  Timeout: 'Timeout',
  NotFound: 'NotFound',
  ParseError: 'ParseError',
  Other: 'Other',
} as const;

// Backend SyncStatus değerleri (IntegrationSyncStatus).
export const SYNC_STATUS = { Success: 'Success', Error: 'Error', Partial: 'Partial', Syncing: 'Syncing' } as const;

const FAILURE_EXPLANATIONS: Record<string, string> = {
  [SITE_FAILURE_KIND.RateLimited]: 'Site çok sık istek nedeniyle bizi yavaşlattı. Kendiliğinden yeniden denenir.',
  [SITE_FAILURE_KIND.Blocked]: 'Site bu sunucunun erişimini engelliyor (güvenlik duvarı). Sitenin izinli IP listesine sunucuyu ekletin.',
  [SITE_FAILURE_KIND.Timeout]: 'Site zamanında cevap vermedi. Kendiliğinden yeniden denenir.',
  [SITE_FAILURE_KIND.NotFound]: 'Adres ya da ürün listesi bulunamadı. Site adresini kontrol edin.',
  [SITE_FAILURE_KIND.ParseError]: 'Sitenin cevabı beklenen biçimde değil. Site yapısı değişmiş olabilir.',
  [SITE_FAILURE_KIND.Other]: 'Siteye ulaşılamadı ya da beklenmeyen bir hata oldu.',
};

// Kayıt verisi bayat sayılmadan önce kaç senkron aralığı geçebilir.
const STALE_AFTER_INTERVALS = 2;
const MS_PER_HOUR = 60 * 60 * 1000;

export type SyncSeverity = 'error' | 'warning' | 'none';

// Hata (Error) kırmızı; kısmi çekme ve başarılı-ama-uyarılı çekme (ör. "pasife alınmadı") sarı.
export function syncSeverity(site: Pick<CatalogSiteSourceDto, 'syncStatus' | 'lastError'>): SyncSeverity {
  if (site.syncStatus === SYNC_STATUS.Error) return 'error';
  if (site.syncStatus === SYNC_STATUS.Partial || site.lastError) return 'warning';
  return 'none';
}

export function describeFailureKind(kind: string | null | undefined): string | null {
  return kind ? (FAILURE_EXPLANATIONS[kind] ?? FAILURE_EXPLANATIONS[SITE_FAILURE_KIND.Other]) : null;
}

// Son tam başarılı çekme, aralığın STALE_AFTER_INTERVALS katından eskiyse (ya da hiç yoksa ve
// kaynak bir kez denenmişse) veri bayattır.
export function isStale(
  site: Pick<CatalogSiteSourceDto, 'lastSuccessAt' | 'lastSyncAt' | 'syncIntervalHours'>,
  nowMs: number,
): boolean {
  if (!site.lastSyncAt) return false;
  if (!site.lastSuccessAt) return true;
  return nowMs - new Date(site.lastSuccessAt).getTime() > site.syncIntervalHours * STALE_AFTER_INTERVALS * MS_PER_HOUR;
}

export function hasPendingRetry(site: Pick<CatalogSiteSourceDto, 'nextAttemptAt'>, nowMs: number): boolean {
  return !!site.nextAttemptAt && new Date(site.nextAttemptAt).getTime() > nowMs;
}

// Elle çekme yalnız site bizi sınırladı/engelledi diye kısa süre kapalıdır (otomatik denemeden bağımsız).
export function isManualSyncBlocked(site: Pick<CatalogSiteSourceDto, 'manualSyncNotBefore'>, nowMs: number): boolean {
  return !!site.manualSyncNotBefore && new Date(site.manualSyncNotBefore).getTime() > nowMs;
}
