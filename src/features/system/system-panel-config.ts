import type { useI18n } from '../../lib/i18n';
import { NAV, isGroup, type NavItem } from '../../lib/nav-groups';

type Translate = ReturnType<typeof useI18n>['t'];

// KALDIRILDI (10 Eyl 2026): APP_MODULE_KEYS / APP_MODULE_KEY_SET / MODULE_ACCESS_LABELS.
//
// Üçü de elle yazılmış modül listeleriydi ve backend'in kataloğuyla aynı değildi. En görünür
// sonucu: Sonar, AdsHub, Erpis, Fiziksel Depo, SellingView ve PartnerHub bu listede
// olmadığı için Yetkiler ekranından kullanıcı bazlı KISITLANAMIYORDU — `isModuleAllowed`
// kayıt bulamayınca `true` döndüğünden altı modül herkese açıktı.
//
// Yerine: `useModuleCatalog()` → GET /api/system-settings/modules/catalog. Ad, açıklama ve
// "kullanıcı bazlı verilebilir mi" bilgisi artık backend'deki ModuleRegistry'den gelir.

export function getDynamicPageList(t: Translate) {
  const list: Array<{ pageKey: string; pageLabel: string; href: string; sortOrder: number }> = [];
  let sortOrder = 1;
  const addNavItem = (item: NavItem) => {
    if (list.some((entry) => entry.href === item.href)) return;
    list.push({ pageKey: item.pageKey, pageLabel: t(item.key) || item.key, href: item.href, sortOrder });
    sortOrder += 1;
  };

  NAV.forEach((entry) => {
    if (!isGroup(entry)) return addNavItem(entry);
    if (entry.sections) entry.sections.forEach((section) => section.children.forEach(addNavItem));
    else entry.children.forEach(addNavItem);
  });
  return list;
}

export function permissionKeyFromHref(href: string) {
  return href.replace(/^\//, '').replace(/\//g, '.').trim() || href;
}

export function getPlatformFields(t: Translate): Record<string, Array<{ key: string; label: string; required: boolean; secret?: boolean }>> {
  return {
    Trendyol: [
      { key: 'ApiKey', label: t('settings_field_trendyol_api_key'), required: true },
      { key: 'SupplierId', label: t('settings_field_trendyol_supplier_id'), required: true, secret: false },
      { key: 'ApiSecret', label: t('settings_field_trendyol_api_secret'), required: true, secret: true },
    ],
    Hepsiburada: [
      { key: 'ApiKey', label: t('settings_field_hepsiburada_api_key'), required: true },
      { key: 'MerchantId', label: t('settings_field_hepsiburada_merchant_id'), required: true, secret: false },
      { key: 'ApiUsername', label: t('settings_field_api_username'), required: true, secret: false },
      { key: 'ApiPassword', label: t('settings_field_api_password'), required: true, secret: true },
    ],
    N11: [
      { key: 'ApiKey', label: t('settings_field_n11_app_key'), required: true },
      { key: 'ApiSecret', label: t('settings_field_n11_app_secret'), required: true, secret: true },
    ],
    Ciceksepeti: [{ key: 'ApiKey', label: t('settings_field_ciceksepeti_api_key'), required: true }],
    Amazon: [
      { key: 'ApiKey', label: t('settings_field_amazon_seller_id'), required: true },
      { key: 'AwsAccessKey', label: t('settings_field_amazon_aws_access_key'), required: true, secret: false },
      { key: 'AwsSecretKey', label: t('settings_field_amazon_aws_secret_key'), required: true, secret: true },
      { key: 'RoleArn', label: t('settings_field_amazon_role_arn'), required: true, secret: false },
      { key: 'LwaClientId', label: t('settings_field_amazon_lwa_client_id'), required: true, secret: false },
      { key: 'LwaClientSecret', label: t('settings_field_amazon_lwa_client_secret'), required: true, secret: true },
      { key: 'RefreshToken', label: t('settings_field_amazon_refresh_token'), required: true, secret: true },
    ],
    Pazarama: [
      { key: 'ApiKey', label: t('settings_field_pazarama_client_id'), required: true },
      { key: 'MerchantId', label: t('settings_field_pazarama_merchant_id'), required: true, secret: false },
      { key: 'ClientSecret', label: t('settings_field_pazarama_client_secret'), required: true, secret: true },
      { key: 'Username', label: t('settings_field_api_username'), required: true, secret: false },
      { key: 'Password', label: t('settings_field_api_password'), required: true, secret: true },
    ],
  };
}

export function userInitials(user: { firstName?: string | null; lastName?: string | null; email: string }): string {
  const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
  return (fullName || user.email).split(' ').filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || '?';
}

export function roleBadgeClass(roleName: string): string {
  const key = roleName.toLowerCase();
  if (key === 'superadmin') return 'role-badge role-superadmin';
  if (key === 'admin') return 'role-badge role-admin';
  if (key === 'moderator') return 'role-badge role-moderator';
  return 'role-badge role-default';
}
