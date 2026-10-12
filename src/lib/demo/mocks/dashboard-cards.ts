// Panodaki Radar (B2B potansiyel müşteri) özet kartı.
import type { RadarWidgetSummaryDto } from '../../api/radar';
import { get, type DemoRequest, type DemoRoute } from '../router';
import { resolveRange, sumOf } from '../data/dashboard-series';

const EMAILS_SENT = 364;
const LEAD_RATE_PERCENT = 12.4;

const SIC_DISTRIBUTION = [
  { sicCode: '45320', count: 184 },
  { sicCode: '45310', count: 142 },
  { sicCode: '45200', count: 118 },
  { sicCode: '29320', count: 76 },
  { sicCode: '46720', count: 51 },
];

function buildRadarOverview({ query }: DemoRequest): RadarWidgetSummaryDto {
  return {
    ...resolveRange(query),
    scrapedCompanyCount: sumOf(SIC_DISTRIBUTION.map((slice) => slice.count)),
    emailsSentCount: EMAILS_SENT,
    leadRatePercent: LEAD_RATE_PERCENT,
    activeScrapeRunCount: 1,
    sicCodeDistribution: SIC_DISTRIBUTION,
  };
}

export const dashboardCardRoutes: DemoRoute[] = [
  get('/radar/dashboard/overview', buildRadarOverview),
];
