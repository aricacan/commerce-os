'use client';

import { useState, type ReactNode } from 'react';
import { Bell, Car, Copy, FileSearch, FileUp, FolderTree, GitCompareArrows, Globe, LayoutGrid, Link2, ListTree, Package, ShoppingBag, Store, Tag, Users } from 'lucide-react';
import { ModuleWorkspace, type WorkspaceTab } from '../shared/ModuleWorkspace';
import { ContentQualityTab } from './ContentQualityTab';
import { CustomersTab } from './CustomersTab';
import { DiscountsTab } from './DiscountsTab';
import { MarketsTab } from './MarketsTab';
import { FitmentTab } from './FitmentTab';
import { ErpMatchTab } from './ErpMatchTab';
import { ImportTab } from './ImportTab';
import { EventsTab } from './EventsTab';
import { CollectionsTab } from './CollectionsTab';
import { MenusTab } from './MenusTab';
import { OrdersTab } from './OrdersTab';
import { OverviewTab } from './OverviewTab';
import { readShopifyOrderLink } from './orderLink';
import { PaymentLinksTab } from './PaymentLinksTab';
import { ProductsTab } from './ProductsTab';
import { explorerErrorText } from './explorerRules';
import { StoreCopyTab } from './StoreCopyTab';
import { StoreScopeBar } from './StoreScopeBar';
import { StoresTab } from './StoresTab';
import { readConnectResult } from './storeRules';
import { useShopifyStores } from './useShopifyStores';

interface Props {
  onClose: () => void;
}

const GENERAL = 'Genel';
const SALES = 'Satış';
const CATALOG = 'Katalog';
const INSIGHTS = 'Takip ve araçlar';
const SETTINGS = 'Ayarlar';

// Sekme anahtarları adrese yazılır (/shopify/orders). Gezgin sekmeleri canlı Shopify verisini okur.
const TABS = [
  { key: 'overview', label: 'Genel Bakış', Icon: LayoutGrid, group: GENERAL },
  { key: 'orders', label: 'Siparişler', Icon: ShoppingBag, group: SALES },
  { key: 'customers', label: 'Müşteriler', Icon: Users, group: SALES },
  { key: 'paymentLinks', label: 'Ödeme linkleri', Icon: Link2, group: SALES },
  { key: 'discounts', label: 'İndirimler', Icon: Tag, group: SALES },
  { key: 'products', label: 'Ürünler', Icon: Package, group: CATALOG },
  { key: 'collections', label: 'Koleksiyonlar', Icon: FolderTree, group: CATALOG },
  { key: 'menus', label: 'Menüler', Icon: ListTree, group: CATALOG },
  { key: 'import', label: 'Toplu içe aktarma', Icon: FileUp, group: CATALOG },
  { key: 'content', label: 'İçerik kalitesi', Icon: FileSearch, group: CATALOG },
  { key: 'fitment', label: 'Araç uyumluluğu', Icon: Car, group: CATALOG },
  { key: 'storeCopy', label: 'Mağaza kopyala', Icon: Copy, group: CATALOG },
  { key: 'markets', label: 'Pazarlar', Icon: Globe, group: INSIGHTS },
  { key: 'erpMatch', label: 'ERP eşleştirme', Icon: GitCompareArrows, group: INSIGHTS },
  { key: 'events', label: 'Olaylar', Icon: Bell, group: INSIGHTS },
  { key: 'stores', label: 'Mağazalar', Icon: Store, group: SETTINGS },
] as const satisfies readonly WorkspaceTab[];

type TabKey = (typeof TABS)[number]['key'];

// "Shopify'a bağlan" dönüşü (?connected / ?connectError) sonucu Mağazalar sekmesi gösterir; yoksa Genel Bakış.
// Sipariş bağlantısı (?store=&order=, Omnichannel müşteri panelinden) Siparişler sekmesiyle ve o mağazayla açar.
function initialTab(): TabKey {
  const params = new URLSearchParams(window.location.search);
  if (readConnectResult(params)) return 'stores';
  return readShopifyOrderLink(params) ? 'orders' : 'overview';
}

function initialStoreId(): number | null {
  return readShopifyOrderLink(new URLSearchParams(window.location.search))?.storeId ?? null;
}

