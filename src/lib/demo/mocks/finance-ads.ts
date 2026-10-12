// AdsHub: hesaplar, genel bakış, yerleşim kırılımı, gerçek kâr köprüsü, kampanya/set/reklam tabloları, öneriler.
import {
  AD_ENTITY_STATUS,
  AD_LEVEL,
  AD_SYNC_RUN_TYPE,
  ADS_ACTION_PROPOSAL_STATUS,
  ADS_ACTION_TYPE,
  ADS_ANOMALY_METRIC,
  ADS_RECOMMENDATION_SEVERITY,
  type AdBreakdownOverviewDto,
  type AdEntityPageDto,
  type AdEntityRowDto,
  type AdLevel,
  type AdSyncRunDto,
  type AdsActionProposalDto,
  type AdsBlendedProfitDto,
  type AdsOverviewDto,
  type AdsRecommendationDto,
} from '../../api/adshub';
import { GBP_TRY_RATE, defaultRange, monthFigures, round2 } from '../data/finance-base';
import {
  AD_ACCOUNT_SEEDS,
  AD_PLATFORM_NAMES,
  accountTotals,
  addMetrics,
  dayMetrics,
  datesBetween,
  emptyMetrics,
  filterAccounts,
  scaleMetrics,
  toAccountDto,
  type AdAccountSeed,
  type AdMetrics,
} from '../data/finance-ads';
import { ago, dayAgo, matchesSearch, paginate } from '../seed';
import { DemoHttpResponse, get, type DemoRequest, type DemoRoute } from '../router';

const NOT_FOUND_STATUS = 404;
const DEFAULT_RANGE_DAYS = 30;
const GROUPS_PER_CAMPAIGN = 2;
const ADS_PER_GROUP = 2;
const SYNC_RUN_COUNT = 12;
const ID_STRIDE_CAMPAIGN = 100;
const ID_STRIDE_GROUP = 1000;
const ID_STRIDE_AD = 10_000;
const NET_MARGIN_RATIO = 0.14;
const PERCENT = 100;

const PLACEMENTS: [string, string, number][] = [
  ['Facebook', 'Feed', 0.34], ['Instagram', 'Feed', 0.22], ['Instagram', 'Stories', 0.18],
  ['Instagram', 'Reels', 0.16], ['Facebook', 'Marketplace', 0.06], ['Audience Network', 'Native', 0.04],
];
const DEVICES: [string, number][] = [['Mobil', 0.71], ['Masaüstü', 0.24], ['Tablet', 0.05]];

const ratio = (numerator: number, denominator: number): number | null => (denominator > 0 ? round2(numerator / denominator) : null);
const rangeOf = (request: DemoRequest) => defaultRange(request.query, DEFAULT_RANGE_DAYS);

function combine(seeds: AdAccountSeed[], dates: string[]): AdMetrics {
  return seeds.reduce((total, seed) => addMetrics(total, accountTotals(seed, dates)), emptyMetrics());
}

// ── Genel bakış ────────────────────────────────────────────────────────────────

