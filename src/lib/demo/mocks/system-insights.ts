// Sistem İzleme > Öneriler: kural tabanlı örnek bulgular.
import type {
  InsightEvidenceDto,
  InsightSummaryDto,
  MonitoringInsightDto,
  MonitoringInsightsViewDto,
} from '../../api/monitoring-insights';
import { get, type DemoRoute } from '../router';
import { ago } from '../seed';

const MANUAL_RUNS_PER_DAY = 3;
const DEFAULT_PERIOD_DAYS = 7;

function evidence(
  partial: Pick<InsightEvidenceDto, 'id' | 'rule' | 'category' | 'severity' | 'title' | 'summary' | 'facts' | 'targetPath'>,
): InsightEvidenceDto {
  return { ...partial, targetTab: null, fingerprint: `fp-${partial.id}`, items: null, steps: null, fix: null };
}

const INSIGHTS: MonitoringInsightDto[] = [
  {
    id: 1,
    category: 'performance',
    severity: 'high',
    title: 'Sipariş listesi yavaş yanıt veriyor',
    reason: 'Son 7 günde /api/orders ucunun 95. yüzdelik süresi 2,3 sn; istekların %13’ü bütçeyi aştı.',
    steps: ['Sipariş listesinde varsayılan sayfa boyutunu 25’te tutun.', 'Tarih aralığı filtresini zorunlu tutmayı değerlendirin.'],
    evidence: [
      evidence({
        id: 'slow-orders', rule: 'slow-route', category: 'performance', severity: 'high',
        title: '/api/orders yavaş', summary: 'Ortalama 940 ms, p95 2,3 sn.',
        facts: [{ label: 'İstek sayısı', value: '3.180' }, { label: 'Bütçe aşımı', value: '410' }],
        targetPath: '/monitoring/slow-requests',
      }),
    ],
    targetTab: 'slow-requests',
    targetPath: '/monitoring/slow-requests',
    status: 'new',
    statusChangedAt: null,
    origin: 'rules',
  },
  {
    id: 2,
    category: 'fix',
    severity: 'medium',
    title: 'Pazaryeri keşfi zaman aşımına uğruyor',
    reason: 'Trendyol · Mağaza B bağlantısının veri keşfi son 24 saatte 14 kez zaman aşımına düştü.',
    steps: ['Bağlantıyı test edin.', 'Keşfi gece saatlerinde çalıştırın.'],
    evidence: [
      evidence({
        id: 'discover-timeout', rule: 'repeated-error', category: 'fix', severity: 'medium',
        title: 'Keşif hataları', summary: '14 tekrar eden zaman aşımı.',
        facts: [{ label: 'İlk görülme', value: '20 saat önce' }],
        targetPath: '/monitoring/exceptions',
      }),
    ],
    targetTab: 'exceptions',
    targetPath: '/monitoring/exceptions',
    status: 'new',
    statusChangedAt: null,
    origin: 'rules',
  },
  {
    id: 3,
    category: 'adoption',
    severity: 'low',
    title: 'Alış fiyatı paneli az kullanılıyor',
    reason: 'Alış fiyatları sayfası son 7 günde yalnızca 2 kullanıcı tarafından açıldı.',
    steps: ['Ekibe kısa bir tanıtım yapın.'],
    evidence: [],
    targetTab: 'page-usage',
    targetPath: '/monitoring/page-usage',
    status: 'new',
    statusChangedAt: null,
    origin: 'rules',
  },
  {
    id: 4,
    category: 'security',
    severity: 'low',
    title: 'Pasif kullanıcı hesabı var',
    reason: '1 kullanıcı pasif durumda; erişimin gerçekten kapalı olduğunu doğrulayın.',
    steps: ['Kullanıcılar ekranından rol atamalarını gözden geçirin.'],
    evidence: [],
    targetTab: null,
    targetPath: '/system/users',
    status: 'done',
    statusChangedAt: ago(1),
    origin: 'rules',
  },
];

const buildView = (): MonitoringInsightsViewDto => ({
  run: {
    id: 1,
    periodDays: DEFAULT_PERIOD_DAYS,
    source: 'daily',
    mode: 'rules',
    evidenceCount: INSIGHTS.reduce((sum, insight) => sum + insight.evidence.length, 0),
    totalTokens: 0,
    aiNote: 'Demo ortamında yapay zekâ özeti kapalı; bulgular kural şablonlarıyla üretildi.',
    createdAt: ago(0, 3),
  },
  insights: INSIGHTS,
  manualRunsLeftToday: MANUAL_RUNS_PER_DAY,
  cached: true,
  fixes: [],
});

const SUMMARY: InsightSummaryDto = {
  newCount: INSIGHTS.filter((insight) => insight.status === 'new').length,
  criticalCount: 0,
  lastRunAt: ago(0, 3),
};

export const systemInsightRoutes: DemoRoute[] = [
  get('/monitoring/insights/summary', () => SUMMARY),
  get('/monitoring/insights', buildView),
];
