import type { DemoRoute } from '../router';
import { orderClaimRoutes } from './orders-claims';
import { orderConfigRoutes } from './orders-config';
import { orderCrmRoutes } from './orders-crm';
import { orderCustomerRoutes } from './orders-customers';
import { orderDeliveryRoutes } from './orders-delivery';
import { orderListRoutes } from './orders-list';
import { orderMailRoutes } from './orders-mail';
import { orderManualRoutes } from './orders-manual';
import { orderPackagingRoutes } from './orders-packaging';
import { orderReportRoutes } from './orders-reports';

// CRM yolları müşteri yollarından önce gelmeli: "/customers/merge-suggestions" ":id" ile karışmasın.
export const ordersRoutes: DemoRoute[] = [
  ...orderListRoutes,
  ...orderReportRoutes,
  ...orderConfigRoutes,
  ...orderClaimRoutes,
  ...orderMailRoutes,
  ...orderPackagingRoutes,
  ...orderDeliveryRoutes,
  ...orderManualRoutes,
  ...orderCrmRoutes,
  ...orderCustomerRoutes,
];
