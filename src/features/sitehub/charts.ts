import type { SiteRefDto, SiteDailyCountDto, SiteDailyTrafficDto } from '../../lib/api/sitehub';

// Grafik yardımcıları.
//
// Modülün temel kısıtı: site sayısı sabit değil. Bugün 5, yarın 10 olabilir.
// Bu yüzden ne renk listesi ne de seri listesi elle yazılıyor — ikisi de site
// listesinden türetiliyor.

// Aksan renginin açıklık/kroma ekseninde kalıp yalnızca tonu döndüren üretici.
// Elle seçilmiş 10 renk yerine formül: 11. site eklendiğinde kod değişmiyor ve
// renkler birbirinin tonu olduğu için pano tek bir tasarım gibi duruyor.
//
// 47° adım altın-oran'a yakın bir tur atlaması — ardışık siteler birbirine
// karışmıyor, 360'a bölünmediği için de tur başına tekrar etmiyor.
const HUE_BASE = 255;
const HUE_STEP = 47;

export function siteColor(index: number): string {
  return `oklch(45% 0.11 ${(HUE_BASE + index * HUE_STEP) % 360})`;
}

// Site kimliği → sabit renk. Sıralama değişse bile aynı sitenin rengi
// değişmesin diye site listesindeki sıraya göre bir kez kuruluyor.
export function buildSiteColors(sites: SiteRefDto[]): Record<number, string> {
  return Object.fromEntries(sites.map((s, i) => [s.siteConnectionId, siteColor(i)]));
}

// Recharts satır başına bir nesne ister ve her seri bir alan adıdır.
// Sunucu uzun format (tarih + site + değer) döndüğü için pivot burada yapılıyor.
export interface ChartRow {
  date: string;
  [siteKey: string]: string | number;
}

export function seriesKey(siteConnectionId: number): string {
  return `s${siteConnectionId}`;
}

/**
 * Uzun formatı Recharts satırlarına çevirir ve ARADAKİ BOŞ GÜNLERİ 0 ile doldurur.
 *
 * Boş günler doldurulmazsa çizgi grafik iki nokta arasını düz çizer ve "o gün de
 * talep gelmiş" izlenimi verir — sıfır günü göstermek verinin kendisi kadar önemli.
 */
export function pivotDaily<T extends { date: string; siteConnectionId: number }>(
  points: T[],
  sites: SiteRefDto[],
  days: number,
  valueOf: (point: T) => number,
): ChartRow[] {
  const byDate = new Map<string, ChartRow>();

  for (const date of lastNDates(days)) {
    const row: ChartRow = { date };
    for (const site of sites) row[seriesKey(site.siteConnectionId)] = 0;
    byDate.set(date, row);
  }

  for (const point of points) {
    const row = byDate.get(point.date);
    // Pencere dışında kalan nokta (sunucu ile istemci saatinin gün sınırında
    // ayrışması) sessizce atlanır — uydurma bir gün eklemekten iyidir.
    if (row) row[seriesKey(point.siteConnectionId)] = valueOf(point);
  }

  return [...byDate.values()];
}

export function pivotRequests(points: SiteDailyCountDto[], sites: SiteRefDto[], days: number): ChartRow[] {
  return pivotDaily(points, sites, days, (p) => p.count);
}

export function pivotTraffic(points: SiteDailyTrafficDto[], sites: SiteRefDto[], days: number): ChartRow[] {
  return pivotDaily(points, sites, days, (p) => p.pageViews);
}

// Bugünden geriye doğru N günün "yyyy-MM-dd" listesi (eskiden yeniye).
function lastNDates(days: number): string[] {
  const today = new Date();
  const dates: string[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    dates.push(toIsoDate(d));
  }

  return dates;
}

// toISOString() UTC'ye çevirir ve yerel saatle gün kayması yaratır; gün
// bileşenleri elle birleştiriliyor.
function toIsoDate(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

// Eksende 30 etiket okunmuyor; "07 Ağu" biçiminde kısa etiket.
export function shortDateLabel(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
}
