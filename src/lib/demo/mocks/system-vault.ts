// Şifre kasası, QR kodlar ve geri bildirim (salt görüntü; gerçek parola/kimlik içermez).
import type { CredentialDto } from '../../api/credentials';
import type { QrAnalyticsDto, QrCodeDto } from '../../api/qr-codes';
import type { Feedback } from '../../../types/api';
import { DEMO_USER } from '../config';
import { DEMO_QR_IMAGE_BASE64 } from '../data/system-qr-image';
import { DEMO_MANAGED_USERS } from '../data/system-people';
import { DemoHttpResponse, get, type DemoRoute } from '../router';
import { ago, createRng, lastDays } from '../seed';

const NOT_FOUND_STATUS = 404;
const MASKED_PASSWORD = '••••••••••';
const DEFAULT_ANALYTICS_DAYS = 30;
const LAST_WEEK_DAYS = 7;

// ─── Şifre kasası ────────────────────────────────────────────────────────────
const CREDENTIAL_SEEDS: Array<[string, string, string, string]> = [
  ['Pazaryerleri', 'Trendyol Satıcı Paneli', 'magaza-a@example.com', 'https://seller.example.com/trendyol'],
  ['Pazaryerleri', 'Hepsiburada Satıcı Paneli', 'magaza-a@example.com', 'https://seller.example.com/hepsiburada'],
  ['Pazaryerleri', 'Amazon Seller Central', 'store-c@example.com', 'https://seller.example.com/amazon'],
  ['Pazaryerleri', 'eBay Seller Hub', 'store-c@example.com', 'https://seller.example.com/ebay'],
  ['Kargo', 'Örnek Kargo Şube Paneli', 'depo@example.com', 'https://kargo.example.com/panel'],
  ['Kargo', 'Demo Courier Portal', 'uk-depo@example.com', 'https://courier.example.com/portal'],
  ['Muhasebe', 'e-Fatura Portalı', 'muhasebe@example.com', 'https://efatura.example.com'],
  ['Muhasebe', 'Banka Kurumsal Girişi', 'finans@example.com', 'https://banka.example.com/kurumsal'],
  ['Pazarlama', 'Reklam Hesabı Yönetimi', 'reklam@example.com', 'https://ads.example.com'],
  ['Pazarlama', 'Alan Adı Sağlayıcı', 'it@example.com', 'https://domain.example.com/login'],
];

const CREDENTIALS: CredentialDto[] = CREDENTIAL_SEEDS.map(([mainGroup, platform, emailOrUsername, url], index) => ({
  id: index + 1,
  mainGroup,
  platform,
  emailOrUsername,
  password: MASKED_PASSWORD,
  url,
  sortOrder: index + 1,
}));

// ─── QR kodlar ───────────────────────────────────────────────────────────────
const QR_SEEDS: Array<Pick<QrCodeDto, 'slug' | 'title' | 'qrType' | 'targetUrl' | 'scanCount'>> = [
  { slug: 'katalog', title: 'Ürün Kataloğu', qrType: 0, targetUrl: 'https://shop.example.com/katalog', scanCount: 1284 },
  { slug: 'whatsapp', title: 'WhatsApp Destek Hattı', qrType: 1, targetUrl: 'https://wa.me/905000000000', scanCount: 862 },
  { slug: 'paspas-kampanya', title: 'Paspas Kampanyası', qrType: 0, targetUrl: 'https://shop.example.com/kampanya/paspas', scanCount: 431 },
  { slug: 'iletisim', title: 'Mağaza Telefonu', qrType: 2, targetUrl: 'tel:+905000000000', scanCount: 207 },
  { slug: 'destek-mail', title: 'Destek E-postası', qrType: 3, targetUrl: 'mailto:destek@example.com', scanCount: 96 },
];

const QR_CODES: QrCodeDto[] = QR_SEEDS.map((seed, index) => ({
  ...seed,
  id: `00000000-0000-4000-8000-00000000000${index + 1}`,
  isUploaded: false,
  isActive: index !== QR_SEEDS.length - 1,
  createdAt: ago(20 + index * 25),
  qrImageBase64: DEMO_QR_IMAGE_BASE64,
}));

