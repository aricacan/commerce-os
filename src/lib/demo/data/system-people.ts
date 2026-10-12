// Sistem alanı: kurgusal çalışanlar, roller ve işlem izinleri kataloğu.
import type { ManagedUser, UserRole } from '../../api/users';
import type { PermissionCatalogItem, RoleDetail, RoleResponse } from '../../api/roles';
import { DEMO_USER } from '../config';

export const DEMO_ROLES: UserRole[] = [
  { id: 1, name: 'Admin' },
  { id: 2, name: 'Moderator' },
  { id: 3, name: 'User' },
  { id: 4, name: 'SuperAdmin' },
];

const roleByName = (name: string): UserRole => DEMO_ROLES.find((role) => role.name === name) ?? DEMO_ROLES[2];

const EMPLOYEES: Array<Pick<ManagedUser, 'firstName' | 'lastName'> & { role: string; active: boolean }> = [
  { firstName: 'Elif', lastName: 'Yılmaz', role: 'Admin', active: true },
  { firstName: 'Burak', lastName: 'Kaya', role: 'Moderator', active: true },
  { firstName: 'Zeynep', lastName: 'Demir', role: 'User', active: true },
  { firstName: 'Emre', lastName: 'Çelik', role: 'User', active: true },
  { firstName: 'Selin', lastName: 'Aydın', role: 'Moderator', active: true },
  { firstName: 'Can', lastName: 'Arslan', role: 'User', active: false },
  { firstName: 'Oliver', lastName: 'Taylor', role: 'User', active: true },
];

const ASCII_MAP: Record<string, string> = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u' };
const toAscii = (value: string): string =>
  value.toLocaleLowerCase('en').replace(/[çğıöşü]/g, (char) => ASCII_MAP[char] ?? char);

export const DEMO_MANAGED_USERS: ManagedUser[] = [
  {
    id: DEMO_USER.id,
    email: DEMO_USER.email,
    firstName: DEMO_USER.firstName,
    lastName: DEMO_USER.lastName,
    companyEmail: null,
    isActive: true,
    roles: [roleByName('Admin')],
  },
  ...EMPLOYEES.map((employee, index): ManagedUser => ({
    id: DEMO_USER.id + index + 1,
    email: `${toAscii(employee.firstName)}.${toAscii(employee.lastName)}@example.com`,
    firstName: employee.firstName,
    lastName: employee.lastName,
    companyEmail: index % 2 === 0 ? `${toAscii(employee.firstName)}@demo-oto.example.com` : null,
    isActive: employee.active,
    roles: [roleByName(employee.role)],
  })),
];

// ─── İşlem bazlı izinler (feature:action) ────────────────────────────────────
const CRUD_ACTIONS = ['view', 'create', 'update', 'delete'] as const;

const PERMISSION_FEATURES: Array<{ group: string; feature: string; label: string; actions: readonly string[] }> = [
  { group: 'Siparişler', feature: 'orders', label: 'Siparişler', actions: ['view', 'update', 'cancel', 'export', 'viewSensitive'] },
  { group: 'Siparişler', feature: 'returns', label: 'İadeler', actions: ['view', 'update', 'approve'] },
  { group: 'Ürünler', feature: 'products', label: 'Ürünler', actions: [...CRUD_ACTIONS, 'export'] },
  { group: 'Ürünler', feature: 'product-costs', label: 'Alış Fiyatları', actions: ['view', 'update', 'approve', 'viewSensitive'] },
  { group: 'Finans', feature: 'finance', label: 'Finans ve P&L', actions: ['view', 'export', 'viewSensitive'] },
  { group: 'Finans', feature: 'expenses', label: 'Giderler', actions: CRUD_ACTIONS },
  { group: 'Faturalama', feature: 'invoices', label: 'Faturalar', actions: ['view', 'create', 'cancel', 'export'] },
  { group: 'Lojistik', feature: 'shipping', label: 'Kargo ve Sevkiyat', actions: ['view', 'create', 'update'] },
  { group: 'Müşteriler', feature: 'customers', label: 'Müşteriler', actions: ['view', 'create', 'update', 'export'] },
  { group: 'Sistem', feature: 'users', label: 'Kullanıcılar', actions: CRUD_ACTIONS },
  { group: 'Sistem', feature: 'settings', label: 'Sistem Ayarları', actions: ['view', 'update'] },
];

const ACTION_LABELS: Record<string, string> = {
  view: 'Görüntüle',
  create: 'Oluştur',
  update: 'Düzenle',
  delete: 'Sil',
  approve: 'Onayla',
  cancel: 'İptal et',
  export: 'Dışa aktar',
  viewSensitive: 'Maliyet/Kâr görüntüle',
};

export const DEMO_PERMISSION_CATALOG: PermissionCatalogItem[] = PERMISSION_FEATURES.flatMap((entry) =>
  entry.actions.map((action) => ({
    groupKey: entry.group,
    featureKey: entry.feature,
    actionKey: action,
    label: `${entry.label} · ${ACTION_LABELS[action] ?? action}`,
    key: `${entry.feature}:${action}`,
  })),
);

const ALL_KEYS = DEMO_PERMISSION_CATALOG.map((item) => item.key);
const isReadOnlyKey = (key: string): boolean => key.endsWith(':view');
const isOperationalKey = (key: string): boolean => !key.startsWith('users:') && !key.startsWith('settings:');

const ROLE_DEFINITIONS: Array<Omit<RoleDetail, 'id'>> = [
  { name: 'SuperAdmin', description: 'Tüm yetkiler ve kiracı yönetimi', isSystem: true, isActive: true, permissionKeys: ALL_KEYS },
  { name: 'Admin', description: 'Şirket yöneticisi: tüm modüller ve ayarlar', isSystem: true, isActive: true, permissionKeys: ALL_KEYS },
  { name: 'Moderator', description: 'Operasyon ekibi: sipariş, ürün ve kargo işlemleri', isSystem: true, isActive: true, permissionKeys: ALL_KEYS.filter(isOperationalKey) },
  { name: 'User', description: 'Salt okunur çalışan hesabı', isSystem: true, isActive: true, permissionKeys: ALL_KEYS.filter(isReadOnlyKey) },
  { name: 'Muhasebe', description: 'Finans ve fatura ekranları', isSystem: false, isActive: true, permissionKeys: ALL_KEYS.filter((key) => /^(finance|expenses|invoices|orders)/.test(key)) },
];

export const DEMO_ROLE_DETAILS: RoleDetail[] = ROLE_DEFINITIONS.map((role, index) => ({ id: index + 1, ...role }));

export const DEMO_ROLE_SUMMARIES: RoleResponse[] = DEMO_ROLE_DETAILS.map(({ permissionKeys, ...role }) => ({
  ...role,
  permissionCount: permissionKeys.length,
}));
