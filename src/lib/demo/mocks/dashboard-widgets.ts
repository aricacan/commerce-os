// Pano widget düzeni ve kullanıcı widget'ları. Değişiklikler oturum belleğinde tutulur.
import type { SavedWidget, WidgetLayout } from '../../../types/api';
import { ago } from '../seed';
import { sessionGet, sessionSet } from '../session-store';
import { del, get, post, put, type DemoRoute } from '../router';

const LAYOUT_KEY = 'dashboard.widget-layout';
const WIDGETS_KEY = 'dashboard.saved-widgets';
const CUSTOM_PREFIX = 'custom-';

interface WidgetBody {
  title: string;
  chartType: string;
  configJson: string;
}

const DEFAULT_LAYOUT: WidgetLayout[] = [
  { i: 'revenue-trend', x: 0, y: 0, w: 8, h: 4, minW: 3, minH: 3 },
  { i: 'platform-dist', x: 8, y: 0, w: 4, h: 4, minW: 3, minH: 3 },
  { i: 'top-categories', x: 0, y: 4, w: 4, h: 4, minW: 3, minH: 3 },
  { i: 'order-status', x: 4, y: 4, w: 4, h: 4, minW: 3, minH: 3 },
  { i: 'profit-trend', x: 8, y: 4, w: 4, h: 4, minW: 3, minH: 3 },
  { i: 'top-products', x: 0, y: 8, w: 6, h: 4, minW: 3, minH: 3 },
  { i: 'brand-sales', x: 6, y: 8, w: 6, h: 4, minW: 3, minH: 3 },
  { i: 'cohort-mini', x: 0, y: 12, w: 4, h: 4, minW: 3, minH: 3 },
  { i: 'anomaly-mini', x: 4, y: 12, w: 4, h: 4, minW: 3, minH: 3 },
  { i: 'cannibalization-mini', x: 8, y: 12, w: 4, h: 4, minW: 3, minH: 3 },
  { i: `${CUSTOM_PREFIX}1`, x: 0, y: 16, w: 6, h: 4, minW: 3, minH: 3 },
];

const WEEKLY_CATEGORY_CONFIG = JSON.stringify({
  groupBy: 'Category',
  aggregate: 'Count',
  description: 'Kategorilere göre sipariş adedi',
  icon: 'BarChart3',
  color: '#3b82f6',
  showGrid: true,
  limit: 'all',
});

function seedWidgets(): SavedWidget[] {
  return [
    { id: 1, title: 'Kategori Sipariş Adedi', chartType: 'bar', configJson: WEEKLY_CATEGORY_CONFIG, createdAt: ago(12) },
  ];
}

const widgets = () => sessionGet<SavedWidget[]>(WIDGETS_KEY, seedWidgets);

function createWidget(body: WidgetBody): SavedWidget {
  const items = widgets();
  const widget: SavedWidget = { id: Math.max(0, ...items.map((item) => item.id)) + 1, createdAt: new Date().toISOString(), ...body };
  sessionSet(WIDGETS_KEY, [...items, widget]);
  return widget;
}

function updateWidget(id: number, body: WidgetBody): SavedWidget | undefined {
  const updated = widgets().map((item) => (item.id === id ? { ...item, ...body } : item));
  sessionSet(WIDGETS_KEY, updated);
  return updated.find((item) => item.id === id);
}

export const dashboardWidgetRoutes: DemoRoute[] = [
  get('/widget', widgets),
  get('/widget/layout', () => ({ layout: JSON.stringify(sessionGet<WidgetLayout[]>(LAYOUT_KEY, () => DEFAULT_LAYOUT)) })),
  put('/widget/layout', ({ body }) => {
    const { layout } = body as { layout: string };
    sessionSet(LAYOUT_KEY, JSON.parse(layout) as WidgetLayout[]);
    return undefined;
  }),
  post('/widget', ({ body }) => createWidget(body as WidgetBody)),
  put('/widget/:id', ({ params, body }) => updateWidget(Number(params.id), body as WidgetBody)),
  del('/widget/:id', ({ params }) => {
    sessionSet(WIDGETS_KEY, widgets().filter((item) => String(item.id) !== params.id));
    return undefined;
  }),
];
