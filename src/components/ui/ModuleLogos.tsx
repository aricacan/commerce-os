import { Boxes, createLucideIcon, type LucideIcon } from 'lucide-react';

// Modül logoları — her modül için tek, sade bir işaret (24×24, çizgi 2, currentColor).
//
// createLucideIcon ile üretilir: lucide ikonlarıyla AYNI bileşen tipi (LucideIcon), aynı
// boyut/renk/çizgi prop'ları. Böylece sol panel, Topbar uygulama menüsü ve Uygulamalar
// paneli logoyu bir lucide ikonu gibi kullanır; ikinci bir ikon sistemi doğmaz.
//
// Anahtar = BACKEND modül anahtarı (bkz. ModuleRegistry; ekran adı farklı olabilir:
// "radar" → B2B Outreach). Backend modülü olmayan Trendyol kendi anahtarıyla durur.

const B2bOutreachLogo = createLucideIcon('ModuleB2bOutreach', [
  ['path', { d: 'M3 21V9l5-3v15', key: 'building-a' }],
  ['path', { d: 'M8 21V11h5v10', key: 'building-b' }],
  ['path', { d: 'M3 21h11', key: 'ground' }],
  ['path', { d: 'M15 8l6-4-2 7-2.5-2.5z', key: 'plane' }],
]);

const AiCopilotLogo = createLucideIcon('ModuleAiCopilot', [
  ['rect', { x: '3', y: '7', width: '13', height: '13', rx: '3', key: 'chip' }],
  ['path', { d: 'M7.5 13.5h4M9.5 11.5v4', key: 'core' }],
  ['path', { d: 'M18.5 2.5l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z', key: 'storea' }],
]);

const OemMatcherLogo = createLucideIcon('ModuleOemMatcher', [
  ['rect', { x: '2.5', y: '4', width: '8', height: '6', rx: '1.5', key: 'part-a' }],
  ['rect', { x: '13.5', y: '14', width: '8', height: '6', rx: '1.5', key: 'part-b' }],
  ['path', { d: 'M10.5 7h3a3 3 0 0 1 3 3v4', key: 'link' }],
  ['path', { d: 'M5 7h3.5M16 17h3.5', key: 'codes' }],
]);

const WmsLogo = createLucideIcon('ModuleWms', [
  ['path', { d: 'M3 21V8l9-5 9 5v13', key: 'roof' }],
  ['path', { d: 'M7 21v-9h10v9', key: 'rack' }],
  ['path', { d: 'M7 15h10M7 18h10', key: 'shelves' }],
]);

const LogisticsLogo = createLucideIcon('ModuleLogistics', [
  ['circle', { cx: '5', cy: '18', r: '2', key: 'origin' }],
  ['circle', { cx: '19', cy: '6', r: '2', key: 'target' }],
  ['path', { d: 'M7 18h6a3 3 0 0 0 0-6h-2a3 3 0 0 1 0-6h6', key: 'route' }],
]);

const BaseLogo = createLucideIcon('ModuleBase', [
  ['path', { d: 'M12 3l9 4.5-9 4.5-9-4.5z', key: 'top' }],
  ['path', { d: 'M3 12l9 4.5 9-4.5', key: 'middle' }],
  ['path', { d: 'M3 16.5L12 21l9-4.5', key: 'bottom' }],
]);

const TrendyolLogo = createLucideIcon('ModuleTrendyol', [
  ['path', { d: 'M5 8h14l-1.2 11.2A2 2 0 0 1 15.8 21H8.2a2 2 0 0 1-2-1.8z', key: 'bag' }],
  ['path', { d: 'M9 8V6a3 3 0 0 1 6 0v2', key: 'handle' }],
  ['path', { d: 'M9.5 12.5h5M12 12.5V18', key: 't' }],
]);

const ErpisLogo = createLucideIcon('ModuleErpis', [
  ['rect', { x: '4', y: '3', width: '16', height: '18', rx: '2', key: 'sheet' }],
  ['path', { d: 'M8 17v-3M12 17V9M16 17v-6', key: 'bars' }],
]);

const SentosTrackLogo = createLucideIcon('ModuleSentosTrack', [
  ['path', { d: 'M3 7.5L12 3l9 4.5v9L12 21l-9-4.5z', key: 'box' }],
  ['path', { d: 'M3 7.5l9 4.5 9-4.5M12 12v9', key: 'edges' }],
]);

