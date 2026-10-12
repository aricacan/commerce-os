'use client';

import { createElement, Suspense, useState, useEffect, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dashboardApi, widgetApi, platformApi, categoryApi } from '../../../../lib/api';
import { useI18n } from '../../../../lib/i18n';
import type { DynamicChartRequest } from '../../../../types/api';
import { Trash2, Pencil, ChevronDown, Save } from 'lucide-react';
import { useMobile } from '../../../../hooks/useMobile';
import { BRAND_OPTIONS } from '../../../../stores/store-selector';
import { MultiSelect, type MultiSelectOption } from '../../../../components/ui/MultiSelect';
import { ConfirmDialog } from '../../../../components/ui/ConfirmDialog';
import { DEFAULT_WIDGET_ICON, resolveWidgetIcon } from '../../../../lib/widget-icons';
import { queryKeys } from '../../../../lib/query-keys';
import { WidgetDataSummary } from '../../../../components/customize/WidgetDataSummary';
import {
  CHART_TYPES, CHART_TYPE_LABEL_KEYS, CustomSelect,
  THEME_COLORS, THEME_COLOR_LABEL_KEYS, type CustomSelectOption,
} from '../../../../components/customize/widget-controls';

const WidgetChartPreview = dynamic(() => import('../../../../components/customize/WidgetChartPreview')
  .then((module) => module.WidgetChartPreview));

type ChartGroup = DynamicChartRequest['groupBy'];
type ChartAggregate = DynamicChartRequest['aggregate'];
type OptionalChartAggregate = ChartAggregate | 'none';

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 mb-2 mt-1">
      <span className="w-1 h-3 rounded-[1px] bg-[var(--fg)]" />
      <span className="text-[10px] font-bold text-[var(--fg-muted)] uppercase tracking-wider">
        {children}
      </span>
    </div>
  );
}

