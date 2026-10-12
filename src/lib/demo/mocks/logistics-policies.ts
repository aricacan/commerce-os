// Kargo ayarları (ücretlendirme politikası) ve sipariş bazlı kargo önizlemesi.
import type {
  ShippingPolicyDto, ShippingQuotePreview, ShippingRegionInfo, ShippingRuleDto,
} from '../../api/shipping-policies';
import { ago, dayAgo } from '../seed';
import { get, type DemoRoute } from '../router';

const UK_ZONES = ['Mainland', 'Scotland', 'NorthernIreland'];
const TR_FREE_SHIPPING_THRESHOLD = 750;
const UK_FREE_SHIPPING_THRESHOLD = 45;
const POLICY_AGE_DAYS = 40;
const OLD_POLICY_AGE_DAYS = 150;

const REGIONS: ShippingRegionInfo[] = [
  { code: 'TR', currency: 'TRY', zones: [''], sources: ['Mağaza A ERP', 'Mağaza B ERP'] },
  { code: 'UK', currency: 'GBP', zones: UK_ZONES, sources: ['Store C ERP'] },
];

let nextRuleId = 1;
const rule = (target: ShippingRuleDto['target'], zone: string, price: number, extra: Partial<ShippingRuleDto> = {}): ShippingRuleDto => ({
  id: nextRuleId++, target, sku: null, internalCategoryId: null, zone, label: null, price, ...extra,
});

const TR_RULES: ShippingRuleDto[] = [
  rule('FreeShipping', '', TR_FREE_SHIPPING_THRESHOLD),
  rule('Product', '', 0, { sku: 'DM-1003', label: 'Direksiyon Kılıfı' }),
];

const UK_RULES: ShippingRuleDto[] = [
  rule('Default', 'Mainland', 4.95),
  rule('Default', 'Scotland', 7.5),
  rule('Default', 'NorthernIreland', 8.9),
  rule('Category', 'Mainland', 9.95, { internalCategoryId: 3, label: 'Bagaj' }),
  rule('Category', 'Scotland', 14.5, { internalCategoryId: 3, label: 'Bagaj' }),
  rule('Category', 'NorthernIreland', 16.9, { internalCategoryId: 3, label: 'Bagaj' }),
  rule('FreeShipping', 'Mainland', UK_FREE_SHIPPING_THRESHOLD),
];

const policy = (id: number, region: string, overrides: Partial<ShippingPolicyDto>): ShippingPolicyDto => ({
  id, region, dataSourceId: null, dataSourceName: null, validFrom: null,
  chargeBasis: 'PerOrder', pricingMethod: 'DesiBand', freeShippingEffect: 'CustomerOnly',
  updatedAt: ago(POLICY_AGE_DAYS), rules: [], ...overrides,
});

// Sunucu kapsam içinde en yeni sürümü önce gönderir.
const POLICIES: ShippingPolicyDto[] = [
  policy(1, 'TR', { validFrom: dayAgo(POLICY_AGE_DAYS), rules: TR_RULES }),
  policy(2, 'TR', { validFrom: null, updatedAt: ago(OLD_POLICY_AGE_DAYS), freeShippingEffect: 'CarrierCostWaived', rules: [rule('FreeShipping', '', 500)] }),
  policy(3, 'UK', { validFrom: dayAgo(POLICY_AGE_DAYS), pricingMethod: 'Category', chargeBasis: 'PerItem', rules: UK_RULES }),
];

function previewFor(orderNumber: string): ShippingQuotePreview {
  const isUk = orderNumber.toUpperCase().startsWith('UK');
  return {
    orderId: 1,
    orderNumber,
    orderDate: ago(3),
    region: isUk ? 'UK' : 'TR',
    zone: isUk ? 'Mainland' : '',
    postcode: isUk ? 'M1 4BT' : null,
    policyScope: isUk ? 'Tüm İngiltere' : 'Tüm Türkiye',
    origin: isUk ? 'Category' : 'DesiBand',
    isKnown: true,
    totalTry: isUk ? 9.95 : 96.5,
    lines: [
      { sku: 'DM-1004', productName: 'AeroLine Bagaj Havuzu Siyah', categoryName: 'Bagaj', quantity: 1, desi: 12, isKnown: true, costTry: isUk ? 9.95 : 78 },
      { sku: 'DM-1007', productName: 'TrackPro Oto Kokusu Premium', categoryName: 'Bakım', quantity: 2, desi: 1, isKnown: true, costTry: isUk ? 0 : 18.5 },
    ],
  };
}

export const logisticsPolicyRoutes: DemoRoute[] = [
  get('/shipping-policies/regions', () => REGIONS),
  get('/shipping-policies/preview', (req) => previewFor(req.query.get('orderNumber') ?? 'DM-240013')),
  get('/shipping-policies', (req) => POLICIES.filter((item) => item.region === (req.query.get('region') ?? 'TR'))),
];
