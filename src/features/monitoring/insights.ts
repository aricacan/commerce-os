import type {
  InsightCategory,
  InsightEvidenceDto,
  InsightFixRecordDto,
  InsightFixRisk,
  InsightFixStatus,
  InsightRunMode,
  InsightSeverity,
  MonitoringInsightDto,
  NavPageRefDto,
} from '../../lib/api';
import type { TranslationKey } from '../../lib/translations/tr';
import { NAV_PAGES, type NavPage } from './page-map';
import type { PillTone } from './ui';

// Öneriler sekmesinin saf yardımcıları: etiketler, süzgeç, sol panel listesi, rol kapısı.

export const SUPER_ADMIN_ROLE = 'SuperAdmin';

export const CATEGORY_LABELS: Record<InsightCategory, string> = {
  fix: 'Düzelt',
  explain: 'Açıkla',
  adoption: 'Benimseme',
  performance: 'Performans',
  security: 'Güvenlik',
  process: 'Süreç',
};

export const SEVERITY_LABELS: Record<InsightSeverity, string> = {
  critical: 'Kritik',
  high: 'Yüksek',
  medium: 'Orta',
  low: 'Düşük',
};

export const SEVERITY_ORDER: readonly InsightSeverity[] = ['critical', 'high', 'medium', 'low'];

export const SEVERITY_TONES: Record<InsightSeverity, PillTone> = {
  critical: 'danger',
  high: 'warning',
  medium: 'neutral',
  low: 'muted',
};

export const MODE_LABELS: Record<InsightRunMode, string> = {
  ai: 'Yapay zekâ',
  rules: 'Kurallar',
  reused: 'Yapay zekâ (değişiklik yok, önceki analiz)',
};

export type CategoryFilter = InsightCategory | 'all';

/** Yalnız SuperAdmin görür — öneriler kişi adı ve kişi bazlı kullanım içerir. */
export function isSuperAdmin(roles: readonly string[] | undefined): boolean {
  return (roles ?? []).some((role) => role.toLowerCase() === SUPER_ADMIN_ROLE.toLowerCase());
}

/**
 * "Hiç açılmayan sayfa" kuralının girdisi. Backend sol paneli bilmez; tek kaynak NAV'dır —
 * liste analiz isteğiyle gönderilir, backend saklar ve otomatik analizlerde yeniden kullanır.
 */
export function buildNavPages(
  translate: (key: TranslationKey) => string,
  pages: readonly NavPage[] = NAV_PAGES,
): NavPageRefDto[] {
  return pages.map((page) => ({ path: page.href, label: translate(page.labelKey) || page.href }));
}

export interface InsightFilter {
  category: CategoryFilter;
  showClosed: boolean;
  /** Yalnız "Düzelt" önerisi olan kartlar. */
  onlyFixable: boolean;
}

/** Kategori süzgeci, kapatılanları (Yapıldı/Yoksay) gizleme ve "yalnız düzeltilebilir". */
export function filterInsights(insights: readonly MonitoringInsightDto[], filter: InsightFilter): MonitoringInsightDto[] {
  return insights.filter(
    (insight) =>
      (filter.category === 'all' || insight.category === filter.category)
      && (filter.showClosed || insight.status === 'new')
      && (!filter.onlyFixable || fixableEvidence(insight).length > 0),
  );
}

/** Kartın düzeltme önerisi taşıyan bulguları (kural koyar; AI değil). */
export function fixableEvidence(insight: MonitoringInsightDto): InsightEvidenceDto[] {
  return insight.evidence.filter((evidence) => evidence.fix != null);
}

/** Kartın etki puanı: dayandığı bulguların en yükseği (eski analizlerde puan yok → 0). */
export function insightImpact(insight: MonitoringInsightDto): number {
  return insight.evidence.reduce((max, evidence) => Math.max(max, evidence.impact ?? 0), 0);
}

export interface PriorityGroup {
  severity: InsightSeverity;
  insights: MonitoringInsightDto[];
}

/** Önem gruplarına böler (Kritik → Düşük); grup içinde etki puanı yüksek olan önce. Boş grup yok. */
export function groupByPriority(insights: readonly MonitoringInsightDto[]): PriorityGroup[] {
  return SEVERITY_ORDER
    .map((severity) => ({
      severity,
      insights: insights
        .filter((insight) => insight.severity === severity)
        .sort((a, b) => insightImpact(b) - insightImpact(a)),
    }))
    .filter((group) => group.insights.length > 0);
}

/** Kartın bulgularına uygulanmış en son düzeltme (düzeltmeler yeni → eski sıralı gelir). */
export function latestFixFor(
  insight: MonitoringInsightDto,
  fixes: readonly InsightFixRecordDto[],
): InsightFixRecordDto | null {
  const fingerprints = new Set(insight.evidence.map((evidence) => evidence.fingerprint));
  return fixes.find((fix) => fingerprints.has(fix.evidenceFingerprint)) ?? null;
}

export const RISK_LABELS: Record<InsightFixRisk, string> = {
  low: 'Düşük risk',
  medium: 'Orta risk',
  high: 'Yüksek risk',
};

export const RISK_TONES: Record<InsightFixRisk, PillTone> = {
  low: 'success',
  medium: 'warning',
  high: 'danger',
};

export const FIX_STATUS_LABELS: Record<InsightFixStatus, string> = {
  applied: 'Uygulandı',
  failed: 'Olmadı',
  undone: 'Geri alındı',
};

export const FIX_STATUS_TONES: Record<InsightFixStatus, PillTone> = {
  applied: 'success',
  failed: 'danger',
  undone: 'muted',
};

/** Süzgeç çipleri: yalnız öneri olan kategoriler, sayılarıyla. */
export function categoryCounts(insights: readonly MonitoringInsightDto[]): { category: InsightCategory; count: number }[] {
  const counts = new Map<InsightCategory, number>();
  for (const insight of insights) counts.set(insight.category, (counts.get(insight.category) ?? 0) + 1);
  return [...counts.entries()].map(([category, count]) => ({ category, count }));
}
