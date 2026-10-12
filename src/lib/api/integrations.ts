import { request } from './core';

// Keşif, birden fazla gerçek ERP/pazaryeri API ucunu tarayan bir işlem — global
// REQUEST_TIMEOUT_MS'ten (25sn) daha uzun bir paya ihtiyacı var.
const DISCOVER_TIMEOUT_MS = 90_000;

export interface MarketplaceIntegration {
  platformId: number;
  platformName: string;
  apiKey: string;
  environment: string;
  secretValues: Record<string, string>;
  isActive: boolean;
  // Kayıtlı kimlik bilgileri çözülemediyse dolu — boş apiKey/secretValues "kayıt yok"
  // değil "kayıt okunamıyor" demektir; kullanıcı alanları yeniden girmelidir.
  // Opsiyonel: eski backend alanı göndermeyebilir — o durumda uyarı gösterilmez.
  credentialError?: string | null;
  // Gerçek senkron telemetrisi (bkz. IIntegrationTelemetryService) — hiç senkron
  // çalışmadıysa hepsi null.
  lastSyncAt: string | null;
  syncStatus: string | null;
  lastError: string | null;
  // Okuma anında hesaplanan sayaçlar (bkz. IIntegrationStatsService).
  productCount: number;
  orderCount: number;
}

export type IntegrationKind = 0 | 1;
export type IntegrationConnectionStatus = 0 | 1 | 2 | 3;

// Bir veri grubunun veritabanına alınıp alınmayacağı — bkz. backend MarketplaceIngestionPolicy.
// Diğer enum'lar gibi (bkz. IntegrationConnectionStatus) sayısal olarak gelir: ViewOnly=0, Ingest=1,
// IncrementalOnly=2. Varsayılan ViewOnly: gezginde görünür ama hiçbir şey yazılmaz. IncrementalOnly
// yalnızca sipariş grubunda geçerlidir (bkz. backend MarketplaceIngestionCatalog.SupportsIncrementalOnly) —
// saatlerce sürebilen tam geçmiş taraması kapanır, dakikalık "yeni sipariş" turu devam eder.
export type MarketplaceIngestionPolicy = 0 | 1 | 2;
export const INGESTION_POLICY = { ViewOnly: 0, Ingest: 1, IncrementalOnly: 2 } as const;

// Bir (Platform, Mağaza) çifti için çözülmüş komisyon/KDV/hizmet bedeli — bkz. backend
// PlatformRateInfo. Manual=elle girilmiş PlatformStoreSetting'den, Ingested=gerçek ingest
// edilmiş pazaryeri finans verisinden (daha güvenilir) gelir. Diğer enum'lar gibi sayısal.
export type PlatformRateSource = 0 | 1;
export const PLATFORM_RATE_SOURCE = { Manual: 0, Ingested: 1 } as const;

export interface PlatformRateInfo {
  platformId: number;
  storeId: number;
  commissionRate: number;
  vatRate: number;
  serviceFee: number;
  source: PlatformRateSource;
  effectiveAsOfDate: string | null;
}

export interface IntegrationResource {
  id: number;
  type: 0 | 1 | 2 | 3 | 4;
  externalId: string;
  name: string;
  isActive: boolean;
  metadata: Record<string, string>;
  ingestionPolicy: MarketplaceIngestionPolicy;
  policyUpdatedAt: string | null;
  children: IntegrationResource[];
  // Yalnızca type === 1 (MarketplaceAccount) için doldurulur — bkz. backend
  // IntegrationResourceDto.Rate.
  rate: PlatformRateInfo | null;
  // Aynı kanalın ayrıca DOĞRUDAN pazaryeri bağlantısı olarak da tanımlı olduğunu gösterir
  // (ör. Sentos-StoreA ERP'si Trendyol getiriyor + elle eklenmiş "Trendyol-StoreA" bağlantısı).
  // İkisi aynı gerçek kanaldır; panel çakıştırmak yerine bağlayıp uyarır. Çakışma yoksa null.
  linkedMarketplaceConnectionId: number | null;
  linkedMarketplaceConnectionName: string | null;
  // "Sadece yeni kayıtlar" (IncrementalOnly) bu kaynakta anlamlı mı — bkz. backend
  // MarketplaceIngestionCatalog.SupportsIncrementalOnly. Backend hesaplar ki frontend
  // hangi grupların bu modu desteklediğini kendi ExternalId string eşleşmesiyle tahmin
  // etmesin (tek karar kaynağı backend'de kalsın).
  supportsIncrementalOnly: boolean;
  // Bu kaynak Aktif edilebilir mi (arkasında gerçek yazma kodu var mı)? Her kaynak Pasif
  // başladığı için panel "onay bekleyen" grupları, hiç aktif edilemeyecek olanlardan bununla
  // ayırır — tek kaynağı backend'deki MarketplaceIngestionCatalog.
  isIngestable: boolean;
}

