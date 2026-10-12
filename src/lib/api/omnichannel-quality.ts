import { BASE, request, throwIfNotOk, uploadHeaders } from './core';
import { fileNameFrom, normalizeEvalRun, normalizeQuickScore, type EvalQuickScoreDto, type EvalRunDto } from './omnichannel-eval';
import { asRecord, bool, boolOrNull, list, num, numOrNull, str, strOrNull, strings } from './safe-read';

// ─── Omnichannel › Kalite Merkezi (FAZ 7.5, Altın Set'in yeni adı) ───────────────────
//
// Genel bakış, koşu karşılaştırma, aday kutusu, veri setleri ve onaylı cevaplar. Uçlar /omnichannel/quality/* (yalnız
// yönetici). Ön yüz backend'den önce yayına çıkar: her yanıt güvenli varsayılana çekilir, uç yoksa ekran sakin
// "güncelleniyor" durumunu gösterir (isServerUpdatePending).

const ROOT = '/omnichannel/quality';
export const QUALITY_PAGE_SIZE = 50;

// Backend QualityCandidateSignals bayraklarıyla birebir.
export const QUALITY_SIGNAL = {
  Handoff: 1, FlaggedWrong: 2, AgentAnswer: 4, ReplyFallback: 8, FailedTurn: 16, DuplicateSuppressed: 32, LowAuditScore: 64,
} as const;
export type QualitySignal = (typeof QUALITY_SIGNAL)[keyof typeof QUALITY_SIGNAL];

export const QUALITY_CANDIDATE_STATUS = { Pending: 0, Approved: 1, Rejected: 2 } as const;
export const EVAL_DIFF_DIRECTION = { Improved: 0, Regressed: 1, Changed: 2 } as const;
export const QUALITY_DATASET_SOURCE = { Built: 0, Uploaded: 1 } as const;

export const RUBRIC_KEYS = ['U', 'C', 'D', 'L', 'F', 'H', 'T'] as const;
export type RubricKey = (typeof RUBRIC_KEYS)[number];

// ── Genel bakış ────────────────────────────────────────────────────────────────

export interface QualityRunKpiDto {
  runId: number;
  name: string;
  pipelineVersion: string;
  completedAt: string | null;
  turnsDone: number;
  quickScore: EvalQuickScoreDto | null;
  handoffRate: number | null;
  duplicateSuppressed: number;
  avgLatencyMs: number | null;
  tokensPerTurn: number | null;
}

export interface QualityTrendPointDto {
  runId: number;
  name: string;
  pipelineVersion: string;
  at: string;
  score: EvalQuickScoreDto | null;
}

export interface QualityCountDto { key: string; label: string; count: number }
export interface QualityOutcomeCountDto { outcome: number; count: number }

export interface QualityLiveDto {
  days: number;
  turns: number;
  outcomes: QualityOutcomeCountDto[];
  paths: QualityCountDto[];
  fallbacks: number;
  fallbackRate: number | null;
  duplicateSuppressed: number;
  handoffs: number;
  handoffReasons: QualityCountDto[];
  avgLatencyMs: number | null;
  tokensPerTurn: number | null;
}

export interface QualityOverviewDto {
  target: number;
  latestRuns: QualityRunKpiDto[];
  trend: QualityTrendPointDto[];
  live: QualityLiveDto;
}

// ── Karşılaştırma ──────────────────────────────────────────────────────────────

export type TurnScores = { turnSuccess: boolean | null } & Record<RubricKey, number | null>;

export interface EvalCompareSideDto {
  replies: string[];
  scores: TurnScores | null;
  issues: string[];
  path: string | null;
  outcome: string | null;
  error: string | null;
}

export interface EvalCompareRowDto {
  conversationKey: string;
  conversationId: number | null;
  turnNumber: number;
  country: string;
  channel: string;
  customerText: string;
  base: EvalCompareSideDto;
  target: EvalCompareSideDto;
  deltas: Record<RubricKey, number | null>;
  textChanged: boolean;
  scoreChanged: boolean;
  direction: number;
}

export interface EvalDiffFacetsDto {
  countries: string[];
  channels: string[];
  issues: string[];
  paths: string[];
  outcomes: string[];
}