function overview(request: DemoRequest): AdsOverviewDto {
  const { from, to } = rangeOf(request);
  const seeds = filterAccounts(request.query);
  const dates = datesBetween(from, to);
  const totals = combine(seeds, dates);
  const currencies = new Set(seeds.map((seed) => seed.currencyCode));
  const nativeCurrencyCode = currencies.size === 1 ? [...currencies][0] : null;
  const erpRevenue = dates.reduce((sum, date) => sum + dailyErpRevenue(date), 0);

  const daily = dates.map((date) => {
    const day = seeds.reduce((total, seed) => addMetrics(total, dayMetrics(seed, date)), emptyMetrics());
    const revenue = dailyErpRevenue(date);
    return {
      date, spendTry: round2(day.spendTry), impressions: day.impressions, clicks: day.clicks,
      platformConversions: day.conversions, platformConversionValueTry: day.conversionValueTry,
      platformAcosPercent: ratio(day.spendTry * PERCENT, day.conversionValueTry),
      erpRevenueTry: revenue, tacosPercent: ratio(day.spendTry * PERCENT, revenue),
    };
  });

  const platformIds = [...new Set(seeds.map((seed) => seed.platform))];
  return {
    from, to,
    totalSpendTry: round2(totals.spendTry), unconvertedRowCount: 0,
    nativeCurrencyCode, totalSpendNative: nativeCurrencyCode ? round2(totals.spend) : null,
    totalImpressions: totals.impressions, totalClicks: totals.clicks,
    ctr: ratio(totals.clicks * PERCENT, totals.impressions),
    cpcTry: ratio(totals.spendTry, totals.clicks),
    cpmTry: ratio(totals.spendTry * 1000, totals.impressions),
    platformConversions: totals.conversions, platformConversionValueTry: round2(totals.conversionValueTry),
    platformRoas: ratio(totals.conversionValueTry, totals.spendTry),
    platformAcosPercent: ratio(totals.spendTry * PERCENT, totals.conversionValueTry),
    tacosPercent: ratio(totals.spendTry * PERCENT, erpRevenue),
    erpTotalRevenueTry: round2(erpRevenue), tacosScopeIsAllSources: false,
    activeAccountCount: seeds.length,
    activeCampaignCount: seeds.reduce((sum, seed) => sum + seed.campaignNames.length - 1, 0),
    byPlatform: platformIds.map((platform) => {
      const sum = combine(seeds.filter((seed) => seed.platform === platform), dates);
      return { platform, platformName: AD_PLATFORM_NAMES[platform], spendTry: round2(sum.spendTry), impressions: sum.impressions, clicks: sum.clicks };
    }),
    byAccount: seeds.map((seed) => {
      const sum = accountTotals(seed, dates);
      return {
        adAccountId: seed.id, accountName: seed.displayName, platform: seed.platform, currencyCode: seed.currencyCode,
        erpSourceCodes: seed.erpSourceCodes, spend: round2(sum.spend), spendTry: round2(sum.spendTry), impressions: sum.impressions, clicks: sum.clicks,
      };
    }),
    daily,
    addToCartCount: Math.round(totals.clicks * 0.09), initiateCheckoutCount: Math.round(totals.clicks * 0.045),
    funnelPurchaseCount: Math.round(totals.conversions * 0.55), funnelPlatformNames: ['Meta'],
  };
}

/** O günkü ERP cirosu (tüm mağazalar, TRY): ayın cirosu gün sayısına bölünür, hafta sonu hafifler. */
function dailyErpRevenue(date: string): number {
  const [year, month] = date.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const weekday = new Date(date).getUTCDay();
  return round2((monthFigures(year, month).revenue / daysInMonth) * (weekday === 0 || weekday === 6 ? 0.88 : 1.04));
}

function breakdown(request: DemoRequest): AdBreakdownOverviewDto {
  const { from, to } = rangeOf(request);
  const metaSeeds = filterAccounts(request.query).filter((seed) => AD_PLATFORM_NAMES[seed.platform] === 'Meta');
  const totals = combine(metaSeeds, datesBetween(from, to));
  const row = (share: number) => ({
    spendTry: round2(totals.spendTry * share), impressions: Math.round(totals.impressions * share), clicks: Math.round(totals.clicks * share),
    ctr: ratio(totals.clicks * PERCENT, totals.impressions), cpcTry: ratio(totals.spendTry, totals.clicks),
  });
  return {
    from, to, unconvertedRowCount: 0,
    byPlacement: PLACEMENTS.map(([publisherPlatform, platformPosition, share]) => ({ publisherPlatform, platformPosition, ...row(share) })),
    byDevice: DEVICES.map(([impressionDevice, share]) => ({ impressionDevice, ...row(share) })),
  };
}

function blendedProfit(request: DemoRequest): AdsBlendedProfitDto {
  const { from, to } = rangeOf(request);
  const seeds = filterAccounts(request.query);
  const dates = datesBetween(from, to);
  const daily = dates.map((date) => {
    const spend = round2(seeds.reduce((sum, seed) => sum + dayMetrics(seed, date).spendTry, 0));
    const revenue = dailyErpRevenue(date);
    const netProfit = round2(revenue * NET_MARGIN_RATIO);
    return {
      date, adSpendTry: spend, erpRevenueTry: revenue, erpNetProfitTry: netProfit, erpOrderCount: Math.round(revenue / 640),
      trueNetTry: round2(netProfit - spend), mer: ratio(revenue, spend), tacosPercent: ratio(spend * PERCENT, revenue),
    };
  });
  const sum = (pick: (day: (typeof daily)[number]) => number) => round2(daily.reduce((total, day) => total + pick(day), 0));
  const totalSpend = sum((day) => day.adSpendTry);
  const totalRevenue = sum((day) => day.erpRevenueTry);
  const currencies = new Set(seeds.map((seed) => seed.currencyCode));
  const nativeCurrencyCode = currencies.size === 1 ? [...currencies][0] : null;
  return {
    from, to, totalAdSpendTry: totalSpend, totalErpRevenueTry: totalRevenue,
    totalErpNetProfitTry: sum((day) => day.erpNetProfitTry), totalTrueNetTry: sum((day) => day.trueNetTry),
    mer: ratio(totalRevenue, totalSpend), tacosPercent: ratio(totalSpend * PERCENT, totalRevenue),
    totalErpOrderCount: daily.reduce((total, day) => total + day.erpOrderCount, 0),
    nativeCurrencyCode, totalAdSpendNative: nativeCurrencyCode ? round2(combine(seeds, dates).spend) : null,
    daysWithSpendButNoOrders: 0, unconvertedSpendDayCount: 0,
    erpSourceCodesUsed: [...new Set(seeds.flatMap((seed) => seed.erpSourceCodes))],
    usedAllStoresFallback: false, matchedStoreCount: seeds.length, requestedStoreCount: seeds.length,
    daily,
  };
}

