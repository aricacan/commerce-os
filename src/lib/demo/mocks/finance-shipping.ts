// Kanal ücretleri ve kargo desi tarifeleri.
import type { ChannelFeeRow } from '../../api/channel-fees';
import type { ShippingExtraFee, ShippingRate } from '../../../types/api';
import { DEMO_STORES } from '../data/core';
import { FINANCE_PLATFORMS } from '../data/finance-base';
import { dayAgo } from '../seed';
import { get, type DemoRequest, type DemoRoute } from '../router';

const TR_REGION = 'TR';
const UK_REGION = 'UK';
const UK_ZONES = ['Mainland', 'Scotland', 'NorthernIreland'];
const ZONE_SURCHARGE: Record<string, number> = { Mainland: 0, Scotland: 1.6, NorthernIreland: 2.4 };
const TR_CARRIERS = ['Aras Kargo', 'Yurtiçi Kargo'];
const UK_CARRIERS = ['Royal Mail', 'Evri'];
const MAX_DESI_BAND = 30;

// ── Kanal ücretleri ────────────────────────────────────────────────────────────

const CHANNEL_VAT_RATE = 0.2;
const UK_VAT_RATE = 0.2;

interface ChannelSeed {
  dataSourceId: number;
  storeIndex: number;
  platformId: number;
  orderCount: number;
  hasOverride: boolean;
}

const CHANNEL_SEEDS: ChannelSeed[] = [
  { dataSourceId: 1, storeIndex: 0, platformId: 1, orderCount: 1840, hasOverride: false },
  { dataSourceId: 1, storeIndex: 0, platformId: 2, orderCount: 760, hasOverride: false },
  { dataSourceId: 1, storeIndex: 0, platformId: 4, orderCount: 520, hasOverride: true },
  { dataSourceId: 2, storeIndex: 1, platformId: 1, orderCount: 1120, hasOverride: false },
  { dataSourceId: 2, storeIndex: 1, platformId: 2, orderCount: 430, hasOverride: true },
  { dataSourceId: 3, storeIndex: 2, platformId: 3, orderCount: 690, hasOverride: false },
  { dataSourceId: 3, storeIndex: 2, platformId: 5, orderCount: 210, hasOverride: false },
];

function channelFeeRow(seed: ChannelSeed): ChannelFeeRow {
  const platform = FINANCE_PLATFORMS.find((item) => item.id === seed.platformId) ?? FINANCE_PLATFORMS[0];
  const store = DEMO_STORES[seed.storeIndex];
  const isUk = store.country === UK_REGION;
  const baseServiceFee = isUk ? Math.round((platform.serviceFee / 44.2) * 100) / 100 : platform.serviceFee;
  const overrideBonus = seed.hasOverride ? 0.01 : 0;
  return {
    dataSourceId: seed.dataSourceId,
    dataSourceName: `Demo ERP - ${store.name}`,
    country: store.country,
    platformId: platform.id,
    platformName: platform.name,
    storeId: seed.storeIndex + 1,
    storeName: store.name,
    orderCount: seed.orderCount,
    ordersWithReportedFees: Math.round(seed.orderCount * 0.72),
    baseCommissionRate: platform.commissionRate,
    baseServiceFee,
    baseVatRate: isUk ? UK_VAT_RATE : CHANNEL_VAT_RATE,
    hasOverride: seed.hasOverride,
    commissionRate: platform.commissionRate + overrideBonus,
    serviceFee: baseServiceFee,
    vatRate: isUk ? UK_VAT_RATE : CHANNEL_VAT_RATE,
    suggestion: seed.platformId === 5
      ? {
          commissionPercent: 12.8,
          serviceFee: 0.3,
          note: 'Kategori bazında değişir; elektronik aksesuarda daha düşük olabilir.',
          sourceName: 'Pazaryeri tarife sayfası',
          sourceUrl: 'https://example.com/fees',
          checkedOn: dayAgo(12),
          kind: 'Researched',
        }
      : null,
  };
}

// ── Kargo tarifeleri ───────────────────────────────────────────────────────────

function buildRates(): ShippingRate[] {
  let id = 1;
  const rates: ShippingRate[] = [];
  for (const carrierName of TR_CARRIERS) {
    const carrierFactor = carrierName === TR_CARRIERS[0] ? 1 : 1.08;
    for (let desi = 0; desi < MAX_DESI_BAND; desi += 1) {
      const price = Math.round((52 + desi * 6.8) * carrierFactor * 100) / 100;
      rates.push({ id: id++, region: TR_REGION, zone: '', validFrom: null, carrierName, minDesi: desi, maxDesi: desi + 1, price });
    }
  }
  for (const carrierName of UK_CARRIERS) {
    const carrierFactor = carrierName === UK_CARRIERS[0] ? 1 : 0.92;
    for (const zone of UK_ZONES) {
      for (let desi = 0; desi < 10; desi += 1) {
        const price = Math.round((3.2 + desi * 0.85 + ZONE_SURCHARGE[zone]) * carrierFactor * 100) / 100;
        rates.push({ id: id++, region: UK_REGION, zone, validFrom: null, carrierName, minDesi: desi * 3, maxDesi: desi * 3 + 3, price });
      }
    }
  }
  return rates;
}

const SHIPPING_RATES = buildRates();

const EXTRA_FEES: ShippingExtraFee[] = [
  { id: 1, carrierName: 'Aras Kargo', feeType: 'Kapıda ödeme hizmeti', price: 18.5 },
  { id: 2, carrierName: 'Aras Kargo', feeType: 'Adrese teslim farkı', price: 9.9 },
  { id: 3, carrierName: 'Yurtiçi Kargo', feeType: 'Mobil bölge farkı', price: 14.25 },
];

function shippingRates(request: DemoRequest): ShippingRate[] {
  const region = request.query.get('region');
  return region ? SHIPPING_RATES.filter((rate) => rate.region === region) : SHIPPING_RATES;
}

export const financeShippingRoutes: DemoRoute[] = [
  get('/channel-fees', () => CHANNEL_SEEDS.map(channelFeeRow)),
  get('/shipping-rates/extra-fees', () => EXTRA_FEES),
  get('/shipping-rates/versions', () => [null]),
  get('/shipping-rates', shippingRates),
];