export interface EvalCompareDto {
  base: EvalRunDto;
  target: EvalRunDto;
  comparedTurns: number;
  differentTurns: number;
  improved: number;
  regressed: number;
  facets: EvalDiffFacetsDto;
  items: EvalCompareRowDto[];
  total: number;
}

export interface CompareFilters {
  country: string;
  channel: string;
  dimension: string;
  issue: string;
  path: string;
  outcome: string;
}

export const EMPTY_COMPARE_FILTERS: CompareFilters = { country: '', channel: '', dimension: '', issue: '', path: '', outcome: '' };

// ── Adaylar ────────────────────────────────────────────────────────────────────

export interface QualityCandidateDto {
  id: number;
  conversationId: number;
  channelId: number;
  channelName: string | null;
  country: string | null;
  signals: number;
  status: number;
  customerText: string;
  botText: string | null;
  reason: string | null;
  decisionPath: string | null;
  suggestedAnswer: string | null;
  expectedAnswer: string | null;
  scenarioId: number | null;
  approvedAnswerId: number | null;
  detectedAt: string;
  reviewedAt: string | null;
}

export interface QualitySignalCountDto { signal: number; count: number }

export interface QualityCandidatePageDto {
  items: QualityCandidateDto[];
  total: number;
  signalCounts: QualitySignalCountDto[];
}

export interface CandidateQuery {
  status: number;
  signal: number | null;
  search: string;
  page: number;
}

export interface ApproveCandidateInput {
  expectedAnswer: string;
  mustContain: string[];
  mustNotContain: string[];
  addToLibrary: boolean;
}

export type QualityReviewOutcome = 'Approved' | 'Rejected' | 'NotFound' | 'AlreadyReviewed' | 'NeedsAnswer';

export interface QualityBulkItemResultDto { id: number; outcome: QualityReviewOutcome }

// ── Veri setleri ───────────────────────────────────────────────────────────────

export interface QualityDatasetDto {
  id: number;
  name: string;
  version: number;
  source: number;
  conversations: number;
  turns: number;
  description: string | null;
  createdByName: string | null;
  createdAt: string;
}

export interface DatasetConversationDto {
  conversationId: number;
  channelName: string;
  country: string | null;
  lastMessageAt: string | null;
  messageCount: number;
  hasHandoff: boolean;
  flagged: boolean;
  preview: string;
}

export interface DatasetConversationPageDto { items: DatasetConversationDto[]; total: number }

// Boş alan süzgeç değildir; tarih "yyyy-mm-dd" (gün başı, UTC).
export interface DatasetConversationFilters {
  from: string;
  to: string;
  channelId: number | null;
  country: string;
  hasHandoff: boolean | null;
  flagged: boolean | null;
}

export const EMPTY_DATASET_FILTERS: DatasetConversationFilters = {
  from: '', to: '', channelId: null, country: '', hasHandoff: null, flagged: null,
};

// ── Onaylı cevaplar ────────────────────────────────────────────────────────────