export interface IntegrationConnection {
  id: number;
  kind: IntegrationKind;
  providerKey: string;
  providerName: string;
  alias: string;
  displayName: string;
  // Kararlı "{pazaryeri}-{mağaza}" kodu (ör. "trendyol-storeb") — bkz. backend
  // MarketplaceSourceCodeCatalog. Alias'ın aksine kullanıcı değiştiremez, planlanan ERP↔pazaryeri
  // eşleştirme adımı için sabit bir anahtar. Yalnızca kind === 1 (Marketplace) için doludur.
  code: string | null;
  status: IntegrationConnectionStatus;
  lastError: string | null;
  lastTestedAt: string | null;
  lastDiscoveredAt: string | null;
  isActive: boolean;
  resources: IntegrationResource[];
  // Gerçek senkron telemetrisi (bkz. IIntegrationTelemetryService) — bağlı DataSource/Platform
  // hiç senkron çalıştırmadıysa null. lastTestedAt/lastDiscoveredAt bağlantı testinin/keşfinin
  // zamanıdır, bu ise asıl veri senkronunun zamanıdır.
  syncedAt: string | null;
  syncStatus: string | null;
  // Okuma anında hesaplanan sayaçlar (bkz. IIntegrationStatsService).
  productCount: number;
  orderCount: number;
  // Yalnızca kind === 1 (Marketplace, doğrudan pazaryeri bağlantısı) için doldurulur —
  // bkz. backend IntegrationConnectionDto.Rate. ERP bağlantılarında her zaman null; onların
  // oranı alt MarketplaceAccount kaynaklarının rate alanında görünür.
  rate: PlatformRateInfo | null;
  // Bu bağlantının GERÇEKTEN senkronladığı veri gruplarının insan-okunur etiketleri —
  // bkz. backend IntegrationHubService.ComputeActiveResourceLabels. Keşif hiç çalışmadıysa
  // (resources boş) boş dizi döner — sahte bir yer tutucu üretilmez. En fazla 4 etiket taşır;
  // gerçek toplam totalResourceCount'ta, fazlası varsa UI "+N daha" gösterebilir.
  activeResourceLabels: string[];
  totalResourceCount: number;
}

// Ana sayfa düzeyinde tüm bağlantılar genelinde toplu özet — bkz. backend
// IIntegrationHubService.GetSummaryAsync / IntegrationHubSummaryDto.
export interface IntegrationHubSummary {
  totalConnections: number;
  activeConnections: number;
  totalProductCount: number;
  totalOrderCount: number;
  lastSyncedAt: string | null;
  connectionsWithErrors: number;
}

// Bağlantı detay grafiklerini besleyen gün-bazlı senkron geçmişi noktası —
// bkz. backend IIntegrationSyncHistoryService / IntegrationSyncHistoryPoint.
export interface IntegrationSyncHistoryPoint {
  date: string;
  successCount: number;
  errorCount: number;
  productCount: number | null;
  orderCount: number | null;
}

// "Bu ERP kanalı ile şu pazaryeri bağlantısı aynı gerçek mağaza mı?" manuel onay/red akışı —
// bkz. backend StoreSourceLink entity yorumu. Hiçbir eşleşme kullanıcı onayı olmadan kalıcı
// sayılmaz.
export interface StoreSourceLinkCandidate {
  erpConnectionId: number;
  erpConnectionName: string;
  erpChannelName: string;
  marketplaceConnectionId: number;
  marketplaceConnectionName: string;
  marketplaceCode: string | null;
  platformName: string;
  storeName: string;
}

export const StoreSourceLinkStatus = { Confirmed: 0, Rejected: 1 } as const;
export type StoreSourceLinkStatus = (typeof StoreSourceLinkStatus)[keyof typeof StoreSourceLinkStatus];

