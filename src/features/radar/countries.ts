// Radar'ın desteklediği ülkeler — her biri backend'de bir provider'a karşılık gelir
// (bkz. src/scrapers/radar/providers/). "enabled: false" olanlar henüz bir kaynağa
// bağlanmadı, formda "yakında" etiketiyle gösterilir ama seçilemez.
export const RADAR_COUNTRIES: { code: string; label: string; enabled: boolean }[] = [
  { code: 'GB', label: 'Birleşik Krallık', enabled: true },
  { code: 'FR', label: 'Fransa', enabled: true },
  { code: 'NL', label: 'Hollanda', enabled: true },
  { code: 'US', label: 'ABD (halka açık şirketler)', enabled: true },
  { code: 'DE', label: 'Almanya', enabled: true },
  { code: 'ES', label: 'İspanya', enabled: true },
];