export interface ApprovedAnswerDto {
  id: number;
  channelId: number | null;
  channelName: string | null;
  country: string | null;
  language: string;
  question: string;
  answer: string;
  isActive: boolean;
  sourceCandidateId: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApprovedAnswerPageDto { items: ApprovedAnswerDto[]; total: number }

export interface ApprovedAnswerPatch {
  question?: string;
  answer?: string;
  isActive?: boolean;
}

// ── Normalleştirme ─────────────────────────────────────────────────────────────

function normalizeCount(value: unknown): QualityCountDto {
  const raw = asRecord(value);
  const key = str(raw.key);
  return { key, label: str(raw.label, key), count: num(raw.count) };
}

function normalizeRunKpi(value: unknown): QualityRunKpiDto {
  const raw = asRecord(value);
  return {
    runId: num(raw.runId), name: str(raw.name), pipelineVersion: str(raw.pipelineVersion),
    completedAt: strOrNull(raw.completedAt), turnsDone: num(raw.turnsDone), quickScore: normalizeQuickScore(raw.quickScore),
    handoffRate: numOrNull(raw.handoffRate), duplicateSuppressed: num(raw.duplicateSuppressed),
    avgLatencyMs: numOrNull(raw.avgLatencyMs), tokensPerTurn: numOrNull(raw.tokensPerTurn),
  };
}

function normalizeTrendPoint(value: unknown): QualityTrendPointDto {
  const raw = asRecord(value);
  return {
    runId: num(raw.runId), name: str(raw.name), pipelineVersion: str(raw.pipelineVersion), at: str(raw.at),
    score: normalizeQuickScore(raw.score),
  };
}

function normalizeLive(value: unknown): QualityLiveDto {
  const raw = asRecord(value);
  return {
    days: num(raw.days), turns: num(raw.turns),
    outcomes: list(raw.outcomes).map((item) => {
      const o = asRecord(item);
      return { outcome: num(o.outcome), count: num(o.count) };
    }),
    paths: list(raw.paths).map(normalizeCount),
    fallbacks: num(raw.fallbacks), fallbackRate: numOrNull(raw.fallbackRate),
    duplicateSuppressed: num(raw.duplicateSuppressed), handoffs: num(raw.handoffs),
    handoffReasons: list(raw.handoffReasons).map(normalizeCount),
    avgLatencyMs: numOrNull(raw.avgLatencyMs), tokensPerTurn: numOrNull(raw.tokensPerTurn),
  };
}

export function normalizeOverview(value: unknown): QualityOverviewDto {
  const raw = asRecord(value);
  return {
    target: num(raw.target, 0.95),
    latestRuns: list(raw.latestRuns).map(normalizeRunKpi),
    trend: list(raw.trend).map(normalizeTrendPoint),
    live: normalizeLive(raw.live),
  };
}

function normalizeTurnScores(value: unknown): TurnScores | null {
  if (typeof value !== 'object' || value === null) return null;
  const raw = asRecord(value);
  const scores = { turnSuccess: boolOrNull(raw.turnSuccess) } as TurnScores;
  for (const key of RUBRIC_KEYS) scores[key] = numOrNull(raw[key]);
  return scores;
}

function normalizeSide(value: unknown): EvalCompareSideDto {
  const raw = asRecord(value);
  return {
    replies: strings(raw.replies), scores: normalizeTurnScores(raw.scores), issues: strings(raw.issues),
    path: strOrNull(raw.path), outcome: strOrNull(raw.outcome), error: strOrNull(raw.error),
  };
}

function normalizeDeltas(value: unknown): Record<RubricKey, number | null> {
  const raw = asRecord(value);
  const deltas = {} as Record<RubricKey, number | null>;
  for (const key of RUBRIC_KEYS) deltas[key] = numOrNull(raw[key]);
  return deltas;
}

function normalizeCompareRow(value: unknown): EvalCompareRowDto {
  const raw = asRecord(value);
  return {
    conversationKey: str(raw.conversationKey), conversationId: numOrNull(raw.conversationId), turnNumber: num(raw.turnNumber),
    country: str(raw.country), channel: str(raw.channel), customerText: str(raw.customerText),
    base: normalizeSide(raw.base), target: normalizeSide(raw.target), deltas: normalizeDeltas(raw.deltas),
    textChanged: bool(raw.textChanged), scoreChanged: bool(raw.scoreChanged), direction: num(raw.direction, EVAL_DIFF_DIRECTION.Changed),
  };
}

export function normalizeCompare(value: unknown): EvalCompareDto {
  const raw = asRecord(value);
  const facets = asRecord(raw.facets);
  const items = list(raw.items).map(normalizeCompareRow);
  return {
    base: normalizeEvalRun(raw.base), target: normalizeEvalRun(raw.target),
    comparedTurns: num(raw.comparedTurns), differentTurns: num(raw.differentTurns),
    improved: num(raw.improved), regressed: num(raw.regressed),
    facets: {
      countries: strings(facets.countries), channels: strings(facets.channels), issues: strings(facets.issues),
      paths: strings(facets.paths), outcomes: strings(facets.outcomes),
    },
    items, total: num(raw.total, items.length),
  };
}

export function normalizeCandidate(value: unknown): QualityCandidateDto {
  const raw = asRecord(value);
  return {
    id: num(raw.id), conversationId: num(raw.conversationId), channelId: num(raw.channelId),
    channelName: strOrNull(raw.channelName), country: strOrNull(raw.country), signals: num(raw.signals),
    status: num(raw.status), customerText: str(raw.customerText), botText: strOrNull(raw.botText),
    reason: strOrNull(raw.reason), decisionPath: strOrNull(raw.decisionPath), suggestedAnswer: strOrNull(raw.suggestedAnswer),
    expectedAnswer: strOrNull(raw.expectedAnswer), scenarioId: numOrNull(raw.scenarioId),
    approvedAnswerId: numOrNull(raw.approvedAnswerId), detectedAt: str(raw.detectedAt), reviewedAt: strOrNull(raw.reviewedAt),
  };
}

function normalizeDataset(value: unknown): QualityDatasetDto {
  const raw = asRecord(value);
  return {
    id: num(raw.id), name: str(raw.name), version: num(raw.version, 1), source: num(raw.source),
    conversations: num(raw.conversations), turns: num(raw.turns), description: strOrNull(raw.description),
    createdByName: strOrNull(raw.createdByName), createdAt: str(raw.createdAt),
  };
}

function normalizeDatasetConversation(value: unknown): DatasetConversationDto {
  const raw = asRecord(value);
  return {
    conversationId: num(raw.conversationId), channelName: str(raw.channelName), country: strOrNull(raw.country),
    lastMessageAt: strOrNull(raw.lastMessageAt), messageCount: num(raw.messageCount), hasHandoff: bool(raw.hasHandoff),
    flagged: bool(raw.flagged), preview: str(raw.preview),
  };
}

function normalizeApprovedAnswer(value: unknown): ApprovedAnswerDto {
  const raw = asRecord(value);
  return {
    id: num(raw.id), channelId: numOrNull(raw.channelId), channelName: strOrNull(raw.channelName),
    country: strOrNull(raw.country), language: str(raw.language, 'tr'), question: str(raw.question), answer: str(raw.answer),
    isActive: raw.isActive !== false, sourceCandidateId: numOrNull(raw.sourceCandidateId),
    createdAt: str(raw.createdAt), updatedAt: str(raw.updatedAt),
  };
}

// ── Adres kurucular ────────────────────────────────────────────────────────────

const skipOf = (page: number) => String(Math.max(page, 0) * QUALITY_PAGE_SIZE);

export function compareUrl(baseRunId: number, targetRunId: number, filters: CompareFilters, page: number): string {
  const params = new URLSearchParams({
    baseRunId: String(baseRunId), targetRunId: String(targetRunId), skip: skipOf(page), take: String(QUALITY_PAGE_SIZE),
  });
  for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value);
  return `${ROOT}/compare?${params}`;
}

