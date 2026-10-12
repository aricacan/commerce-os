'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  ShoppingCart, Search, MapPin, ChevronDown, ChevronUp,
  ChevronLeft, ChevronRight, Clock, Eye, CreditCard, Truck, User, X, SlidersHorizontal, StickyNote, Plus, Trash2,
} from 'lucide-react';
import { ExportMenu, type ExportRow } from '../../../components/ui/ExportMenu';
import { SkeletonList } from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorState } from '../../../components/ui/ErrorState';
import { PullToRefresh } from '../../../components/ui/PullToRefresh';
import { useUrlState } from '../../../hooks/useUrlState';
import { ListViewBar } from '@/features/listviews/ListViewBar';
import type { ExportColumn } from '../../../lib/export';
import { OrderRegionTag } from '../../../components/orders/OrderRegionTag';
import { OrderProfitCell } from '../../../components/orders/OrderProfitCell';
import { OrderFeeBreakdown } from '../../../components/orders/OrderFeeBreakdown';
import { OrderNoteEditor } from '../../../components/orders/OrderNoteEditor';
import { MobileOrderDetailSheet } from '../../../components/orders/MobileOrderDetailSheet';
import { FullScreenPanel } from '../../../components/ui/FullScreenPanel';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { useUnsavedChangesGuard } from '../../../hooks/useUnsavedChangesGuard';
import { ManualOrderWorkspace } from '../../../features/manual-orders/ManualOrderWorkspace';
import { BulkShipButton } from '../../../components/orders/BulkShipButton';
import { useMobile } from '../../../hooks/useMobile';
import { formatDateTime } from '../../../lib/format';
import { CustomCheckbox } from '../../../components/ui/CustomCheckbox';
import { FilterSelect } from '../../../components/ui/FilterSelect';
import { toast } from '../../../lib/toast';
import { DateRangePicker } from '../../../components/ui/DateRangePicker';
import { resolveDatePreset, type DatePreset } from '../../../utils/date';
import { useRegisterPageShortcuts } from '../../../hooks/useRegisterPageShortcuts';
import { describeError } from '../../../lib/errors';
import { useAuthStore } from '../../../stores/auth';

import type { OrderDetail } from '../../../types/api';

// Export sütun şeması — tip bilgisi (para/tarih/sayı) burada; lib/export.ts bunu gerçek .xlsx
// hücre biçimine çevirir. Para birimi AYRIMI kritik: TotalAmount her zaman TL saklanır (Base/UK
// siparişleri ingest'te TL'ye çevrilir), gerçek GBP ise originalTotal'da durur. Bu yüzden hem
// "Tutar (TL)" hem "Tutar (GBP)" sütunu var — GBP yalnızca Base kaynaklı siparişlerde dolu.
const ORDER_EXPORT_COLUMNS: ExportColumn[] = [
  { key: 'Marka', header: 'Marka', type: 'text' },
  { key: 'Sipariş No', header: 'Sipariş No', type: 'text' },
  { key: 'Platform', header: 'Platform', type: 'text' },
  { key: 'Durum', header: 'Durum', type: 'text' },
  { key: 'Tarih', header: 'Tarih', type: 'date' },
  { key: 'Müşteri', header: 'Müşteri', type: 'text' },
  { key: 'Şehir', header: 'Şehir', type: 'text' },
  { key: 'İlçe', header: 'İlçe', type: 'text' },
  { key: 'Para Birimi', header: 'Para Birimi', type: 'text' },
  // noConvert: bu sütunun zaten YETKİLİ GBP kardeşi var (originalTotal) — para birimi modunda
  // kurdan ikinci bir GBP sütunu türetilmesin.
  { key: 'Sipariş Tutarı (TL)', header: 'Sipariş Tutarı (TL)', type: 'money', currency: 'TRY', noConvert: true },
  { key: 'Sipariş Tutarı (GBP)', header: 'Sipariş Tutarı (GBP)', type: 'money', currency: 'GBP' },
  { key: 'Ürün', header: 'Ürün', type: 'text' },
  { key: 'SKU', header: 'SKU', type: 'text' },
  { key: 'Adet', header: 'Adet', type: 'int' },
  { key: 'Liste Fiyatı (TL)', header: 'Liste Fiyatı (TL)', type: 'money', currency: 'TRY' },
  { key: 'Satış Fiyatı (TL)', header: 'Satış Fiyatı (TL)', type: 'money', currency: 'TRY' },
  { key: 'Alış Fiyatı (TL)', header: 'Alış Fiyatı (TL)', type: 'money', currency: 'TRY' },
  { key: 'Kutu Maliyeti (TL)', header: 'Kutu Maliyeti (TL)', type: 'money', currency: 'TRY' },
  { key: 'Kargo (TL)', header: 'Kargo (TL)', type: 'money', currency: 'TRY' },
  { key: 'Komisyon (TL)', header: 'Komisyon (TL)', type: 'money', currency: 'TRY' },
  { key: 'Hizmet Bedeli (TL)', header: 'Hizmet Bedeli (TL)', type: 'money', currency: 'TRY' },
  { key: 'KDV (TL)', header: 'KDV (TL)', type: 'money', currency: 'TRY' },
  { key: 'Net Kâr (TL)', header: 'Net Kâr (TL)', type: 'money', currency: 'TRY' },
  { key: 'Not', header: 'Not', type: 'text' },
];

// Base/UK siparişi için GBP toplamı. Güvenilir kaynak originalTotal (ham GBP, bozulmamış);
// yoksa güncel kurdan (toGbp) tahmin edilir. Base olmayan siparişte boş bırakılır.
function orderGbpTotal(
  o: OrderDetail,
  isBase: boolean,
  toGbp: (tryAmount: number) => number | null,
): number | '' {
  if (!isBase) return '';
  if (o.originalCurrency === 'GBP' && o.originalTotal != null) return o.originalTotal;
  const g = toGbp(o.totalAmount);
  return g != null ? Math.round(g * 100) / 100 : '';
}

// Sipariş kalemi başına bir satır — sipariş bağlamı (marka/platform/tarih/müşteri/tutar) her
// satırda tekrarlanır. Kalemi olmayan (nadir) siparişler için tek boş-ürün satırı düşülür ki
// sipariş hiç kaybolmasın. Kalem-içi fiyatlar TL'dir (raporlama para birimi); GBP yalnızca
// sipariş toplamında gösterilir (kalem bazında ham GBP geçmişi güvenilir değil).
function ordersToExportRows(
  orders: OrderDetail[],
  isBaseSourceType: (s?: string | null) => boolean,
  toGbp: (tryAmount: number) => number | null,
): ExportRow[] {
  return orders.flatMap((o): ExportRow[] => {
    const isBase = isBaseSourceType(o.sourceType);
    const orderContext = {
      'Marka': o.storeName,
      'Sipariş No': formatOrderNumber(o.platformOrderNumber, o.orderCode),
      'Platform': o.platformName,
      'Durum': orderStatusLabel(o.universalStatus),
      'Tarih': o.orderDate,
      'Müşteri': o.customerName ?? '',
      'Şehir': o.shipCity ?? '',
      'İlçe': o.addressDistrict ?? '',
      'Para Birimi': isBase ? (o.originalCurrency ?? 'GBP') : 'TRY',
      'Sipariş Tutarı (TL)': o.totalAmount,
      'Sipariş Tutarı (GBP)': orderGbpTotal(o, isBase, toGbp),
      'Not': o.note ?? '',
    };

    if (o.items.length === 0) {
      return [{
        ...orderContext,
        'Ürün': '', 'SKU': '', 'Adet': '',
        'Liste Fiyatı (TL)': '', 'Satış Fiyatı (TL)': '', 'Alış Fiyatı (TL)': '',
        'Kutu Maliyeti (TL)': '', 'Kargo (TL)': '', 'Komisyon (TL)': '',
        'Hizmet Bedeli (TL)': '', 'KDV (TL)': '', 'Net Kâr (TL)': '',
      }];
    }

    return o.items.map(item => ({
      ...orderContext,
      'Ürün': item.productName,
      'SKU': item.supplierSku,
      'Adet': item.quantity,
      'Liste Fiyatı (TL)': item.listPrice,
      'Satış Fiyatı (TL)': item.unitPrice,
      'Alış Fiyatı (TL)': item.buyingPrice ?? '',
      'Kutu Maliyeti (TL)': item.boxCost ?? '',
      'Kargo (TL)': item.shippingCost,
      'Komisyon (TL)': item.commissionAmount,
      'Hizmet Bedeli (TL)': item.serviceFeeAmount,
      'KDV (TL)': item.vatAmount,
      'Net Kâr (TL)': item.hasCostData ? item.netProfit : '',
    }));
  });
}
import { orderApi, categoryApi } from '../../../lib/api';
import { useI18n } from '../../../lib/i18n';
import { useBaseCurrency } from '../../../hooks/useBaseCurrency';
import { formatOrderNumber, formatOrderNumberWithHash } from '../../../utils/orderNumber';
import { ORDER_STATUS_DELIVERED, ORDER_STATUS_SHIPPED, orderStatusLabel } from '../../../utils/orderStatusLabel';
// Varsayılana eşit değerler adrese yazılmaz, böylece paylaşılan link temiz kalır.
// custFrom/custTo yalnızca range='custom' iken anlamlıdır (bkz. DateRangePicker — P36).

