import type { DemoRoute } from '../router';
import { authRoutes } from './auth';
import { dashboardRoutes } from './dashboard';
import { financeRoutes } from './finance';
import { logisticsRoutes } from './logistics';
import { omnichannelRoutes } from './omnichannel';
import { ordersRoutes } from './orders';
import { productsRoutes } from './products';
import { systemRoutes } from './system';

// Sıra önemli: ilk eşleşen kazanır. Daha özel yollar daha genel olanlardan önce gelmeli.
export const demoRoutes: DemoRoute[] = [
  ...authRoutes,
  ...dashboardRoutes,
  ...ordersRoutes,
  ...productsRoutes,
  ...omnichannelRoutes,
  ...financeRoutes,
  ...logisticsRoutes,
  ...systemRoutes,
];
