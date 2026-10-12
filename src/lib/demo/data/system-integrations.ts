// Entegrasyon merkezi verisi: mağazalar, ERP kaynakları ve pazaryeri bağlantıları (hepsi kurgusal).
import type { ErpConnectorTypeInfo, ErpStoreIntegrations, StoreInfo } from '../../../types/api';
import type {
  IntegrationConnection,
  IntegrationResource,
  MarketplaceIntegration,
  PlatformRateInfo,
} from '../../api/integrations';
import { DEMO_PLATFORMS, DEMO_STORES, type DemoStore } from './core';
import { ago } from '../seed';

const STORE_COLORS = ['#2563eb', '#16a34a', '#d97706'];
const TURKEY_TIME_ZONE = 'Europe/Istanbul';
const UK_TIME_ZONE = 'Europe/London';
const ERP_KIND = 0;
const MARKETPLACE_KIND = 1;
const STATUS_ACTIVE = 1;
const INGEST_POLICY = 1;
const VIEW_ONLY_POLICY = 0;
const RATE_SOURCE_INGESTED = 1;
const VAT_RATE = 20;
const RESOURCE_STORE = 0;
const RESOURCE_ACCOUNT = 1;
const RESOURCE_WAREHOUSE = 2;
const RESOURCE_OTHER = 4;

export const DEMO_STORE_INFOS: StoreInfo[] = DEMO_STORES.map((store, index) => ({
  id: index + 1,
  code: store.code,
  name: store.name,
  displayColor: STORE_COLORS[index % STORE_COLORS.length],
  isActive: true,
  timeZoneId: store.country === 'UK' ? UK_TIME_ZONE : TURKEY_TIME_ZONE,
}));

const storeId = (store: DemoStore): number => DEMO_STORES.indexOf(store) + 1;
const erpOf = (store: DemoStore): 'Sentos' | 'Base' => (store.country === 'UK' ? 'Base' : 'Sentos');

// Pazaryeri kanalları hangi mağazada satış yapıyor: [platform, mağaza kodu]
const MARKETPLACE_LINKS: Array<[(typeof DEMO_PLATFORMS)[number], string]> = [
  ['Trendyol', 'store-a'],
  ['Hepsiburada', 'store-a'],
  ['Trendyol', 'store-b'],
  ['Amazon', 'store-c'],
  ['eBay', 'store-c'],
];

const platformIdOf = (platform: string): number => DEMO_PLATFORMS.findIndex((entry) => entry === platform) + 1;

function rateFor(platformId: number, store: DemoStore): PlatformRateInfo {
  return {
    platformId,
    storeId: storeId(store),
    commissionRate: 12 + platformId * 1.5,
    vatRate: VAT_RATE,
    serviceFee: store.country === 'UK' ? 0.3 : 8.5,
    source: RATE_SOURCE_INGESTED,
    effectiveAsOfDate: ago(2).slice(0, 10),
  };
}

let nextResourceId = 1;

function resource(partial: Partial<IntegrationResource> & Pick<IntegrationResource, 'type' | 'name' | 'externalId'>): IntegrationResource {
  return {
    id: nextResourceId++,
    isActive: true,
    metadata: {},
    ingestionPolicy: INGEST_POLICY,
    policyUpdatedAt: ago(10),
    children: [],
    rate: null,
    linkedMarketplaceConnectionId: null,
    linkedMarketplaceConnectionName: null,
    supportsIncrementalOnly: false,
    isIngestable: true,
    ...partial,
  };
}

const DATA_GROUPS: Array<[string, string, boolean]> = [
  ['orders', 'Siparişler', true],
  ['products', 'Ürünler', false],
  ['returns', 'İadeler', false],
  ['finance', 'Finans / Hakediş', false],
];

function dataGroups(): IntegrationResource[] {
  return DATA_GROUPS.map(([externalId, name, incremental], index) =>
    resource({
      type: RESOURCE_OTHER,
      externalId,
      name,
      supportsIncrementalOnly: incremental,
      ingestionPolicy: index < 2 ? INGEST_POLICY : VIEW_ONLY_POLICY,
    }),
  );
}

function erpResources(store: DemoStore): IntegrationResource[] {
  const accounts = MARKETPLACE_LINKS.filter(([, code]) => code === store.code).map(([platform]) =>
    resource({
      type: RESOURCE_ACCOUNT,
      externalId: `${platform.toLowerCase()}-${store.code}`,
      name: `${platform} · ${store.name}`,
      rate: rateFor(platformIdOf(platform), store),
    }),
  );
  return [
    resource({ type: RESOURCE_STORE, externalId: store.code, name: store.name, children: accounts }),
    resource({ type: RESOURCE_WAREHOUSE, externalId: `wh-${store.code}`, name: `${store.name} Ana Depo` }),
  ];
}

interface ConnectionSeed {
  id: number;
  kind: 0 | 1;
  providerKey: string;
  providerName: string;
  alias: string;
  displayName: string;
  code: string | null;
  resources: IntegrationResource[];
  productCount: number;
  orderCount: number;
  rate: PlatformRateInfo | null;
}

function toConnection(seed: ConnectionSeed): IntegrationConnection {
  const labels = seed.resources.map((entry) => entry.name);
  return {
    ...seed,
    status: STATUS_ACTIVE,
    lastError: null,
    lastTestedAt: ago(1, 3),
    lastDiscoveredAt: ago(2),
    isActive: true,
    syncedAt: ago(0, 0, 12),
    syncStatus: 'Success',
    activeResourceLabels: labels.slice(0, 4),
    totalResourceCount: labels.length,
  };
}

