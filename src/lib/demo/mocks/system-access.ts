// Kullanıcılar, roller, izinler, modül bayrakları ve sistem ayarları (salt görüntü + kimlik).
import type { FinanceSettings, PermissionEnforcementStatus, TenantLinks, TenantPublicLinks } from '../../api/settings';
import type { TenantSummary } from '../../api/system-tenants';
import { DEMO_MODULE_CATALOG, DEMO_MODULE_FLAGS, DEMO_PAGE_PERMISSIONS } from '../data/system-modules';
import { DEMO_MANAGED_USERS, DEMO_PERMISSION_CATALOG, DEMO_ROLES, DEMO_ROLE_DETAILS, DEMO_ROLE_SUMMARIES } from '../data/system-people';
import { ago } from '../seed';
import { DemoHttpResponse, get, type DemoRoute } from '../router';

const NOT_FOUND_STATUS = 404;
const DEMO_KDV_RATE = 20;
const TENANT_AGE_DAYS = 400;
const SECOND_TENANT_AGE_DAYS = 120;

const FINANCE_SETTINGS: FinanceSettings = {
  kdvRate: DEMO_KDV_RATE,
  defaultCargoFirm: 'Örnek Kargo',
  defaultCargoFirmUK: 'Demo Courier',
  availableCargoFirms: ['Örnek Kargo', 'Hızlı Taşıma', 'Demo Lojistik', 'Demo Courier'],
  trendyolCommission: 18,
  hepsiburadaCommission: 16.5,
  n11Commission: 14,
  amazonCommission: 15,
};

const PERMISSION_ENFORCEMENT: PermissionEnforcementStatus = {
  mode: 'Log',
  blocking: false,
  shadowWindowDays: 7,
  shadowDeniedCount: 0,
  notice: 'Demo ortamında izin denetimi yalnızca kayıt modunda çalışır; hiçbir istek engellenmez.',
};

const PUBLIC_LINKS: TenantPublicLinks = { slackWorkspaceUrl: null, trelloBoardUrl: null };

const TENANT_LINKS: TenantLinks = {
  ...PUBLIC_LINKS,
  slackWebhookUrl: null,
  hasSlackWebhook: false,
  usesSystemSlackFallback: false,
};

const TENANTS: TenantSummary[] = [
  { id: 1, code: 'demo-oto', name: 'Demo Oto Aksesuar', isActive: true, createdAt: ago(TENANT_AGE_DAYS), storeCount: 3, erpConnectionCount: 3, marketplaceConnectionCount: 5, userCount: DEMO_MANAGED_USERS.length, categoryTemplateKey: 'auto-accessories' },
  { id: 2, code: 'demo-yedek-parca', name: 'Demo Yedek Parça', isActive: true, createdAt: ago(SECOND_TENANT_AGE_DAYS), storeCount: 1, erpConnectionCount: 1, marketplaceConnectionCount: 2, userCount: 4, categoryTemplateKey: null },
];

const moduleAccess = () =>
  DEMO_MODULE_CATALOG.filter((entry) => entry.grantablePerUser).map((entry) => ({
    moduleKey: entry.key,
    userIds: DEMO_MANAGED_USERS.filter((user) => user.isActive).map((user) => user.id),
  }));

export const systemAccessRoutes: DemoRoute[] = [
  get('/user', () => DEMO_MANAGED_USERS),
  get('/user/roles', () => DEMO_ROLES),

  get('/roles', () => DEMO_ROLE_SUMMARIES),
  get('/roles/catalog', () => DEMO_PERMISSION_CATALOG),
  get('/roles/:id', (req) => {
    const role = DEMO_ROLE_DETAILS.find((entry) => entry.id === Number(req.params.id));
    return role ?? new DemoHttpResponse(NOT_FOUND_STATUS, { title: 'Rol bulunamadı.' });
  }),

  get('/permissions/pages', () => DEMO_PAGE_PERMISSIONS),
  get('/module-access', moduleAccess),

  get('/system-settings/finance', () => FINANCE_SETTINGS),
  get('/system-settings/permissions/enforcement', () => PERMISSION_ENFORCEMENT),
  get('/system-settings/modules/catalog', () => DEMO_MODULE_CATALOG),
  get('/system-settings/modules', () => DEMO_MODULE_FLAGS),
  get('/system-settings/tenant-links', () => TENANT_LINKS),
  get('/tenant-links', () => PUBLIC_LINKS),

  get('/system/tenants', () => TENANTS),
];