export interface StoreSourceLink {
  id: number;
  erpConnectionId: number;
  erpConnectionName: string;
  marketplaceConnectionId: number;
  marketplaceConnectionName: string;
  marketplaceCode: string | null;
  status: StoreSourceLinkStatus;
  decidedAt: string;
  decidedByUserId: number | null;
}

export const storeSourceLinksApi = {
  candidates: () => request<StoreSourceLinkCandidate[]>('/integration-connections/store-source-links/candidates'),
  decided: () => request<StoreSourceLink[]>('/integration-connections/store-source-links'),
  confirm: (erpConnectionId: number, marketplaceConnectionId: number) =>
    request<StoreSourceLink>('/integration-connections/store-source-links/confirm', {
      method: 'POST',
      body: JSON.stringify({ erpConnectionId, marketplaceConnectionId }),
    }),
  reject: (erpConnectionId: number, marketplaceConnectionId: number) =>
    request<StoreSourceLink>('/integration-connections/store-source-links/reject', {
      method: 'POST',
      body: JSON.stringify({ erpConnectionId, marketplaceConnectionId }),
    }),
  removeDecision: (linkId: number) =>
    request<void>(`/integration-connections/store-source-links/${linkId}`, { method: 'DELETE' }),
};

export const integrationConnectionsApi = {
  list: (kind?: IntegrationKind) =>
    request<IntegrationConnection[]>(`/integration-connections${kind === undefined ? '' : `?kind=${kind}`}`),
  // Bağlantı özeti. kind verilirse YALNIZCA o türü kapsar — ERP sayfasının KPI şeridi
  // pazaryeri bağlantılarını saymasın (ve tam tersi) diye; aksi halde şerit altındaki
  // listeyle çelişir.
  summary: (kind?: IntegrationKind) =>
    request<IntegrationHubSummary>(`/integration-connections/summary${kind === undefined ? '' : `?kind=${kind}`}`),
  // storeId: bağlantının ait olduğu MEVCUT mağaza. Pazaryeri için zorunludur (backend 400
  // döner) — Trendyol/Hepsiburada yeni bir marka değil, var olan mağazanın satış kanalıdır.
  // ERP'de verilmezse backend yeni bir mağaza oluşturur (yeni ERP hesabı = yeni marka).
  create: (body: {
    kind: IntegrationKind;
    providerKey: string;
    alias: string;
    storeId?: number;
    configValues: Record<string, string>;
  }) =>
    request<IntegrationConnection>('/integration-connections', { method: 'POST', body: JSON.stringify(body) }),
  test: (connectionId: number) =>
    request<{ success: boolean; message: string }>(`/integration-connections/${connectionId}/test`, { method: 'POST' }),
  // Bağlantıyı ve yalnızca ona ait yapılandırmayı (keşfedilen kaynaklar, kimlik bilgileri)
  // siler. Sipariş/ürün kayıtlarına dokunmaz — onlar mağazaya aittir ve geçmiş veri olarak
  // kalır. Bağlantıyla birlikte doğmuş boş mağaza da temizlenir.
  remove: (connectionId: number) =>
    request<void>(`/integration-connections/${connectionId}`, { method: 'DELETE' }),
  // Keşif tek bir hızlı çağrı değil — ERP/pazaryeri türüne göre birden fazla gerçek API ucunu
  // (ürün/kategori/sipariş/iade, Trendyol'da 12 uca kadar) tarıyor. Backend'de paralel çalışsa
  // da bazı ERP'ler yavaş yanıt verebiliyor — global 25sn istek zaman aşımı burada çok kısa
  // kalıyordu ("İstek zaman aşımına uğradı" hatası). Sadece bu çağrı için daha uzun bir pay.
  discover: (connectionId: number) =>
    request<IntegrationConnection>(
      `/integration-connections/${connectionId}/discover`,
      { method: 'POST' },
      true,
      DISCOVER_TIMEOUT_MS,
    ),
  // Pasif yapıldığında bağlı DataSource/PlatformApiCredential de pasife düşer — bkz. backend
  // IIntegrationHubService.SetActiveAsync. Sync job'lar pasif bağlantıya artık dokunmaz.
  setActive: (connectionId: number, isActive: boolean) =>
    request<IntegrationConnection>(`/integration-connections/${connectionId}/active`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    }),
  // Bağlantı detay sayfasındaki senkron aktivitesi/ürün/sipariş grafiklerini besler.
  history: (connectionId: number, days = 30) =>
    request<IntegrationSyncHistoryPoint[]>(`/integration-connections/${connectionId}/history?days=${days}`),
  // Bir veri grubunun "sadece görüntüle" / "veritabanına al" kararını değiştirir. Arkasında
  // alım uygulaması olmayan bir grup için backend 400 döner (bkz. MarketplaceIngestionCatalog) —
  // katalog bilinçli olarak frontend'e kopyalanmaz, gerçek hata describeError() ile gösterilir.
  // Backend güncellenen KAYNAĞI döner (IntegrationConnectionsController.SetIngestionPolicy).
  setResourcePolicy: (connectionId: number, resourceId: number, policy: MarketplaceIngestionPolicy) =>
    request<IntegrationResource>(`/integration-connections/${connectionId}/resources/${resourceId}/policy`, {
      method: 'PATCH',
      body: JSON.stringify({ policy }),
    }),
};