// ── Kampanya / set / reklam tabloları ──────────────────────────────────────────

const CAMPAIGN_WEIGHTS = [0.4, 0.3, 0.2, 0.1];
const OBJECTIVES = ['SALES', 'CATALOG_SALES', 'CONVERSIONS', 'TRAFFIC'];
const GROUP_NAMES = ['Geniş Kitle', 'Benzer Kitle %1'];
const AD_NAMES = ['Statik Görsel', 'Kısa Video'];

interface EntityNode {
  level: AdLevel;
  id: number;
  name: string;
  parentId: number | null;
  parentName: string | null;
  seed: AdAccountSeed;
  share: number;
  paused: boolean;
}

function entityTree(seed: AdAccountSeed): EntityNode[] {
  const nodes: EntityNode[] = [];
  seed.campaignNames.forEach((campaignName, campaignIndex) => {
    const campaignShare = CAMPAIGN_WEIGHTS[campaignIndex] / CAMPAIGN_WEIGHTS.slice(0, seed.campaignNames.length).reduce((a, b) => a + b, 0);
    const campaignId = seed.id * ID_STRIDE_CAMPAIGN + campaignIndex + 1;
    const campaignPaused = campaignIndex === seed.campaignNames.length - 1;
    nodes.push({ level: AD_LEVEL.Campaign, id: campaignId, name: campaignName, parentId: null, parentName: null, seed, share: campaignShare, paused: campaignPaused });
    for (let groupIndex = 0; groupIndex < GROUPS_PER_CAMPAIGN; groupIndex += 1) {
      const groupId = seed.id * ID_STRIDE_GROUP + campaignIndex * 10 + groupIndex + 1;
      const groupShare = campaignShare / GROUPS_PER_CAMPAIGN;
      nodes.push({ level: AD_LEVEL.AdGroup, id: groupId, name: GROUP_NAMES[groupIndex], parentId: campaignId, parentName: campaignName, seed, share: groupShare, paused: campaignPaused });
      for (let adIndex = 0; adIndex < ADS_PER_GROUP; adIndex += 1) {
        const adId = seed.id * ID_STRIDE_AD + campaignIndex * 100 + groupIndex * 10 + adIndex + 1;
        nodes.push({ level: AD_LEVEL.Ad, id: adId, name: `${AD_NAMES[adIndex]} ${campaignIndex + 1}`, parentId: groupId, parentName: GROUP_NAMES[groupIndex], seed, share: groupShare / ADS_PER_GROUP, paused: campaignPaused });
      }
    }
  });
  return nodes;
}

