// AdsHub mock verisi: reklam hesapları ve gün bazlı metrikler. Tüm reklam ekranları buradan beslenir.
import { AD_ACCOUNT_STATUS, AD_PLATFORM, type AdAccountDto, type AdPlatform } from '../../api/adshub';
import { GBP_TRY_RATE, round2 } from './finance-base';
import { ago, createRng } from '../seed';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MAX_RANGE_DAYS = 400;
const WEEKEND_FACTOR = 0.85;
const BACKFILL_DAYS = 90;

export const AD_PLATFORM_NAMES: Record<AdPlatform, string> = {
  [AD_PLATFORM.Meta]: 'Meta',
  [AD_PLATFORM.Google]: 'Google',
  [AD_PLATFORM.TikTok]: 'TikTok',
};

export interface AdAccountSeed {
  id: number;
  platform: AdPlatform;
  displayName: string;
  externalAccountId: string;
  currencyCode: 'TRY' | 'GBP';
  erpSourceCodes: string[];
  /** Günlük ortalama harcama (hesabın kendi para biriminde). */
  dailySpend: number;
  /** Bin gösterim maliyeti. */
  cpm: number;
  ctr: number;
  conversionRate: number;
  /** Ortalama sepet tutarı (hesabın kendi para biriminde). */
  averageOrderValue: number;
  campaignNames: string[];
}

export const AD_ACCOUNT_SEEDS: AdAccountSeed[] = [
  {
    id: 1, platform: AD_PLATFORM.Google, displayName: 'Demo Google Ads (TR)', externalAccountId: '000-000-0001', currencyCode: 'TRY',
    erpSourceCodes: ['store-a', 'store-b'], dailySpend: 1300, cpm: 62, ctr: 0.034, conversionRate: 0.028, averageOrderValue: 690,
    campaignNames: ['Performance Max - Paspas', 'Arama - Bagaj Havuzu', 'Alışveriş - Tüm Ürünler', 'Marka Anahtar Kelimeleri'],
  },
  {
    id: 2, platform: AD_PLATFORM.Meta, displayName: 'Demo Meta Ads (TR)', externalAccountId: 'act_000000001', currencyCode: 'TRY',
    erpSourceCodes: ['store-a'], dailySpend: 800, cpm: 48, ctr: 0.016, conversionRate: 0.019, averageOrderValue: 610,
    campaignNames: ['Katalog Satışı - Dinamik', 'Retargeting - Sepet Terk', 'Yeni Müşteri - Video'],
  },
  {
    id: 3, platform: AD_PLATFORM.Meta, displayName: 'Demo Meta Ads (UK)', externalAccountId: 'act_000000002', currencyCode: 'GBP',
    erpSourceCodes: ['store-c'], dailySpend: 8, cpm: 5.2, ctr: 0.014, conversionRate: 0.017, averageOrderValue: 24,
    campaignNames: ['UK Catalogue Sales', 'UK Retargeting'],
  },
  {
    id: 4, platform: AD_PLATFORM.Google, displayName: 'Demo Google Ads (UK)', externalAccountId: '000-000-0002', currencyCode: 'GBP',
    erpSourceCodes: ['store-c'], dailySpend: 10, cpm: 6.8, ctr: 0.031, conversionRate: 0.024, averageOrderValue: 27,
    campaignNames: ['UK Shopping - All Products', 'UK Search - Floor Mats'],
  },
];

export function toAccountDto(seed: AdAccountSeed): AdAccountDto {
  return {
    id: seed.id, platform: seed.platform, platformName: AD_PLATFORM_NAMES[seed.platform],
    externalAccountId: seed.externalAccountId, displayName: seed.displayName, currencyCode: seed.currencyCode,
    timeZone: seed.currencyCode === 'GBP' ? 'Europe/London' : 'Europe/Istanbul',
    erpSourceCodes: seed.erpSourceCodes, isActive: true, isPaused: false, pausedReason: null,
    status: AD_ACCOUNT_STATUS.Connected, lastError: null,
    lastCheckedAt: ago(0, 0, 25), lastSyncedAt: ago(0, 1), metricsSyncedThrough: ago(1).slice(0, 10),
    backfillDays: BACKFILL_DAYS, hasCredentials: true, tokenExpiresAt: ago(-45),
    campaignCount: seed.campaignNames.length, activeCampaignCount: seed.campaignNames.length - 1,
    createdAt: ago(200),
  };
}