function fmtCurrency(n: number, symbol: string) {
  return symbol + n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(dateStr: string, lang: string) {
  return formatDateTime(dateStr, lang === 'tr' ? 'tr' : 'en', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function getStatusStyles(status: string) {
  const n = status.toLowerCase();
  if (n.includes('yeni') || n.includes('new'))       return { bg: 'rgba(59,130,246,0.06)',  fg: '#93c5fd', border: 'rgba(59,130,246,0.12)' };
  if (n.includes('onay') || n.includes('hazır') || n.includes('tamam') || n.includes('approv') || n.includes('ready'))
                                                       return { bg: 'rgba(16,185,129,0.06)', fg: '#6ee7b7', border: 'rgba(16,185,129,0.12)' };
  if (n.includes('kargo') || n.includes('shipped'))  return { bg: 'rgba(139,92,246,0.06)', fg: '#c4b5fd', border: 'rgba(139,92,246,0.12)' };
  if (n.includes('teslim') || n.includes('deliver')) return { bg: 'rgba(20,184,166,0.06)', fg: '#5eead4', border: 'rgba(20,184,166,0.12)' };
  if (n.includes('iptal') || n.includes('red') || n.includes('cancel')) return { bg: 'rgba(244,63,94,0.06)', fg: '#fda4af', border: 'rgba(244,63,94,0.12)' };
  if (n.includes('iade') || n.includes('return'))    return { bg: 'rgba(251,146,60,0.06)', fg: '#fdba74', border: 'rgba(251,146,60,0.12)' };
  return { bg: 'var(--bg-subtle)', fg: 'var(--fg-muted)', border: 'var(--border-soft)' };
}

const COMPACT_TABLE_BREAKPOINT = 1180;

const ORDER_FILTER_DEFAULTS = { page: 1, range: 'all', q: '', cat: '', status: '', custFrom: '', custTo: '', sort: 'date_desc', campaignUploadId: '' };

export default function OrdersPage() {
  const { t, lang } = useI18n();
  const isMobile = useMobile();
  // Dar masaüstünde (ör. yan panel açıkken) mağaza ve not kolonları gizlenir; mağaza adı
  // sipariş satırının alt bilgisine taşınır — kolonlar birbirine girmesin.
  const isCompact = useMobile(COMPACT_TABLE_BREAKPOINT);
  const { toGbp, isBaseSourceType } = useBaseCurrency();
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.roles?.some((role) => role === 'Admin' || role === 'SuperAdmin') ?? false;

  useRegisterPageShortcuts([
    { keys: ['Tab'], label: 'Filtreler arasında gez' },
    { keys: ['Space'], label: 'Sipariş seç / kaldır' },
  ]);

  // Base (BaseLinker) ERP'sinden gelen siparişlerde TRY'nin yanında GBP karşılığı da
  // gösterilir — satır bazlı, sipariş.storeName'e göre DEĞİL (o artık marka — StoreA/
  // StoreB — anlamına geliyor), sipariş.sourceType'a göre (bkz. useBaseCurrency).
  function fmt(n: number, sourceType?: string | null) {
    const tryStr = fmtCurrency(n, '₺');
    if (!isBaseSourceType(sourceType)) return tryStr;
    const gbp = toGbp(n);
    // Base kaynaklı satırlarda £ baskın, ₺ parantezde arka planda kalır (dashboard'daki
    // aynı kuralla tutarlı — bkz. KpiBar/StaticWidgets fmtCurrency).
    return gbp != null ? `${fmtCurrency(gbp, '£')} (${tryStr})` : tryStr;
  }

  // Filtreler URL'de tutuluyor: geri tuşu çalışır, link paylaşılabilir, yenileyince kaybolmaz.
  const { state: urlState, setState: setUrlState, reset: resetFilters } = useUrlState(ORDER_FILTER_DEFAULTS);
  const page = urlState.page;
  const dateRange = urlState.range as DatePreset;
  const debouncedSearch = urlState.q;
  const categoryId = urlState.cat ? Number(urlState.cat) : undefined;
  const status = urlState.status || undefined;
  const sortBy = urlState.sort;

  // Preset (today/week/...) veya özel aralık farketmeksizin somut {from,to} tarihine çevir —
  // dashboard-filters.ts'in kullandığı AYNI mantık (utils/date.ts), takvim hizası tutarlı kalır.
  const resolvedRange = dateRange !== 'all'
    ? resolveDatePreset(dateRange, urlState.custFrom, urlState.custTo)
    : null;

  // Arama kutusunun kendisi yerel: her tuşta URL yazmak adres çubuğunu titretir ve
  // geçmişi kirletir. URL'e yalnızca debounce sonrası yazılıyor (aşağıdaki effect).
  const [searchInput, setSearchInput] = useState(urlState.q);
  const [expandedOrders, setExpandedOrders] = useState<Record<number, boolean>>({});
  const [selectedOrderIds, setSelectedOrderIds] = useState<number[]>([]);
  // "Tüm sayfaları seç" modu: açıksa sayfa değişse bile seçili kalır ve
  // toplu işlem mevcut filtrelere göre TÜM siparişlere uygulanır.
  const [selectAllMode, setSelectAllMode] = useState(false);
  // Canlı senkron: arka plan refetch'i sonucu totalCount artarsa kullanıcıya "N yeni sipariş"
  // çipi gösterilir; tıklayınca kaybolur ve referans güncellenir.
  const [prevTotalCount, setPrevTotalCount] = useState<number | null>(null);
  const [newOrdersBanner, setNewOrdersBanner] = useState<string | null>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  // Manuel siparis paneli — URL degistirmeden listenin ustunde acilir.
  const [manualOrderOpen, setManualOrderOpen] = useState(false);
  const [mobileDetailOrderId, setMobileDetailOrderId] = useState<number | null>(null);
  const [mobileFilterDraft, setMobileFilterDraft] = useState({
    range: dateRange,
    customFrom: urlState.custFrom,
    customTo: urlState.custTo,
    category: urlState.cat,
    status: urlState.status,
  });

  function openMobileFilters() {
    setMobileFilterDraft({
      range: dateRange,
      customFrom: urlState.custFrom,
      customTo: urlState.custTo,
      category: urlState.cat,
      status: urlState.status,
    });
    setMobileFiltersOpen(true);
  }

  function applyMobileFilters() {
    setUrlState({
      range: mobileFilterDraft.range,
      custFrom: mobileFilterDraft.customFrom,
      custTo: mobileFilterDraft.customTo,
      cat: mobileFilterDraft.category,
      status: mobileFilterDraft.status,
      page: 1,
    });
    setMobileFiltersOpen(false);
  }

  function clearMobileFilterDraft() {
    setMobileFilterDraft({ range: 'all', customFrom: '', customTo: '', category: '', status: '' });
  }

  const setPage = (p: number) => {
    if (!selectAllMode) setSelectedOrderIds([]);
    setUrlState({ page: p });
  };

  // Boş sonuç ekranındaki çıkış yolu: kullanıcı hangi filtrenin elediğini aramasın,
  // tek tıkla hepsi sıfırlansın.
  function clearFilters() {
    setSearchInput('');
    setSelectedOrderIds([]);
    resetFilters();
  }

  const [visibleCols, setVisibleCols] = useState<string[]>(() => {
    if (typeof window === 'undefined') return ['store', 'order', 'city', 'amount', 'profit', 'status', 'note'];
    try {
      const saved = localStorage.getItem('orders_visible_cols');
      if (!saved) return ['store', 'order', 'city', 'amount', 'profit', 'status', 'note'];
      const cols: string[] = JSON.parse(saved);
      // Kâr kolonu sonradan eklendi: kaydedilmiş seçimi olan kullanıcıya BİR KEZ eklenir,
      // sonra kapatırsa tercihi korunur.
      if (!cols.includes('profit') && !localStorage.getItem('orders_profit_col_added')) {
        localStorage.setItem('orders_profit_col_added', '1');
        const amountIndex = cols.indexOf('amount');
        cols.splice(amountIndex === -1 ? cols.length : amountIndex + 1, 0, 'profit');
        localStorage.setItem('orders_visible_cols', JSON.stringify(cols));
      }
      return cols;
    } catch {
      return ['store', 'order', 'city', 'amount', 'profit', 'status', 'note'];
    }
  });
  const [colMenuOpen, setColMenuOpen] = useState(false);

  const toggleCol = (key: string) => {
    setVisibleCols(prev => {
      const next = prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key];
      try { localStorage.setItem('orders_visible_cols', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  // Kayitli gorunum kolon tasiyorsa uygulanir. localStorage'a da yazilir ki gorunum
  // uygulandiktan sonra sayfa yenilense bile ayni kolonlar kalsin.
  const applyVisibleCols = (next: string[]) => {
    setVisibleCols(next);
    try { localStorage.setItem('orders_visible_cols', JSON.stringify(next)); } catch {}
  };

  const shownCols = isCompact ? visibleCols.filter((c) => c !== 'store' && c !== 'note') : visibleCols;

  // Sipariş kolonu sınırlı genişlikte: eskiden 1fr tüm boşluğu yutuyor, şehir ve sonrası
  // sağa itilip birbirine giriyordu. Esneyen kolon artık şehir.
  const gridTemplate = [
    '28px',
    shownCols.includes('store') ? '84px' : '',
    shownCols.includes('order') ? 'minmax(150px, 220px)' : '',
    shownCols.includes('city') ? 'minmax(130px, 1fr)' : '',
    shownCols.includes('amount') ? 'minmax(110px, 150px)' : '',
    shownCols.includes('profit') ? '100px' : '',
    shownCols.includes('status') ? '112px' : '',
    shownCols.includes('note') ? '44px' : '',
    '20px'
  ].filter(Boolean).join(' ');

  // Tutar iki satır: Base siparişinde £ önde, ₺ altında küçük.
  function amountParts(n: number, sourceType?: string | null): { primary: string; secondary: string | null } {
    const tryStr = fmtCurrency(n, '₺');
    const gbp = isBaseSourceType(sourceType) ? toGbp(n) : null;
    return gbp != null ? { primary: fmtCurrency(gbp, '£'), secondary: tryStr } : { primary: tryStr, secondary: null };
  }

  // 3 durumlu döngü: 1. tık azalan → 2. tık artan → 3. tık default (date_desc).
  // Böylece bir kolona basınca sonsuza kadar takılı kalmaz, üçüncü tıkta sıfırlanır.
  const handleSortToggle = (field: string) => {
    const prefix = field === 'date' ? 'date' : 'total';
    const desc = `${prefix}_desc`;
    const asc = `${prefix}_asc`;
    const DEFAULT_SORT = 'date_desc';
    let nextSort: string;
    if (!sortBy.startsWith(prefix)) nextSort = desc;      // ilk tık
    else if (sortBy === desc) nextSort = asc;             // ikinci tık
    else nextSort = DEFAULT_SORT;                         // üçüncü tık → default
    setUrlState({ sort: nextSort, page: 1 });
  };

  const renderSortableHeader = (label: string, field: string) => {
    const isSorted = field === 'date' ? sortBy.startsWith('date') : sortBy.startsWith('total');
    const isAsc = sortBy.endsWith('_asc');
    return (
      <div
        onClick={() => handleSortToggle(field)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          cursor: 'pointer',
          userSelect: 'none',
          color: isSorted ? 'var(--accent)' : 'var(--fg-muted)',
          fontWeight: 700,
        }}
      >
        <span>{label}</span>
        {isSorted ? (
          <span style={{ fontSize: 10, color: 'var(--accent)' }}>
            {isAsc ? '▲' : '▼'}
          </span>
        ) : (
          <span style={{ fontSize: 10, color: 'var(--fg-muted)', opacity: 0.3 }}>
            ▲
          </span>
        )}
      </div>
    );
  };

  const STATUS_OPTIONS = [
    { value: 'Yeni', label: t('orders_status_new') },
    { value: 'Onay Bekliyor', label: lang === 'tr' ? 'Onay Bekliyor' : 'Awaiting Approval' },
    { value: 'Onaylandı', label: t('orders_status_approved') },
    { value: 'Tedarik Sürecinde', label: lang === 'tr' ? 'Tedarik Sürecinde' : 'Sourcing' },
    { value: 'Hazırlanıyor', label: lang === 'tr' ? 'Hazırlanıyor' : 'Preparing' },
    { value: ORDER_STATUS_SHIPPED, label: t('orders_status_shipped') },
    { value: ORDER_STATUS_DELIVERED, label: t('orders_status_delivered') },
    { value: 'İptal', label: t('orders_status_cancelled') },
    { value: 'missing_cost', label: lang === 'tr' ? 'Maliyeti Eksik Siparişler' : 'Orders Missing Cost' },
  ];
  const activeDateLabel = dateRange === 'custom' && urlState.custFrom && urlState.custTo
    ? `${urlState.custFrom} – ${urlState.custTo}`
    : ({
        today: t('filter_today'),
        yesterday: t('filter_yesterday'),
        week: t('filter_week'),
        month: t('filter_month'),
        lastMonth: t('filter_last_month'),
        '30days': t('filter_30days'),
        year: t('filter_year'),
        '3month': t('filter_3month'),
        '6month': t('filter_6month'),
        '9month': t('filter_9month'),
        '365days': t('filter_365days'),
        all: t('filter_all'),
        custom: t('filter_custom'),
      } satisfies Record<DatePreset, string>)[dateRange];

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryApi.master(),
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    const handler = setTimeout(() => {
      setUrlState({ q: searchInput, page: 1 });
    }, 450);
    return () => clearTimeout(handler);
    // setUrlState artik REFERANS OLARAK SABIT (bkz. useUrlState): bagimliliga konmasi
    // debounce sayacini sifirlamaz. Eskiden konamiyordu cunku her URL degisiminde yeniden
    // uretiliyordu; listeden cikarilinca da BAYAT searchParams'i tasiyordu.
  }, [searchInput, setUrlState]);

  const ordersQueryKey = ['orders', resolvedRange?.from, resolvedRange?.to, debouncedSearch, categoryId, status === 'missing_cost' ? undefined : status, page, sortBy, urlState.campaignUploadId] as const;

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ordersQueryKey,
    queryFn: () => orderApi.list({
      from: resolvedRange?.from || undefined,
      to: resolvedRange?.to || undefined,
      search: debouncedSearch || undefined,
      categoryId,
      status: status === 'missing_cost' ? undefined : status,
      page, pageSize: 15,
      sortBy: sortBy || undefined,
      campaignUploadId: urlState.campaignUploadId ? Number(urlState.campaignUploadId) : undefined,
    }),
    staleTime: 15_000,
    // Canlı senkron: sayfa arka planda 60s'de bir tazelenir. Yeni siparişler geldiğinde
    // totalCount artar ve kullanıcı hiçbir şeye tıklamadan "N yeni sipariş" çipi görür.
    refetchInterval: 60_000,
  });

  // Manuel siparis paneli kapanisi: form kirliyse once onay sorulur, yazilan veri
  // yanlislikla kaybolmaz. Kaydettikten sonra alttaki siparis listesi tazelenir.
  const closeManualOrder = useCallback(() => setManualOrderOpen(false), []);
  const manualOrderGuard = useUnsavedChangesGuard(closeManualOrder);
  const handleManualOrderSaved = useCallback(() => { void refetch(); }, [refetch]);

  const [accumulatedOrders, setAccumulatedOrders] = useState<OrderDetail[]>([]);

  useEffect(() => {
    if (!data) return;
    if (page === 1) {
      setAccumulatedOrders(data.items ?? []);
    } else {
      setAccumulatedOrders((prev) => {
        const existingIds = new Set(prev.map(o => o.orderId));
        const newItems = (data.items ?? []).filter(o => !existingIds.has(o.orderId));
        return [...prev, ...newItems];
      });
    }
  }, [data, page]);

  const rawOrders = isMobile ? accumulatedOrders : (data?.items ?? []);
  const orders = status === 'missing_cost'
    ? rawOrders.filter(o => o.items.some(i => !i.hasCostData || i.buyingPrice == null))
    : rawOrders;
  const mobileDetailOrder = mobileDetailOrderId === null
    ? null
    : rawOrders.find((order) => order.orderId === mobileDetailOrderId) ?? null;
  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.ceil(totalCount / 15) || 1;

  // Canlı senkron detektörü: ilk yüklemede sadece referans kaydet; sonraki refetch'lerde
  // totalCount yükselirse banner göster. Kullanıcı filtre değiştirdiğinde (queryKey değişir)
  // referans sıfırlanır ki yanlış pozitif çıkmasın.
  useEffect(() => {
    // KRİTİK: veri gelmeden referans alma. Yükleme sırasında totalCount=0 olur; ilk
    // gerçek veri (9199) geldiğinde 0→9199 farkı "9199 yeni sipariş" sanılıyordu.
    // Referansı yalnızca veri yüklendikten SONRA sabitle.
    if (isLoading || !data) return;
    if (prevTotalCount === null) { setPrevTotalCount(totalCount); return; }
    if (totalCount > prevTotalCount) {
      const diff = totalCount - prevTotalCount;
      setNewOrdersBanner(diff === 1 ? '1 yeni sipariş' : `${diff} yeni sipariş`);
      setPrevTotalCount(totalCount);
    } else if (totalCount < prevTotalCount) {
      setPrevTotalCount(totalCount);
    }
  }, [totalCount, prevTotalCount, isLoading, data]);

  const toggleExpand = (id: number) => {
    setExpandedOrders(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleSelectOrder = (id: number) => {
    setSelectAllMode(false);
    setSelectedOrderIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectAllMode) {
      setSelectAllMode(false);
      setSelectedOrderIds([]);
    } else if (selectedOrderIds.length === orders.length && orders.length > 0) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(orders.map(o => o.orderId));
    }
  };

  // "Tümü (X sipariş)" seçimi: filtrelere uyan TÜM siparişleri hedefler
  const toggleSelectAllPages = () => {
    if (selectAllMode) {
      setSelectAllMode(false);
      setSelectedOrderIds([]);
    } else {
      setSelectAllMode(true);
      setSelectedOrderIds([]); // ID listesine gerek yok — toplam sayıyı kullanacağız
    }
  };

  // ⚠️ SipariŞ durumu (`UniversalStatus`) ERP senkronundan gelir (Sentos/Base → pazaryeri) ve
  // manuel değiştirilemez: burada değiştirilse bile pazaryerindeki gerçek durum değişmez ve
  // bir sonraki senkronda üzerine yazılır. Bu yüzden gerçek bir "durum güncelle" API'si YOK.
  // Bunun yerine gerçekten var olan not alanına (orderApi.updateNote) toplu yazıyoruz —
  // operasyon ekibinin "bunlar kargoya verildi" gibi kendi takibi için kullandığı, dürüst
  // ve backend'de gerçekten karşılığı olan bir işlem. Sahte "başarılı" mesajı vermek yerine
  // gerçekten kaç tanesinin gittiğini/başarısız olduğunu bildiriyoruz.
  const bulkNoteMutation = useMutation({
    meta: { silentError: true } as const,
    mutationFn: async ({ ids, note }: { ids: number[]; note: string }) => {
      // 500'den az ise tek bulk isteği, fazlaysa chunk'la
      const CHUNK = 500;
      const chunks: number[][] = [];
      for (let i = 0; i < ids.length; i += CHUNK) chunks.push(ids.slice(i, i + CHUNK));
      let updated = 0;
      let failed = 0;
      for (const chunk of chunks) {
        try {
          const res = await orderApi.bulkUpdateNote(chunk, note);
          updated += res.updated;
          failed += (res.total - res.updated);
        } catch {
          failed += chunk.length;
        }
      }
      return { total: ids.length, updated, failed };
    },
    onSuccess: ({ total, updated, failed }) => {
      setSelectedOrderIds([]);
      setSelectAllMode(false);
      refetch();
      if (failed === 0) toast.success(`${updated} siparişe not eklendi.`);
      else toast.warning(`${updated}/${total} siparişe not eklendi, ${failed} tanesi başarısız oldu.`);
    },
    onError: (error) => toast.error(describeError(error)),
  });

  const cancelManualOrderMutation = useMutation({
    mutationFn: ({ orderId, reason }: { orderId: number; reason: string }) => orderApi.cancelManual(orderId, reason),
    onSuccess: () => {
      toast.success('Manuel sipariş silindi; kâr ve sipariş toplamlarından çıkarıldı.');
      refetch();
    },
    onError: (error) => toast.error(describeError(error)),
  });

  function cancelManualOrder(orderId: number) {
    const reason = window.prompt('Silme nedenini yazın:')?.trim();
    if (!reason || !window.confirm('Bu manuel sipariş kalıcı olarak silinecek ve finansal hesaplardan çıkarılacak. Devam edilsin mi?')) return;
    cancelManualOrderMutation.mutate({ orderId, reason });
  }

  const handleBulkNote = (note: string) => {
    if (selectAllMode) {
      // Tüm sayfalar seçiliyken: tüm sipariş ID'lerini çek, sonra toplu not ata
      fetchAllIdsAndBulkNote(note);
      return;
    }
    if (selectedOrderIds.length === 0) return;
    bulkNoteMutation.mutate({ ids: selectedOrderIds, note });
  };

  // "Tüm sayfaları seç" modunda: önce mevcut filtrelere göre TÜM sipariş ID'lerini çeker,
  // sonra toplu not atar. Arka planda çalışır, buton loading gösterir.
  const [isBulkFetching, setIsBulkFetching] = useState(false);
  async function fetchAllIdsAndBulkNote(note: string) {
    setIsBulkFetching(true);
    try {
      const allOrders = await orderApi.listAll({
        from: resolvedRange?.from || undefined,
        to: resolvedRange?.to || undefined,
        search: debouncedSearch || undefined,
        categoryId, status: status === 'missing_cost' ? undefined : status,
        campaignUploadId: urlState.campaignUploadId ? Number(urlState.campaignUploadId) : undefined,
      });
      const filtered = status === 'missing_cost'
        ? allOrders.filter(o => o.items.some(i => !i.hasCostData || i.buyingPrice == null))
        : allOrders;
      const ids = filtered.map(o => o.orderId);
      setIsBulkFetching(false);
      bulkNoteMutation.mutate({ ids, note });
    } catch {
      setIsBulkFetching(false);
      toast.error('Siparişler çekilirken hata oluştu.');
    }
  }

  const start = (page - 1) * 15 + 1;
  const end   = Math.min(page * 15, totalCount);
  const paginationText = lang === 'tr'
    ? `Toplam ${totalCount} siparişten ${start}–${end} arası gösteriliyor`
    : `Showing ${start}–${end} of ${totalCount} orders`;

  const allSelected = orders.length > 0 && selectedOrderIds.length === orders.length;
  const isBulkPending = bulkNoteMutation.isPending || isBulkFetching;

  // Seçili sayısı: selectAllMode açıksa toplam sipariş sayısı, değilse seçili ID sayısı
  const selectedCount = selectAllMode ? totalCount : selectedOrderIds.length;

  return (<>
    <FullScreenPanel open={manualOrderOpen} title="Manuel Sipariş" onClose={manualOrderGuard.requestClose}>
      <ManualOrderWorkspace
        onDirtyChange={manualOrderGuard.setDirty}
        onSaved={handleManualOrderSaved}
      />
    </FullScreenPanel>
    <ConfirmDialog
      open={manualOrderGuard.confirmOpen}
      title={lang === 'tr' ? 'Kaydedilmemiş değişiklikler' : 'Unsaved changes'}
      description={lang === 'tr'
        ? 'Bu formda kaydedilmemiş değişiklikler var. Paneli kapatırsanız bunlar kaybolur.'
        : 'This form has unsaved changes. Closing the panel will discard them.'}
      confirmLabel={lang === 'tr' ? 'Kapat ve vazgeç' : 'Discard and close'}
      cancelLabel={lang === 'tr' ? 'Düzenlemeye dön' : 'Keep editing'}
      onConfirm={manualOrderGuard.confirmDiscard}
      onCancel={manualOrderGuard.cancelDiscard}
    />
    <PullToRefresh onRefresh={refetch} className="bg-transparent">
      <style>{`
        /* Baselinker tarzı yoğun tablo — her satır kendi yuvarlak/gölgeli kutusu olan
           bir kart DEĞİL, tek sürekli tablonun bir satırı. Ayrım sadece ince alt çizgi. */
        .order-row {
          border-bottom: 1px solid var(--border-soft);
          transition: background .1s;
        }
        .order-row:last-child { border-bottom: none; }
        .order-row.is-open {
          border-bottom: 2.5px solid var(--border-strong);
        }
        .order-row-header {
          transition: background .1s;
        }
        .order-row-header:hover { background: var(--bg-subtle); }
        .order-row.selected > .order-row-header { background: var(--bg-subtle); }
        .order-row.selected > .order-row-header:hover { background: var(--card-hover); }
        /* Liste kutusuz: satırlar sayfa zemininde tam genişlikte, yalnızca ince ayraçla
           ayrılır — kart içinde kart görüntüsü kaldırıldı. */
        .orders-table-shell { border-top: 1px solid var(--border-soft); }
        .orders-table-header {
          position: sticky;
          top: 0;
          z-index: 2;
        }
        .filter-tab {
          padding: 6px 14px; font-size: 12.5px; font-weight: 600;
          border-radius: 8px; cursor: pointer; transition: all .15s;
          border: none; background: transparent; color: var(--fg-muted);
        }
        .filter-tab:hover { color: var(--fg); }
        .filter-tab.active { background: var(--accent); color: #fff; }
        .order-details-table {
          width: 100%; border-collapse: collapse; font-size: 11.5px;
          border: 1px solid var(--border-strong); background: var(--card);
        }
        .order-details-table th {
          background: var(--card); color: var(--fg); font-weight: 700;
          font-size: 11px; padding: 7px 10px; border: 1px solid var(--border);
          white-space: nowrap; letter-spacing: 0.01em;
        }
        .order-details-table td {
          padding: 6px 10px; color: var(--fg); background: var(--card);
          border: 1px solid var(--border); vertical-align: middle;
        }
        .order-details-table tbody tr:hover td {
          background: var(--card-hover);
        }
        .select-custom {
          appearance: none; background-color: var(--card); color: var(--fg);
          border: 1px solid var(--border); border-radius: var(--radius);
          padding: 8px 36px 8px 14px; font-size: 13px; font-weight: 500;
          outline: none; cursor: pointer; transition: all .2s;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239ca3af' stroke-width='2.5'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 12px center; background-size: 14px;
          box-shadow: var(--shadow-xs);
        }
        .select-custom:hover, .select-custom:focus {
          border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft);
        }
        .page-btn {
          width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
          background: var(--card); border: 1px solid var(--border); border-radius: 8px;
          cursor: pointer; color: var(--fg-muted); transition: all .15s;
        }
        .page-btn:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }
        .page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .orders-mobile-title { display: none; }
        @media (max-width: 640px) {
          .orders-toolbar {
            padding: 12px !important;
            border-bottom: none !important;
            background: transparent !important;
            gap: 10px !important;
          }
          .orders-header-block {
            padding: 10px 12px;
            border: 1px solid var(--border);
            border-radius: 14px;
            background: var(--card);
            box-shadow: var(--shadow-xs);
          }
          .orders-mobile-title {
            display: block;
            margin: 0;
            font-size: 15px;
            font-weight: 700;
            color: var(--fg);
            line-height: 1.2;
          }
          .orders-filter-panel {
            display: grid !important;
            grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
            gap: 8px !important;
            width: 100% !important;
            padding: 10px;
            border: 1px solid var(--border);
            border-radius: 14px;
            background: var(--card);
            box-shadow: var(--shadow-xs);
          }
          .orders-filter-panel .select-custom {
            width: 100% !important;
            min-width: 0;
            font-size: 12px;
            padding-left: 10px;
            padding-right: 30px;
          }
          .orders-search {
            grid-column: 1 / -1;
            width: 100% !important;
          }
          .orders-filter-panel .export-menu-root {
            justify-self: end;
          }
        }
      `}</style>

      {/* Toolbar — normal akışta (sticky/z-index YOK, sidebar'la çakışmıyordu bu yüzden
          eskiden ayrı bir sticky çubuk kaldırıldı). Seçim aktifken alt başlık satırı
          seçim özetine dönüşür, "not ekle" pill'leri hemen altında ikinci satırda çıkar. */}
      <div className="orders-toolbar" style={{
        padding: isMobile ? '12px 16px' : '14px 20px', borderBottom: '1px solid var(--border)',
        background: 'var(--card)', display: 'flex', flexDirection: 'column', gap: 10, flexShrink: 0,
      }}>
        <div style={{
          display: 'flex', flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'stretch' : 'center', justifyContent: 'space-between', gap: 12,
        }}>
        <div className="orders-header-block" data-tour="orders-header" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {!isMobile && (
              <CustomCheckbox checked={allSelected} onChange={toggleSelectAll} style={{ marginRight: 2 }} />
            )}
            <h1 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--fg)', letterSpacing: '-0.2px', whiteSpace: 'nowrap' }}>
              {lang === 'tr' ? 'Tüm Siparişler' : 'All orders'}
            </h1>
            {!isMobile && (
              <ListViewBar pageKey="orders" columns={visibleCols} onApplyColumns={applyVisibleCols} />
            )}
          </div>

          <div className="orders-filter-panel" style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'stretch' : 'center',
          gap: 10,
          width: isMobile ? '100%' : 'auto',
          flexWrap: 'wrap',
        }}>
          {/* URL degistirmeden panel acar; /orders/manual-orders rotasi deep-link olarak duruyor. */}
          <button
            type="button"
            data-tour="orders-manual"
            onClick={() => setManualOrderOpen(true)}
            className="inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-[4px] bg-slate-800 hover:bg-slate-700 text-slate-100 dark:bg-slate-700 dark:hover:bg-slate-600 px-2.5 text-xs font-semibold transition-colors shadow-xs"
          >
            <Plus size={13} /> Manuel sipariş
          </button>
          {isMobile ? (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', width: '100%' }}>
              {/* Search */}
              <div className="orders-search" data-tour="orders-search" style={{ position: 'relative', flex: 1 }}>
                <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-muted)' }} />
                <input
                  type="text"
                  placeholder={t('orders_search_placeholder')}
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  style={{
                    width: '100%', height: 32, padding: '0 12px 0 32px', borderRadius: 4, border: '1px solid var(--border-soft)', background: 'var(--card)', color: 'var(--fg)', fontSize: 12, outline: 'none',
                  }}
                />
              </div>
              <button
                onClick={openMobileFilters}
                style={{
                  height: 32, padding: '0 10px', borderRadius: 4, border: '1px solid var(--border-soft)', background: 'var(--card)', color: 'var(--fg)', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                <SlidersHorizontal size={14} />
                <span>{lang === 'tr' ? 'Filtrele' : 'Filter'}</span>
              </button>
            </div>
          ) : (
            <>
              {/* Filtre Grubu */}
              <div data-tour="orders-filters" className="inline-flex items-center gap-2">
                {/* Tarih aralığı — hazır presetler + özel aralık (P36) */}
                <DateRangePicker
                  value={dateRange}
                  onChange={(preset) => setUrlState({ range: preset, page: 1 })}
                  customFrom={urlState.custFrom}
                  customTo={urlState.custTo}
                  onCustomChange={(from, to) => setUrlState({ range: 'custom', custFrom: from, custTo: to, page: 1 })}
                  includeAll
                  className="[&>.dropdown-trigger]:!h-8 [&>.dropdown-trigger]:!text-[12px] [&>.dropdown-trigger]:!rounded-[4px] [&>.dropdown-trigger]:!px-2.5"
                />

                {/* Kategori — custom dropdown (native <option> yerine, uygulama görünümüyle tutarlı) */}
                <FilterSelect
                  value={categoryId ? String(categoryId) : ''}
                  placeholder={t('orders_all_categories')}
                  minWidth={160}
                  options={(categoriesData ?? []).map(c => ({ value: String(c.id), label: c.name }))}
                  onChange={(v) => setUrlState({ cat: v, page: 1 })}
                />

                {/* Durum — custom dropdown */}
                <FilterSelect
                  value={status || ''}
                  placeholder={t('orders_status_all')}
                  minWidth={150}
                  options={STATUS_OPTIONS}
                  onChange={(v) => setUrlState({ status: v, page: 1 })}
                />
              </div>

              {/* Search */}
              <div className="orders-search" data-tour="orders-search" style={{ position: 'relative', width: 220 }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-muted)' }} />
                <input
                  type="text"
                  placeholder={t('orders_search_placeholder')}
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  style={{
                    width: '100%', height: 32, padding: '0 12px 0 30px', borderRadius: 4, border: '1px solid var(--border-soft)', background: 'var(--card)', color: 'var(--fg)', fontSize: 12, outline: 'none',
                  }}
                />
              </div>

              <div data-tour="orders-export" className="inline-flex">
                <ExportMenu
                  filename="siparisler"
                  columns={ORDER_EXPORT_COLUMNS}
                  totalHint={totalCount}
                  className="[&>.export-menu-trigger]:!h-8 [&>.export-menu-trigger]:!rounded-[4px] [&>.export-menu-trigger]:!px-2.5 [&>.export-menu-trigger]:!text-[12px]"
                  getDataAsync={async (opts) => {
                    const rows = await orderApi.listAll({
                      from: resolvedRange?.from || undefined,
                      to: resolvedRange?.to || undefined,
                      search: debouncedSearch || undefined,
                      categoryId, status: status === 'missing_cost' ? undefined : status, limit: opts?.limit,
                      campaignUploadId: urlState.campaignUploadId ? Number(urlState.campaignUploadId) : undefined,
                    });
                    const filteredRows = status === 'missing_cost'
                      ? rows.filter(r => r.items.some(i => !i.hasCostData || i.buyingPrice == null))
                      : rows;
                    return ordersToExportRows(filteredRows, isBaseSourceType, toGbp);
                  }}
                  label={t('orders_export_label')}
                />
              </div>
            </>
          )}

          {!isMobile && (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setColMenuOpen(o => !o)}
                style={{
                  height: 32, padding: '0 10px', borderRadius: 4, border: '1px solid var(--border-soft)', background: 'var(--card)', color: 'var(--fg)', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                {lang === 'tr' ? `Kolonlar (${visibleCols.length}/7)` : `Columns (${visibleCols.length}/7)`}
              </button>
              {colMenuOpen && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={() => setColMenuOpen(false)} />
                  <div style={{
                    position: 'absolute', right: 0, top: '100%', marginTop: 4, zIndex: 20,
                    background: 'var(--card)', border: '1px solid var(--border-soft)', borderRadius: 6,
                    padding: 8, boxShadow: 'var(--shadow-md)', width: 180, display: 'flex', flexDirection: 'column', gap: 4,
                  }}>
                    {[
                      { key: 'store', label: lang === 'tr' ? 'Mağaza' : 'Store' },
                      { key: 'order', label: lang === 'tr' ? 'Sipariş & Tarih' : 'Order & Date' },
                      { key: 'city', label: lang === 'tr' ? 'Teslimat Şehri' : 'Delivery City' },
                      { key: 'amount', label: lang === 'tr' ? 'Sipariş Tutarı' : 'Order Amount' },
                      { key: 'profit', label: lang === 'tr' ? 'Net Kâr & Marj' : 'Net Profit & Margin' },
                      { key: 'status', label: lang === 'tr' ? 'Durum' : 'Status' },
                      { key: 'note', label: lang === 'tr' ? 'Sipariş Notu' : 'Order Note' },
                    ].map(col => (
                      <label key={col.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer', padding: '4px 6px', borderRadius: 4 }}>
                        <input
                          type="checkbox"
                          checked={visibleCols.includes(col.key)}
                          onChange={() => toggleCol(col.key)}
                        />
                        <span>{col.label}</span>
                      </label>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>


      {/* Seçim aktifken: hızlı not ekleme — artık ayrı sticky çubuk değil, toolbar'ın
            kendi ikinci satırı (z-index/overlap sorunu buradan geliyordu). */}
        {(selectedOrderIds.length > 0 || selectAllMode) && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
            padding: '8px 14px', borderRadius: 6, background: 'var(--card-hover)',
            border: '1px solid var(--border-strong)', flexWrap: 'wrap',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--fg)' }}>
                {selectedCount} {lang === 'tr' ? 'sipariş seçildi' : 'selected'}
              </span>
              <button
                onClick={toggleSelectAllPages}
                style={{
                  background: 'none', border: 'none', color: 'var(--fg)', fontSize: 11.5, fontWeight: 700,
                  cursor: 'pointer', padding: 0, textDecoration: 'underline',
                }}
              >
                {selectAllMode ? `✓ ${lang === 'tr' ? 'Tüm sayfalar seçili' : 'All pages'}` : `${lang === 'tr' ? 'Tümünü seç' : 'Select all'} (${totalCount})`}
              </button>
              <button
                onClick={() => { setSelectedOrderIds([]); setSelectAllMode(false); }}
                style={{ background: 'none', border: 'none', color: 'var(--fg-muted)', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3, padding: 0 }}
              >
                <X size={12} /> {lang === 'tr' ? 'Vazgeç' : 'Clear'}
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              {/* Toplu kargolama (FAZ 4). selectAllMode'da GORUNMEZ: tum sayfalari kapsayan
                  bir kargo emri, kullanicinin gormedigi siparisleri de tasiyiciya gonderirdi. */}
              {!selectAllMode && selectedOrderIds.length > 0 && (
                <BulkShipButton
                  orderIds={selectedOrderIds}
                  carrierId={1}
                  onDone={() => refetch()}
                />
              )}
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-muted)' }}>
                {isBulkPending ? (lang === 'tr' ? 'İşleniyor…' : 'Working…') : (lang === 'tr' ? 'Not Ekle:' : 'Add Note:')}
              </span>
              {[
                t('order_note_preset_preparing'),
                t('order_note_preset_shipped'),
                t('order_note_preset_contacted_customer'),
                t('order_note_preset_problem'),
              ].map((label) => (
                <button
                  key={label}
                  onClick={() => handleBulkNote(label)}
                  disabled={isBulkPending}
                  style={{
                    padding: '4px 10px', borderRadius: 4, border: '1px solid var(--border-soft)',
                    background: 'var(--card)', color: 'var(--fg)', fontSize: 11, fontWeight: 600,
                    cursor: isBulkPending ? 'not-allowed' : 'pointer',
                    opacity: isBulkPending ? 0.5 : 1,
                    transition: 'all 0.12s ease',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Active Filter Chips */}
      {(dateRange !== 'all' || status || categoryId || debouncedSearch || urlState.campaignUploadId) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', padding: isMobile ? '0 14px 10px' : '0 20px 10px' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-muted)' }}>Aktif Filtreler:</span>
          {dateRange !== 'all' && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 6, background: 'var(--card-hover)', color: 'var(--fg)', border: '1px solid var(--border-soft)', fontSize: 11, fontWeight: 600 }}>
              Tarih: {activeDateLabel}
              <button onClick={() => setUrlState({ range: 'all', custFrom: '', custTo: '', page: 1 })} aria-label="Tarih filtresini kaldır" style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--fg-muted)', padding: 0, display: 'flex' }}><X size={12} /></button>
            </span>
          )}
          {status && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 6, background: 'var(--card-hover)', color: 'var(--fg)', border: '1px solid var(--border-soft)', fontSize: 11, fontWeight: 600 }}>
              Durum: {status === 'missing_cost' ? 'Maliyeti Eksik' : status}
              <button onClick={() => setUrlState({ status: undefined, page: 1 })} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--fg-muted)', padding: 0, display: 'flex' }}><X size={12} /></button>
            </span>
          )}
          {categoryId && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 6, background: 'var(--card-hover)', color: 'var(--fg)', border: '1px solid var(--border-soft)', fontSize: 11, fontWeight: 600 }}>
              Kategori #{categoryId}
              <button onClick={() => setUrlState({ cat: '', page: 1 })} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--fg-muted)', padding: 0, display: 'flex' }}><X size={12} /></button>
            </span>
          )}
          {urlState.campaignUploadId && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 6, background: 'var(--card-hover)', color: 'var(--fg)', border: '1px solid var(--border-soft)', fontSize: 11, fontWeight: 600 }}>
              Kampanya #{urlState.campaignUploadId}
              <button onClick={() => setUrlState({ campaignUploadId: '', page: 1 })} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--fg-muted)', padding: 0, display: 'flex' }}><X size={12} /></button>
            </span>
          )}
          {debouncedSearch && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 6, background: 'var(--card-hover)', color: 'var(--fg)', border: '1px solid var(--border-soft)', fontSize: 11, fontWeight: 600 }}>
              Arama: "{debouncedSearch}"
              <button onClick={() => { setSearchInput(''); setUrlState({ q: '', page: 1 }); }} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--fg-muted)', padding: 0, display: 'flex' }}><X size={12} /></button>
            </span>
          )}
          <button
            onClick={() => { setSearchInput(''); setUrlState({ status: undefined, cat: '', q: '', campaignUploadId: '', page: 1 }); }}
            style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-muted)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
          >
            Tümünü Sıfırla
          </button>
        </div>
      )}

      {/* List */}
      <div style={{ padding: isMobile ? '12px 14px' : '0 0 16px' }}>
        {newOrdersBanner && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 10 }}>
            <button
              onClick={() => { refetch(); setNewOrdersBanner(null); }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '5px 12px', border: '1px solid rgba(16,185,129,0.4)', borderRadius: 99,
                background: 'rgba(16,185,129,0.1)', color: '#059669', cursor: 'pointer',
                fontSize: 12, fontWeight: 700,
              }}
            >
              <span style={{ width: 7, height: 7, borderRadius: 99, background: '#10b981', flexShrink: 0 }} />
              {newOrdersBanner} · göster
            </button>
          </div>
        )}
        {isLoading ? (
          <SkeletonList count={8} rowHeight={64} />
        ) : isError ? (
          <ErrorState title={t('orders_error')} onRetry={refetch} retryLabel={t('try_again')} />
        ) : orders.length === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            title={t('orders_empty')}
            description={t('orders_empty_hint')}
            action={{ label: t('clear_filters'), onClick: clearFilters }}
          />
        ) : isMobile ? (
          <div data-tour="orders-table" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {orders.map((o) => {
              const isSelected = selectedOrderIds.includes(o.orderId);
              const st = getStatusStyles(o.universalStatus);
              const hasMissingCost = o.items.some((i) => !i.hasCostData || i.buyingPrice == null);
              return (
                <div
                  key={o.orderId}
                  onClick={() => setMobileDetailOrderId(o.orderId)}
                  style={{
                    background: isSelected ? 'var(--accent-soft)' : 'var(--card)',
                    border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border)',
                    borderRadius: 14, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10,
                    cursor: 'pointer', transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.borderColor = 'var(--accent-dim)'; }}
                  onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.borderColor = 'var(--border)'; }}
                >
                  {/* Üst satır: checkbox + mağaza + platform badge + sipariş no + tutar */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ display: 'flex', minWidth: 0, alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <CustomCheckbox checked={isSelected} onChange={() => toggleSelectOrder(o.orderId)} />
                      <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: 10.5, fontWeight: 600, border: '1px solid var(--border-soft)', background: 'var(--card)', color: 'var(--fg)' }}>{o.storeName}</span>
                      <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: 10.5, fontWeight: 600, border: '1px solid var(--border-soft)', background: 'var(--card)', color: 'var(--fg-muted)' }}>{o.platformName}</span>
                      <span title={o.platformOrderNumber} style={{ minWidth: 0, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13, fontWeight: 700, color: 'var(--fg)', display: 'block' }}>
                        {formatOrderNumberWithHash(o.platformOrderNumber, o.orderCode)}
                      </span>
                      {hasMissingCost && (
                        <span style={{ fontSize: 9.5, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: 'var(--warning-soft)', color: 'var(--warning)' }}>
                          Maliyet Eksik
                        </span>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-0.5">
                      <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--fg)', textAlign: 'right' }}>{amountParts(o.totalAmount, o.sourceType).primary}</span>
                      <OrderProfitCell order={o} format={(amount) => fmt(amount, o.sourceType)} />
                    </div>
                  </div>
                  {/* Alt satır: tarih + şehir + durum */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ display: 'flex', minWidth: 0, alignItems: 'center', gap: 10 }}>
                      <span style={{ flexShrink: 0, fontSize: 11, color: 'var(--fg-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={11} />{fmtDate(o.orderDate, lang)}
                      </span>
                      {o.shipCity && (
                        <span title={o.shipCity} style={{ minWidth: 0, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11, color: 'var(--fg-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <MapPin size={11} style={{ flexShrink: 0 }} />{o.shipCity}
                        </span>
                      )}
                      <OrderRegionTag country={o.country} zone={o.shippingZone} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 10.5, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: st.bg, color: st.fg, border: `1px solid ${st.border}` }}>
                        {orderStatusLabel(o.universalStatus)}
                      </span>
                      <ChevronRight size={16} style={{ flexShrink: 0, color: 'var(--fg-muted)' }} />
                    </div>
                  </div>
                  
                  {/* Not icon indicator */}
                  {o.note && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, padding: '2px 8px', borderRadius: 4, background: 'rgba(99,102,241,0.06)', width: 'fit-content' }}>
                      <StickyNote size={12} style={{ color: 'var(--accent)' }} />
                      <span style={{ fontSize: 11, color: 'var(--fg-muted)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: 200 }}>
                        {o.note}
                      </span>
                    </div>
                  )}

                </div>
              );
            })}
          </div>

        ) : (
          <div data-tour="orders-table" className="orders-table-shell">
            {!isMobile && (
              <div
                className="orders-table-header"
                style={{
                  display: 'grid',
                  gridTemplateColumns: gridTemplate,
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 20px',
                  background: 'var(--bg)',
                  borderBottom: '1px solid var(--border)',
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: 'var(--fg-muted)',
                  textTransform: 'uppercase',
                }}
              >
                <div />
                {shownCols.includes('store') && <div>{lang === 'tr' ? 'Mağaza' : 'Store'}</div>}
                {shownCols.includes('order') && renderSortableHeader(lang === 'tr' ? 'Sipariş & Tarih' : 'Order & Date', 'date')}
                {shownCols.includes('city') && <div>{lang === 'tr' ? 'Şehir' : 'City'}</div>}
                {shownCols.includes('amount') && renderSortableHeader(lang === 'tr' ? 'Tutar' : 'Amount', 'amount')}
                {shownCols.includes('profit') && <div style={{ textAlign: 'right' }}>{lang === 'tr' ? 'Net Kâr' : 'Net Profit'}</div>}
                {shownCols.includes('status') && <div style={{ textAlign: 'center' }}>{lang === 'tr' ? 'Durum' : 'Status'}</div>}
                {shownCols.includes('note') && <div style={{ textAlign: 'center' }}>{lang === 'tr' ? 'Not' : 'Note'}</div>}
                <div />
              </div>
            )}
            {orders.map((o) => {
              const isOpen = !!expandedOrders[o.orderId];
              const isSelected = selectedOrderIds.includes(o.orderId);
              const st = getStatusStyles(o.universalStatus);
              const hasMissingCost = o.items.some((i) => !i.hasCostData || i.buyingPrice == null);
              return (
                <div key={o.orderId} className={`order-row${isSelected ? ' selected' : ''}${isOpen ? ' is-open' : ''}`}>
                  <div
                    className="order-row-header"
                    onClick={() => toggleExpand(o.orderId)}
                    style={{
                      padding: '9px 20px',
                      display: 'grid',
                      gridTemplateColumns: gridTemplate,
                      alignItems: 'center',
                      cursor: 'pointer',
                      userSelect: 'none',
                      gap: 10,
                    }}
                  >
                    {/* Checkbox */}
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <CustomCheckbox checked={isSelected} onChange={() => toggleSelectOrder(o.orderId)} />
                    </div>

                    {/* Store badge — dolu renkli kutu yerine küçük renkli nokta + düz yazı,
                        tablo yoğunlaştıkça 5-6 dolu renkli kutu satır başına çok ağır duruyordu. */}
                    {shownCols.includes('store') && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
                        
                        <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--fg-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {o.storeName}
                        </span>
                      </div>
                    )}

                    {/* Platform + order number */}
                    {shownCols.includes('order') && (
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--fg)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Link
                            href={`/orders/${o.orderId}`}
                            title={o.platformOrderNumber}
                            className="min-w-0 truncate"
                            onClick={(e: React.MouseEvent) => e.stopPropagation()}
                            style={{ color: 'var(--fg)', textDecoration: 'none' }}
                            onMouseEnter={(e: React.MouseEvent) => { (e.currentTarget as HTMLElement).style.color = 'var(--accent)'; (e.currentTarget as HTMLElement).style.textDecoration = 'underline'; }}
                            onMouseLeave={(e: React.MouseEvent) => { (e.currentTarget as HTMLElement).style.color = 'var(--fg)'; (e.currentTarget as HTMLElement).style.textDecoration = 'none'; }}
                          >
                            {formatOrderNumberWithHash(o.platformOrderNumber, o.orderCode)}
                          </Link>
                          {hasMissingCost && (
                            <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4, background: 'var(--warning-soft)', color: 'var(--warning)', flexShrink: 0 }}>
                              Maliyet Eksik
                            </span>
                          )}
                        </p>
                        <p style={{ fontSize: 10.5, color: 'var(--fg-subtle)', margin: '2px 0 0', display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
                          
                          {!shownCols.includes('store') && <>{o.storeName}<span style={{ opacity: 0.5 }}>·</span></>}
                          {o.platformName}
                          <span style={{ opacity: 0.5 }}>·</span>
                          <Clock size={11} style={{ flexShrink: 0 }} /> {fmtDate(o.orderDate, lang)}
                        </p>
                      </div>
                    )}

                    {/* City */}
                    {shownCols.includes('city') && (
                      <div className="flex min-w-0 flex-col items-start gap-1">
                        <span className="flex min-w-0 max-w-full items-center gap-1.5">
                          <MapPin size={13} className="shrink-0 text-[var(--fg-muted)]" />
                          <span className="truncate text-[12.5px] font-medium text-[var(--fg)]" title={o.shipCity || t('orders_unknown_city')}>
                            {o.shipCity || t('orders_unknown_city')}
                          </span>
                        </span>
                        <OrderRegionTag country={o.country} zone={o.shippingZone} />
                      </div>
                    )}

                    {/* Amount */}
                    {shownCols.includes('amount') && (() => {
                      const amount = amountParts(o.totalAmount, o.sourceType);
                      return (
                        <div className="flex min-w-0 flex-col whitespace-nowrap">
                          <span className="text-[13.5px] font-bold tabular-nums text-[var(--fg)]">{amount.primary}</span>
                          {amount.secondary && <span className="text-[10.5px] tabular-nums text-[var(--fg-muted)]">{amount.secondary}</span>}
                        </div>
                      );
                    })()}

                    {/* Net kâr + marj (kalem bazlı merkezi hesabın toplamı) */}
                    {shownCols.includes('profit') && (
                      <OrderProfitCell order={o} format={(amount) => fmt(amount, o.sourceType)} />
                    )}

                    {/* Status badge */}
                    {shownCols.includes('status') && (
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <span style={{ padding: '4px 10px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: st.bg, color: st.fg, border: `1px solid ${st.border}`, whiteSpace: 'nowrap' }}>
                          {orderStatusLabel(o.universalStatus)}
                        </span>
                      </div>
                    )}

                    {/* Not editörü sütunu yerine küçük bir ikon */}
                    {shownCols.includes('note') && (
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        {o.note ? (
                          <span title={o.note} style={{ color: 'var(--accent)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <StickyNote size={14} />
                          </span>
                        ) : (
                          <span style={{ color: 'var(--fg-subtle)', opacity: 0.35 }}>—</span>
                        )}
                      </div>
                    )}

                    <div style={{ color: 'var(--fg-muted)', justifySelf: 'end', display: 'flex', alignItems: 'center' }}>
                      {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>
                  </div>

                  {/* Expanded product list */}
                  {isOpen && (
                    <div style={{
                      padding: '8px 16px 16px',
                      background: 'var(--bg)',
                      borderTop: '1px solid var(--border-strong)',
                    }}>
                      <div style={{
                        border: '1.5px solid var(--border-strong)',
                        borderRadius: 3,
                        padding: '12px 16px 16px',
                        background: 'var(--card)',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                      }}>
                        {(o.orderCode || o.packageCode || o.shippingTotal != null || o.paymentStatus || o.customerName || o.addressDistrict || o.addressLine || o.note) && (
                          <div style={{
                            marginBottom: 10, padding: '7px 12px', borderRadius: 2, background: 'var(--card)', border: '1px solid var(--border)',
                            display: 'flex', flexWrap: 'wrap', gap: '6px 16px', alignItems: 'center',
                          }}>
                            {o.customerName && (
                              <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--fg)', display: 'flex', alignItems: 'center', gap: 5 }}>
                                <User size={12} style={{ color: 'var(--fg-muted)' }} /> {o.customerName}
                              </span>
                            )}
                            {(o.addressDistrict || o.addressLine) && (
                              <span style={{ fontSize: 11.5, color: 'var(--fg-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
                                <MapPin size={12} style={{ color: 'var(--fg-muted)' }} />
                                {[o.addressLine, o.addressDistrict].filter(Boolean).join(', ')}
                              </span>
                            )}

                            {(o.orderCode || o.packageCode) && (
                              <span style={{ fontSize: 11.5, color: 'var(--fg-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
                                <Truck size={12} style={{ color: 'var(--fg-muted)' }} />
                                {o.packageCode
                                  ? `${t('orders_package_code')}: ${o.packageCode}`
                                  : `${t('orders_order_code')}: ${o.orderCode}`}
                              </span>
                            )}
                            {o.shippingTotal != null && (
                              <span style={{ fontSize: 11.5, color: 'var(--fg-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
                                <CreditCard size={12} style={{ color: 'var(--fg-muted)' }} />
                                {t('orders_shipping_total')}: {fmt(o.shippingTotal, o.sourceType)}
                              </span>
                            )}
                            {o.paymentStatus && (
                              <span style={{
                                fontSize: 10.5, fontWeight: 600, padding: '2px 7px', borderRadius: 2, background: 'var(--card)', color: 'var(--fg)', border: '1px solid var(--border)',
                              }}>
                                {o.paymentStatus}
                              </span>
                            )}
                          </div>
                        )}
                        <div style={{ marginBottom: 10 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between', flexWrap: 'wrap' }}>
                            <OrderNoteEditor orderId={o.orderId} note={o.note} queryKey={ordersQueryKey} />
                            {o.platformName === 'Manuel' && isAdmin && (
                              <button
                                type="button"
                                onClick={() => cancelManualOrder(o.orderId)}
                                disabled={cancelManualOrderMutation.isPending}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: '1px solid rgba(239,68,68,.3)', borderRadius: 2, padding: '5px 10px', background: 'var(--card)', color: '#dc2626', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}
                              >
                                <Trash2 size={13} /> Siparişi sil
                              </button>
                            )}
                          </div>
                        </div>
                        <div>
                          <p style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--fg)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                            <Eye size={12} style={{ color: 'var(--fg-muted)' }} />
                            {t('orders_items_label')} ({o.items.length} {t('orders_items_unit')})
                          </p>
                          {o.items.length === 0 ? (
                            <p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: 0 }}>{t('orders_no_items')}</p>
                          ) : (
                            <div style={{ overflowX: 'auto', border: '1px solid var(--border-strong)', borderRadius: 2 }}>
                            <table className="order-details-table" style={{ border: 'none' }}>
                              <thead>
                                <tr>
                                  <th style={{ textAlign: 'left' }}>{t('orders_col_product')}</th>
                                  <th className="font-mono" style={{ width: 130, textAlign: 'left' }}>{t('orders_col_product_code')}</th>
                                  <th style={{ width: 50, textAlign: 'center' }}>{t('orders_col_qty')}</th>
                                  <th style={{ width: 100, textAlign: 'right' }}>{t('orders_col_list_price')}</th>
                                  <th style={{ width: 100, textAlign: 'right' }}>{t('orders_col_unit_price')}</th>
                                  <th style={{ width: 100, textAlign: 'right' }}>{t('orders_col_buying_price')}</th>
                                  <th style={{ width: 85, textAlign: 'right' }}>{t('orders_col_box_cost')}</th>
                                  <th style={{ width: 85, textAlign: 'center' }}>{t('orders_col_box_code')}</th>
                                  <th style={{ width: 65, textAlign: 'right' }}>{t('orders_col_desi')}</th>
                                  <th style={{ width: 85, textAlign: 'right' }}>{t('orders_col_shipping')}</th>
                                  <th style={{ width: 95, textAlign: 'right' }}>{lang === 'tr' ? 'Komisyon' : 'Commission'}</th>
                                  <th style={{ width: 100, textAlign: 'right' }}>{t('orders_col_profit')}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {o.items.map((item, idx) => (
                                  <tr key={`${item.productId}-${idx}`}>
                                    <td style={{ fontWeight: 500, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.productName}>
                                      {item.productName}
                                    </td>
                                    <td className="font-mono" style={{ fontSize: 11, color: 'var(--fg-muted)' }}>
                                      {item.supplierSku || '—'}
                                    </td>
                                    <td style={{ textAlign: 'center', fontWeight: 700 }} className="tabular-nums">
                                      {item.quantity}
                                    </td>
                                    <td style={{ textAlign: 'right', color: 'var(--fg-muted)' }} className="tabular-nums">
                                      {fmt(item.listPrice, o.sourceType)}
                                    </td>
                                    <td style={{ textAlign: 'right', fontWeight: 600 }} className="tabular-nums">
                                      {fmt(item.unitPrice, o.sourceType)}
                                    </td>
                                    <td style={{ textAlign: 'right' }} className="tabular-nums">
                                      {item.buyingPrice != null
                                        ? fmt(item.buyingPrice, o.sourceType)
                                        : <span style={{ color: 'var(--warning)', fontSize: 10.5, fontWeight: 600 }}>{t('orders_col_no_cost')}</span>}
                                    </td>
                                    <td style={{ textAlign: 'right', color: 'var(--fg-muted)' }} className="tabular-nums">
                                      {item.boxCost != null ? fmt(item.boxCost, o.sourceType) : '—'}
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                      {item.boxCode
                                        ? <span className="font-mono" style={{
                                            display: 'inline-block',
                                            background: 'var(--card)', color: 'var(--fg)', border: '1px solid var(--border)', borderRadius: 2, padding: '1px 5px', fontWeight: 600, fontSize: 10.5,
                                          }}>{item.boxCode}</span>
                                        : <span style={{
                                            display: 'inline-block',
                                            background: 'var(--warning-soft)',
                                            color: 'var(--warning)',
                                            borderRadius: 2,
                                            padding: '1px 5px',
                                            fontSize: 10,
                                            fontWeight: 700,
                                          }}>{t('orders_col_not_assigned')}</span>
                                      }
                                    </td>
                                    <td style={{ textAlign: 'right', fontWeight: 600, color: item.desi ? 'var(--fg)' : 'var(--fg-subtle)' }} className="tabular-nums">
                                      {item.desi != null ? item.desi.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) : '—'}
                                    </td>
                                    <td style={{ textAlign: 'right', color: 'var(--fg-muted)' }} className="tabular-nums">
                                      {fmt(item.shippingCost, o.sourceType)}
                                    </td>
                                    <td style={{ textAlign: 'right', color: 'var(--fg-muted)' }} className="tabular-nums" title={item.commissionIsActual ? 'Pazaryerinin bildirdiği gerçek tutar' : 'Kanal oranından tahmin'}>
                                      {fmt(item.commissionAmount, o.sourceType)}
                                      <span style={{ marginLeft: 4, fontSize: 9.5, fontWeight: 700, color: item.commissionIsActual ? '#10b981' : 'var(--fg-subtle)' }}>
                                        {item.commissionIsActual ? 'G' : 'T'}
                                      </span>
                                    </td>
                                    <td style={{ textAlign: 'right', fontWeight: 700, color: !item.hasCostData ? 'var(--fg-subtle)' : item.netProfit >= 0 ? '#10b981' : '#ef4444' }} className="tabular-nums">
                                      {item.hasCostData ? fmt(item.netProfit, o.sourceType) : '—'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            </div>
                          )}
                        </div>
                        <div style={{ marginTop: 12 }}>
                          <OrderFeeBreakdown order={o} format={(amount) => fmt(amount, o.sourceType)} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination — masaüstü için */}
      {!isMobile && !isLoading && !isError && orders.length > 0 && (
        <div style={{
          padding: '12px 20px', borderTop: '1px solid var(--border)',
          background: 'var(--card)', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', flexShrink: 0, gap: 8,
        }}>
          <span style={{ fontSize: 12.5, color: 'var(--fg-muted)' }}>
            {paginationText}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button className="page-btn" onClick={() => setPage(Math.max(page - 1, 1))} disabled={page === 1}>
              <ChevronLeft size={15} />
            </button>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', minWidth: 60, textAlign: 'center' }}>
              {page} / {totalPages}
            </span>
            <button className="page-btn" onClick={() => setPage(Math.min(page + 1, totalPages))} disabled={page === totalPages}>
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Mobil Daha Fazla Yükle Butonu */}
      {isMobile && !isLoading && !isError && page < totalPages && (
        <div style={{ padding: '12px 14px', borderTop: '1px solid var(--border-soft)', background: 'var(--card)', display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={() => setPage(page + 1)}
            style={{
              width: '100%', padding: '10px', borderRadius: 8, border: '1px solid var(--border)',
              background: 'var(--card)', color: 'var(--fg)', fontSize: 13, fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Daha Fazla Yükle
          </button>
        </div>
      )}
    </PullToRefresh>

    {isMobile && (
      <MobileOrderDetailSheet
        order={mobileDetailOrder}
        onClose={() => setMobileDetailOrderId(null)}
        queryKey={ordersQueryKey}
        formatMoney={fmt}
        formatOrderDate={(date) => fmtDate(date, lang)}
        onDelete={mobileDetailOrder?.platformName === 'Manuel' && isAdmin ? cancelManualOrder : undefined}
        deleting={cancelManualOrderMutation.isPending}
      />
    )}

    {isMobile && mobileFiltersOpen && (
      <>
        <div
          className="orders-mobile-filter-backdrop"
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
            animation: 'fadeIn 0.2s ease-out',
          }}
          onClick={() => setMobileFiltersOpen(false)}
        />
        <div
          className="orders-mobile-filter-sheet"
          style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 101,
            background: 'var(--card)', borderTopLeftRadius: 20, borderTopRightRadius: 20,
            padding: '20px 16px calc(20px + env(safe-area-inset-bottom))',
            boxShadow: '0 -4px 20px rgba(0,0,0,0.15)',
            display: 'flex', flexDirection: 'column', gap: 14,
            maxHeight: '80vh', overflowY: 'auto',
            animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--fg)', margin: 0 }}>
              {lang === 'tr' ? 'Filtreler' : 'Filters'}
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={clearMobileFilterDraft} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--accent)', padding: '4px 6px', fontSize: 12, fontWeight: 700 }}>
                {lang === 'tr' ? 'Temizle' : 'Clear'}
              </button>
              <button onClick={() => setMobileFiltersOpen(false)} aria-label={lang === 'tr' ? 'Kapat' : 'Close'} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--fg-muted)', padding: 4 }}>
                <X size={18} />
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--fg-muted)' }}>
              {lang === 'tr' ? 'Tarih Aralığı' : 'Date Range'}
            </label>
            <DateRangePicker
              value={mobileFilterDraft.range}
              onChange={(preset) => setMobileFilterDraft((draft) => ({ ...draft, range: preset }))}
              customFrom={mobileFilterDraft.customFrom}
              customTo={mobileFilterDraft.customTo}
              onCustomChange={(from, to) => setMobileFilterDraft((draft) => ({ ...draft, range: 'custom', customFrom: from, customTo: to }))}
              includeAll
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--fg-muted)' }}>
              {lang === 'tr' ? 'Kategori' : 'Category'}
            </label>
            <FilterSelect
              value={mobileFilterDraft.category}
              placeholder={t('orders_all_categories')}
              minWidth="100%"
              options={(categoriesData ?? []).map((c) => ({ value: String(c.id), label: c.name }))}
              onChange={(v) => setMobileFilterDraft((draft) => ({ ...draft, category: v }))}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--fg-muted)' }}>
              {lang === 'tr' ? 'Durum' : 'Status'}
            </label>
            <FilterSelect
              value={mobileFilterDraft.status}
              placeholder={t('orders_status_all')}
              minWidth="100%"
              options={STATUS_OPTIONS}
              onChange={(v) => setMobileFilterDraft((draft) => ({ ...draft, status: v }))}
            />
          </div>

          <div style={{ height: 1, background: 'var(--border-soft)', margin: '4px 0' }} />

          <div className="orders-mobile-filter-footer" style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <div style={{ flex: 1 }}>
              <ExportMenu
                filename="siparisler"
                columns={ORDER_EXPORT_COLUMNS}
                totalHint={totalCount}
                getDataAsync={async (opts) => {
                  const rows = await orderApi.listAll({
                    from: resolvedRange?.from || undefined,
                    to: resolvedRange?.to || undefined,
                    search: debouncedSearch || undefined,
                    categoryId, status: status === 'missing_cost' ? undefined : status, limit: opts?.limit,
                    campaignUploadId: urlState.campaignUploadId ? Number(urlState.campaignUploadId) : undefined,
                  });
                  const filteredRows = status === 'missing_cost'
                    ? rows.filter(r => r.items.some(i => !i.hasCostData || i.buyingPrice == null))
                    : rows;
                  return ordersToExportRows(filteredRows, isBaseSourceType, toGbp);
                }}
                label={t('orders_export_label')}
                mobileExpanded
              />
            </div>
            <button
              onClick={applyMobileFilters}
              style={{
                flex: 1.5, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 10,
                padding: '10px 16px', fontWeight: 700, fontSize: 13.5, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {lang === 'tr' ? 'Filtreleri Uygula' : 'Apply Filters'}
            </button>
          </div>
        </div>
        <style>{`
          .orders-mobile-filter-sheet {
            max-height: calc(100dvh - 12px) !important;
            padding: 18px 16px calc(14px + env(safe-area-inset-bottom)) !important;
            overscroll-behavior: contain;
          }
          .orders-mobile-filter-footer {
            position: sticky;
            bottom: calc(-14px - env(safe-area-inset-bottom));
            z-index: 2;
            margin: 0 -16px !important;
            padding: 12px 16px calc(14px + env(safe-area-inset-bottom));
            border-top: 1px solid var(--border-soft);
            background: var(--card);
          }
          .orders-mobile-filter-footer > div,
          .orders-mobile-filter-footer > button {
            min-width: 0;
            min-height: 44px;
          }
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slideUp {
            from { transform: translateY(100%); }
            to { transform: translateY(0); }
          }
        `}</style>
      </>
    )}
  </>
);
}