function toRow(node: EntityNode, dates: string[]): AdEntityRowDto {
  const { seed } = node;
  const metrics = scaleMetrics(accountTotals(seed, dates), node.share);
  const rate = seed.currencyCode === 'GBP' ? GBP_TRY_RATE : 1;
  const conversionValue = round2(metrics.conversionValueTry / rate);
  const isAd = node.level === AD_LEVEL.Ad;
  const attributed = node.level === AD_LEVEL.Campaign && node.id % 2 === 0;
  return {
    id: node.id, externalId: `ext-${node.id}`, name: node.name, level: node.level,
    parentId: node.parentId, parentName: node.parentName,
    adAccountId: seed.id, accountName: seed.displayName, platform: seed.platform, currencyCode: seed.currencyCode,
    erpSourceCodes: seed.erpSourceCodes,
    status: node.paused ? AD_ENTITY_STATUS.Paused : AD_ENTITY_STATUS.Active, statusRaw: node.paused ? 'PAUSED' : 'ACTIVE',
    objective: OBJECTIVES[node.id % OBJECTIVES.length], isDeletedOnPlatform: false,
    dailyBudget: node.level === AD_LEVEL.Campaign ? round2(seed.dailySpend * node.share * 1.2) : null, lifetimeBudget: null,
    thumbnailUrl: null, creativeTitle: isAd ? node.name : null, creativeBody: isAd ? 'Aracınıza özel aksesuarlarda sezon fırsatları.' : null,
    spend: metrics.spend, spendTry: metrics.spendTry, impressions: metrics.impressions, clicks: metrics.clicks,
    reach: Math.round(metrics.impressions * 0.62),
    ctr: ratio(metrics.clicks * PERCENT, metrics.impressions), cpc: ratio(metrics.spend, metrics.clicks), cpm: ratio(metrics.spend * 1000, metrics.impressions),
    platformConversions: metrics.conversions, platformConversionValue: conversionValue,
    platformRoas: ratio(conversionValue, metrics.spend),
    platformAcosPercent: ratio(metrics.spend * PERCENT, conversionValue),
    costPerConversion: ratio(metrics.spend, metrics.conversions),
    addToCartCount: Math.round(metrics.clicks * 0.09), initiateCheckoutCount: Math.round(metrics.clicks * 0.045),
    erpOrderCount: Math.round(metrics.conversions * 1.8),
    isLandingProductOutOfStock: isAd && !node.paused ? node.id % 7 === 0 : null,
    realAttributedOrderCount: attributed ? Math.max(1, Math.round(metrics.conversions * 0.6)) : null,
    realAttributedRevenueTry: attributed ? round2(metrics.conversionValueTry * 0.55) : null,
    landingProductGrossMarginPercent: isAd ? round2(24 + (node.id % 9) * 2.5) : null,
    landingProductName: isAd ? 'Araç Paspası 3D Siyah' : null,
  };
}

function entityPage(level: AdLevel) {
  return (request: DemoRequest): AdEntityPageDto => {
    const { from, to } = rangeOf(request);
    const dates = datesBetween(from, to);
    const accountId = Number(request.query.get('adAccountId')) || null;
    const parentId = Number(request.query.get('parentId')) || null;
    const includeInactive = request.query.get('includeInactive') === 'true';
    const rows = filterAccounts(request.query)
      .filter((seed) => !accountId || seed.id === accountId)
      .flatMap(entityTree)
      .filter((node) => node.level === level && (!parentId || node.parentId === parentId) && (includeInactive || !node.paused))
      .map((node) => toRow(node, dates))
      .filter((row) => matchesSearch(row, request.query.get('search'), ['name']))
      .sort((a, b) => (b.spendTry ?? 0) - (a.spendTry ?? 0));
    const page = paginate(rows, request.query, 50);
    const currencies = new Set(rows.map((row) => row.currencyCode));
    const nativeCurrencyCode = currencies.size === 1 ? [...currencies][0] : null;
    return {
      rows: page.items, totalCount: page.totalCount, page: page.page, pageSize: page.pageSize,
      totalSpendTry: round2(rows.reduce((sum, row) => sum + (row.spendTry ?? 0), 0)),
      nativeCurrencyCode, totalSpendNative: nativeCurrencyCode ? round2(rows.reduce((sum, row) => sum + row.spend, 0)) : null,
      unconvertedRowCount: 0,
    };
  };
}

// ── Senkron, öneri ve onay verileri ────────────────────────────────────────────

function syncRuns(request: DemoRequest): AdSyncRunDto[] {
  const take = Number(request.query.get('take')) || SYNC_RUN_COUNT;
  return Array.from({ length: Math.min(take, SYNC_RUN_COUNT) }, (_, index) => {
    const seed = AD_ACCOUNT_SEEDS[index % AD_ACCOUNT_SEEDS.length];
    const failed = index === 5;
    return {
      id: 100 - index, adAccountId: seed.id, accountName: seed.displayName,
      type: index % 4 === 0 ? AD_SYNC_RUN_TYPE.Metadata : AD_SYNC_RUN_TYPE.Metrics,
      startedAt: ago(0, index * 3 + 1), finishedAt: ago(0, index * 3 + 1, -1), success: !failed,
      error: failed ? 'Platform geçici olarak yanıt vermedi (demo).' : null,
      fetchedCount: failed ? 0 : 140 + index * 7, createdCount: failed ? 0 : 6, updatedCount: failed ? 0 : 134, failedCount: failed ? 1 : 0,
      checkpoint: dayAgo(1),
    };
  });
}