const OmnichannelLogo = createLucideIcon('ModuleOmnichannel', [
  ['path', { d: 'M4 5h11a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H9l-4 3v-3H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z', key: 'bubble-a' }],
  ['path', { d: 'M19 9h1a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-1v3l-4-3h-3', key: 'bubble-b' }],
]);

const SiteHubLogo = createLucideIcon('ModuleSiteHub', [
  ['rect', { x: '2.5', y: '4', width: '19', height: '16', rx: '2', key: 'window' }],
  ['path', { d: 'M2.5 9h19', key: 'bar' }],
  ['path', { d: 'M6 6.5h.01M9 6.5h.01', key: 'dots' }],
  ['path', { d: 'M7 13h6M7 16h10', key: 'lines' }],
]);

const ShopifyLogo = createLucideIcon('ModuleShopify', [
  ['path', { d: 'M4 7h16l-1 13H5z', key: 'bag' }],
  ['path', { d: 'M9 10V6a3 3 0 0 1 6 0v4', key: 'handle' }],
]);

const PhotoStudioLogo = createLucideIcon('ModulePhotoStudio', [
  ['rect', { x: '2.5', y: '6', width: '19', height: '14', rx: '2', key: 'body' }],
  ['path', { d: 'M8 6l1.5-2.5h5L16 6', key: 'top' }],
  ['circle', { cx: '12', cy: '13', r: '3.5', key: 'lens' }],
]);

const AdsHubLogo = createLucideIcon('ModuleAdsHub', [
  ['path', { d: 'M3 10v4a1 1 0 0 0 1 1h2l6 4V5L6 9H4a1 1 0 0 0-1 1z', key: 'horn' }],
  ['path', { d: 'M16 9a4 4 0 0 1 0 6M19 6.5a8 8 0 0 1 0 11', key: 'waves' }],
]);

const SellingViewLogo = createLucideIcon('ModuleSellingView', [
  ['path', { d: 'M3 3v18h18', key: 'axis' }],
  ['path', { d: 'M7 15l4-4 3 3 5-6', key: 'trend' }],
  ['path', { d: 'M19 8V5h-3', key: 'arrow' }],
]);

const MonitoringLogo = createLucideIcon('ModuleMonitoring', [
  ['rect', { x: '2.5', y: '4', width: '19', height: '13', rx: '2', key: 'screen' }],
  ['path', { d: 'M6 11h2.5l1.5-3 2.5 6 1.5-3H18', key: 'pulse' }],
  ['path', { d: 'M9 21h6M12 17v4', key: 'stand' }],
]);

const PartnerHubLogo = createLucideIcon('ModulePartnerHub', [
  ['circle', { cx: '6', cy: '12', r: '3', key: 'node-a' }],
  ['circle', { cx: '18', cy: '6', r: '3', key: 'node-b' }],
  ['circle', { cx: '18', cy: '18', r: '3', key: 'node-c' }],
  ['path', { d: 'M8.7 10.7l6.6-3.4M8.7 13.3l6.6 3.4', key: 'links' }],
]);

const LOGOS: Record<string, LucideIcon> = {
  radar: B2bOutreachLogo,
  intelligent: AiCopilotLogo,
  sonar: OemMatcherLogo,
  warehouse: WmsLogo,
  shipping: LogisticsLogo,
  basetrack: BaseLogo,
  trendyol: TrendyolLogo,
  erpis: ErpisLogo,
  sentostrack: SentosTrackLogo,
  omnichannel: OmnichannelLogo,
  sitehub: SiteHubLogo,
  shopify: ShopifyLogo,
  'photo-studio': PhotoStudioLogo,
  adshub: AdsHubLogo,
  forecast: SellingViewLogo,
  monitoring: MonitoringLogo,
  partnerhub: PartnerHubLogo,
};

/** Backend modül anahtarının logosu; tanımsız modül jenerik kutu ikonuyla görünür (menüden düşmez). */
export function moduleLogo(moduleKey: string): LucideIcon {
  return LOGOS[moduleKey] ?? Boxes;
}

export { BaseLogo, TrendyolLogo };
