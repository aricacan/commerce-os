import type { DemoRoute } from '../router';
import { channelRoutes } from './omnichannel-channels';
import { customerRoutes } from './omnichannel-customers';
import { extraRoutes } from './omnichannel-extras';
import { inboxRoutes } from './omnichannel-inbox';
import { learningRoutes } from './omnichannel-learning';
import { overviewRoutes } from './omnichannel-overview';
import { qualityRoutes } from './omnichannel-quality';
import { radarRoutes } from './omnichannel-radar';
import { settingsRoutes } from './omnichannel-settings';
import { shopifyRoutes } from './omnichannel-shopify';
import { sitehubRoutes } from './omnichannel-sitehub';
import { workRoutes } from './omnichannel-work';

// Sıra önemli: ilk eşleşen kazanır. Özel yollar (counts, board, summary…) genel :id yollarından önce gelmeli.
export const omnichannelRoutes: DemoRoute[] = [
  ...inboxRoutes,
  ...workRoutes,
  ...customerRoutes,
  ...overviewRoutes,
  ...channelRoutes,
  ...settingsRoutes,
  ...qualityRoutes,
  ...learningRoutes,
  ...extraRoutes,
  ...sitehubRoutes,
  ...shopifyRoutes,
  ...radarRoutes,
];
