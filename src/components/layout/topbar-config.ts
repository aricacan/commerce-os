import type { CSSProperties } from 'react';
import { NAV, isGroup } from '../../lib/nav-groups';
import { text } from '../../features/shared/design';

// Mobil profil dropdown'ına gömülen satırlar (Uygulamalar/Bildirimler/Tema/Dil) için ortak stil.
export const mobileMenuRowStyle: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 10,
  width: '100%', padding: '9px 10px',
  background: 'transparent', border: 'none',
  borderRadius: 'var(--radius-sm)',
  cursor: 'pointer', textAlign: 'left',
  fontSize: text.md, fontWeight: 600, color: 'var(--fg)',
};

// Sayfa başlığı (h1) da sol panel ve sekme çubuğuyla AYNI kaynaktan gelir. Üç yerde ayrı
// etiket listesi tutmak bunların ayrışmasına yol açıyordu (ör. /warehouse başlığı "Kutular"
// iken sekmesi "Depolar" yazıyordu) ve NAV'a eklenen yeni sayfalar başlıksız kalıyordu
// (/products/categories/rules, /system/feedback, /products/categories/mismatches, /price-comparison).
// NAV'daki her sayfa artık otomatik gelir; aşağıdaki ek kayıtlar yalnızca NAV'da BULUNMAYAN
// rotalar (kampanya alt sayfaları, yönlendirme kabukları) ve bilinçli başlık istisnaları içindir.
export const PAGE_TITLES: Record<string, string> = {
  ...Object.fromEntries(
    // Bölüm içi sekmeler (subItems) de dahil: kendi URL'i olan her sekmenin başlığı
    // olmalı, yoksa örn. /products/categories/catalog başlıksız açılır.
    NAV.flatMap((entry) => (isGroup(entry) ? entry.children : [entry]))
      .flatMap((item) => [item, ...(item.subItems ?? [])])
      .map((item) => [item.href, item.key as string])
  ),

  // Özelleştirme sayfalarının h1'i menü etiketinden bilinçli olarak daha açıklayıcı.
  '/customize/widget':  'page_customize_widget_title',
  '/customize/excel':   'page_customize_excel_title',

  // NAV'da yer almayan rotalar (alt sayfalar + eski yönlendirme kabukları).
  '/campaigns/analysis':     'campaign_analysis',
  '/moderation':             'nav_moderation',

  '/price-stock-consistency': 'nav_price_stock_consistency',
  '/settings':               'nav_settings',
  '/system':                 'nav_system',
  '/system/permissions':     'nav_system_permissions',
  '/finance':                'nav_finance',
  '/dashboard/erpis':        'page_dashboard_erpis_title',
  '/dashboard/ecommerce':    'page_dashboard_ecommerce_title',
  '/dashboard/patches':      'page_dashboard_patches_title',
};

// Ambient mağaza/ERP seçicisinin GİZLENDİĞİ sayfalar: hepsinin kendi panel-içi ERP
// kaynağı seçimi var (bkz. LogisticsMapView, price-comparison/*, system/erp-import),
// dolayısıyla bu 4'lü seçicinin orada hiçbir etkisi yok — görünür kalması yanıltıcı olurdu.
// (Ürünler sayfası farklı: orada seçici gizlenmez, SOLUK gösterilir; bkz. isProductsPage.)
export const STORE_SELECTOR_HIDDEN_PATHS = [
  '/products/logistics',
  '/price-comparison',
  '/fitment',
  '/product-costs',
  // Kanal kesintileri tablosu tüm ERP × pazaryeri × marka kanallarını birlikte gösterir.
  '/finance/platforms',
  // Panonun Erpis görünümü: veri pazaryeri/ERP senkronundan değil elle yüklenen Excel'den
  // geliyor ve kendi firma/rapor seçicisi var. /dashboard/ecommerce'i ETKİLEMEZ — eşleşme
  // tam yol ya da alt yol üzerinden (bkz. isStoreSelectorHidden).
  '/dashboard/erpis',
  // Sürüm güncellemeleri sayfası statik içerik: mağaza/ERP seçicisinin etkisi yok.
  '/dashboard/patches',
];

// Seçicinin gizlendiği ama ALT YOLLARININ etkilenmemesi gereken sayfalar.
//
// Pano giriş ekranı (/dashboard) yalnızca iki karttan ibaret; orada mağaza seçicisi
// anlamsız. Ama yukarıdaki listeye eklenemez: prefix eşleşmesi /dashboard/ecommerce'i de
// gizlerdi ve seçici asıl gerektiği yerde kaybolurdu.
const STORE_SELECTOR_HIDDEN_EXACT = ['/dashboard'];

// /price-comparison/readiness gibi alt rotalar tam eşleşmiyor — prefix kontrolü gerekir
// (bkz. resolvePageTitleKey'deki aynı desen).
export function isStoreSelectorHidden(pathname: string): boolean {
  if (STORE_SELECTOR_HIDDEN_EXACT.includes(pathname)) return true;
  return STORE_SELECTOR_HIDDEN_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

// /campaigns/analysis/[id] gibi dinamik rotalar tam eşleşmiyor — en uzun eşleşen
// önek (prefix) aranır (ör. /campaigns/analysis/42 -> /campaigns/analysis).
export function resolvePageTitleKey(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  const prefix = Object.keys(PAGE_TITLES)
    .filter((p) => pathname.startsWith(p + '/'))
    .sort((a, b) => b.length - a.length)[0];
  return prefix ? PAGE_TITLES[prefix] : 'nav_dashboard';
}