export function candidatesUrl(query: CandidateQuery): string {
  const params = new URLSearchParams({ status: String(query.status), skip: skipOf(query.page), take: String(QUALITY_PAGE_SIZE) });
  if (query.signal !== null) params.set('signal', String(query.signal));
  if (query.search.trim()) params.set('search', query.search.trim());
  return `${ROOT}/candidates?${params}`;
}

export function datasetConversationsUrl(filters: DatasetConversationFilters, page: number): string {
  const params = new URLSearchParams({ skip: skipOf(page), take: String(QUALITY_PAGE_SIZE) });
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  if (filters.channelId !== null) params.set('channelId', String(filters.channelId));
  if (filters.country) params.set('country', filters.country);
  if (filters.hasHandoff !== null) params.set('hasHandoff', String(filters.hasHandoff));
  if (filters.flagged !== null) params.set('flagged', String(filters.flagged));
  return `${ROOT}/datasets/conversations?${params}`;
}

export function approvedAnswersUrl(search: string, includeInactive: boolean, page: number): string {
  const params = new URLSearchParams({ skip: skipOf(page), take: String(QUALITY_PAGE_SIZE), includeInactive: String(includeInactive) });
  if (search.trim()) params.set('search', search.trim());
  return `${ROOT}/approved-answers?${params}`;
}

async function downloadFile(path: string, fallbackName: string): Promise<{ fileName: string; blob: Blob }> {
  const res = await fetch(`${BASE}${path}`, { headers: uploadHeaders(), credentials: 'include' });
  await throwIfNotOk(res);
  return { fileName: fileNameFrom(res, fallbackName), blob: await res.blob() };
}

