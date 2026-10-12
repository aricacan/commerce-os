import { HEALTH_SEVERITY, type AccountHealthDto } from '../../lib/api/omnichannel';
import type { Resource } from './useResource';

// "Bakım ve sistem sağlığı" bölümünün kapalıyken gösterdiği tek satırlık özet. Öneriler (Info) sorun sayılmaz.

export type SystemHealthTone = 'ok' | 'warning' | 'critical' | 'unknown';

export interface SystemHealthSummary {
  issueCount: number;
  tone: SystemHealthTone;
  text: string;
}

const countIssues = (health: AccountHealthDto) =>
  health.findings.filter((f) => f.severity === HEALTH_SEVERITY.Critical || f.severity === HEALTH_SEVERITY.Warning).length;

export function summarizeSystemHealth(health: Resource<AccountHealthDto>): SystemHealthSummary {
  if (health.error) return { issueCount: 0, tone: 'unknown', text: 'Denetlenemedi' };
  if (!health.data) return { issueCount: 0, tone: 'unknown', text: 'Denetleniyor…' };

  const issueCount = countIssues(health.data);
  if (issueCount === 0) return { issueCount, tone: 'ok', text: 'Sorun yok' };

  const hasCritical = health.data.findings.some((f) => f.severity === HEALTH_SEVERITY.Critical);
  return { issueCount, tone: hasCritical ? 'critical' : 'warning', text: `${issueCount} sorun` };
}