// Shopify Hub: ülke başına Shopify mağazası. Ayrı modül — kendi ekranları Omnichannel'den bağımsız çalışır.
export function ShopifyHubWorkspace({ onClose }: Props) {
  const [tab, setTab] = useState<TabKey>(initialTab);
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(initialStoreId);
  // Olay akışından "Siparişi aç" ile gelinen sipariş: Siparişler sekmesi detayı açık başlar.
  const [focusOrderId, setFocusOrderId] = useState<number | null>(null);
  const storesQuery = useShopifyStores();

  const stores = storesQuery.data ?? [];
  // Seçili mağaza yoksa (ya da silindiyse) ilk mağaza.
  const storeId = stores.find((s) => s.id === selectedStoreId)?.id ?? stores[0]?.id ?? null;

  const changeTab = (key: string) => {
    setFocusOrderId(null);
    setTab(key as TabKey);
  };
  const openOrder = (orderId: number) => {
    setFocusOrderId(orderId);
    setTab('orders');
  };

  return (
    <ModuleWorkspace title="Shopify Hub" tabs={TABS} activeTab={tab} onTabChange={changeTab} onClose={onClose}>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4">
        {tab === 'stores' ? <StoresTab /> : (
          <StoreDataTab
            tab={tab} storeId={storeId} focusOrderId={focusOrderId} onOpenOrder={openOrder} loading={storesQuery.isLoading} error={storesQuery.error}
            onOpenStores={() => setTab('stores')}
            scopeBar={<StoreScopeBar stores={stores} storeId={storeId} onChange={setSelectedStoreId} />}
          />
        )}
      </div>
    </ModuleWorkspace>
  );
}

interface StoreDataProps {
  tab: Exclude<TabKey, 'stores'>;
  storeId: number | null;
  focusOrderId: number | null;
  onOpenOrder: (orderId: number) => void;
  loading: boolean;
  error: unknown;
  scopeBar: ReactNode;
  onOpenStores: () => void;
}

// Gezgin sekmeleri mağaza ister: mağaza seçilene kadar (ya da hiç yoksa) açıklayıcı durum gösterilir.
function StoreDataTab({ tab, storeId, focusOrderId, onOpenOrder, loading, error, scopeBar, onOpenStores }: StoreDataProps) {
  if (loading) return <p className="m-0 text-ui-xs text-fg-muted">Mağazalar yükleniyor…</p>;
  if (error) return <p role="alert" className="m-0 text-ui-xs text-danger">Mağazalar yüklenemedi: {explorerErrorText(error)}</p>;
  if (storeId === null) {
    return <p className="m-0 text-ui-xs text-fg-muted">Henüz bağlı mağaza yok. Mağazalar sekmesinden &quot;Shopify&apos;a bağlan&quot; ile ekleyin.</p>;
  }

  // key: mağaza değişince sekmenin tüm iç durumu (süzgeç, sayfa, açık sipariş) sıfırlanır.
  return (
    <>
      {scopeBar}
      {tab === 'overview' && <OverviewTab key={storeId} storeId={storeId} />}
      {tab === 'orders' && <OrdersTab key={storeId} storeId={storeId} initialOrderId={focusOrderId} />}
      {tab === 'products' && <ProductsTab key={storeId} storeId={storeId} />}
      {tab === 'customers' && <CustomersTab key={storeId} storeId={storeId} />}
      {tab === 'discounts' && <DiscountsTab key={storeId} storeId={storeId} />}
      {tab === 'markets' && <MarketsTab key={storeId} storeId={storeId} />}
      {tab === 'fitment' && <FitmentTab key={storeId} storeId={storeId} />}
      {tab === 'content' && <ContentQualityTab key={storeId} storeId={storeId} />}
      {tab === 'events' && <EventsTab key={storeId} storeId={storeId} onOpenOrder={onOpenOrder} />}
      {tab === 'collections' && <CollectionsTab key={storeId} storeId={storeId} />}
      {tab === 'menus' && <MenusTab key={storeId} storeId={storeId} />}
      {tab === 'paymentLinks' && <PaymentLinksTab key={storeId} storeId={storeId} />}
      {tab === 'erpMatch' && <ErpMatchTab key={storeId} storeId={storeId} onOpenStores={onOpenStores} />}
      {tab === 'storeCopy' && <StoreCopyTab key={storeId} storeId={storeId} />}
      {tab === 'import' && <ImportTab key={storeId} storeId={storeId} />}
    </>
  );
}
