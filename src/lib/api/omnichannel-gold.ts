import { AI_REQUEST_TIMEOUT_MS } from './ai';
import { request } from './core';

// ─── Omnichannel › Altın konuşma seti (P35) ───────────────────────────────────────
//
// Temsilcinin "doğru cevap bu" dediği gerçek konuşmalar (kişisel veri maskelenmiş) senaryo olur; her
// deploy öncesi Test Alanı hattından geçirilip yargıç puanıyla önceki koşuya kıyaslanır.

const SCENARIOS = '/omnichannel/gold-scenarios';
const SET = '/omnichannel/gold-set';

// Sunucudaki GoldExpectations ile aynı alanlar.
export interface GoldExpectationsDto {
  expectedTools: string[];
  expectedStage: string | null;
  mustContain: string[];
  mustNotContain: string[];
  requiresPrice: boolean;
  requiresLink: boolean;
}

export interface GoldScenarioDto {
  id: number;
  title: string;
  // "tr" | "sq" | "en"
  language: string;
  countryCode: string;
  steps: string[];
  referenceReply: string;
  expectations: GoldExpectationsDto;
  isActive: boolean;
  createdAt: string;
}

// Aday öneri: kişisel veri sunucuda maskelenmiş önizleme (ham metin gelmez).
export interface GoldCandidateDto {
  messageId: number;
  conversationId: number;
  language: string;
  countryCode: string;
  customerPreview: string;
  replyPreview: string;
}

// Sunucudaki CreateGoldScenarioOutcome adları (toplu eklemede her mesaj için ayrı döner).
export type GoldBulkOutcome =
  | 'Created' | 'AlreadyExists' | 'MessageNotFound' | 'NotAgentMessage'
  | 'SandboxChannel' | 'NoCustomerMessages' | 'WriteDenied';

export interface GoldBulkItemResultDto {
  messageId: number;
  outcome: GoldBulkOutcome;
}

export interface GoldRunSummaryDto {
  id: number;
  startedAt: string;
  finishedAt: string | null;
  versionLabel: string;
  averageScore: number | null;
  previousAverageScore: number | null;
  delta: number | null;
  // Yalnız bitmiş koşuda dolu.
  gatePassed: boolean | null;
  scenarioCount: number;
  judgeFailedCount: number;
  deterministicFailedCount: number;
}

export interface GoldRunResultDto {
  scenarioId: number;
  scenarioTitle: string;
  referenceReply: string;
  actualReply: string;
  deterministicPassed: boolean;
  deterministicNotes: string | null;
  judgeFailed: boolean;
  accuracy: number | null;
  tone: number | null;
  opportunity: number | null;
  score: number | null;
  previousScore: number | null;
  scoreDelta: number | null;
  diffNote: string | null;
}

export interface GoldRunDetailDto {
  run: GoldRunSummaryDto;
  results: GoldRunResultDto[];
}

export interface GoldRunStartDto {
  runId: number;
  scenarioIds: number[];
}

export const goldApi = {
  getScenarios: () => request<GoldScenarioDto[]>(SCENARIOS),
  setScenarioActive: (id: number, isActive: boolean) =>
    request<GoldScenarioDto>(`${SCENARIOS}/${id}`, { method: 'PUT', body: JSON.stringify({ isActive }) }),
  deleteScenario: (id: number) => request<void>(`${SCENARIOS}/${id}`, { method: 'DELETE' }),
  // Temsilci mesajını altın sete ekler; aynı mesajı tekrar eklemek zararsızdır (mevcut senaryo döner).
  addFromMessage: (messageId: number) =>
    request<GoldScenarioDto>(`${SCENARIOS}/from-message/${messageId}`, { method: 'POST' }),

  getCandidates: (days: number) => request<GoldCandidateDto[]>(`${SCENARIOS}/candidates?days=${days}`),
  addFromCandidates: (messageIds: number[]) =>
    request<GoldBulkItemResultDto[]>(`${SCENARIOS}/from-candidates`, { method: 'POST', body: JSON.stringify({ messageIds }) }),

  getRuns: () => request<GoldRunSummaryDto[]>(`${SET}/runs`),
  getRun: (id: number) => request<GoldRunDetailDto>(`${SET}/runs/${id}`),

  // Koşu üç adım: başlat → senaryo senaryo → bitir (tek uzun istek vekil sunucuda kesilirdi).
  startRun: (versionLabel: string) =>
    request<GoldRunStartDto>(`${SET}/run`, { method: 'POST', body: JSON.stringify({ versionLabel }) }),
  runScenario: (runId: number, scenarioId: number) =>
    request<GoldRunResultDto>(`${SET}/run/${runId}/scenarios/${scenarioId}`, { method: 'POST' }, true, AI_REQUEST_TIMEOUT_MS),
  finishRun: (runId: number) =>
    request<GoldRunSummaryDto>(`${SET}/run/${runId}/finish`, { method: 'POST' }),
};
