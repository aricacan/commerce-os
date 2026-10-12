import type { ComponentType, SVGProps } from 'react';
import { Store } from 'lucide-react';
import type { IntegrationConnectionStatus } from '../../lib/api';
import {
  SentosIcon, BaseErpIcon, LogoYazilimIcon, MikroIcon, NetsisIcon, NebimIcon,
  ParasutIcon, BizimHesapIcon, AkinsoftIcon, OdooIcon, SapIcon,
  DiaIcon, EtaIcon, LucaIcon, MsDynamics365Icon, OracleNetsuiteIcon, UyumsoftIcon,
  TrendyolIcon, HepsiburadaIcon, N11Icon, AmazonIcon, EbayIcon,
  PazaramaIcon, CiceksepetiIcon, ShopifyIcon, WooCommerceIcon,
  EtsyIcon, TemuIcon, AliexpressIcon, WalmartIcon, TiktokShopIcon, BoynerIcon, PttAvmIcon,
} from '../../components/ui/BrandIcons';
import { formatDateTime } from '../../lib/format';

// Bağlantı durumu ve marka ikonu çözümleme mantığı IntegrationsHubView.tsx ile
// aynı sözleşimi paylaşır (bkz. o dosyadaki resolveStatus/resolveIcon), buraya
// ayrı bir modül olarak taşındı ki detay sayfası da aynı görsel dili tekrar
// yazmadan kullanabilsin — hub view'a dokunmadan.

export type IntegrationStatus = 'active' | 'syncing' | 'error' | 'idle';

// Backend SyncStatus ("Success"/"Error"/"Syncing"/null) -> panel status'una eşlenir.
// Senkron telemetrisi (asıl veri senkronu) varsa o önceliklidir; yoksa bağlantının KENDİ
// durumuna (IntegrationConnectionStatus: Pending=0, Active=1, Error=2, Disabled=3) düşülür.
//
// Önceden bu ikinci parametre `fallbackActive: boolean` idi ve çağıranlar
// `connection.status === 1` geçiyordu — bu, Error(2) ve Disabled(3) durumlarını tek bir
// `false` değerine ezip ikisini de "Beklemede" gösteriyordu. Sonuç: keşif sırasında
// gerçek bir API hatası alan bağlantı (ör. "Trendyol API doğrulaması başarısız (403)")
// ekranda nötr görünüyor, hata hiç fark edilmiyordu.
export function resolveStatus(
  syncStatus: string | null | undefined,
  connectionStatus: IntegrationConnectionStatus,
): IntegrationStatus {
  switch (syncStatus) {
    case 'Success':
      return 'active';
    case 'Error':
      return 'error';
    case 'Syncing':
      return 'syncing';
  }
  switch (connectionStatus) {
    case 2:
      return 'error';
    case 1:
      return 'active';
    default:
      return 'idle';
  }
}

export const STATUS_LABEL: Record<IntegrationStatus, { tr: string; en: string; dot: string }> = {
  active: { tr: 'Bağlı (Canlı)', en: 'Connected', dot: 'bg-emerald-500' },
  syncing: { tr: 'Senkronize Ediliyor', en: 'Syncing', dot: 'bg-amber-500' },
  error: { tr: 'Hata', en: 'Error', dot: 'bg-red-500' },
  idle: { tr: 'Beklemede', en: 'Idle', dot: 'bg-[var(--fg-muted)]' },
};

export const STATUS_TEXT_CLASS: Record<IntegrationStatus, string> = {
  active: 'text-emerald-600 dark:text-emerald-400',
  syncing: 'text-amber-600 dark:text-amber-400',
  error: 'text-red-600 dark:text-red-400',
  idle: 'text-[var(--fg-muted)]',
};

// Bağlantının en son GERÇEK veri senkronu (syncedAt) yoksa keşif/test zamanına düşülür —
// hepsi aynı yolla (formatDateTime) biçimlendirilir ki hiçbir çağıran ISO string'i çıplak
// ekrana basmasın.
export function resolveLastSync(lastSyncAt: string | null | undefined, isEn: boolean): string {
  if (!lastSyncAt) return isEn ? 'Never synced' : 'Hiç senkronize edilmedi';
  return formatDateTime(lastSyncAt, isEn ? 'en' : 'tr');
}

type BrandIconProps = SVGProps<SVGSVGElement> & { size?: number | string; className?: string };

export function resolveBrandIcon(nameOrType: string): ComponentType<BrandIconProps> {
  const lower = nameOrType.toLowerCase();
  if (lower.includes('sentos')) return SentosIcon;
  if (lower.includes('base')) return BaseErpIcon;
  if (lower.includes('logo')) return LogoYazilimIcon;
  if (lower.includes('mikro')) return MikroIcon;
  if (lower.includes('netsis')) return NetsisIcon;
  if (lower.includes('nebim')) return NebimIcon;
  if (lower.includes('paraşüt') || lower.includes('parasut')) return ParasutIcon;
  if (lower.includes('bizimhesap')) return BizimHesapIcon;
  if (lower.includes('akınsoft') || lower.includes('akinsoft')) return AkinsoftIcon;
  if (lower.includes('odoo')) return OdooIcon;
  if (lower.includes('netsuite') || lower.includes('oracle')) return OracleNetsuiteIcon;
  if (lower.includes('dynamics')) return MsDynamics365Icon;
  if (lower.includes('uyumsoft')) return UyumsoftIcon;
  if (lower.includes('luca')) return LucaIcon;
  if (lower.includes('eta')) return EtaIcon;
  if (lower.includes('dia')) return DiaIcon;
  if (lower.includes('sap')) return SapIcon;
  if (lower.includes('trendyol')) return TrendyolIcon;
  if (lower.includes('hepsiburada')) return HepsiburadaIcon;
  if (lower.includes('n11')) return N11Icon;
  if (lower.includes('amazon')) return AmazonIcon;
  if (lower.includes('ebay')) return EbayIcon;
  if (lower.includes('pazarama')) return PazaramaIcon;
  if (lower.includes('çiçeksepeti') || lower.includes('ciceksepeti')) return CiceksepetiIcon;
  if (lower.includes('shopify')) return ShopifyIcon;
  if (lower.includes('woocommerce')) return WooCommerceIcon;
  if (lower.includes('etsy')) return EtsyIcon;
  if (lower.includes('temu')) return TemuIcon;
  if (lower.includes('aliexpress')) return AliexpressIcon;
  if (lower.includes('walmart')) return WalmartIcon;
  if (lower.includes('tiktok')) return TiktokShopIcon;
  if (lower.includes('boyner')) return BoynerIcon;
  if (lower.includes('pttavm') || lower.includes('ptt avm') || lower.includes('ptt')) return PttAvmIcon;
  return Store;
}