export default function CustomizePage() {
  const { t, lang } = useI18n();
  const isMobile = useMobile();
  const qc = useQueryClient();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Data config
  const [groupBy,         setGroupBy]         = useState<ChartGroup>('Category');
  const [aggregate,       setAggregate]        = useState<ChartAggregate>('Count');
  const [aggregate2,      setAggregate2]       = useState<OptionalChartAggregate>('none');
  const [platformFilter,  setPlatformFilter]   = useState('');
  const [storeCodes,      setStoreCodes]       = useState<(string | number)[]>([]);
  const [categoryIds,     setCategoryIds]      = useState<(string | number)[]>([]);

  // Visual config
  const [chartType,    setChartType]    = useState('bar');
  const [color,        setColor]        = useState('#3b82f6');
  const [showGrid,     setShowGrid]     = useState(true);
  const [showLegend,   setShowLegend]   = useState(false);
  const [strokeW,      setStrokeW]      = useState(2);
  const [useGrad,      setUseGrad]      = useState(true);
  const [limit,        setLimit]        = useState('all');
  const [valueFormat,  setValueFormat]  = useState<'number' | 'currency' | 'percent'>('number');
  const [showDataLabels, setShowDataLabels] = useState(false);

  // Widget meta
  const [title,       setTitle]       = useState('');
  const [icon,        setIcon]        = useState(DEFAULT_WIDGET_ICON);
  const [description, setDescription] = useState('');

  // Edit & list state
  const [editingId,          setEditingId]          = useState<number | null>(null);
  const [savedMsg,            setSavedMsg]            = useState('');
  const [savedDropdownOpen,   setSavedDropdownOpen]   = useState(false);
  const [deletingWidgetId,    setDeletingWidgetId]    = useState<number | null>(null);

  const { data: platforms } = useQuery({
    queryKey: ['platforms'],
    queryFn: () => platformApi.list(),
    staleTime: 5 * 60_000,
  });

  const { data: categories } = useQuery({
    queryKey: ['categories-master'],
    queryFn: () => categoryApi.master(),
    staleTime: 5 * 60_000,
  });

  const { data: savedWidgets } = useQuery({
    queryKey: ['saved-widgets'],
    queryFn: () => widgetApi.list(),
  });

  const storeOptions: MultiSelectOption[] = useMemo(
    () => BRAND_OPTIONS.map((o) => ({ value: o.code, label: o.label, color: o.color })),
    []
  );

  const categoryOptions: MultiSelectOption[] = useMemo(
    () => (categories ?? []).map((c) => ({ value: c.id, label: c.name })),
    [categories]
  );

  useEffect(() => {
    function clickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setSavedDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', clickOutside);
    return () => document.removeEventListener('mousedown', clickOutside);
  }, []);

  const [previewReq1, setPreviewReq1] = useState<DynamicChartRequest | null>(null);
  const [previewReq2, setPreviewReq2] = useState<DynamicChartRequest | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      const storeCodesArg = storeCodes.length ? (storeCodes as string[]) : undefined;
      const categoryIdsArg = categoryIds.length ? (categoryIds as number[]) : undefined;
      setPreviewReq1({ groupBy, aggregate, platformFilter: platformFilter || undefined, storeCodes: storeCodesArg, categoryIds: categoryIdsArg });
      if (aggregate2 && aggregate2 !== 'none') {
        setPreviewReq2({ groupBy, aggregate: aggregate2, platformFilter: platformFilter || undefined, storeCodes: storeCodesArg, categoryIds: categoryIdsArg });
      } else {
        setPreviewReq2(null);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [groupBy, aggregate, aggregate2, platformFilter, storeCodes, categoryIds]);

  const { data: previewData1, isLoading: previewLoading1 } = useQuery({
    queryKey: queryKeys.widgets.preview(1, previewReq1),
    queryFn:  ({ signal }) => dashboardApi.dynamicChart(previewReq1!, signal),
    enabled:  !!previewReq1,
  });

  const { data: previewData2 } = useQuery({
    queryKey: queryKeys.widgets.preview(2, previewReq2),
    queryFn:  ({ signal }) => dashboardApi.dynamicChart(previewReq2!, signal),
    enabled:  !!previewReq2,
  });

  const previewData = useMemo(() => {
    if (!previewData1) return undefined;
    if (!previewReq2 || !previewData2) {
      return previewData1.map(item => ({ label: item.label, value: item.value }));
    }
    return previewData1.map(item1 => {
      const item2 = previewData2.find(x => x.label === item1.label);
      return {
        label: item1.label,
        value: item1.value,
        value2: item2 ? item2.value : 0
      };
    });
  }, [previewData1, previewData2, previewReq2]);

  const configPayload = () => ({
    title: title.trim() || 'Yeni Widget',
    chartType,
    configJson: JSON.stringify({
      groupBy, aggregate, aggregate2, platformFilter: platformFilter || undefined,
      storeCodes: storeCodes.length ? storeCodes : undefined,
      categoryIds: categoryIds.length ? categoryIds : undefined,
      color, showGrid, showLegend, strokeWidth: strokeW, useGradient: useGrad, limit, valueFormat, showDataLabels,
      icon, description: description.trim() || undefined,
    }),
  });

  const saveMutation = useMutation({
    meta: { successMessage: 'Widget kaydedildi' } as const,
    mutationFn: () => editingId
      ? widgetApi.update(editingId, configPayload())
      : widgetApi.create(configPayload()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['saved-widgets'] });
      setSavedMsg(editingId ? 'Widget güncellendi.' : 'Widget kaydedildi.');
      setTimeout(() => setSavedMsg(''), 2200);
      setTitle('');
      setIcon(DEFAULT_WIDGET_ICON);
      setDescription('');
      setEditingId(null);
    },
  });

  function loadWidgetForEdit(w: { id: number; title: string; chartType: string; configJson: string }) {
    setEditingId(w.id);
    setTitle(w.title);
    setChartType(w.chartType);
    setSavedDropdownOpen(false);
    try {
      const cfg = JSON.parse(w.configJson);
      if (cfg.groupBy) setGroupBy(cfg.groupBy);
      if (cfg.aggregate) setAggregate(cfg.aggregate);
      setAggregate2(cfg.aggregate2 ?? 'none');
      setPlatformFilter(cfg.platformFilter ?? '');
      setStoreCodes(cfg.storeCodes ?? []);
      setCategoryIds(cfg.categoryIds ?? []);
      if (cfg.color) setColor(cfg.color);
      setShowGrid(cfg.showGrid ?? true);
      setShowLegend(cfg.showLegend ?? false);
      setStrokeW(cfg.strokeWidth ?? 2);
      setUseGrad(cfg.useGradient ?? true);
      setLimit(cfg.limit ?? 'all');
      if (cfg.valueFormat) setValueFormat(cfg.valueFormat);
      setShowDataLabels(cfg.showDataLabels ?? false);
      setIcon(cfg.icon ?? DEFAULT_WIDGET_ICON);
      setDescription(cfg.description ?? '');
    } catch { /* ignore */ }
  }

  function cancelEdit() {
    setEditingId(null);
    setTitle('');
    setIcon(DEFAULT_WIDGET_ICON);
    setDescription('');
  }

  const deleteMutation = useMutation({
    meta: { successMessage: 'Widget silindi' } as const,
    mutationFn: widgetApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['saved-widgets'] });
      setDeletingWidgetId(null);
    },
  });

  const platformOptions: CustomSelectOption<string>[] = useMemo(() => {
    const opts: CustomSelectOption<string>[] = [{ value: '', label: lang === 'tr' ? 'Tüm Platformlar' : 'All Platforms' }];
    (platforms ?? []).forEach((p: { id: number; name: string }) => opts.push({ value: p.name, label: p.name }));
    return opts;
  }, [platforms, lang]);

  return (
    <div className={`flex h-full overflow-hidden p-4 sm:p-5 gap-4 bg-transparent text-xs ${isMobile ? 'flex-col overflow-y-auto' : 'flex-row'}`}>
      {/* ── Sol: Canlı Grafik Önizleme (Flex-1) ── */}
      <div className="flex-1 flex flex-col min-w-0 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] shadow-xs overflow-hidden">
        {/* Grafik Türü Seçici & Kayıtlı Widgetlar Butonu */}
        <div className="flex items-center justify-between gap-2 p-3 border-b border-[var(--border-soft)] bg-[var(--bg-subtle)]/20">
          <div data-tour="widget-chart-types" className="flex items-center gap-1 overflow-x-auto">
            {CHART_TYPES.map(({ id, preview }) => {
              const active = chartType === id;
              const label = t(CHART_TYPE_LABEL_KEYS[id]);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setChartType(id)}
                  className={`h-7 px-2.5 rounded-[3px] text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border shrink-0 ${
                    active
                      ? 'border-[var(--border)] bg-[var(--card)] text-[var(--fg)] font-bold shadow-xs'
                      : 'border-transparent text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)]'
                  }`}
                >
                  <span className="w-3.5 h-3.5 flex items-center justify-center opacity-70">
                    {preview(active ? color : 'currentColor')}
                  </span>
                  <span>{label}</span>
                </button>
              );
            })}
          </div>

          <div data-tour="widget-saved-list" ref={dropdownRef} className="relative shrink-0">
            <button
              type="button"
              onClick={() => setSavedDropdownOpen(!savedDropdownOpen)}
              className="h-7 px-2.5 rounded-[3px] border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--bg-subtle)] text-xs font-semibold text-[var(--fg)] shadow-xs transition cursor-pointer flex items-center gap-1.5"
            >
              <span>Kayıtlı Widgetlar ({savedWidgets?.length ?? 0})</span>
              <ChevronDown size={11} className={`transition-transform duration-200 ${savedDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {savedDropdownOpen && (
              <div className="absolute right-0 top-[calc(100%+4px)] z-50 w-64 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-2 shadow-lg space-y-1">
                <span className="text-[10px] font-bold text-[var(--fg-muted)] uppercase block px-1">Kayıtlı Şablonlar</span>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {!savedWidgets?.length ? (
                    <p className="p-3 text-center text-xs text-[var(--fg-muted)]">Kayıtlı widget yok.</p>
                  ) : (
                    savedWidgets.map((w) => (
                      <div
                        key={w.id}
                        className={`flex items-center justify-between p-2 rounded-[3px] text-xs border transition ${
                          editingId === w.id ? 'border-[var(--border)] bg-[var(--card-hover)] font-bold' : 'border-transparent hover:bg-[var(--bg-subtle)]'
                        }`}
                      >
                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => loadWidgetForEdit(w)}>
                          <p className="truncate text-xs font-semibold text-[var(--fg)]">{w.title}</p>
                          <p className="text-[10px] text-[var(--fg-muted)] uppercase font-mono">{w.chartType}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => loadWidgetForEdit(w)} className="p-1 text-[var(--fg-muted)] hover:text-[var(--fg)] cursor-pointer">
                            <Pencil size={11} />
                          </button>
                          <button type="button" onClick={() => setDeletingWidgetId(w.id)} className="p-1 text-rose-500 hover:opacity-80 cursor-pointer">
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Canlı Grafik Alanı */}
        <div data-tour="widget-preview" className="flex-1 p-4 flex flex-col min-h-[340px] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-[3px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] flex items-center justify-center text-[var(--fg)]">
                {createElement(resolveWidgetIcon(icon), { size: 13 })}
              </span>
              <div>
                <h3 className="font-bold text-xs text-[var(--fg)]">{title.trim() || 'Widget Önizleme'}</h3>
                {description.trim() && <p className="text-[10.5px] text-[var(--fg-muted)]">{description.trim()}</p>}
              </div>
            </div>
            {previewLoading1 && <span className="text-[11px] text-[var(--fg-muted)] animate-pulse">Yükleniyor...</span>}
          </div>

          <div className="flex-1 min-h-[260px]">
            <Suspense fallback={<div className="h-full animate-pulse rounded-[4px] bg-[var(--bg-subtle)]" />}>
              <WidgetChartPreview
                chartType={chartType} data={previewData}
                color={color} showGrid={showGrid} showLegend={showLegend}
                strokeWidth={strokeW} useGradient={useGrad} limit={limit}
                valueFormat={valueFormat} aggregate={aggregate} aggregate2={aggregate2}
                showDataLabels={showDataLabels}
              />
            </Suspense>
          </div>

          <WidgetDataSummary data={previewData} limit={limit} />
        </div>
      </div>

      {/* ── Sağ: Ayarlar Paneli ── */}
      <div className={`flex flex-col shrink-0 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] shadow-xs overflow-hidden ${isMobile ? 'w-full' : 'w-80'}`}>
        <div className="flex-1 overflow-y-auto p-4 space-y-4 pr-2">
          {/* Başlık ve İkon */}
          <div data-tour="widget-meta" className="space-y-2">
            <SectionLabel>WIDGET BİLGİLERİ</SectionLabel>
            <div>
              <label className="text-[10px] text-[var(--fg-muted)] uppercase font-semibold block mb-1">Widget Başlığı</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Örn: Aylık Kategori Satışları"
                className="h-8 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] outline-none focus:border-[var(--fg)]"
              />
            </div>
            <div>
              <label className="text-[10px] text-[var(--fg-muted)] uppercase font-semibold block mb-1">Açıklama (Opsiyonel)</label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Widget altındaki kısa not..."
                className="h-8 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] outline-none focus:border-[var(--fg)]"
              />
            </div>
          </div>

          <div className="h-[1px] bg-[var(--border-soft)]" />

          {/* 1. Veri Kaynağı */}
          <div data-tour="widget-datasource" className="space-y-2.5">
            <SectionLabel>VERİ KAYNAĞI & BOYUTLAR</SectionLabel>
            <div>
              <label className="text-[10px] text-[var(--fg-muted)] uppercase font-semibold block mb-1">Gruplama (X Ekseni)</label>
              <CustomSelect
                value={groupBy}
                onChange={setGroupBy}
                options={[
                  { value: 'Category', label: 'Kategori' },
                  { value: 'Platform', label: 'Platform' },
                  { value: 'Brand', label: 'Marka' },
                  { value: 'OrderStatus', label: 'Sipariş Durumu' },
                ]}
              />
            </div>

            <div>
              <label className="text-[10px] text-[var(--fg-muted)] uppercase font-semibold block mb-1">Metrik 1 (Y Ekseni)</label>
              <CustomSelect
                value={aggregate}
                onChange={setAggregate}
                options={[
                  { value: 'Count', label: 'Sipariş Sayısı' },
                  { value: 'AvgPrice', label: 'Ortalama Fiyat' },
                  { value: 'TotalRevenue', label: 'Toplam Ciro' },
                  { value: 'TotalStock', label: 'Toplam Stok' },
                ]}
              />
            </div>

            <div>
              <label className="text-[10px] text-[var(--fg-muted)] uppercase font-semibold block mb-1">Metrik 2 (İkincil Çizgi/Bar)</label>
              <CustomSelect
                value={aggregate2}
                onChange={setAggregate2}
                options={[
                  { value: 'none', label: 'Yok' },
                  { value: 'Count', label: 'Sipariş Sayısı' },
                  { value: 'AvgPrice', label: 'Ortalama Fiyat' },
                  { value: 'TotalRevenue', label: 'Toplam Ciro' },
                  { value: 'TotalStock', label: 'Toplam Stok' },
                ]}
              />
            </div>

            <div>
              <label className="text-[10px] text-[var(--fg-muted)] uppercase font-semibold block mb-1">Platform Filtresi</label>
              <CustomSelect
                value={platformFilter}
                onChange={(v) => setPlatformFilter(String(v))}
                options={platformOptions}
              />
            </div>

            <div>
              <label className="text-[10px] text-[var(--fg-muted)] uppercase font-semibold block mb-1">Mağaza Filtresi</label>
              <MultiSelect
                label="Mağaza"
                options={storeOptions}
                selected={storeCodes}
                onChange={setStoreCodes}
                allLabel="Tüm Mağazalar"
                compact
              />
            </div>

            {/* Kategori filtresi: categoryIds onizleme isteginde de kayit yukunde de ZATEN
                tasiniyordu, eksik olan tek sey bu kontroldu. */}
            <div>
              <label className="text-[10px] text-[var(--fg-muted)] uppercase font-semibold block mb-1">Kategori Filtresi</label>
              <MultiSelect
                label="Kategori"
                options={categoryOptions}
                selected={categoryIds}
                onChange={setCategoryIds}
                allLabel="Tüm Kategoriler"
                compact
              />
            </div>
          </div>

          <div className="h-[1px] bg-[var(--border-soft)]" />

          {/* 2. Görünüm Tasarımı */}
          <div data-tour="widget-styles" className="space-y-2.5">
            <SectionLabel>GÖRSEL & STİL AYARLARI</SectionLabel>
            <div>
              <label className="text-[10px] text-[var(--fg-muted)] uppercase font-semibold block mb-1">Tema Rengi</label>
              <CustomSelect
                value={color}
                onChange={(v) => setColor(String(v))}
                options={THEME_COLORS.map((tc) => ({
                  value: tc.id,
                  label: t(THEME_COLOR_LABEL_KEYS[tc.id]),
                  color: tc.id,
                }))}
              />
            </div>

            <div>
              <label className="text-[10px] text-[var(--fg-muted)] uppercase font-semibold block mb-1">Değer Formatı</label>
              <CustomSelect
                value={valueFormat}
                onChange={setValueFormat}
                options={[
                  { value: 'number', label: 'Sayısal' },
                  { value: 'currency', label: 'Para Birimi (₺)' },
                  { value: 'percent', label: 'Yüzde (%)' },
                ]}
              />
            </div>

            <div>
              <label className="text-[10px] text-[var(--fg-muted)] uppercase font-semibold block mb-1">Kayıt Limiti</label>
              <CustomSelect
                value={limit}
                onChange={(v) => setLimit(String(v))}
                options={[
                  { value: 'all', label: 'Tümü' },
                  { value: '5', label: 'İlk 5' },
                  { value: '10', label: 'İlk 10' },
                  { value: '15', label: 'İlk 15' },
                ]}
              />
            </div>
          </div>
        </div>

        {/* Kaydet & İptal Footer */}
        <div className="p-3 border-t border-[var(--border-soft)] bg-[var(--bg-subtle)]/30 flex items-center justify-between gap-2">
          {editingId ? (
            <button
              type="button"
              onClick={cancelEdit}
              className="h-8 px-3 rounded-[4px] border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--bg-subtle)] text-xs text-[var(--fg-muted)] cursor-pointer"
            >
              Vazgeç
            </button>
          ) : <div />}

          <button
            data-tour="widget-save-btn"
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="h-8 px-4 rounded-[4px] border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--bg-subtle)] text-xs font-bold text-[var(--fg)] shadow-xs hover:border-[var(--fg-muted)] transition cursor-pointer flex items-center gap-1.5 disabled:opacity-40"
          >
            <Save size={13} />
            <span>{editingId ? 'Güncelle' : 'Widget Kaydet'}</span>
          </button>

          {/* Kaydetme geri bildirimi: mesaj uretiliyordu ama hicbir yerde gosterilmiyordu. */}
          {savedMsg && (
            <span className="text-xs font-semibold text-emerald-600">{savedMsg}</span>
          )}
        </div>
      </div>

      {/* Silme ONAYI: cop kutusu butonu deletingWidgetId'yi set ediyordu ama bu durumu
          okuyan hicbir sey yoktu - yani silme butonu HICBIR SEY YAPMIYORDU. */}
      <ConfirmDialog
        open={deletingWidgetId !== null}
        title="Widget silinsin mi?"
        description="Bu widget kalıcı olarak silinecek. Panolara eklenmiş kopyaları da kaybolur."
        onConfirm={() => {
          if (deletingWidgetId !== null) deleteMutation.mutate(deletingWidgetId);
        }}
        onCancel={() => setDeletingWidgetId(null)}
      />
    </div>
  );
}
