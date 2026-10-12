import type { DemoRoute } from '../router';
import { systemAccessRoutes } from './system-access';
import { systemInsightRoutes } from './system-insights';
import { systemIntegrationRoutes } from './system-integrations';
import { systemJobRoutes } from './system-jobs';
import { systemMailRoutes } from './system-mail';
import { systemMonitoringRoutes } from './system-monitoring';
import { systemMonitoringUsersRoutes } from './system-monitoring-users';
import { systemSyntheticRoutes } from './system-synthetic';
import { systemVaultRoutes } from './system-vault';
import { systemWorkflowRoutes } from './system-workflow';

// Sistem alanı: ayarlar, kullanıcı/izin, entegrasyonlar, izleme ve arka plan işleri.
// Özel yollar (ör. /monitoring/insights/summary) kendi dosyalarında genel olanlardan önce gelir.
export const systemRoutes: DemoRoute[] = [
  ...systemAccessRoutes,
  ...systemVaultRoutes,
  ...systemMailRoutes,
  ...systemIntegrationRoutes,
  ...systemMonitoringRoutes,
  ...systemMonitoringUsersRoutes,
  ...systemInsightRoutes,
  ...systemSyntheticRoutes,
  ...systemJobRoutes,
  ...systemWorkflowRoutes,
];