const erpConnections = DEMO_STORES.map((store, index) =>
  toConnection({
    id: index + 1,
    kind: ERP_KIND,
    providerKey: erpOf(store).toLowerCase(),
    providerName: `${erpOf(store)} ERP`,
    alias: `${store.name} ERP`,
    displayName: `${erpOf(store)} ERP · ${store.name}`,
    code: null,
    resources: erpResources(store),
    productCount: 1200 + index * 340,
    orderCount: 8400 - index * 2100,
    rate: null,
  }),
);

const marketplaceConnections = MARKETPLACE_LINKS.map(([platform, storeCode], index) => {
  const store = DEMO_STORES.find((entry) => entry.code === storeCode) ?? DEMO_STORES[0];
  return toConnection({
    id: DEMO_STORES.length + index + 1,
    kind: MARKETPLACE_KIND,
    providerKey: platform.toLowerCase(),
    providerName: platform,
    alias: `${platform} ${store.name}`,
    displayName: `${platform} · ${store.name}`,
    code: `${platform.toLowerCase()}-${store.code}`,
    resources: dataGroups(),
    productCount: 640 + index * 120,
    orderCount: 3200 - index * 410,
    rate: rateFor(platformIdOf(platform), store),
  });
});

// Gerçekten desteklenen diğer doğrudan pazaryeri entegrasyonları (ERP olarak yalnız Sentos ve Base vardır).
const EXTRA_MARKETPLACES: Array<[string, string]> = [
  ['n11', 'N11'], ['ciceksepeti', 'Çiçeksepeti'], ['pazarama', 'Pazarama'], ['shopify', 'Shopify'],
];

const FIRST_EXTRA_ID = DEMO_STORES.length + MARKETPLACE_LINKS.length + 1;
const storeAt = (index: number): DemoStore => DEMO_STORES[index % DEMO_STORES.length];

const extraMarketplaceConnections = EXTRA_MARKETPLACES.map(([key, name], index) => {
  const store = storeAt(index);
  return toConnection({
    id: FIRST_EXTRA_ID + index,
    kind: MARKETPLACE_KIND,
    providerKey: key,
    providerName: name,
    alias: `${name} ${store.name}`,
    displayName: `${name} · ${store.name}`,
    code: `${key}-${store.code}`,
    resources: dataGroups(),
    productCount: 420 + index * 70,
    orderCount: 2100 - index * 150,
    rate: rateFor(0, store),
  });
});

export const DEMO_INTEGRATION_CONNECTIONS: IntegrationConnection[] = [
  ...erpConnections,
  ...marketplaceConnections,
  ...extraMarketplaceConnections,
];

export const DEMO_ERP_CONNECTOR_TYPES: ErpConnectorTypeInfo[] = [
  {
    type: 0,
    displayName: 'Sentos',
    configFields: [
      { key: 'BaseUrl', label: 'API Adresi', secret: false, default: 'https://erp.example.com/api' },
      { key: 'ApiKey', label: 'API Anahtarı', secret: true },
    ],
  },
  {
    type: 1,
    displayName: 'Base',
    configFields: [{ key: 'Token', label: 'Erişim Anahtarı', secret: true }],
  },
];

export const DEMO_ERP_STORE_INTEGRATIONS: ErpStoreIntegrations[] = DEMO_STORES.map((store, index) => ({
  storeId: index + 1,
  storeName: store.name,
  dataSources: [
    {
      dataSourceId: index + 1,
      connectorType: store.country === 'UK' ? 1 : 0,
      code: `${erpOf(store).toLowerCase()}-${store.code}`,
      isActive: true,
      hasCredential: store.country !== 'UK',
      sharesGlobalCredential: store.country === 'UK',
      configValues: { BaseUrl: 'https://erp.example.com/api' },
      lastSyncAt: ago(0, 0, 8),
      syncStatus: 'Success',
      lastError: null,
      productCount: 1200 + index * 340,
      orderCount: 8400 - index * 2100,
    },
  ],
}));

// Her pazaryeri için tek doğrudan-API kaydı (aynı platform birden çok mağazada kullanılsa da).
const DIRECT_PLATFORMS = [...new Set(MARKETPLACE_LINKS.map(([platform]) => platform))];

export const DEMO_MARKETPLACE_INTEGRATIONS: MarketplaceIntegration[] = DIRECT_PLATFORMS.map((platform, index) => ({
  platformId: platformIdOf(platform),
  platformName: platform,
  apiKey: '••••••••',
  environment: 'Production',
  secretValues: {},
  isActive: true,
  lastSyncAt: ago(0, 0, 5 + index),
  syncStatus: 'Success',
  lastError: null,
  productCount: 640 + index * 120,
  orderCount: 3200 - index * 410,
}));

// Topbar "doğrudan pazaryeri" seçenekleri: (mağaza, platform) çiftleri.
export const DEMO_MP_OPTIONS = MARKETPLACE_LINKS.map(([platform, storeCode]) => {
  const store = DEMO_STORES.find((entry) => entry.code === storeCode) ?? DEMO_STORES[0];
  return {
    storeId: storeId(store),
    storeCode: store.code,
    storeName: store.name,
    platformId: platformIdOf(platform),
    platformName: platform,
    label: `${platform}-${store.name}`,
  };
});
