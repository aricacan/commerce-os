import { request } from './core';

// ─── System Settings ──────────────────────────────────────────────────────────
export interface FinanceSettings {
  kdvRate: number;
  defaultCargoFirm: string;
  // UK varsayılan taşıyıcısı; boşsa ve UK'de tek taşıyıcı varsa o kullanılır.
  defaultCargoFirmUK?: string | null;
  availableCargoFirms: string[];
  trendyolCommission?: number;
  hepsiburadaCommission?: number;
  n11Commission?: number;
  amazonCommission?: number;
}

// Kiracıya özel Slack/Trello bağlantıları (bkz. backend SystemSettingsController tenant-links).
// slackWebhookUrl GET'te MASKELİ gelir (sır). PUT'ta: null = değiştirme, '' = sil, değer = yeni.
export interface TenantLinks {
  slackWorkspaceUrl: string | null;
  slackWebhookUrl: string | null;
  hasSlackWebhook: boolean;
  trelloBoardUrl: string | null;
  usesSystemSlackFallback: boolean;
}

export interface UpdateTenantLinksBody {
  slackWorkspaceUrl: string | null;
  slackWebhookUrl: string | null;
  trelloBoardUrl: string | null;
}

// Topbar kısayolları: her kullanıcıya açık, sır içermeyen kısım (webhook yok).
export interface TenantPublicLinks {
  slackWorkspaceUrl: string | null;
  trelloBoardUrl: string | null;
}

export const tenantLinksApi = {
  getPublic: () => request<TenantPublicLinks>('/tenant-links'),
  get: () => request<TenantLinks>('/system-settings/tenant-links'),
  update: (body: UpdateTenantLinksBody) =>
    request<TenantLinks>('/system-settings/tenant-links', { method: 'PUT', body: JSON.stringify(body) }),
};

export const settingsApi = {
  getFinance: () => request<FinanceSettings>('/system-settings/finance'),
  setFinance: (body: Omit<FinanceSettings, 'availableCargoFirms'>) =>
    request<{ message: string }>('/system-settings/finance', { method: 'PUT', body: JSON.stringify(body) }),
  // Artık tamamen otomatik (CurrencyRates/TCMB) — salt-okunur, PUT/manuel giriş yok
  // (bkz. backend SystemSettingsController.GetBaseFx).
  getBaseFx: () => request<{ gbpToTryRate: number }>('/system-settings/base-fx'),
  // Izin uygulamasinin GERCEK durumu. Varsayilan mod `log` ve o modda [RequirePermission]
  // hicbir istegi ENGELLEMIYOR — yalnizca golge denetim kaydi yaziyor. Bu bilincli bir gecis
  // modu ama panelden gorunmuyordu ve "yetkiler calisiyor" saniliyordu.
  getPermissionEnforcement: () =>
    request<PermissionEnforcementStatus>('/system-settings/permissions/enforcement'),
  // Modül aç/kapa (runtime). getModuleFlags herkes okuyabilir (UI gizleme için); set admin.
  getModuleFlags: () => request<Record<string, boolean>>('/system-settings/modules'),
  // MODÜL KATALOĞU — ön yüzün TEK kaynağı. Önceden ön yüz kendi listelerini tutuyordu
  // (useAppCatalog + APP_MODULE_KEYS) ve bunlar backend'in kataloğuyla aynı değildi: bazı
  // modüller menüde görünüp kapatılamıyor, bazıları kapatılıp menüde kalıyordu.
  getModuleCatalog: () => request<ModuleCatalogEntry[]>('/system-settings/modules/catalog'),
  setModuleFlag: (moduleKey: string, enabled: boolean) =>
    request<{ module: string; enabled: boolean }>(`/system-settings/modules/${moduleKey}`, { method: 'PUT', body: JSON.stringify({ enabled }) }),
};

export interface PermissionEnforcementStatus {
  /** "Log" | "Block" */
  mode: string;
  /** true ise yetkisiz istekler gercekten 403 alir. */
  blocking: boolean;
  shadowWindowDays: number;
  /** Block modunda reddedilecek olan istek sayisi — block'a gecmeden once bakilacak sayi. */
  shadowDeniedCount: number;
  notice: string;
}

/**
 * Bir modülün sistemdeki rolü (backend ModuleKind ile birebir).
 *  - Workspace    : kendi rotası olan modül, Uygulamalar menüsünde çıkar
 *  - AdminTool    : yönetici aracı, Uygulamalar menüsünde ayrı bölümde
 *  - NavPage      : sol paneldeki normal sayfa ama modül gibi kapatılabilir (ör. Uyumluluk)
 *  - InternalFlag : kullanıcıya görünmeyen davranış anahtarı (ör. dış ERP gönderimi)
 */
export type ModuleKind = 'Workspace' | 'AdminTool' | 'NavPage' | 'InternalFlag' | 'Hub';

export interface ModuleCatalogEntry {
  key: string;
  displayName: string;
  description: string;
  kind: ModuleKind;
  /** Workspace/AdminTool için modül rotası, NavPage için sol paneldeki sayfa. */
  uiRoute: string | null;
  /** Yetkiler ekranından kullanıcı bazlı erişim verilebilir mi. */
  grantablePerUser: boolean;
  /** Ayarlar > Modüller'de aç/kapa anahtarı gösterilir mi. */
  togglable: boolean;
  /** BU KİRACI için açık mı (kiracı satırı → eski global ayar → açık). Sunucuda yoksa hep false. */
  enabled: boolean;
  /**
   * false: modül bu sunucuda ortam anahtarıyla hiç yüklenmemiş (Modules__X__Enabled=false).
   * Ayarlar'dan açılamaz, menüde görünmez; rotası "bu sunucuda kapalı" ekranını gösterir.
   */
  availableOnServer: boolean;
}
