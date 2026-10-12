import type { DemoRoute } from '../router';
import { dashboardAiRoutes } from './dashboard-ai';
import { dashboardAnalyticsRoutes } from './dashboard-analytics';
import { dashboardCardRoutes } from './dashboard-cards';
import { dashboardChartRoutes } from './dashboard-charts';
import { dashboardOrderRoutes } from './dashboard-orders';
import { dashboardReportRoutes } from './dashboard-reports';
import { dashboardShellRoutes } from './dashboard-shell';
import { dashboardWidgetRoutes } from './dashboard-widgets';

// Pano + uygulama kabuğu + analiz/rapor uçları. Alt dosyalar konuya göre ayrıldı.
export const dashboardRoutes: DemoRoute[] = [
  ...dashboardShellRoutes,
  ...dashboardOrderRoutes,
  ...dashboardChartRoutes,
  ...dashboardWidgetRoutes,
  ...dashboardCardRoutes,
  ...dashboardAnalyticsRoutes,
  ...dashboardReportRoutes,
  ...dashboardAiRoutes,
];
