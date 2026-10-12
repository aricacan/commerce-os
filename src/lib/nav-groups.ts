import {
  LayoutGrid, Package, PackageSearch, ShoppingCart,
  Settings, Map, Users, GitFork,
  Bell, Truck, Warehouse, BarChart3, Tag, ListChecks, GitMerge,
  Wallet, FileBarChart,
  Car, FolderTree, SlidersHorizontal,
  Sparkles, MessageSquare, GitCompare, Scale, Shield, Mail, Undo2,
  TrendingDown, Building2, Receipt, BookOpen, FlaskConical, ListTodo, Percent, Layers, Workflow, Hourglass, ShieldCheck,
  Landmark, BookText, CalendarClock, Wallet2, Hash, BookLock, ScrollText, Handshake, BookUser,
  CalendarCheck, ClipboardCheck, QrCode, KeyRound,
} from 'lucide-react';
import type { TranslationKey } from './translations/tr';

/**
 * Bir menü satırının KENDİ İÇİNDEKİ sekmeleri (örn. Kategoriler → Katalog / Kurallar /
 * Eşleştirme / Uyuşmazlıklar). Sol panelde ayrı satır olarak GÖRÜNMEZ; yalnızca o
 * bölümün sekme çubuğunu besler.
 *
 * Neden burada: sekme çubukları tek kaynaktan (bu dosya) türer. Etiketler bileşenin
 * içine elle yazıldığında sekme adı ile sayfa başlığı kolayca ayrışıyordu.
 */
export interface NavSubItem {
  key: TranslationKey;
  href: string;
  Icon: typeof LayoutGrid;
}

export interface NavItem {
  key: TranslationKey;
  href: string;
  pageKey: string;
  Icon: typeof LayoutGrid;
  /** Bölüm içi sekmeler — varsa o sayfanın sekme çubuğu buradan üretilir. */
  subItems?: NavSubItem[];
}

export interface NavSection {
  key: TranslationKey;
  children: NavItem[];
}

export interface NavGroup {
  key: TranslationKey;
  Icon: typeof LayoutGrid;
  children: NavItem[];
  sections?: NavSection[];
}

export type NavEntry = NavItem | NavGroup;

export function isGroup(entry: NavEntry): entry is NavGroup {
  return 'children' in entry;
}

const SETTINGS_SECTIONS: NavSection[] = [
  {
    key: 'nav_settings_system',
    children: [
      { key: 'nav_system_users',         href: '/system/users',         pageKey: 'settings',      Icon: Users },
      { key: 'nav_system_permissions',   href: '/system/permissions',   pageKey: 'settings',      Icon: Shield },
      { key: 'nav_order_statuses',       href: '/system/order-statuses', pageKey: 'order-statuses', Icon: ListTodo },
      { key: 'nav_price_groups',        href: '/system/price-groups',  pageKey: 'settings',      Icon: Percent },
      { key: 'nav_automation',          href: '/system/automation',    pageKey: 'automation',    Icon: Workflow },
      { key: 'nav_two_factor',       href: '/system/two-factor',   pageKey: 'settings',      Icon: ShieldCheck },
      { key: 'nav_system_ai',            href: '/system/ai',            pageKey: 'settings',      Icon: Sparkles },
      { key: 'nav_system_notifications', href: '/system/notifications', pageKey: 'notifications', Icon: Bell },
      { key: 'nav_moderation',           href: '/system/moderation',    pageKey: 'settings',      Icon: ClipboardCheck },
      { key: 'nav_feedback',             href: '/system/feedback',      pageKey: 'feedback',      Icon: MessageSquare },
      // QR kodları ve Şifre Kasası eski Vibe modülünden taşındı (7 Eki 2026).
      { key: 'nav_system_qr_codes',      href: '/system/qr-codes',      pageKey: 'settings',      Icon: QrCode },
      { key: 'nav_system_credentials',   href: '/system/credentials',   pageKey: 'settings',      Icon: KeyRound },
    ],
  },
];