// ─── Mağazalar (müşteri/marka — StoreA/StoreB gibi) ───────────────────────────
// Panelden yeni bir müşteri/marka eklenebilsin diye (deploy'suz) — bkz. plan notu:
// bu SADECE Store satırını yönetir; ERP bağlantısı ayrıca erpIntegrationApi'den eklenir.
// Topbar'daki ambient ERP seçici HENÜZ bu yeni mağazaları otomatik tanımaz (bilinçli sınır).
export const storeApi = {
  list: () => request<import('../../types/api').StoreInfo[]>('/store'),
  create: (body: { code: string; name: string; displayColor?: string; timeZoneId?: string }) =>
    request<import('../../types/api').StoreInfo>('/store', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: number, body: { name: string; displayColor?: string; isActive: boolean; timeZoneId?: string }) =>
    request<import('../../types/api').StoreInfo>(`/store/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
};

// ─── Integrations ─────────────────────────────────────────────────────────────
export const integrationsApi = {
  list: () => request<MarketplaceIntegration[]>('/integrations'),
  listWithSignal: (signal: AbortSignal) => request<MarketplaceIntegration[]>('/integrations', { signal }),
  save: (body: { platformId: number; apiKey: string; environment: string; secretValues: Record<string, string> }) =>
    request<MarketplaceIntegration>('/integrations', { method: 'POST', body: JSON.stringify(body) }),
  // Topbar'daki MP (doğrudan pazaryeri entegrasyonu) seçenekleri — gerçek API anahtarı
  // kayıtlı her (Store, Platform) çifti için "Amazon-StoreA" tarzı bir seçenek döner.
  mpOptions: () =>
    request<{ storeId: number; storeCode: string; storeName: string; platformId: number; platformName: string; label: string }[]>(
      '/integrations/mp-options',
    ),
};

// ─── ERP Entegrasyonları (dinamik Sentos/Base/... bağlantıları) ───────────────
export const erpIntegrationApi = {
  connectorTypes: () => request<import('../../types/api').ErpConnectorTypeInfo[]>('/erpintegrations/connector-types'),
  list: () => request<import('../../types/api').ErpStoreIntegrations[]>('/erpintegrations'),
  save: (body: { storeId: number; connectorType: number; code: string; configValues: Record<string, string> }) =>
    request<{ message: string; dataSourceId: number }>('/erpintegrations', { method: 'POST', body: JSON.stringify(body) }),
  test: (dataSourceId: number) =>
    request<{ success: boolean; message: string }>(`/erpintegrations/${dataSourceId}/test`, { method: 'POST' }),
};

// ─── Base Kanal/Mağaza Eşleştirme (eBay hesapları vb. → StoreA/StoreB) ────────
export interface BaseChannelMappingRow {
  orderSource: string;
  orderSourceId: number;
  accountName: string | null;
  liveOrderCount: number;
  isMapped: boolean;
  mapping: { id: number; storeId: number; storeCode: string; storeName: string } | null;
}
export const baseChannelMappingApi = {
  overview: () =>
    request<{ channels: BaseChannelMappingRow[]; unmappedCount: number }>('/base-channel-mappings'),
  create: (body: { orderSource: string; orderSourceId: number; storeId: number }) =>
    request<{ id: number }>('/base-channel-mappings', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: number, storeId: number) =>
    request<{ id: number }>(`/base-channel-mappings/${id}`, { method: 'PUT', body: JSON.stringify({ storeId }) }),
  remove: (id: number) => request<void>(`/base-channel-mappings/${id}`, { method: 'DELETE' }),
};
