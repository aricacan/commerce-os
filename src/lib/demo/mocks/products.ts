import type { DemoRoute } from '../router';
import { productBaseCatalogRoutes } from './products-base-catalog';
import { productCatalogRoutes } from './products-catalog';
import { productCategoryRoutes } from './products-categories';
import { productCompetitorRoutes } from './products-competitors';
import { productCostRoutes } from './products-costs';
import { productFitmentRoutes } from './products-fitment';
import { productPricingRoutes } from './products-pricing';
import { productSonarRoutes } from './products-sonar';
import { productSupplyRoutes } from './products-supply';

export const productsRoutes: DemoRoute[] = [
  ...productCatalogRoutes,
  ...productCategoryRoutes,
  ...productCostRoutes,
  ...productPricingRoutes,
  ...productCompetitorRoutes,
  ...productFitmentRoutes,
  ...productBaseCatalogRoutes,
  ...productSupplyRoutes,
  ...productSonarRoutes,
];