export interface AdMetrics {
  spend: number;
  spendTry: number;
  impressions: number;
  clicks: number;
  conversions: number;
  conversionValueTry: number;
}

export const emptyMetrics = (): AdMetrics => ({ spend: 0, spendTry: 0, impressions: 0, clicks: 0, conversions: 0, conversionValueTry: 0 });

export function addMetrics(a: AdMetrics, b: AdMetrics): AdMetrics {
  return {
    spend: a.spend + b.spend, spendTry: a.spendTry + b.spendTry, impressions: a.impressions + b.impressions,
    clicks: a.clicks + b.clicks, conversions: a.conversions + b.conversions, conversionValueTry: a.conversionValueTry + b.conversionValueTry,
  };
}

export function scaleMetrics(metrics: AdMetrics, factor: number): AdMetrics {
  return {
    spend: round2(metrics.spend * factor), spendTry: round2(metrics.spendTry * factor),
    impressions: Math.round(metrics.impressions * factor), clicks: Math.round(metrics.clicks * factor),
    conversions: Math.round(metrics.conversions * factor), conversionValueTry: round2(metrics.conversionValueTry * factor),
  };
}

/** Bir hesabın tek günlük metriği; aynı (hesap, gün) her zaman aynı sonucu verir. */
export function dayMetrics(seed: AdAccountSeed, date: string): AdMetrics {
  const rng = createRng(seed.id * 100_000 + Number(date.replaceAll('-', '')));
  const weekday = new Date(date).getUTCDay();
  const weekendFactor = weekday === 0 || weekday === 6 ? WEEKEND_FACTOR : 1;
  const spend = round2(seed.dailySpend * rng.float(0.8, 1.2) * weekendFactor);
  const impressions = Math.round((spend / seed.cpm) * 1000);
  const clicks = Math.round(impressions * seed.ctr * rng.float(0.9, 1.1));
  const conversions = Math.round(clicks * seed.conversionRate * rng.float(0.8, 1.2));
  const rate = seed.currencyCode === 'GBP' ? GBP_TRY_RATE : 1;
  return {
    spend, spendTry: round2(spend * rate), impressions, clicks, conversions,
    conversionValueTry: round2(conversions * seed.averageOrderValue * rate),
  };
}

export function datesBetween(from: string, to: string): string[] {
  const start = new Date(from).getTime();
  const end = new Date(to).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return [];
  const count = Math.min(MAX_RANGE_DAYS, Math.floor((end - start) / MS_PER_DAY) + 1);
  return Array.from({ length: count }, (_, index) => new Date(start + index * MS_PER_DAY).toISOString().slice(0, 10));
}

export function accountTotals(seed: AdAccountSeed, dates: string[]): AdMetrics {
  return dates.reduce((total, date) => addMetrics(total, dayMetrics(seed, date)), emptyMetrics());
}

/** "store-a,store-b" ve "1,2" sorgu filtrelerini uygulayan hesap seçimi. */
export function filterAccounts(query: URLSearchParams): AdAccountSeed[] {
  const codes = query.get('erpSourceCodes')?.split(',').filter(Boolean) ?? [];
  const platforms = query.get('platforms')?.split(',').filter(Boolean).map(Number) ?? [];
  return AD_ACCOUNT_SEEDS.filter((seed) =>
    (codes.length === 0 || seed.erpSourceCodes.some((code) => codes.includes(code)))
    && (platforms.length === 0 || platforms.includes(seed.platform)));
}
