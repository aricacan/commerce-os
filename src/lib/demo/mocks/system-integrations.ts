// Mağazalar, ERP kaynakları ve entegrasyon merkezi (salt görüntü).
import type {
  BaseChannelMappingRow,
  IntegrationHubSummary,
  IntegrationSyncHistoryPoint,
  StoreSourceLink,
  StoreSourceLinkCandidate,
} from '../../api/integrations';
import {
  DEMO_ERP_CONNECTOR_TYPES,
  DEMO_ERP_STORE_INTEGRATIONS,
  DEMO_INTEGRATION_CONNECTIONS,
  DEMO_MARKETPLACE_INTEGRATIONS,
  DEMO_MP_OPTIONS,
  DEMO_STORE_INFOS,
} from '../data/system-integrations';
import { DemoHttpResponse, get, type DemoRoute } from '../router';
import { ago, createRng, lastDays } from '../seed';

const NOT_FOUND_STATUS = 404;
const DEFAULT_HISTORY_DAYS = 30;
const MAX_DAILY_SUCCESS = 96;

const kindFilter = (query: URLSearchParams) => {
  const raw = query.get('kind');
  return raw === null ? null : Number(raw);
};

function summarize(kind: number | null): IntegrationHubSummary {
  const connections = DEMO_INTEGRATION_CONNECTIONS.filter((entry) => kind === null || entry.kind === kind);
  return {
    totalConnections: connections.length,
    activeConnections: connections.filter((entry) => entry.isActive).length,
    totalProductCount: connections.reduce((sum, entry) => sum + entry.productCount, 0),
    totalOrderCount: connections.reduce((sum, entry) => sum + entry.orderCount, 0),
    lastSyncedAt: ago(0, 0, 4),
    connectionsWithErrors: connections.filter((entry) => entry.lastError !== null).length,
  };
}

function buildHistory(connectionId: number, days: number): IntegrationSyncHistoryPoint[] {
  const connection = DEMO_INTEGRATION_CONNECTIONS.find((entry) => entry.id === connectionId);
  const rng = createRng(connectionId * 7919);
  return lastDays(days, (date, index) => ({
    date,
    successCount: rng.int(MAX_DAILY_SUCCESS / 2, MAX_DAILY_SUCCESS),
    errorCount: rng.chance(0.08) ? rng.int(1, 3) : 0,
    productCount: (connection?.productCount ?? 0) - (days - index) * rng.int(0, 3),
    orderCount: (connection?.orderCount ?? 0) - (days - index) * rng.int(8, 30),
  }));
}

const BASE_CHANNEL_SEEDS: Array<[string, number, string]> = [
  ['ebay', 101, 'Demo eBay Hesabı'],
  ['amazon', 102, 'Demo Amazon UK'],
  ['website', 103, 'Demo Web Sitesi (UK)'],
];

const BASE_CHANNELS: BaseChannelMappingRow[] = BASE_CHANNEL_SEEDS.map(([orderSource, orderSourceId, accountName], index) => ({
  orderSource,
  orderSourceId,
  accountName,
  liveOrderCount: 420 - index * 130,
  isMapped: true,
  mapping: { id: index + 1, storeId: 3, storeCode: 'store-c', storeName: 'Store C (UK)' },
}));

const LINK_CANDIDATES: StoreSourceLinkCandidate[] = [
  {
    erpConnectionId: 2,
    erpConnectionName: 'Sentos ERP · Mağaza B',
    erpChannelName: 'Hepsiburada · Mağaza B',
    marketplaceConnectionId: 6,
    marketplaceConnectionName: 'Trendyol · Mağaza B',
    marketplaceCode: 'trendyol-store-b',
    platformName: 'Trendyol',
    storeName: 'Mağaza B',
  },
];

const DECIDED_LINKS: StoreSourceLink[] = [];

export const systemIntegrationRoutes: DemoRoute[] = [
  get('/store', () => DEMO_STORE_INFOS),

  get('/erpintegrations/connector-types', () => DEMO_ERP_CONNECTOR_TYPES),
  get('/erpintegrations', () => DEMO_ERP_STORE_INTEGRATIONS),

  get('/integrations/mp-options', () => DEMO_MP_OPTIONS),
  get('/integrations', () => DEMO_MARKETPLACE_INTEGRATIONS),

  get('/base-channel-mappings', () => ({ channels: BASE_CHANNELS, unmappedCount: 0 })),

  get('/integration-connections/summary', (req) => summarize(kindFilter(req.query))),
  get('/integration-connections/store-source-links/candidates', () => LINK_CANDIDATES),
  get('/integration-connections/store-source-links', () => DECIDED_LINKS),
  get('/integration-connections/:id/history', (req) =>
    buildHistory(Number(req.params.id), Number(req.query.get('days') ?? DEFAULT_HISTORY_DAYS)),
  ),
  get('/integration-connections/:id', (req) =>
    DEMO_INTEGRATION_CONNECTIONS.find((entry) => entry.id === Number(req.params.id))
      ?? new DemoHttpResponse(NOT_FOUND_STATUS, { title: 'Bağlantı bulunamadı.' }),
  ),
  get('/integration-connections', (req) => {
    const kind = kindFilter(req.query);
    return DEMO_INTEGRATION_CONNECTIONS.filter((entry) => kind === null || entry.kind === kind);
  }),
];
