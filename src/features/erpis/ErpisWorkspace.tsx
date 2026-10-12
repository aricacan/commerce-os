'use client';

import { useEffect, useState } from 'react';
import { LayoutDashboard, ClipboardList, CalendarRange, Package, Sparkles, Hash, BookMarked, FolderTree, FileSpreadsheet, Building2, Columns3, Presentation, Split, Radio, Database, Settings2, BarChart3 } from 'lucide-react';
import { useInitialTab } from '../../hooks/useInitialTab';
import { ModuleWorkspace, type WorkspaceSection, type WorkspaceTab } from '../shared/ModuleWorkspace';
import { OverviewTab } from './OverviewTab';
import { OrdersTab } from './OrdersTab';
import { OrderAnalysisTab } from './OrderAnalysisTab';
import { PlanningTab } from './PlanningTab';
import { NewItemsTab } from './NewItemsTab';
import { MixedOrdersTab } from './MixedOrdersTab';
import { SkuRoutesTab } from './SkuRoutesTab';
import { ItemsTab } from './ItemsTab';
import { SegmentsTab } from './SegmentsTab';
import { DictionariesTab } from './DictionariesTab';
import { CategoriesTab } from './CategoriesTab';
import { UploadsTab } from './UploadsTab';
import { CompaniesTab } from './CompaniesTab';
import { MappingsTab } from './MappingsTab';
import { SqlSourcesTab } from './SqlSourcesTab';
import { PresentationShell } from './PresentationShell';
import { useErpisCompanies } from '@/hooks/erpis/useErpis';
import { useErpisFilterOptions } from '@/hooks/erpis/useErpisQuery';
import { ErpisQueryFilterBar } from './ErpisQueryFilterBar';
import { useErpisFilterState } from './useErpisFilterState';
import { FilterSelect } from '../../components/ui/FilterSelect';
import { ExportButton } from './ExportButton';
import { parseId, trLower } from './erpisFilterUtils';
import { OutdatedParseBanner } from './ReparseButton';

interface Props {
  onClose: () => void;
}

// Sol panel AÇILIR BÖLÜMLERE ayrılmış — ana uygulamanın sol paneliyle aynı desen
// (Siparişler ▸ …). On dört sekmelik düz liste "hangisi neydi" sorusunu her açılışta
// yeniden soruyordu; bölümler kapalıyken panelde yalnız beş satır kalıyor.
//
// Bölüm sırası GÜNLÜK KULLANIMA göre: Genel Bakış → sipariş → ürün → veri girişi →
// kurulumda bir kez dokunulan sistem ekranları.
//
// "Analiz" ayrı sekme DEĞİL: içeriği Genel Bakış'ın altına indi (bkz. OverviewTab).
const ORDERS_SECTION: WorkspaceSection = { key: 'orders', label: 'Sipariş', Icon: ClipboardList };
const ITEMS_SECTION: WorkspaceSection = { key: 'items', label: 'Ürün', Icon: Package };
const DATA_SECTION: WorkspaceSection = { key: 'data', label: 'Veri', Icon: Database };
const SYSTEM_SECTION: WorkspaceSection = { key: 'system', label: 'Sistem', Icon: Settings2 };

