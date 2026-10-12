// Bildirim tipi → zil panelindeki sekme. Backend'deki NotificationTypeCatalog ile aynı
// eşleme; yeni tip eklenirken iki yerde de tanımlanır.
//
// Önceden sekme, BAŞLIK METNİNDEN tahmin ediliyordu: içinde "stok" geçen her başlık Stok
// sekmesine, "sistem" geçen her başlık Sistem sekmesine düşüyordu ve sipariş bildirimi
// "stok tükendi" yazınca yanlış yere gidiyordu.
export type NotificationCategory = 'order' | 'stock' | 'system' | 'ai' | 'personal';

const CATEGORY_BY_TYPE: Record<string, NotificationCategory> = {
  stock_critical: 'stock',
  OrderStatus: 'order',
  OperationsDailyDigest: 'order',
  Anomaly: 'ai',
  RadarReply: 'system',
  Automation: 'system',
  sonar: 'system',
  'monitoring-alert': 'system',
  'shopify-privacy': 'system',
  'monitoring-insights': 'system',
  omnichannel: 'personal',
  OperationAssigned: 'personal',
  Feedback: 'personal',
  'photo-studio': 'personal',
  PrayerTime: 'personal',
  DailyVerse: 'personal',
  'system-test': 'personal',
};

// Katalogda olmayan (eski ya da yeni) tip Sistem sekmesinde görünür — kaybolmaz.
export function notificationCategory(type: string | null | undefined): NotificationCategory {
  if (!type) return 'system';
  return CATEGORY_BY_TYPE[type] ?? 'system';
}
