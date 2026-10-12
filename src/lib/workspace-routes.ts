import type { WorkspaceKey } from '../stores/workspace-panel';

// Modül URL'leri — TEK KAYNAK.
//
// Modüller daha önce yalnızca bir overlay paneldi: adresi yoktu, yenilenince kayboluyordu,
// linki paylaşılamıyordu. Artık her modülün gerçek bir rotası var (/adshub, /b2b-outreach, …) ve
// modül içindeki sekme de adrese yazılıyor (/adshub/campaigns) — bkz. ModuleWorkspace.
//
// Anahtar, WorkspaceKey ile AYNI string: rota segmenti ile panel anahtarını ayrı tutmak
// ikisinin zamanla ayrışmasına davetiye çıkarırdı.
export const WORKSPACE_ROUTES: Record<WorkspaceKey, string> = {
  'b2b-outreach': '/b2b-outreach',
  'ai-copilot': '/ai-copilot',
  base: '/base',
  erpis: '/erpis',
  sentos: '/sentos',
  monitoring: '/monitoring',
  omnichannel: '/omnichannel',
  logistics: '/logistics',
  'photo-studio': '/photo-studio',
  sitehub: '/sitehub',
  shopify: '/shopify',
  wms: '/wms',
  adshub: '/adshub',
  sellingview: '/sellingview',
  partnerhub: '/partnerhub',
  'oem-matcher': '/oem-matcher',
  trendyol: '/trendyol',
};

const SEGMENT_TO_KEY = new Map<string, WorkspaceKey>(
  (Object.entries(WORKSPACE_ROUTES) as [WorkspaceKey, string][])
    .map(([key, route]) => [route.slice(1), key]),
);

// Modül anahtarı ↔ workspace anahtarı. Ekran adı/rotası işlevi anlatır; backend'deki teknik
// anahtar ise kiracı bayrakları, kullanıcı erişimleri ve iş kapıları bu adla kayıtlı olduğu
// için ESKİ adında kaldı (bkz. backend ModuleRegistry). SellingView de aynı nedenle "forecast".
// Trendyol Hub'ın modül kaydı aynı adla ("trendyol") — eşlemede yer almaz.
//
// BURADA çünkü WorkspaceKey'in evi burası. Eşleme iki ayrı hook'ta kopyalanınca (useAppCatalog
// ve useModuleAccess) ikisinin ayrışması an meselesiydi — modül kavramını tek kaynağa
// oturturken aynı hatayı ön yüzde tekrarlamak anlamsız olurdu.
const MODULE_KEY_BY_WORKSPACE: Partial<Record<WorkspaceKey, string>> = {
  sellingview: 'forecast',
  'b2b-outreach': 'radar',
  'ai-copilot': 'intelligent',
  'oem-matcher': 'sonar',
  wms: 'warehouse',
  logistics: 'shipping',
  base: 'basetrack',
  sentos: 'sentostrack',
};

// Hub'lar: erişim SEKME bazında karar verilir (Base Hub'da katalog sekmeleri sayfa yetkisiyle,
// sevkiyat sekmeleri modül yetkisiyle; Trendyol Hub'da her sekme kendi sayfa yetkisiyle). Rota
// kapısı (WorkspaceRoutePage) bunları modül yetkisiyle bütünüyle kilitlemez — hub kendisi süzer.
export const TAB_GATED_WORKSPACES: ReadonlySet<WorkspaceKey> = new Set<WorkspaceKey>(['base', 'trendyol']);

const WORKSPACE_BY_MODULE_KEY: Record<string, WorkspaceKey> = Object.fromEntries(
  Object.entries(MODULE_KEY_BY_WORKSPACE).map(([workspace, moduleKey]) => [moduleKey, workspace as WorkspaceKey]),
);

/** Workspace anahtarından modül anahtarı (bayrak/yetki kaydında kullanılan ad). */
export function moduleKeyOfWorkspace(workspace: WorkspaceKey): string {
  return MODULE_KEY_BY_WORKSPACE[workspace] ?? workspace;
}

/** Modül anahtarından workspace anahtarı. Rotası olmayan modül için null. */
export function workspaceKeyOfModule(moduleKey: string): WorkspaceKey | null {
  const candidate = WORKSPACE_BY_MODULE_KEY[moduleKey] ?? (moduleKey as WorkspaceKey);
  return candidate in WORKSPACE_ROUTES ? candidate : null;
}

export function workspaceRoute(key: WorkspaceKey): string {
  return WORKSPACE_ROUTES[key];
}

/**
 * Bir pathname'i modül rotası olarak çözer.
 * "/adshub/campaigns" -> { key: 'adshub', base: '/adshub', section: 'campaigns' }
 * Modül rotası değilse null.
 */
export function parseWorkspacePath(pathname: string): {
  key: WorkspaceKey;
  base: string;
  section: string | null;
} | null {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) return null;

  const key = SEGMENT_TO_KEY.get(segments[0]);
  if (!key) return null;

  return { key, base: `/${segments[0]}`, section: segments[1] ?? null };
}
