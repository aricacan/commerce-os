'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Loader2, Eye, X, SlidersHorizontal, Check, ChevronDown, ArrowRight, Download } from 'lucide-react';
import { categoryApi, platformApi, productApi, orderApi, excelReportApi } from '../../../../lib/api';
import { useI18n } from '../../../../lib/i18n';
import { BRAND_OPTIONS } from '../../../../stores/store-selector';
import { type MultiSelectOption } from '../../../../components/ui/MultiSelect';
import { DateRangePicker } from '../../../../components/ui/DateRangePicker';
import { resolveDatePreset, type DatePreset } from '../../../../utils/date';
import type { ExcelJoinRequest, ExcelReportModule, ExcelReportRequest } from '../../../../types/api';
import type { TranslationKey } from '../../../../lib/translations/tr';
import { VirtualizedPreviewTable } from '../../../../components/excel/VirtualizedPreviewTable';
import { formatOrderNumberWithHash } from '../../../../utils/orderNumber';

const MODULE_DEFS: { key: ExcelReportModule; labelKey: TranslationKey }[] = [
  { key: 'Products',   labelKey: 'excel_module_products' },
  { key: 'Orders',     labelKey: 'excel_module_orders' },
  { key: 'Finance',    labelKey: 'excel_module_finance' },
  { key: 'Logistics',  labelKey: 'excel_module_logistics' },
  { key: 'Shipping',   labelKey: 'excel_module_shipping' },
  { key: 'Returns',    labelKey: 'excel_module_returns' },
  { key: 'Boxes',      labelKey: 'excel_module_boxes' },
];

// Anahtarlar ExcelReportService'in ÜRETTİĞİ kolon adlarıyla BİREBİR aynı olmalı. Eskiden
// hiçbiri eşleşmiyordu ("Ad" ↔ "ÜrünAdı"); sunucu eşleşme bulamayınca tüm kolonları
// döndürdüğü için kolon seçimi hiçbir şey yapmıyordu.
const MODULE_COLUMNS: Record<ExcelReportModule, { key: string; label: string }[]> = {
  Products: [
    { key: 'Id', label: 'ID' },
    { key: 'SKU', label: 'SKU' },
    { key: 'ÜrünAdı', label: 'Ürün Adı' },
    { key: 'Marka', label: 'Marka' },
    { key: 'Barkod', label: 'Barkod' },
    { key: 'Stok', label: 'Stok' },
    { key: 'Fiyat', label: 'Fiyat' },
    { key: 'FiyatBirimi', label: 'Fiyat Birimi' },
    { key: 'Mağaza', label: 'Mağaza' },
  ],
  Orders: [
    { key: 'Id', label: 'ID' },
    { key: 'SiparişNo', label: 'Sipariş No' },
    { key: 'Tarih', label: 'Sipariş Tarihi' },
    { key: 'Müşteri', label: 'Müşteri' },
    { key: 'Tutar', label: 'Tutar' },
    { key: 'ParaBirimi', label: 'Para Birimi' },
    { key: 'Durum', label: 'Durum' },
    { key: 'Mağaza', label: 'Mağaza' },
  ],
  // Komisyon/KDV/Net Kâr sipariş satırında saklanmıyor; tahmini yüzdeyle doldurmak yerine
  // kaldırıldı. Gerçek kâr: Finans > P&L.
  Finance: [
    { key: 'SiparişNo', label: 'Sipariş No' },
    { key: 'Ciro', label: 'Ciro' },
    { key: 'ParaBirimi', label: 'Para Birimi' },
    { key: 'MüşteridenAlınanKargo', label: 'Müşteriden Alınan Kargo' },
    { key: 'GerçekKargoMaliyeti', label: 'Gerçek Kargo Maliyeti' },
    { key: 'Tarih', label: 'Tarih' },
    { key: 'Mağaza', label: 'Mağaza' },
  ],
  Logistics: [
    { key: 'SiparişNo', label: 'Sipariş No' },
    { key: 'Şehir', label: 'Şehir' },
    { key: 'İlçe', label: 'İlçe' },
    { key: 'Mağaza', label: 'Mağaza' },
  ],
  Shipping: [
    { key: 'SiparişNo', label: 'Sipariş No' },
    { key: 'MüşteridenAlınanKargo', label: 'Müşteriden Alınan Kargo' },
    { key: 'GerçekKargoMaliyeti', label: 'Gerçek Kargo Maliyeti' },
    { key: 'ParaBirimi', label: 'Para Birimi' },
    { key: 'Mağaza', label: 'Mağaza' },
  ],
  Returns: [
    { key: 'Id', label: 'İade ID' },
    { key: 'SiparişNo', label: 'Sipariş No' },
    { key: 'Neden', label: 'Neden' },
    { key: 'Durum', label: 'Durum' },
    { key: 'İadeTutarı', label: 'İade Tutarı' },
    { key: 'ParaBirimi', label: 'Para Birimi' },
    { key: 'Tarih', label: 'Tarih' },
    { key: 'Mağaza', label: 'Mağaza' },
  ],
  Boxes: [
    { key: 'SKU', label: 'SKU' },
    { key: 'KutuKodu', label: 'Kutu Kodu' },
    { key: 'En', label: 'En (mm)' },
    { key: 'Boy', label: 'Boy (mm)' },
    { key: 'Yükseklik', label: 'Yükseklik (mm)' },
    { key: 'Desi', label: 'Desi' },
    { key: 'Mağaza', label: 'Mağaza' },
  ],
};