const TABS = [
  { key: 'overview',  label: 'Genel Bakış', Icon: LayoutDashboard },

  { key: 'orders',    label: 'Siparişler',  Icon: ClipboardList, section: ORDERS_SECTION },
  // Kalemleri iki şirkete dağılan siparişler — kim faturalayacak kararı insana ait.
  { key: 'mixed',     label: 'Karma Siparişler', Icon: Split, section: ORDERS_SECTION },
  // Açık siparişlerin karşılanma planı — sipariş verisinden türüyor, bu yüzden burada.
  { key: 'planning',  label: 'Planlama',    Icon: CalendarRange, section: ORDERS_SECTION },
  // En çok satanlar + yurt içi/dışı ayrımı — sipariş verisinden türüyor (bkz.
  // OrderAnalysisTab). Faz 1, docs/superpowers/specs/2026-09-15-siparis-analiz-design.md.
  { key: 'order-analysis', label: 'Sipariş Analiz', Icon: BarChart3, section: ORDERS_SECTION },

  // "Stok Kartları" değil ÜRÜNLER: kullanıcı bunlara ürün diyor. "Kart" Erpis'in kendi
  // iç terimi ve arayüzde kimseye bir şey anlatmıyor.
  { key: 'items',     label: 'Ürünler',     Icon: Package, section: ITEMS_SECTION },
  { key: 'new-items', label: 'Yeni Ürünler', Icon: Sparkles, section: ITEMS_SECTION },

  // Veri girişinin iki yolu yan yana: elle Excel ve SQL'den otomatik çekim.
  { key: 'uploads',   label: 'Yükle',       Icon: FileSpreadsheet, section: DATA_SECTION },
  { key: 'sql-sources', label: 'Canlı Veri', Icon: Radio, section: DATA_SECTION },

  // Kurulumda bir kez, sonra ayda bir dokunulan ekranlar.
  { key: 'companies', label: 'Firmalar',    Icon: Building2, section: SYSTEM_SECTION },
  { key: 'dictionaries', label: 'Ayrıştırma Sözlüğü', Icon: BookMarked, section: SYSTEM_SECTION },
  // Tek kural sayfası: kartın hangi FİRMAYA ait olduğu ve filtrede hangi ADLA
  // göründüğü. İkisi de aynı kartın aynı iki özelliğinden (kod kalıbı, kart tipi)
  // türüyor; ayrı ekranlara bölmek aynı tabloyu iki kez göstermek olurdu.
  { key: 'routes',    label: 'Firma Kuralları', Icon: Split, section: SYSTEM_SECTION },
  { key: 'categories', label: 'ERP Grupları', Icon: FolderTree, section: SYSTEM_SECTION },
  { key: 'segments',  label: 'Stok Kodu Şeması', Icon: Hash, section: SYSTEM_SECTION },
  { key: 'mappings',  label: 'Excel Kolon Eşlemesi', Icon: Columns3, section: SYSTEM_SECTION },
] as const satisfies readonly WorkspaceTab[];

type TabKey = (typeof TABS)[number]['key'];

// Filtre çubuğunun anlamlı olduğu sekmeler. Sözlükler/Firmalar/Eşlemeler sipariş
// verisiyle çalışmıyor; oralarda çubuk yalnız yer kaplardı.
const FILTERED_TABS: readonly TabKey[] = ['overview', 'orders', 'planning', 'items', 'mixed', 'order-analysis'];

// Dışa aktarım düğmesi FİLTRENİN YANINDA ve SEKMEYE ÖZGÜ.
//
// Eskiden her sekme kendi içinde, tablonun üstünde bir düğme çiziyordu: sayfa aşağı
// kayıyor ve düğme filtre çubuğundan uzakta duruyordu — oysa indirilen şey tam olarak o
// çubuğun tarif ettiği küme. Artık tek yerde, ama içerik sekmeye göre değişiyor:
// siparişlerde sipariş kalemleri, stok kartlarında kartlar, planlamada planlama listesi.
const EXPORT_TARGETS: Partial<Record<TabKey, 'orderLines' | 'items' | 'planning'>> = {
  overview: 'orderLines',
  orders: 'orderLines',
  planning: 'planning',
  items: 'items',
};