// MANUEL SIPARIS / MANUEL URUN buradan BILEREK cikarildi.
//
// Ikisi de artik kendi listelerinin ustunde, URL degistirmeden acilan bir panel
// (bkz. FullScreenPanel + /orders ve /products sayfalarindaki dugmeler). Sol panelde
// ayri birer satir olmalari, kullaniciyi listeden koparip ayri bir sayfaya goturuyordu.
// Rotalar (/orders/manual-orders, /products/new-products) KALDIRILMADI — eski
// bookmark'lar ve derin linkler calismaya devam ediyor.
export const NAV: NavEntry[] = [
  { key: 'nav_dashboard', href: '/dashboard', pageKey: 'dashboard', Icon: LayoutGrid },
  {
    key: 'nav_orders',
    Icon: ShoppingCart,
    children: [
      { key: 'nav_orders',        href: '/orders',               pageKey: 'orders', Icon: ShoppingCart },
      { key: 'nav_customer_emails', href: '/orders/customer-emails', pageKey: 'orders', Icon: Mail },
      { key: 'nav_returns',         href: '/orders/returns',         pageKey: 'orders', Icon: Undo2 },
    ],
  },
  {
    key: 'nav_products',
    Icon: Package,
    children: [
      { key: 'nav_products',       href: '/products',                pageKey: 'products',   Icon: Package },
      {
        key: 'nav_categories',
        href: '/products/categories',
        pageKey: 'categories',
        Icon: FolderTree,
        // Dört araç eskiden tek sayfada `?tab=` ile değişiyordu: derin link verilemiyor,
        // tarayıcı geri tuşu çalışmıyordu. Her biri artık gerçek bir rota.
        subItems: [
          { key: 'nav_categories_catalog',    href: '/products/categories/catalog',    Icon: FolderTree },
          { key: 'nav_categories_rules',      href: '/products/categories/rules',      Icon: ListChecks },
          { key: 'nav_categories_matching',   href: '/products/categories/matching',   Icon: GitMerge },
          { key: 'nav_categories_mismatches', href: '/products/categories/mismatches', Icon: GitCompare },
        ],
      },
      { key: 'nav_warehouse',      href: '/products/boxes',          pageKey: 'boxes',      Icon: Warehouse },
      { key: 'nav_fitment',        href: '/products/fitment',        pageKey: 'fitment',    Icon: Car },
      { key: 'nav_logistics',      href: '/products/logistics',      pageKey: 'logistics',  Icon: Map },
      { key: 'nav_stock',          href: '/products/stock',          pageKey: 'products',   Icon: PackageSearch },
      { key: 'nav_product_gap',    href: '/products/gaps',           pageKey: 'products',   Icon: GitCompare },
    ],
  },
  {
    key: 'nav_analytics',
    Icon: BarChart3,
    children: [
      { key: 'nav_product_analysis',        href: '/product-analysis',        pageKey: 'product-analysis',        Icon: BarChart3 },
      { key: 'nav_anomaly',                 href: '/anomaly',                 pageKey: 'anomaly',                 Icon: Bell },
      { key: 'nav_price_stock_consistency', href: '/price-stock-consistency', pageKey: 'price-stock-consistency', Icon: Scale },
      { key: 'nav_cohort_analytics',        href: '/cohort-analytics',        pageKey: 'cohort-analytics',        Icon: Users },
      { key: 'nav_cannibalization',         href: '/cannibalization',         pageKey: 'cannibalization',         Icon: GitFork },
      // Finans grubundan tasindi: ikisi de "neyi yanlis fiyatliyoruz" sorusunu yanitliyor,
      // Finans ise gerceklesmis para hareketini raporluyor. pageKey DEGISMEDI — yetki
      // anahtarlari backend'de tanimli, degistirilirse sayfalar yetkisiz gorunur.
      { key: 'nav_loss_products',           href: '/loss-products',           pageKey: 'finance',                 Icon: TrendingDown },
      { key: 'nav_price_comparison',        href: '/price-comparison',        pageKey: 'price-comparison',        Icon: SlidersHorizontal },
    ],
  },
  {
    key: 'nav_finance',
    Icon: Wallet,
    children: [
      { key: 'nav_pnl',              href: '/finance/pnl',            pageKey: 'finance',         Icon: FileBarChart },
      { key: 'nav_expenses',         href: '/finance/expenses',       pageKey: 'finance',         Icon: Wallet },
      { key: 'nav_product_costs',    href: '/product-costs',          pageKey: 'product-costs',   Icon: Tag },
      { key: 'nav_shipping_rates',    href: '/finance/shipping',      pageKey: 'finance',         Icon: Truck },
      { key: 'nav_platform_settings', href: '/finance/platforms',     pageKey: 'finance',         Icon: Percent },
      { key: 'nav_aging',            href: '/finance/aging',         pageKey: 'finance',         Icon: Hourglass },
    ],
  },
  {
    key: 'nav_invoicing',
    Icon: Receipt,
    children: [
      { key: 'nav_ledger', href: '/invoicing/ledger', pageKey: 'invoicing-ledger', Icon: BookOpen },
      { key: 'nav_invoices', href: '/invoicing/invoices', pageKey: 'invoicing-invoices', Icon: Receipt },
      { key: 'nav_billing_entities', href: '/invoicing/billing-entities', pageKey: 'invoicing-billing-entities', Icon: Building2 },
      { key: 'nav_delivery_notes', href: '/invoicing/delivery-notes', pageKey: 'invoicing-delivery-notes', Icon: Truck },
      { key: 'nav_invoice_series', href: '/invoicing/series', pageKey: 'invoicing-series', Icon: Hash },
      { key: 'nav_commercial_responses', href: '/invoicing/commercial-responses', pageKey: 'invoicing-commercial-responses', Icon: ScrollText },
      { key: 'nav_purchase_matching', href: '/invoicing/purchase-matching', pageKey: 'invoicing-purchase-matching', Icon: Handshake },
      { key: 'nav_address_book', href: '/invoicing/address-book', pageKey: 'invoicing-address-book', Icon: BookUser },
      { key: 'nav_envelopes', href: '/invoicing/envelopes', pageKey: 'invoicing-envelopes', Icon: Mail },
      { key: 'nav_tax_codes', href: '/invoicing/tax-codes', pageKey: 'invoicing-tax-codes', Icon: Percent },
      { key: 'nav_carriers', href: '/invoicing/carriers', pageKey: 'invoicing-carriers', Icon: Truck },
      { key: 'nav_invoicing_settings', href: '/invoicing/settings', pageKey: 'invoicing-settings', Icon: Settings },
    ],
  },
  {
    key: 'nav_procurement',
    Icon: Truck,
    children: [
      { key: 'nav_purchase_orders', href: '/purchase-orders',     pageKey: 'purchase-orders',   Icon: ListTodo },
      { key: 'nav_suppliers',       href: '/suppliers',           pageKey: 'suppliers',        Icon: Building2 },
      { key: 'nav_raw_materials',   href: '/raw-materials',       pageKey: 'raw-materials',     Icon: FlaskConical },
      { key: 'nav_bom',             href: '/bom',                 pageKey: 'bom',               Icon: Layers },
    ],
  },
  {
    key: 'nav_pre_accounting',
    Icon: Wallet2,
    children: [
      { key: 'nav_customers', href: '/accounting/customers', pageKey: 'accounting-customers', Icon: Users },
      { key: 'nav_treasury', href: '/accounting/treasury', pageKey: 'accounting-treasury', Icon: Wallet },
      { key: 'nav_payments', href: '/accounting/payments', pageKey: 'accounting-payments', Icon: Wallet2 },
    ],
  },
  {
    key: 'nav_accounting',
    Icon: Landmark,
    children: [
      { key: 'nav_chart_of_accounts', href: '/accounting/chart-of-accounts', pageKey: 'accounting-chart-of-accounts', Icon: BookText },
      { key: 'nav_journal_entries', href: '/accounting/journal-entries', pageKey: 'accounting-journal-entries', Icon: BookOpen },
      { key: 'nav_trial_balance', href: '/accounting/trial-balance', pageKey: 'accounting-trial-balance', Icon: Scale },
      { key: 'nav_vat_summary', href: '/accounting/vat-summary', pageKey: 'accounting-vat-summary', Icon: Percent },
      { key: 'nav_e_ledger', href: '/accounting/e-ledger', pageKey: 'accounting-e-ledger', Icon: BookLock },
      { key: 'nav_e_archive_daily_report', href: '/accounting/e-archive-daily-report', pageKey: 'accounting-e-archive-daily-report', Icon: CalendarCheck },
      { key: 'nav_marketplace_reconciliation', href: '/accounting/marketplace-reconciliation', pageKey: 'accounting-marketplace-reconciliation', Icon: GitCompare },
      { key: 'nav_accounting_settings', href: '/accounting/settings', pageKey: 'accounting-settings', Icon: CalendarClock },
    ],
  },
  {
    key: 'nav_customize',
    Icon: SlidersHorizontal,
    children: [
      { key: 'nav_customize_excel',  href: '/customize/excel',  pageKey: 'customize', Icon: FileBarChart },
      { key: 'nav_customize_widget', href: '/customize/widget', pageKey: 'customize', Icon: LayoutGrid },
    ],
  },
  {
    key: 'nav_system',
    Icon: Settings,
    sections: SETTINGS_SECTIONS,
    children: SETTINGS_SECTIONS.flatMap((s) => s.children),
  },
];

export function findGroup(key: TranslationKey): NavGroup | undefined {
  const entry = NAV.find((e) => e.key === key);
  return entry && isGroup(entry) ? entry : undefined;
}

export function groupTabItems(key: TranslationKey): NavItem[] {
  return findGroup(key)?.children ?? [];
}

/**
 * Bir bölümün (örn. '/products/categories') sekmelerini döner.
 *
 * `groupTabItems` bir GRUBUN satırlarını verir; bu ise tek bir satırın kendi içindeki
 * sekmelerini. İkisi de aynı tek kaynaktan (NAV) okur — sekme çubukları hiçbir yerde
 * elle liste tutmaz.
 */
export function sectionTabItems(href: string): NavSubItem[] {
  for (const entry of NAV) {
    const items = isGroup(entry) ? entry.children : [entry];
    const found = items.find((item) => item.href === href);
    if (found?.subItems) return found.subItems;
  }
  return [];
}
