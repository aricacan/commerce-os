import { request } from './core';

// ─── Sistem İzleme > ÖNERİLER ─────────────────────────────────────────────────
// Backend: Modules/Monitoring MonitoringInsightsController (yalnız SuperAdmin). Alan adları
// camelCase, birebir. Kod değerleri İngilizce; ekran Türkçe etikete çevirir (features/monitoring/insights.ts).

export type InsightCategory = 'fix' | 'explain' | 'adoption' | 'performance' | 'security' | 'process';
export type InsightSeverity = 'critical' | 'high' | 'medium' | 'low';
export type InsightStatus = 'new' | 'done' | 'ignored';
export type InsightRunMode = 'ai' | 'rules' | 'reused';
export type InsightRunSource = 'manual' | 'daily' | 'weekly';

export interface InsightFactDto {
  label: string;
  value: string;
}

/** Bir bulgudan etkilenen tek kayıt (SKU, iş, fatura, konuşma…). */
export interface InsightItem {
  label: string;
  detail: string | null;
  path: string | null;
}

export type InsightFixRisk = 'low' | 'medium' | 'high';

/** Kuralın önerdiği, izin listesindeki düzeltme. Tür ve konu sunucuda kalır; istemci yalnız kartı + bulguyu gönderir. */
export interface InsightFixOfferDto {
  kind: string;
  label: string;
  subject: string;
  itemIds: string[];
  /** Yalnız kurulumun sahibi şirketin SuperAdmin'i uygulayabilir. */
  platformOnly: boolean;
}

export interface InsightEvidenceDto {
  id: string;
  rule: string;
  category: InsightCategory;
  severity: InsightSeverity;
  title: string;
  summary: string;
  facts: InsightFactDto[];
  /** Tıklanınca gidilecek izleme sekmesi (monitoring-tabs anahtarı). */
  targetTab: string | null;
  /** Uygulama içi sayfa yolu (ör. "/hangfire", "/erpis?tab=sql-sources"). */
  targetPath: string | null;
  fingerprint: string;
  /** Somut neden (hata metni, reddedilen bağlantı); eski analizlerde yok. */
  cause?: string | null;
  items?: InsightItem[] | null;
  steps?: string[] | null;
  fix?: InsightFixOfferDto | null;
  area?: string | null;
  affected?: number;
  /** Etki puanı: önem × etkilenen adet × iş alanı — sıralama anahtarı. */
  impact?: number;
  /** Hedef ekranın adı ("Erpis › Canlı Veri"). */
  actionLabel?: string | null;
}

export interface InsightFixChange {
  label: string;
  before: string | null;
  after: string | null;
}

export interface InsightFixChoice {
  value: string;
  label: string;
}

export interface InsightFixPreviewDto {
  kind: string;
  title: string;
  risk: InsightFixRisk;
  platformOnly: boolean;
  reversible: boolean;
  canApply: boolean;
  blockedReason: string | null;
  summary: string;
  changes: InsightFixChange[];
  choices: InsightFixChoice[];
  choiceLabel: string | null;
}

export type InsightFixStatus = 'applied' | 'failed' | 'undone';

export interface InsightFixRecordDto {
  id: number;
  insightId: number | null;
  evidenceFingerprint: string;
  kind: string;
  title: string;
  risk: InsightFixRisk;
  status: InsightFixStatus;
  message: string;
  canUndo: boolean;
  appliedBy: string | null;
  appliedAt: string;
  undoneAt: string | null;
}

export interface InsightFixRequest {
  insightId: number;
  evidenceFingerprint: string;
  choice: string | null;
}

export interface MonitoringInsightDto {
  id: number;
  category: InsightCategory;
  severity: InsightSeverity;
  title: string;
  reason: string;
  steps: string[];
  evidence: InsightEvidenceDto[];
  targetTab: string | null;
  targetPath: string | null;
  status: InsightStatus;
  statusChangedAt: string | null;
  /** Kartın metnini kim yazdı: yapay zekâ ya da kural şablonu. */
  origin: 'ai' | 'rules';
}

export interface MonitoringInsightRunDto {
  id: number;
  periodDays: number;
  source: InsightRunSource;
  mode: InsightRunMode;
  evidenceCount: number;
  totalTokens: number;
  /** Yapay zekâ neden devrede değildi; devredeyse null. */
  aiNote: string | null;
  createdAt: string;
}

export interface MonitoringInsightsViewDto {
  run: MonitoringInsightRunDto | null;
  insights: MonitoringInsightDto[];
  manualRunsLeftToday: number;
  /** "Analiz et" yeni iş yapmadı — son bir saatin sonucu döndü. */
  cached: boolean;
  /** Son düzeltmeler (yeni en üstte) — kart sonucu ve geçmiş listesi. */
  fixes?: InsightFixRecordDto[] | null;
}

export interface InsightSummaryDto {
  newCount: number;
  criticalCount: number;
  lastRunAt: string | null;
}

export interface NavPageRefDto {
  path: string;
  label: string;
}

// Analiz modele gidip döndüğü için genel 25 sn zaman aşımı yetmeyebilir (LLM kuyruğu).
const ANALYZE_TIMEOUT_MS = 90_000;

export const monitoringInsightsApi = {
  getLatest: (periodDays: number) =>
    request<MonitoringInsightsViewDto>(`/monitoring/insights?periodDays=${periodDays}`),

  getSummary: () => request<InsightSummaryDto>('/monitoring/insights/summary'),

  analyze: (periodDays: number, navPages: NavPageRefDto[]) =>
    request<MonitoringInsightsViewDto>(
      '/monitoring/insights/analyze',
      { method: 'POST', body: JSON.stringify({ periodDays, navPages }) },
      true,
      ANALYZE_TIMEOUT_MS,
    ),

  updateStatus: (id: number, status: InsightStatus) =>
    request<void>(`/monitoring/insights/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),

  // Düzelt: önizleme hiçbir şey yazmaz; uygula/geri al sunucuda canlı ön koşulu yeniden denetler.
  previewFix: (body: InsightFixRequest) =>
    request<InsightFixPreviewDto>('/monitoring/insights/fixes/preview', { method: 'POST', body: JSON.stringify(body) }),

  applyFix: (body: InsightFixRequest) =>
    request<InsightFixRecordDto>('/monitoring/insights/fixes/apply', { method: 'POST', body: JSON.stringify(body) }),

  undoFix: (fixId: number) =>
    request<InsightFixRecordDto>(`/monitoring/insights/fixes/${fixId}/undo`, { method: 'POST' }),
};