const COUNTRIES: Array<[string, string, number]> = [
  ['Türkiye', 'TR', 0.62],
  ['Birleşik Krallık', 'GB', 0.2],
  ['Almanya', 'DE', 0.08],
  ['Hollanda', 'NL', 0.06],
  ['Kuzey Kıbrıs', 'CY', 0.04],
];
const DEVICES: Array<[string, number]> = [['Mobil', 0.71], ['Masaüstü', 0.24], ['Tablet', 0.05]];
const BROWSERS: Array<[string, number]> = [['Chrome', 0.52], ['Safari', 0.33], ['Samsung Internet', 0.08], ['Firefox', 0.04], ['Edge', 0.03]];

function buildAnalytics(qr: QrCodeDto, days: number): QrAnalyticsDto {
  const rng = createRng(qr.scanCount);
  const dailyScans = lastDays(days, (date) => ({ date, count: rng.int(0, Math.max(2, Math.round((qr.scanCount / 30) * 2))) }));
  const totalScans = dailyScans.reduce((sum, day) => sum + day.count, 0);
  const share = (ratio: number) => Math.round(totalScans * ratio);

  return {
    totalScans,
    uniqueCountries: COUNTRIES.length,
    last7DayScans: dailyScans.slice(-LAST_WEEK_DAYS).reduce((sum, day) => sum + day.count, 0),
    dailyScans,
    topCountries: COUNTRIES.map(([country, countryCode, ratio]) => ({ country, countryCode, count: share(ratio) })),
    deviceBreakdown: DEVICES.map(([deviceType, ratio]) => ({ deviceType, count: share(ratio) })),
    browserBreakdown: BROWSERS.map(([browser, ratio]) => ({ browser, count: share(ratio) })),
  };
}

// ─── Geri bildirim ───────────────────────────────────────────────────────────
const FEEDBACK_SEEDS: Array<[string, Feedback['status'], number]> = [
  ['Sipariş listesinde kargo firmasına göre filtre eklenebilir mi?', 'InProgress', 2],
  ['Mobilde ürün fotoğrafları geç yükleniyor.', 'New', 3],
  ['Finans raporlarına haftalık Excel dışa aktarım ekleyin.', 'Done', 9],
  ['Karanlık temada bazı tablolarda yazılar okunmuyor.', 'Done', 14],
  ['Toplu stok güncelleme ekranı çok isabetli olmuş, teşekkürler.', 'Done', 21],
  ['Bildirimleri saat aralığına göre kısabilsek iyi olur.', 'New', 1],
  ['İade nedenlerini grafikte görmek istiyoruz.', 'Rejected', 30],
];

const FEEDBACKS: Feedback[] = FEEDBACK_SEEDS.map(([message, status, daysAgo], index) => {
  const author = DEMO_MANAGED_USERS[index % DEMO_MANAGED_USERS.length];
  return {
    id: index + 1,
    authorUserId: author.id,
    authorName: `${author.firstName} ${author.lastName}`,
    message,
    status,
    isMine: author.id === DEMO_USER.id,
    createdAt: ago(daysAgo, index),
    updatedAt: ago(Math.max(0, daysAgo - 1), index),
  };
});

export const systemVaultRoutes: DemoRoute[] = [
  get('/credentials', () => CREDENTIALS),

  get('/qr-codes', () => QR_CODES),
  get('/qr-codes/:id/analytics', (req) => {
    const qr = QR_CODES.find((entry) => entry.id === req.params.id);
    if (!qr) return new DemoHttpResponse(NOT_FOUND_STATUS, { title: 'QR kod bulunamadı.' });
    return buildAnalytics(qr, Number(req.query.get('days') ?? DEFAULT_ANALYTICS_DAYS));
  }),
  get('/qr-codes/:id', (req) =>
    QR_CODES.find((entry) => entry.id === req.params.id) ?? new DemoHttpResponse(NOT_FOUND_STATUS, { title: 'QR kod bulunamadı.' }),
  ),

  get('/feedback', () => FEEDBACKS),
];