export function ErpisWorkspace({ onClose }: Props) {
  const initialTab = useInitialTab(TABS.map((t) => t.key), 'overview');
  const [tab, setTab] = useState<TabKey>(initialTab);
  const [presenting, setPresenting] = useState(false);
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [companyTouched, setCompanyTouched] = useState(false);

  const companies = useErpisCompanies();

  // Varsayılan firma: Kullanıcının localStorage'da belirlediği varsayılan firma,
  // yoksa adı 'levha' içeren firma (DEMO Levha), yoksa ilk aktif firma.
  useEffect(() => {
    if (companyTouched || companyId !== null) return;
    if (!companies.data || companies.data.length === 0) return;

    const savedDefault = typeof window !== 'undefined' ? localStorage.getItem('erpis_default_company_id') : null;
    if (savedDefault) {
      const found = companies.data.find((c) => String(c.id) === savedDefault && c.isActive);
      if (found) {
        setCompanyId(found.id);
        return;
      }
    }

    const levhaCompany = companies.data.find((c) => c.isActive && trLower(c.name).includes('levha'));
    if (levhaCompany) {
      setCompanyId(levhaCompany.id);
      return;
    }

    const first = companies.data.find((c) => c.isActive);
    if (first) setCompanyId(first.id);
  }, [companies.data, companyId, companyTouched]);

  // Filtre TEK YERDE kuruluyor ve URL'de yaşıyor; sekmeler aynı durumu okuyor
  // (bkz. useErpisFilterState). Her sekme kendi çubuğunu çizerken aynı filtre üç
  // kez render ediliyor ve ekranın üçte birini yiyordu.
  const { filter, setFilter, reset, activeCount } = useErpisFilterState(companyId);
  const filterOptions = useErpisFilterOptions(filter);
  const showFilters = FILTERED_TABS.includes(tab);

  const companyName = companies.data?.find((c) => c.id === companyId)?.name ?? 'Tüm firmalar';

  // Sunum modu kabuğu DEĞİŞTİRMEZ, yerine geçer: ModuleWorkspace 14 modülün ortak kabuğu,
  // sunuma özel boyut/kroma kuralları oraya sızmamalı.
  if (presenting) {
    return (
      <PresentationShell
        filter={filter}
        onFilterChange={setFilter}
        onFilterReset={reset}
        activeFilterCount={activeCount}
        filterOptions={filterOptions.data}
        onCompanyChange={(next) => {
          setCompanyTouched(true);
          setCompanyId(next);
        }}
        companyName={companyName}
        datasetName="Sipariş kalemleri"
        onExit={() => setPresenting(false)}
      />
    );
  }

  return (
    <ModuleWorkspace
      title="Erpis"
      tabs={TABS}
      activeTab={tab}
      onTabChange={(k) => setTab(k as TabKey)}
      onClose={onClose}
      sidebarFooter={(sidebarOpen) => (
        <div className="flex flex-col gap-2">
          {sidebarOpen && (
            <FilterSelect
              value={companyId ? String(companyId) : ''}
              options={(companies.data ?? [])
                .filter((c) => c.isActive)
                .map((c) => ({ value: String(c.id), label: c.name, sublabel: c.code }))}
              placeholder="Tüm firmalar"
              onChange={(v) => {
                setCompanyTouched(true);
                setCompanyId(parseId(v));
              }}
              minWidth="100%"
              // Seçici sol panelin DİBİNDE; aşağı açılan liste ekran dışında kalıyordu.
              dropUp
            />
          )}
          <button
          type="button"
          onClick={() => setPresenting(true)}
          title="Sunum moduna geç"
          className="flex w-full items-center gap-2 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-[12px] font-bold text-[var(--fg)] shadow-xs"
        >
            <Presentation size={14} strokeWidth={1.8} />
            {sidebarOpen && 'Sunum Modu'}
          </button>
        </div>
      )}
    >
      <OutdatedParseBanner />

      {showFilters && (
        <div data-tour="erpis-filter-bar" className="border-b border-[var(--border-soft)] bg-[var(--bg-subtle)]/40 px-2.5 py-1.5 sm:px-4 sm:py-2.5">
          <ErpisQueryFilterBar
            filter={filter}
            options={filterOptions.data}
            activeCount={activeCount}
            onChange={setFilter}
            onReset={reset}
            exportButton={
              EXPORT_TARGETS[tab] ? (
                <ExportButton filter={filter} target={EXPORT_TARGETS[tab]!} />
              ) : undefined
            }
          />
        </div>
      )}

      <div className="flex min-h-0 w-full flex-1 flex-col">
        {tab === 'overview' && <OverviewTab companyId={companyId} />}
        {tab === 'orders' && <OrdersTab companyId={companyId} />}
        {tab === 'order-analysis' && <OrderAnalysisTab companyId={companyId} />}
        {tab === 'planning' && <PlanningTab companyId={companyId} />}
        {tab === 'items' && <ItemsTab companyId={companyId} />}
        {tab === 'mixed' && <MixedOrdersTab companyId={companyId} />}
        {tab === 'routes' && <SkuRoutesTab />}
        {tab === 'new-items' && <NewItemsTab companyId={companyId} />}
        {tab === 'segments' && <SegmentsTab />}
        {tab === 'dictionaries' && <DictionariesTab />}
        {tab === 'categories' && <CategoriesTab />}
        {tab === 'uploads' && <UploadsTab onOpenLiveData={() => setTab('sql-sources')} />}
        {tab === 'companies' && <CompaniesTab />}
        {tab === 'mappings' && <MappingsTab />}
        {tab === 'sql-sources' && <SqlSourcesTab />}
      </div>
    </ModuleWorkspace>
  );
}