export const qualityApi = {
  getOverview: async (days: number): Promise<QualityOverviewDto> =>
    normalizeOverview(await request<unknown>(`${ROOT}/overview?days=${days}`)),

  compare: async (baseRunId: number, targetRunId: number, filters: CompareFilters, page: number): Promise<EvalCompareDto> =>
    normalizeCompare(await request<unknown>(compareUrl(baseRunId, targetRunId, filters, page))),

  getCandidates: async (query: CandidateQuery): Promise<QualityCandidatePageDto> => {
    const raw = asRecord(await request<unknown>(candidatesUrl(query)));
    const items = list(raw.items).map(normalizeCandidate);
    return {
      items, total: num(raw.total, items.length),
      signalCounts: list(raw.signalCounts).map((item) => {
        const c = asRecord(item);
        return { signal: num(c.signal), count: num(c.count) };
      }),
    };
  },
  approveCandidate: (id: number, input: ApproveCandidateInput) =>
    request<unknown>(`${ROOT}/candidates/${id}/approve`, { method: 'POST', body: JSON.stringify(input) }),
  rejectCandidate: (id: number) => request<unknown>(`${ROOT}/candidates/${id}/reject`, { method: 'POST' }),
  bulkReview: (ids: number[], approve: boolean, addToLibrary: boolean) =>
    request<QualityBulkItemResultDto[]>(`${ROOT}/candidates/bulk`, {
      method: 'POST', body: JSON.stringify({ ids, approve, addToLibrary }),
    }),
  collectCandidates: () => request<{ created: number; updated: number }>(`${ROOT}/candidates/collect`, { method: 'POST' }),

  getDatasets: async (): Promise<QualityDatasetDto[]> => list(await request<unknown>(`${ROOT}/datasets`)).map(normalizeDataset),
  getDatasetConversations: async (filters: DatasetConversationFilters, page: number): Promise<DatasetConversationPageDto> => {
    const raw = asRecord(await request<unknown>(datasetConversationsUrl(filters, page)));
    const items = list(raw.items).map(normalizeDatasetConversation);
    return { items, total: num(raw.total, items.length) };
  },
  buildDataset: async (name: string, description: string, conversationIds: number[]): Promise<QualityDatasetDto> =>
    normalizeDataset(await request<unknown>(`${ROOT}/datasets`, {
      method: 'POST', body: JSON.stringify({ name, description, conversationIds }),
    })),
  // Dosya yükleme: request() JSON başlığı ekler; FormData için başlık tarayıcıya bırakılır.
  uploadDataset: async (file: File, name: string): Promise<QualityDatasetDto> => {
    const form = new FormData();
    form.append('file', file);
    if (name.trim()) form.append('name', name.trim());
    const res = await fetch(`${BASE}${ROOT}/datasets/upload`, {
      method: 'POST', headers: uploadHeaders(), body: form, credentials: 'include',
    });
    await throwIfNotOk(res);
    return normalizeDataset(await res.json());
  },
  downloadDataset: (id: number) => downloadFile(`${ROOT}/datasets/${id}/download`, `kalite-veri-seti-${id}.json`),
  deleteDataset: (id: number) => request<void>(`${ROOT}/datasets/${id}`, { method: 'DELETE' }),
  // serverScoring: turlar sunucuda yapay zekâyla puanlanır (ek token); varsayılan kapalı.
  startDatasetRun: async (id: number, pipelineVersion: string, serverScoring = false): Promise<EvalRunDto> =>
    normalizeEvalRun(await request<unknown>(`${ROOT}/datasets/${id}/runs`, {
      method: 'POST', body: JSON.stringify({ pipelineVersion, serverScoring }),
    })),

  getApprovedAnswers: async (search: string, includeInactive: boolean, page: number): Promise<ApprovedAnswerPageDto> => {
    const raw = asRecord(await request<unknown>(approvedAnswersUrl(search, includeInactive, page)));
    const items = list(raw.items).map(normalizeApprovedAnswer);
    return { items, total: num(raw.total, items.length) };
  },
  updateApprovedAnswer: async (id: number, patch: ApprovedAnswerPatch): Promise<ApprovedAnswerDto> =>
    normalizeApprovedAnswer(await request<unknown>(`${ROOT}/approved-answers/${id}`, { method: 'PUT', body: JSON.stringify(patch) })),
};
