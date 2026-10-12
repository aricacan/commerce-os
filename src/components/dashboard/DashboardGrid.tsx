'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Plus, Check, X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { widgetApi } from '../../lib/api';
import { useI18n } from '../../lib/i18n';
import { WidgetCard, type WidgetConfig } from './WidgetCard';
import { useMobile } from '../../hooks/useMobile';
import type { WidgetLayout } from '../../types/api';
import { useAuthStore } from '../../stores/auth';

type RGLLayout = {
  i: string; x: number; y: number; w: number; h: number;
  minW?: number; minH?: number; static?: boolean;
};

const COLS = 12;
const MARGIN: [number, number] = [16, 16];
const PADDING: [number, number] = [16, 16];

const DEFAULT_LAYOUT: WidgetLayout[] = [];

const BUILTIN_IDS = [
  'top-categories', 'recent-orders', 'platform-dist', 'revenue-trend', 'top-products',
  'category-price', 'ai-success', 'moderation-load',
  'brand-sales', 'order-status', 'stock-low',
  'profit-trend', 'daily-orders', 'platform-compare', 'category-revenue',
  'cohort-mini', 'cannibalization-mini', 'anomaly-mini',
];

// BUILTIN_IDS already defined above

// Maps each builtin widget id to its translation key (used in the "Add Widget" dropdown).
const BUILTIN_LABEL_KEYS: Record<string, string> = {
  'top-categories':      'widget_top_categories',
  'recent-orders':       'widget_recent_orders',
  'platform-dist':       'widget_platform_dist',
  'revenue-trend':       'widget_revenue_trend',
  'top-products':        'widget_top_products',
  'category-price':      'widget_category_price',
  'ai-success':          'widget_ai_success',
  'moderation-load':     'widget_moderation_load',
  'brand-sales':         'widget_brand_sales',
  'order-status':        'widget_order_status',
  'stock-low':           'widget_stock_low',
  'profit-trend':        'widget_profit_trend',
  'daily-orders':        'widget_daily_orders',
  'platform-compare':    'widget_platform_compare',
  'category-revenue':    'widget_category_revenue',
  'cohort-mini':         'widget_cohort_analysis',
  'cannibalization-mini':'widget_cannibalization',
  'anomaly-mini':        'widget_system_health',
};

type GridLayoutComponent = React.ComponentType<{
  layout: RGLLayout[];
  cols: number;
  rowHeight: number;
  width: number;
  margin: [number, number];
  containerPadding: [number, number];
  isDraggable: boolean;
  isResizable: boolean;
  onLayoutChange: (layout: RGLLayout[]) => void;
  draggableHandle: string;
  children: React.ReactNode;
}>;

export function isWidgetAllowed(id: string, roles: string[]): boolean {
  const isDepo = roles.some(r => r.toLowerCase().includes('depo') || r.toLowerCase().includes('warehouse'));
  const isMuhasebe = roles.some(r => r.toLowerCase().includes('muhasebe') || r.toLowerCase().includes('finance') || r.toLowerCase().includes('accounting'));
  const isAdmin = roles.some(r => r.toLowerCase().includes('admin') || r.toLowerCase().includes('superadmin'));

  if (isAdmin) return true;

  if (isDepo) {
    const financialWidgets = [
      'revenue-trend', 'profit-trend', 'brand-sales', 'platform-dist',
      'category-revenue', 'platform-compare', 'cohort-mini', 'cannibalization-mini'
    ];
    return !financialWidgets.includes(id);
  }

  if (isMuhasebe) {
    const warehouseWidgets = [
      'stock-low', 'anomaly-mini'
    ];
    return !warehouseWidgets.includes(id);
  }

  return true;
}