const RECOMMENDATIONS: AdsRecommendationDto[] = [
  { erpSourceCode: 'store-a', metric: ADS_ANOMALY_METRIC.Cpc, severity: ADS_RECOMMENDATION_SEVERITY.Warning, evaluatedDate: dayAgo(1), value: 4.9, baselineAverage: 3.6, zScore: 2.4 },
  { erpSourceCode: 'store-a', metric: ADS_ANOMALY_METRIC.Roas, severity: ADS_RECOMMENDATION_SEVERITY.Opportunity, evaluatedDate: dayAgo(1), value: 6.2, baselineAverage: 4.7, zScore: 2.1 },
  { erpSourceCode: 'store-c', metric: ADS_ANOMALY_METRIC.Ctr, severity: ADS_RECOMMENDATION_SEVERITY.Critical, evaluatedDate: dayAgo(1), value: 0.006, baselineAverage: 0.014, zScore: -3.3 },
  { erpSourceCode: 'store-b', metric: ADS_ANOMALY_METRIC.Spend, severity: ADS_RECOMMENDATION_SEVERITY.Healthy, evaluatedDate: dayAgo(1), value: 1240, baselineAverage: 1215, zScore: 0.2 },
  { erpSourceCode: 'store-c', metric: ADS_ANOMALY_METRIC.ConversionRate, severity: ADS_RECOMMENDATION_SEVERITY.Warning, evaluatedDate: dayAgo(1), value: 0.011, baselineAverage: 0.017, zScore: -2.2 },
];

const PROPOSALS: AdsActionProposalDto[] = [
  { id: 1, adAccountId: 1, adCampaignId: 101, actionType: ADS_ACTION_TYPE.UpdateBudget, status: ADS_ACTION_PROPOSAL_STATUS.PendingApproval, currentBudget: 520, proposedBudget: 650, reason: 'ROAS son 7 günde hedefin üzerinde; bütçe artırımı önerilir.', simulationOnly: false, executionError: null, rollbackOfProposalId: null, createdAt: ago(0, 5) },
  { id: 2, adAccountId: 2, adCampaignId: 203, actionType: ADS_ACTION_TYPE.Pause, status: ADS_ACTION_PROPOSAL_STATUS.PendingApproval, currentBudget: null, proposedBudget: null, reason: 'CPC üç gündür baz değerin %35 üzerinde ve dönüşüm düşük.', simulationOnly: true, executionError: null, rollbackOfProposalId: null, createdAt: ago(1, 2) },
  { id: 3, adAccountId: 4, adCampaignId: 402, actionType: ADS_ACTION_TYPE.Resume, status: ADS_ACTION_PROPOSAL_STATUS.Executed, currentBudget: null, proposedBudget: null, reason: 'Stok yenilendi; kampanya yeniden açıldı.', simulationOnly: false, executionError: null, rollbackOfProposalId: null, createdAt: ago(4) },
  { id: 4, adAccountId: 1, adCampaignId: 102, actionType: ADS_ACTION_TYPE.UpdateBudget, status: ADS_ACTION_PROPOSAL_STATUS.Rejected, currentBudget: 390, proposedBudget: 200, reason: 'Düşük performans nedeniyle bütçe azaltımı.', simulationOnly: false, executionError: null, rollbackOfProposalId: null, createdAt: ago(6) },
];

export const financeAdsRoutes: DemoRoute[] = [
  get('/adshub/accounts/platforms', () => [...new Set(AD_ACCOUNT_SEEDS.map((seed) => seed.platform))].map((platform) => ({ platform, name: AD_PLATFORM_NAMES[platform] }))),
  get('/adshub/accounts/:id', (request) => {
    const seed = AD_ACCOUNT_SEEDS.find((item) => item.id === Number(request.params.id));
    return seed ? toAccountDto(seed) : new DemoHttpResponse(NOT_FOUND_STATUS);
  }),
  get('/adshub/accounts', () => AD_ACCOUNT_SEEDS.map(toAccountDto)),
  get('/adshub/overview', overview),
  get('/adshub/sync-runs', syncRuns),
  get('/adshub/breakdown', breakdown),
  get('/adshub/blended-profit', blendedProfit),
  get('/adshub/entities/campaigns', entityPage(AD_LEVEL.Campaign)),
  get('/adshub/entities/ad-groups', entityPage(AD_LEVEL.AdGroup)),
  get('/adshub/entities/ads', entityPage(AD_LEVEL.Ad)),
  get('/adshub/recommendations', () => RECOMMENDATIONS),
  get('/adshub/action-proposals', () => PROPOSALS),
];
