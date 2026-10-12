import type { DemoRoute } from '../router';
import { logisticsBaseCatalogRoutes } from './logistics-base-catalog';
import { logisticsBasetrackRoutes } from './logistics-basetrack';
import { logisticsOperationsRoutes } from './logistics-operations';
import { logisticsPackagingRoutes } from './logistics-packaging';
import { logisticsPolicyRoutes } from './logistics-policies';
import { logisticsSentosRoutes } from './logistics-sentos';
import { logisticsShippingRoutes } from './logistics-shipping';
import { logisticsWarehouseRoutes } from './logistics-warehouse';

// Lojistik alanı: kargo, WMS, Base Hub, Sentos Hub, koli, operasyon kuyruğu ve harita.
export const logisticsRoutes: DemoRoute[] = [
  ...logisticsShippingRoutes,
  ...logisticsPolicyRoutes,
  ...logisticsPackagingRoutes,
  ...logisticsWarehouseRoutes,
  ...logisticsBasetrackRoutes,
  ...logisticsBaseCatalogRoutes,
  ...logisticsSentosRoutes,
  ...logisticsOperationsRoutes,
];