export function DashboardGrid() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ width: 800, height: 600 });
  const isMobile = useMobile();
  const [editMode, setEditMode] = useState(false);
  const [layout, setLayout] = useState<WidgetLayout[]>(DEFAULT_LAYOUT);
  const [addOpen, setAddOpen] = useState(false);
  const [GridLayout, setGridLayout] = useState<GridLayoutComponent | null>(null);
  const [gridLoadError, setGridLoadError] = useState(false);
  const [gridLoadRetryToken, setGridLoadRetryToken] = useState(0);

  const roles = useAuthStore((s) => s.user?.roles ?? []);
  const allowedLayout = layout.filter(item => isWidgetAllowed(item.i, roles));

  // Load react-grid-layout on client — ÖNCEDEN .catch yoktu: chunk yüklemesi başarısız olursa
  // (ağ sorunu/CDN) GridLayout sonsuza kadar null kalıyor ve dashboard hiçbir hata göstermeden
  // boş kalıyordu. Artık en azından bir yeniden dene seçeneği sunuluyor.
  useEffect(() => {
    setGridLoadError(false);
    import('react-grid-layout')
      .then((mod) => {
        setGridLayout(() => (mod.default ?? mod) as unknown as GridLayoutComponent);
      })
      .catch(() => {
        setGridLoadError(true);
      });
  }, [gridLoadRetryToken]);

  // ResizeObserver for container dimensions
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(([entry]) => {
      setDims({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Load saved layout
  const { data: savedLayout } = useQuery({
    queryKey: ['widget-layout'],
    queryFn: widgetApi.getLayout,
  });

  useEffect(() => {
    if (!savedLayout) return;
    try {
      const parsed = JSON.parse(savedLayout.layout);
      if (Array.isArray(parsed)) {
        setLayout(parsed);
      }
    } catch { /* fallback to default */ }
  }, [savedLayout]);

  const saveLayoutMutation = useMutation({
    mutationFn: (l: WidgetLayout[]) => widgetApi.saveLayout(JSON.stringify(l)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['widget-layout'] }),
  });

  const { data: savedWidgets } = useQuery({
    queryKey: ['saved-widgets'],
    queryFn: widgetApi.list,
  });

  const resolveConfig = useCallback((id: string): WidgetConfig => {
    if (BUILTIN_IDS.includes(id)) return { type: 'builtin', id };
    const customId = id.replace('custom-', '');
    const w = savedWidgets?.find((x) => String(x.id) === customId);
    if (w) {
      return { type: 'custom', chartType: w.chartType, configJson: w.configJson, title: w.title };
    }
    return { type: 'custom', chartType: 'bar', configJson: '{}' };
  }, [savedWidgets]);

  const rowH = 80;

  const autoSave = useCallback((newLayout: WidgetLayout[]) => {
    saveLayoutMutation.mutate(newLayout);
  }, [saveLayoutMutation]);

  const handleLayoutChange = useCallback((newLayout: RGLLayout[]) => {
    const merged: WidgetLayout[] = newLayout.map((nl) => {
      const orig = layout.find((l) => l.i === nl.i);
      return { ...orig, ...nl } as WidgetLayout;
    });
    setLayout(merged);
    // Boyut/konum değişikliğini ANINDA kalıcı yap — eskiden yalnızca "Bitti"ye basınca
    // kaydediliyordu, düzenleme modundan Kaydet'e basmadan çıkınca (veya sayfa yenilenince)
    // ayarlanan boyut kayboluyordu. Sadece düzenleme modunda kaydet ki ilk mount'ta RGL'in
    // tetiklediği onLayoutChange gereksiz bir save yapmasın.
    if (editMode) autoSave(merged);
  }, [layout, editMode, autoSave]);

  function removeWidget(id: string) {
    setLayout((prev) => {
      const next = prev.filter((l) => l.i !== id);
      autoSave(next);
      return next;
    });
  }

  function addBuiltinWidget(id: string) {
    if (layout.find((l) => l.i === id)) return;
    const maxY = Math.max(...layout.map((l) => l.y + l.h), 0);
    setLayout((prev) => {
      const next = [...prev, { i: id, x: 0, y: maxY, w: 6, h: 3, minW: 3, minH: 2 }];
      autoSave(next);
      return next;
    });
    setAddOpen(false);
  }

  function addCustomWidget(widgetId: number) {
    const id = `custom-${widgetId}`;
    if (layout.find((l) => l.i === id)) return;
    const maxY = Math.max(...layout.map((l) => l.y + l.h), 0);
    setLayout((prev) => {
      const next = [...prev, { i: id, x: 0, y: maxY, w: 6, h: 3, minW: 3, minH: 2 }];
      autoSave(next);
      return next;
    });
    setAddOpen(false);
  }

  function handleDone() {
    setEditMode(false);
    saveLayoutMutation.mutate(layout);
  }

  const unusedBuiltins = BUILTIN_IDS.filter((id) => isWidgetAllowed(id, roles) && !layout.find((l) => l.i === id));

  // Mobile layout fallback (vertical stack)
  if (isMobile) {
    return (
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 12px 8px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {allowedLayout.map((item) => (
          <div key={item.i} style={{ height: 280, flexShrink: 0 }}>
            <WidgetCard config={resolveConfig(item.i)} editMode={false} onRemove={() => removeWidget(item.i)} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ width: '100%' }}>
      {/* Container with conditional Grid Helper pattern */}
      <div
        ref={containerRef}
        className={`w-full pr-1 ${editMode ? 'edit-grid-active' : ''}`}
        style={{ transition: 'all 0.3s', minHeight: '400px' }}
      >
        {gridLoadError && (
          <div className="flex flex-col items-center gap-2 py-10 text-sm text-[var(--fg-muted)]">
            <span>{t('dashboard_grid_load_error')}</span>
            <button
              type="button"
              className="rounded-[4px] border border-[var(--border)] px-3 py-1.5 text-xs font-semibold hover:bg-[var(--bg-subtle)]"
              onClick={() => setGridLoadRetryToken((n) => n + 1)}
            >
              {t('common_retry')}
            </button>
          </div>
        )}
        {GridLayout && dims.width > 0 && (
          <GridLayout
            layout={allowedLayout}
            cols={COLS}
            rowHeight={rowH}
            width={dims.width}
            margin={MARGIN}
            containerPadding={PADDING}
            isDraggable={editMode}
            isResizable={editMode}
            onLayoutChange={handleLayoutChange}
            draggableHandle=".drag-handle"
          >
            {allowedLayout.map((item) => (
              <div
                key={item.i}
                style={{ position: 'relative' }}
                className={editMode ? 'edit-widget-wrapper' : ''}
              >
                {/* Dotted Drag Handle Bar at the top */}
                {editMode && (
                  <div
                    className="drag-handle"
                    style={{
                      position: 'absolute', top: 8, left: 16, right: 44, height: 26,
                      zIndex: 10, cursor: 'grab',
                      background: 'var(--accent-soft)',
                      border: '1px dashed var(--accent-dim)',
                      borderRadius: 8,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, fontWeight: 700, color: 'var(--accent)',
                      letterSpacing: '0.5px', textTransform: 'uppercase',
                      transition: 'all 0.2s',
                    }}
                  >
                    <span style={{ marginRight: 6 }}>⋮⋮</span> {t('dashboard_hold_drag')}
                  </div>
                )}

                {/* X Delete Button */}
                {editMode && (
                  <button
                    onClick={(e) => { e.stopPropagation(); removeWidget(item.i); }}
                    className="widget-delete-btn"
                    style={{
                      position: 'absolute', top: 8, right: 10,
                      zIndex: 20,
                      width: 26, height: 26,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'var(--card)',
                      border: '1px solid var(--border-soft)',
                      borderRadius: 8,
                      cursor: 'pointer',
                      color: 'var(--fg-muted)',
                      boxShadow: 'var(--shadow-xs)',
                      transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                  >
                    <X size={13} />
                  </button>
                )}

                <div style={{ position: 'absolute', inset: 0 }}>
                  <WidgetCard
                    config={resolveConfig(item.i)}
                    editMode={editMode}
                    onRemove={() => removeWidget(item.i)}
                  />
                </div>
              </div>
            ))}
          </GridLayout>
        )}
      </div>

      {/* Floating Action Bar / Controls Dock — yüzen Aivar kartının (AiFloatingWidget.tsx) altında durur */}
      <div
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9960,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        {editMode ? (
          <div
            className="premium-edit-dock"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 6px',
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            {/* Add Widget Dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setAddOpen((o) => !o)}
                className="dashboard-add-widget-btn"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  height: '30px',
                  padding: '0 10px',
                  background: 'var(--bg-subtle)',
                  color: 'var(--fg)',
                  border: '1px solid var(--border-soft)',
                  borderRadius: '5px',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--card-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--bg-subtle)')}
              >
                <Plus size={13} style={{ color: 'var(--accent)' }} />
                <span>{t('dashboard_add_widget')}</span>
              </button>

              {addOpen && (
                <>
                  <div
                    style={{ position: 'fixed', inset: 0, zIndex: 10 }}
                    onClick={() => setAddOpen(false)}
                  />
                  <div
                    className="animate-fade-in premium-dropdown"
                    style={{
                      position: 'absolute',
                      right: 0,
                      bottom: 'calc(100% + 8px)',
                      width: '220px',
                      background: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      boxShadow: 'var(--shadow-lg)',
                      zIndex: 20,
                      maxHeight: '280px',
                      overflowY: 'auto',
                      padding: '6px',
                    }}
                  >
                    {unusedBuiltins.length > 0 && (
                      <>
                        <p style={{ padding: '4px 8px', fontSize: '9.5px', fontWeight: 800, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.6px', margin: 0 }}>
                          {t('dashboard_builtin_reports')}
                        </p>
                        {unusedBuiltins.map((id) => (
                          <button
                            key={id}
                            onClick={() => addBuiltinWidget(id)}
                            className="dropdown-item-btn"
                            style={{
                              width: '100%',
                              textAlign: 'left',
                              padding: '6px 8px',
                              fontSize: '12px',
                              fontWeight: 600,
                              background: 'transparent',
                              border: 'none',
                              borderRadius: '4px',
                              color: 'var(--fg)',
                              cursor: 'pointer',
                              transition: 'all 0.12s',
                            }}
                          >
                            {BUILTIN_LABEL_KEYS[id] ? t(BUILTIN_LABEL_KEYS[id] as Parameters<typeof t>[0]) : id.replace(/-/g, ' ')}
                          </button>
                        ))}
                      </>
                    )}
                    {savedWidgets && savedWidgets.length > 0 && (
                      <>
                        {unusedBuiltins.length > 0 && <div style={{ height: 1, background: 'var(--border-soft)', margin: '4px 0' }} />}
                        <p style={{ padding: '4px 8px', fontSize: '9.5px', fontWeight: 800, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.6px', margin: 0 }}>
                          {t('dashboard_my_custom_charts')}
                        </p>
                        {savedWidgets.map((w) => (
                          <button
                            key={w.id}
                            onClick={() => addCustomWidget(w.id)}
                            className="dropdown-item-btn"
                            style={{
                              width: '100%',
                              textAlign: 'left',
                              padding: '6px 8px',
                              fontSize: '12px',
                              fontWeight: 600,
                              background: 'transparent',
                              border: 'none',
                              borderRadius: '4px',
                              color: 'var(--fg)',
                              cursor: 'pointer',
                              transition: 'all 0.12s',
                            }}
                          >
                            {w.title}
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Save / Done Button */}
            <button
              onClick={handleDone}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                height: '30px',
                padding: '0 12px',
                background: 'var(--accent)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '5px',
                fontSize: '11.5px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: 'var(--shadow-xs)',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
            >
              <Check size={13} />
              <span>{t('save')}</span>
            </button>
          </div>
        ) : (
          /* Floating Edit Button Trigger - Sleek Glass Pill */
          <button
            onClick={() => setEditMode(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              height: '32px',
              padding: '0 12px',
              background: 'var(--card)',
              color: 'var(--fg)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              boxShadow: 'var(--shadow-md)',
              fontSize: '11.5px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.18s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
            title={t('dashboard_edit_mode')}
          >
            <span>{t('dashboard_edit_mode')}</span>
          </button>
        )}
      </div>

      <style>{`
        /* Radial dot background when editing — tek accent, .dark override'a gerek yok:
           var(--accent-soft) zaten temaya göre kendi değişiyor. */
        .edit-grid-active {
          background-image: radial-gradient(var(--accent-soft) 1.5px, transparent 1.5px);
          background-size: 20px 20px;
          border-radius: 20px;
        }

        /* Outline widget cards in edit mode */
        .edit-widget-wrapper {
          border: 1px dashed var(--accent-dim) !important;
          border-radius: 24px;
          padding: 2px;
          background: var(--accent-soft);
          transition: all 0.25s ease;
        }

        .edit-widget-wrapper:hover {
          border-color: var(--accent) !important;
          box-shadow: var(--shadow-sm);
        }

        /* Widget drag handle hover state */
        .drag-handle:hover {
          background: var(--accent-dim) !important;
          border-color: var(--accent) !important;
          color: var(--accent-h) !important;
        }

        /* Widget delete button hover state — kırmızı bilinçli: yıkıcı işlem sinyali */
        .widget-delete-btn:hover {
          background: var(--danger-soft) !important;
          border-color: var(--danger) !important;
          color: var(--danger) !important;
        }

        /* Premium dropdown button hover */
        .dropdown-item-btn:hover {
          background: var(--accent-soft) !important;
          color: var(--accent) !important;
        }

        /* Dark mode edit dock override — glassmorphism efekti token'a bağlı değil,
           bilinçli olarak yarı saydam beyaz/siyah katman kullanıyor. */
        .dark .premium-edit-dock {
          background: rgba(30, 30, 30, 0.8) !important;
          border-color: rgba(255,255,255,0.08) !important;
          box-shadow: 0 10px 40px rgba(0,0,0,0.3) !important;
        }

        /* Dark mode dropdown list override */
        .dark .premium-dropdown {
          background: rgba(30, 30, 30, 0.9) !important;
          border-color: rgba(255,255,255,0.08) !important;
          box-shadow: 0 10px 30px rgba(0,0,0,0.4) !important;
        }
      `}</style>
    </div>
  );
}