const ROW_LIMIT_OPTIONS = [
  { value: 0, label: 'Tüm Satırlar' },
  { value: 50, label: '50 Satır' },
  { value: 100, label: '100 Satır' },
  { value: 250, label: '250 Satır' },
  { value: 500, label: '500 Satır' },
  { value: 1000, label: '1.000 Satır' },
  { value: 5000, label: '5.000 Satır' },
];

interface PresetReport {
  key: string;
  labelKey: TranslationKey;
  groupKey: TranslationKey;
  groupName: string;
  modules: ExcelReportModule[];
  dateRange: DatePreset;
}

const PRESET_REPORTS: PresetReport[] = [
  { key: 'orders_returns_today', labelKey: 'excel_preset_orders_returns_today', groupKey: 'excel_preset_group_orders_returns', groupName: 'Sipariş & İadeler', modules: ['Orders', 'Returns'], dateRange: 'today' },
  { key: 'orders_returns_month', labelKey: 'excel_preset_orders_returns_month', groupKey: 'excel_preset_group_orders_returns', groupName: 'Sipariş & İadeler', modules: ['Orders', 'Returns'], dateRange: 'month' },
  { key: 'orders_returns_all', labelKey: 'excel_preset_orders_returns_all', groupKey: 'excel_preset_group_orders_returns', groupName: 'Sipariş & İadeler', modules: ['Orders', 'Returns'], dateRange: 'all' },
  { key: 'finance_today', labelKey: 'excel_preset_finance_today', groupKey: 'excel_preset_group_finance', groupName: 'Finans', modules: ['Finance'], dateRange: 'today' },
  { key: 'finance_month', labelKey: 'excel_preset_finance_month', groupKey: 'excel_preset_group_finance', groupName: 'Finans', modules: ['Finance'], dateRange: 'month' },
  { key: 'finance_all', labelKey: 'excel_preset_finance_all', groupKey: 'excel_preset_group_finance', groupName: 'Finans', modules: ['Finance'], dateRange: 'all' },
  { key: 'logistics_month', labelKey: 'excel_preset_logistics_month', groupKey: 'excel_preset_group_logistics', groupName: 'Lojistik', modules: ['Logistics'], dateRange: 'month' },
  { key: 'logistics_all', labelKey: 'excel_preset_logistics_all', groupKey: 'excel_preset_group_logistics', groupName: 'Lojistik', modules: ['Logistics'], dateRange: 'all' },
  { key: 'products_stock', labelKey: 'excel_preset_products_stock', groupKey: 'excel_preset_group_other', groupName: 'Diğer Hazır Raporlar', modules: ['Products'], dateRange: 'all' },
  { key: 'shipping_rates', labelKey: 'excel_preset_shipping_rates', groupKey: 'excel_preset_group_other', groupName: 'Diğer Hazır Raporlar', modules: ['Shipping'], dateRange: 'all' },
  { key: 'boxes_inventory', labelKey: 'excel_preset_boxes_inventory', groupKey: 'excel_preset_group_other', groupName: 'Diğer Hazır Raporlar', modules: ['Boxes'], dateRange: 'all' },
  { key: 'full_report_month', labelKey: 'excel_preset_full_month', groupKey: 'excel_preset_group_other', groupName: 'Diğer Hazır Raporlar', modules: ['Products', 'Orders', 'Finance', 'Logistics', 'Shipping', 'Returns', 'Boxes'], dateRange: 'month' },
  { key: 'full_report_all', labelKey: 'excel_preset_full_all', groupKey: 'excel_preset_group_other', groupName: 'Diğer Hazır Raporlar', modules: ['Products', 'Orders', 'Finance', 'Logistics', 'Shipping', 'Returns', 'Boxes'], dateRange: 'all' },
];

