// Finans alanı mock'ları: P&L, muhasebe, e-belge, Trendyol kampanya, AdsHub, Erpis ve satış görünümü.
import type { DemoRoute } from '../router';
import { financeAccountingRoutes } from './finance-accounting';
import { financeAdsRoutes } from './finance-ads';
import { financeCampaignRoutes } from './finance-campaign';
import { financeCoreRoutes } from './finance-core';
import { financeEBelgeRoutes } from './finance-ebelge';
import { financeErpisAdminRoutes } from './finance-erpis-admin';
import { financeErpisCatalogRoutes } from './finance-erpis-catalog';
import { financeErpisQueryRoutes } from './finance-erpis';
import { financeForecastRoutes } from './finance-forecast';
import { financeForecastExtraRoutes } from './finance-forecast-extra';
import { financeInvoicingRoutes } from './finance-invoicing';
import { financePreAccountingRoutes } from './finance-preaccounting';
import { financeReportRoutes } from './finance-reports';
import { financeShippingRoutes } from './finance-shipping';

// Sıra önemli: ilk eşleşen kazanır; özel yollar alt dosyalarda genel olanlardan önce gelir.
export const financeRoutes: DemoRoute[] = [
  ...financeCoreRoutes,
  ...financeReportRoutes,
  ...financeShippingRoutes,
  ...financeAccountingRoutes,
  ...financePreAccountingRoutes,
  ...financeInvoicingRoutes,
  ...financeEBelgeRoutes,
  ...financeCampaignRoutes,
  ...financeAdsRoutes,
  ...financeErpisQueryRoutes,
  ...financeErpisAdminRoutes,
  ...financeErpisCatalogRoutes,
  ...financeForecastRoutes,
  ...financeForecastExtraRoutes,
];