interface CustomSelectOption<T extends string | number> {
  value: T;
  label: string;
  group?: string;
}

function CustomSelect<T extends string | number>({
  value,
  onChange,
  options,
  placeholder = 'Seçiniz',
  disabled = false,
}: {
  value: T | '';
  onChange: (v: T) => void;
  options: CustomSelectOption<T>[];
  placeholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const selectedOpt = options.find((o) => o.value === value);

  return (
    <div ref={rootRef} className={`relative w-full ${disabled ? 'opacity-60' : ''}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className="flex h-8 w-full items-center justify-between gap-2 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-2.5 text-xs font-medium text-[var(--fg)] shadow-xs transition hover:bg-[var(--bg-subtle)] cursor-pointer"
      >
        <span className="truncate">{selectedOpt ? selectedOpt.label : placeholder}</span>
        <ChevronDown size={12} className={`shrink-0 text-[var(--fg-muted)] transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && !disabled && (
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 max-h-56 overflow-y-auto rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-1 shadow-lg">
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={String(opt.value)}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={`flex w-full items-center justify-between rounded-[3px] px-2.5 py-1.5 text-xs transition cursor-pointer ${
                  isSelected ? 'bg-[var(--bg-subtle)] font-bold text-[var(--fg)]' : 'text-[var(--fg)] hover:bg-[var(--bg-subtle)]'
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && <Check size={12} className="text-[var(--fg)] shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface FilterSection {
  key: string;
  label: string;
  allLabel: string;
  options: MultiSelectOption[];
  selected: (string | number)[];
  onChange: (values: (string | number)[]) => void;
  searchable?: boolean;
  searchPlaceholder?: string;
}

function CombinedFilterPanel({ sections }: { sections: FilterSection[] }) {
  const [open, setOpen] = useState(false);
  const [activeKey, setActiveKey] = useState(sections[0]?.key);
  const [search, setSearch] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (!open) setSearch(''); }, [open]);
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const totalActive = sections.reduce((s, sec) => s + sec.selected.length, 0);
  const active = sections.find((s) => s.key === activeKey) ?? sections[0];

  const filteredOptions = useMemo(() => {
    if (!active) return [];
    if (!search.trim()) return active.options;
    const q = search.trim().toLowerCase();
    return active.options.filter((o) => o.label.toLowerCase().includes(q));
  }, [active, search]);

  if (!active) return null;

  function toggle(value: string | number) {
    active.onChange(active.selected.includes(value) ? active.selected.filter((v) => v !== value) : [...active.selected, value]);
  }

  return (
    <div ref={rootRef} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex h-8 w-full items-center justify-center gap-2 rounded-[4px] border px-3 text-xs font-semibold shadow-xs transition cursor-pointer ${
          totalActive > 0
            ? 'border-[var(--border)] bg-[var(--card)] text-[var(--fg)] font-bold'
            : 'border-[var(--border)] bg-[var(--card)] text-[var(--fg)] hover:bg-[var(--bg-subtle)]'
        }`}
      >
        <SlidersHorizontal size={12} className="text-[var(--fg-muted)]" />
        <span>Filtreler{totalActive > 0 ? ` (${totalActive})` : ''}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+6px)] z-50 flex w-96 max-h-80 overflow-hidden rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] shadow-lg">
          <div className="w-36 shrink-0 border-r border-[var(--border-soft)] p-1.5 space-y-0.5 overflow-y-auto bg-[var(--bg-subtle)]/30">
            {sections.map((sec) => (
              <button
                key={sec.key}
                type="button"
                onClick={() => setActiveKey(sec.key)}
                className={`flex w-full items-center justify-between rounded-[3px] p-2 text-left text-xs transition cursor-pointer ${
                  sec.key === active.key
                    ? 'bg-[var(--card)] font-bold text-[var(--fg)] shadow-xs border border-[var(--border)]'
                    : 'text-[var(--fg-muted)] hover:text-[var(--fg)]'
                }`}
              >
                <span className="truncate">{sec.label}</span>
                {sec.selected.length > 0 && (
                  <span className="text-[10px] font-mono px-1 rounded-[2px] bg-[var(--bg-subtle)] text-[var(--fg)]">
                    {sec.selected.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="flex flex-1 flex-col min-w-0">
            {active.searchable && (
              <div className="border-b border-[var(--border-soft)] p-2">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={active.searchPlaceholder}
                  className="h-7 w-full rounded-[3px] border border-[var(--border)] bg-[var(--bg)] px-2 text-xs text-[var(--fg)] outline-none"
                />
              </div>
            )}
            <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
              <button
                type="button"
                onClick={() => active.onChange([])}
                className={`w-full rounded-[3px] p-1.5 text-left text-xs transition cursor-pointer ${
                  active.selected.length === 0 ? 'bg-[var(--bg-subtle)] font-bold text-[var(--fg)]' : 'text-[var(--fg-muted)] hover:bg-[var(--bg-subtle)]'
                }`}
              >
                {active.allLabel}
              </button>
              <div className="my-1 h-[1px] bg-[var(--border-soft)]" />
              {filteredOptions.map((opt) => {
                const checked = active.selected.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggle(opt.value)}
                    className={`flex w-full items-center gap-2 rounded-[3px] p-1.5 text-left text-xs transition cursor-pointer ${
                      checked ? 'bg-[var(--bg-subtle)] text-[var(--fg)] font-semibold' : 'text-[var(--fg)] hover:bg-[var(--bg-subtle)]'
                    }`}
                  >
                    <span className={`h-3 w-3 rounded-[2px] border flex items-center justify-center ${
                      checked ? 'border-[var(--fg)] bg-[var(--fg)]' : 'border-[var(--border)]'
                    }`}>
                      {checked && <Check size={9} className="text-[var(--bg)]" />}
                    </span>
                    <span className="truncate">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ExcelReportPage() {
  const { t } = useI18n();

  const [storeCodes, setStoreCodes] = useState<(string | number)[]>([]);
  const [categoryIds, setCategoryIds] = useState<(string | number)[]>([]);
  const [platformIds, setPlatformIds] = useState<(string | number)[]>([]);
  const [productIds, setProductIds] = useState<(string | number)[]>([]);
  const [orderIds, setOrderIds] = useState<(string | number)[]>([]);
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [selectedModules, setSelectedModules] = useState<ExcelReportModule[]>(['Products', 'Orders']);
  const [selectedColumns, setSelectedColumns] = useState<Partial<Record<ExcelReportModule, string[]>>>({});
  const [rowLimit, setRowLimit] = useState<number | 0>(0);
  const [selectedPreset, setSelectedPreset] = useState('');
  const [activePreviewTab, setActivePreviewTab] = useState<string | null>(null);
  const [previewModules, setPreviewModules] = useState<ExcelReportModule[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [joins, setJoins] = useState<ExcelJoinRequest[]>([]);
  const [joinDraft, setJoinDraft] = useState<{
    leftModule: ExcelReportModule | ''; leftKey: string;
    rightModule: ExcelReportModule | ''; rightKey: string;
    joinType: 'inner' | 'left';
  }>({ leftModule: '', leftKey: '', rightModule: '', rightKey: '', joinType: 'inner' });

  useEffect(() => {
    setJoins((prev) => prev.filter((j) => selectedModules.includes(j.leftModule) && selectedModules.includes(j.rightModule)));
  }, [selectedModules]);

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryApi.master(),
    staleTime: 5 * 60_000,
  });

  const { data: platformsData } = useQuery({
    queryKey: ['platforms'],
    queryFn: () => platformApi.list(),
    staleTime: 10 * 60_000,
  });

  const { data: productsData } = useQuery({
    queryKey: ['excel-report-products'],
    queryFn: () => productApi.list({ pageSize: 300 }),
    staleTime: 60_000,
  });

  const { data: ordersData } = useQuery({
    queryKey: ['excel-report-orders'],
    queryFn: () => orderApi.list({ pageSize: 300 }),
    staleTime: 60_000,
  });

  const storeOptions: MultiSelectOption[] = BRAND_OPTIONS.map((o) => ({ value: o.code, label: o.label, color: o.color }));
  const categoryOptions: MultiSelectOption[] = (categoriesData ?? []).map((c) => ({ value: c.id, label: c.name }));
  const platformOptions: MultiSelectOption[] = (platformsData ?? []).map((p) => ({ value: p.id, label: p.name }));
  const productOptions: MultiSelectOption[] = (productsData?.items ?? []).map((p) => ({ value: p.productId, label: p.productName }));
  const orderOptions: MultiSelectOption[] = (ordersData?.items ?? []).map((o) => ({ value: o.orderId, label: `${formatOrderNumberWithHash(o.platformOrderNumber)} —${o.storeName}` }));

  function buildRequest(modules: ExcelReportModule[]): ExcelReportRequest {
    const columns: Partial<Record<ExcelReportModule, string[]>> = {};
    modules.forEach((m) => {
      if (selectedColumns[m]) columns[m] = selectedColumns[m];
    });
    const { from, to } = resolveDatePreset(datePreset, customFrom, customTo);

    return {
      storeCodes: storeCodes.length ? (storeCodes as string[]) : undefined,
      categoryIds: categoryIds.length ? (categoryIds as number[]) : undefined,
      platformIds: platformIds.length ? (platformIds as number[]) : undefined,
      productIds: productIds.length ? (productIds as number[]) : undefined,
      orderIds: orderIds.length ? (orderIds as number[]) : undefined,
      dateFrom: from || undefined,
      dateTo: to || undefined,
      modules,
      rowLimit: rowLimit > 0 ? rowLimit : undefined,
      columns: Object.keys(columns).length ? columns : undefined,
      joins: joins.length ? joins : undefined,
    };
  }

  function addJoin() {
    const { leftModule, leftKey, rightModule, rightKey, joinType } = joinDraft;
    if (!leftModule || !leftKey || !rightModule || !rightKey) return;
    setJoins((prev) => [...prev, { leftModule, leftKey, rightModule, rightKey, joinType }]);
    setJoinDraft({ leftModule: '', leftKey: '', rightModule: '', rightKey: '', joinType: 'inner' });
  }

  function removeJoin(index: number) {
    setJoins((prev) => prev.filter((_, i) => i !== index));
  }

  function toggleColumn(module: ExcelReportModule, colKey: string) {
    const allKeys = MODULE_COLUMNS[module].map((c) => c.key);
    setSelectedColumns((prev) => {
      const current = prev[module] ?? allKeys;
      if (current.includes(colKey)) {
        if (current.length <= 1) return prev;
        return { ...prev, [module]: current.filter((k) => k !== colKey) };
      }
      return { ...prev, [module]: [...current, colKey] };
    });
  }

  function selectAllColumns(module: ExcelReportModule) {
    setSelectedColumns((prev) => ({ ...prev, [module]: MODULE_COLUMNS[module].map((c) => c.key) }));
  }

  function clearAllColumns(module: ExcelReportModule) {
    setSelectedColumns((prev) => ({ ...prev, [module]: [MODULE_COLUMNS[module][0].key] }));
  }

  const previewMutation = useMutation({
    mutationFn: (modules: ExcelReportModule[]) => excelReportApi.preview(buildRequest(modules)),
    onMutate: (modules) => {
      setPreviewModules(modules);
    },
    onSuccess: (data, modules) => {
      const sheetKeys = Object.keys(data.sheets ?? {});
      const firstPreviewKey = modules[0] ?? sheetKeys[0] ?? null;
      setActivePreviewTab(firstPreviewKey);
    },
    onError: () => setMessage({ type: 'error', text: 'Önizleme oluşturulamadı.' }),
  });

  const generateMutation = useMutation({
    meta: { successMessage: 'Excel raporu oluşturuldu' } as const,
    mutationFn: (modules: ExcelReportModule[]) => excelReportApi.generate(buildRequest(modules)),
    onSuccess: () => setMessage({ type: 'success', text: 'Excel raporu başarıyla indirildi.' }),
    onError: () => setMessage({ type: 'error', text: 'Rapor oluşturulamadı.' }),
  });

  function applyPreset(presetKey: string) {
    setSelectedPreset(presetKey);
    if (!presetKey) return;
    const preset = PRESET_REPORTS.find((p) => p.key === presetKey);
    if (!preset) return;
    setSelectedModules(preset.modules);
    setStoreCodes([]);
    setCategoryIds([]);
    setPlatformIds([]);
    setProductIds([]);
    setOrderIds([]);
    setDatePreset(preset.dateRange);
    setMessage(null);
  }

  function toggleModule(key: ExcelReportModule) {
    setSelectedPreset('');
    setSelectedModules((prev) => (prev.includes(key) ? prev.filter((m) => m !== key) : [...prev, key]));
  }

  const previewSheets = useMemo(() => previewMutation.data?.sheets ?? null, [previewMutation.data]);
  const previewSheetKeys = useMemo(() => Object.keys(previewSheets ?? {}), [previewSheets]);
  const previewTabKeys = useMemo(() => {
    if (!previewSheets) return [];
    const keys = new Set<string>(previewModules);
    previewSheetKeys.forEach((key) => keys.add(key));
    return Array.from(keys);
  }, [previewModules, previewSheetKeys, previewSheets]);

  const presetSelectOptions = useMemo(() => {
    const opts: CustomSelectOption<string>[] = [{ value: '', label: 'Manuel Seçim' }];
    PRESET_REPORTS.forEach((p) => {
      opts.push({ value: p.key, label: t(p.labelKey) });
    });
    return opts;
  }, [t]);

  const moduleSelectOptions = useMemo(() => {
    return MODULE_DEFS.filter((m) => selectedModules.includes(m.key)).map((m) => ({
      value: m.key,
      label: t(m.labelKey),
    }));
  }, [selectedModules, t]);

  const leftKeyOptions = useMemo(() => {
    if (!joinDraft.leftModule) return [];
    return MODULE_COLUMNS[joinDraft.leftModule].map((c) => ({ value: c.key, label: c.label }));
  }, [joinDraft.leftModule]);

  const rightKeyOptions = useMemo(() => {
    if (!joinDraft.rightModule) return [];
    return MODULE_COLUMNS[joinDraft.rightModule].map((c) => ({ value: c.key, label: c.label }));
  }, [joinDraft.rightModule]);

  return (
    <div className="flex flex-col h-full overflow-hidden p-4 sm:p-5 gap-4 bg-transparent text-xs">
      <div className="flex-1 overflow-y-auto min-h-0 space-y-4 pr-1">
        {/* Rapor Oluşturucu Kontrol Kartı */}
        <div className="p-4 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-[var(--fg)] uppercase tracking-wider">Excel Rapor Oluşturucu</h2>
            <div data-tour="excel-actions" className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (selectedModules.length === 0) { setMessage({ type: 'error', text: 'En az bir modül seçin.' }); return; }
                  setMessage(null);
                  previewMutation.mutate(selectedModules);
                }}
                disabled={previewMutation.isPending}
                className="h-8 px-3 rounded-[4px] border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--bg-subtle)] text-xs font-semibold text-[var(--fg)] shadow-xs hover:border-[var(--fg-muted)] transition cursor-pointer flex items-center gap-1.5"
              >
                {previewMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Eye size={13} />}
                <span>Önizle</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (selectedModules.length === 0) { setMessage({ type: 'error', text: 'En az bir modül seçin.' }); return; }
                  setMessage(null);
                  generateMutation.mutate(selectedModules);
                }}
                disabled={generateMutation.isPending}
                className="h-8 px-3.5 rounded-[4px] border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--bg-subtle)] text-xs font-bold text-[var(--fg)] shadow-xs hover:border-[var(--fg-muted)] transition cursor-pointer flex items-center gap-1.5"
              >
                {generateMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                <span>İndir (Excel)</span>
              </button>
            </div>
          </div>

          {message && (
            <div className={`p-2.5 rounded-[3px] text-xs font-semibold ${
              message.type === 'success' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
            }`}>
              {message.text}
            </div>
          )}

          {/* Filtre Kontrolleri */}
          <div data-tour="excel-filters" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase block mb-1">Tarih Aralığı</label>
              <DateRangePicker
                value={datePreset}
                onChange={(p) => { setSelectedPreset(''); setDatePreset(p); }}
                customFrom={customFrom}
                customTo={customTo}
                onCustomChange={(f, tt) => { setCustomFrom(f); setCustomTo(tt); }}
                includeAll
              />
            </div>

            <div>
              <label className="text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase block mb-1">Hazır Rapor Şablonları</label>
              <CustomSelect
                value={selectedPreset}
                onChange={applyPreset}
                options={presetSelectOptions}
                placeholder="Hazır Rapor Seçin"
              />
            </div>

            <div>
              <label className="text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase block mb-1">Filtreler</label>
              <CombinedFilterPanel sections={[
                { key: 'store', label: t('excel_filter_store'), allLabel: t('excel_filter_store_all'), options: storeOptions, selected: storeCodes, onChange: setStoreCodes },
                { key: 'category', label: t('excel_filter_category'), allLabel: t('excel_filter_category_all'), options: categoryOptions, selected: categoryIds, onChange: setCategoryIds },
                { key: 'platform', label: t('excel_filter_platform'), allLabel: t('excel_filter_platform_all'), options: platformOptions, selected: platformIds, onChange: setPlatformIds },
                { key: 'product', label: t('excel_filter_product'), allLabel: t('excel_filter_product_all'), options: productOptions, selected: productIds, onChange: setProductIds, searchable: true, searchPlaceholder: t('excel_filter_product_search') },
                { key: 'order', label: t('excel_filter_order'), allLabel: t('excel_filter_order_all'), options: orderOptions, selected: orderIds, onChange: setOrderIds, searchable: true, searchPlaceholder: t('excel_filter_order_search') },
              ]} />
            </div>

            <div>
              <label className="text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase block mb-1">Satır Limiti</label>
              <CustomSelect
                value={rowLimit}
                onChange={(v) => setRowLimit(Number(v))}
                options={ROW_LIMIT_OPTIONS}
                placeholder="Tüm Satırlar"
              />
            </div>
          </div>

          <div className="h-[1px] bg-[var(--border-soft)]" />

          {/* Modül Seçici Çipler */}
          <div data-tour="excel-modules" className="space-y-2">
            <label className="text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase block">Rapora Dahil Edilecek Modüller</label>
            <div className="flex flex-wrap gap-2">
              {MODULE_DEFS.map(({ key, labelKey }) => {
                const selected = selectedModules.includes(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleModule(key)}
                    className={`h-8 px-3 rounded-[4px] text-xs font-semibold border transition cursor-pointer flex items-center gap-2 ${
                      selected
                        ? 'border-[var(--border)] bg-[var(--card-hover)] text-[var(--fg)] font-bold shadow-xs'
                        : 'border-[var(--border-soft)] bg-[var(--card)] text-[var(--fg-muted)] hover:text-[var(--fg)]'
                    }`}
                  >
                    <span className={`h-3.5 w-3.5 rounded-[2px] border flex items-center justify-center ${
                      selected ? 'border-[var(--fg)] bg-[var(--fg)]' : 'border-[var(--border)]'
                    }`}>
                      {selected && <Check size={10} className="text-[var(--bg)]" />}
                    </span>
                    <span>{t(labelKey)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sütun Seçimi */}
          {selectedModules.length > 0 && (
            <div data-tour="excel-columns" className="space-y-3 pt-2 border-t border-[var(--border-soft)]">
              <label className="text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase block">Modül Sütunları</label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {MODULE_DEFS.filter((m) => selectedModules.includes(m.key)).map(({ key, labelKey }) => {
                  const allKeys = MODULE_COLUMNS[key].map((c) => c.key);
                  const active = selectedColumns[key] ?? allKeys;
                  return (
                    <div key={key} className="p-3 rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)]/20 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-[var(--fg)]">
                          {t(labelKey)} <span className="text-[10.5px] font-normal text-[var(--fg-muted)]">({active.length}/{allKeys.length})</span>
                        </span>
                        <div className="flex items-center gap-2 text-[10.5px]">
                          <button type="button" onClick={() => selectAllColumns(key)} className="text-[var(--fg)] font-semibold hover:underline cursor-pointer">Tümü</button>
                          <button type="button" onClick={() => clearAllColumns(key)} className="text-[var(--fg-muted)] hover:underline cursor-pointer">Temizle</button>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {MODULE_COLUMNS[key].map((col) => {
                          const checked = active.includes(col.key);
                          return (
                            <button
                              key={col.key}
                              type="button"
                              onClick={() => toggleColumn(key, col.key)}
                              className={`px-2 py-0.5 rounded-[2px] text-[11px] transition border cursor-pointer ${
                                checked
                                  ? 'border-[var(--border)] bg-[var(--card)] text-[var(--fg)] font-semibold shadow-xs'
                                  : 'border-transparent text-[var(--fg-muted)] hover:bg-[var(--bg-subtle)]'
                              }`}
                            >
                              {col.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Join (Tablo Birleştirme) Oluşturucu */}
          {selectedModules.length > 1 && (
            <div data-tour="excel-joins" className="space-y-3 pt-2 border-t border-[var(--border-soft)]">
              <label className="text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase block">Tablo Birleştirme (Join İlişkileri)</label>
              <div className="p-3 rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)]/20 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="w-36">
                    <CustomSelect
                      value={joinDraft.leftModule}
                      onChange={(v) => setJoinDraft((d) => ({ ...d, leftModule: v as ExcelReportModule, leftKey: '' }))}
                      options={moduleSelectOptions}
                      placeholder="Sol Modül"
                    />
                  </div>

                  <div className="w-36">
                    <CustomSelect
                      value={joinDraft.leftKey}
                      onChange={(v) => setJoinDraft((d) => ({ ...d, leftKey: String(v) }))}
                      options={leftKeyOptions}
                      placeholder="Sol Sütun"
                      disabled={!joinDraft.leftModule}
                    />
                  </div>

                  <ArrowRight size={13} className="text-[var(--fg-muted)] shrink-0" />

                  <div className="w-36">
                    <CustomSelect
                      value={joinDraft.rightModule}
                      onChange={(v) => setJoinDraft((d) => ({ ...d, rightModule: v as ExcelReportModule, rightKey: '' }))}
                      options={moduleSelectOptions.filter((m) => m.value !== joinDraft.leftModule)}
                      placeholder="Sağ Modül"
                    />
                  </div>

                  <div className="w-36">
                    <CustomSelect
                      value={joinDraft.rightKey}
                      onChange={(v) => setJoinDraft((d) => ({ ...d, rightKey: String(v) }))}
                      options={rightKeyOptions}
                      placeholder="Sağ Sütun"
                      disabled={!joinDraft.rightModule}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={addJoin}
                    disabled={!joinDraft.leftModule || !joinDraft.leftKey || !joinDraft.rightModule || !joinDraft.rightKey}
                    className="h-8 px-3 rounded-[4px] border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--bg-subtle)] text-xs font-semibold text-[var(--fg)] shadow-xs disabled:opacity-40 cursor-pointer"
                  >
                    + İlişki Ekle
                  </button>
                </div>

                {joins.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {joins.map((j, i) => (
                      <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[3px] border border-[var(--border-soft)] bg-[var(--card)] text-xs text-[var(--fg)] shadow-xs">
                        <span>{j.leftModule}.{j.leftKey} = {j.rightModule}.{j.rightKey}</span>
                        <button type="button" onClick={() => removeJoin(i)} className="text-[var(--fg-muted)] hover:text-rose-500 cursor-pointer">
                          <X size={11} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Canlı Önizleme Tablosu */}
        {previewSheets && previewTabKeys.length > 0 && (
          <div data-tour="excel-preview" className="p-4 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-[var(--border-soft)] pb-2">
              <h3 className="font-bold text-xs text-[var(--fg)] uppercase">Veri Önizleme</h3>
              <div className="flex items-center gap-1">
                {previewTabKeys.map((sheetKey) => (
                  <button
                    key={sheetKey}
                    type="button"
                    onClick={() => setActivePreviewTab(sheetKey)}
                    className={`h-7 px-2.5 rounded-[3px] text-xs font-semibold border transition cursor-pointer ${
                      activePreviewTab === sheetKey
                        ? 'border-[var(--border)] bg-[var(--card-hover)] text-[var(--fg)] font-bold shadow-xs'
                        : 'border-transparent text-[var(--fg-muted)] hover:text-[var(--fg)]'
                    }`}
                  >
                    {sheetKey}
                  </button>
                ))}
              </div>
            </div>

            {activePreviewTab && previewSheets[activePreviewTab] && (
              <VirtualizedPreviewTable
                rows={previewSheets[activePreviewTab]}
                columns={previewSheets[activePreviewTab].length > 0 ? Object.keys(previewSheets[activePreviewTab][0]) : []}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
