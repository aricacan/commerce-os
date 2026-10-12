import { BASE, request, throwIfNotOk, uploadHeaders } from './core';
import { asRecord, list, num, numOrNull, str, strOrNull, strings } from './safe-read';

// ─── Omnichannel › Bot değerlendirme (FAZ 2) ──────────────────────────────────────
//
// Tur izi, bot hattı sürümleri, Kalite Merkezi değerlendirme koşuları ve gölge karşılaştırma.
// Sözleşme: docs/omnichannel-eval/FAZ2-API.md. Ön yüz backend'den önce yayına çıkar; alanlar
// eksik gelebileceği için her yanıt burada güvenli varsayılanlara çekilir (normalize*).

const ROOT = '/omnichannel';
const EVAL_RUNS = `${ROOT}/gold-set/eval-runs`;

export const TRACE_PAGE_SIZE = 20;
export const EVAL_RUN_PAGE_SIZE = 20;
export const SHADOW_PAGE_SIZE = 50;

// Backend enum'larıyla birebir sayısal karşılık.
export const BOT_RUN_MODE = { Live: 0, Shadow: 1, Replay: 2 } as const;
export type BotRunMode = (typeof BOT_RUN_MODE)[keyof typeof BOT_RUN_MODE];

export const BOT_TURN_OUTCOME = { Sent: 0, Handoff: 1, Failed: 2, Skipped: 3, Silent: 4 } as const;
export type BotTurnOutcome = (typeof BOT_TURN_OUTCOME)[keyof typeof BOT_TURN_OUTCOME];

export const EVAL_RUN_STATUS = { Queued: 0, Running: 1, Completed: 2, Failed: 3, Cancelled: 4 } as const;
export type EvalRunStatus = (typeof EVAL_RUN_STATUS)[keyof typeof EVAL_RUN_STATUS];

export interface BotToolCallDto {
  name: string;
  args: string;
  status: string;
  durationMs: number | null;
}

export interface BotTurnTraceDto {
  id: number;
  createdAt: string;
  pipelineVersion: string;
  // Sunucu yeni bir değer eklerse sayı olduğu gibi kalır; etiket eşlemesi bilinmeyeni ayrıca karşılar.
  mode: number;
  path: string;
  outcome: number;
  durationMs: number | null;
  model: string | null;
  promptTokens: number | null;
  completionTokens: number | null;
  inboundMessageId: number | null;
  replyTexts: string[];
  toolCalls: BotToolCallDto[];
  failureReason: string | null;
  shadowOfTraceId: number | null;
}

export interface BotTracePageDto {
  items: BotTurnTraceDto[];
  nextBeforeId: number | null;
}

// default: koddaki varsayılan (en yeni sürüm). tenantDefault*: hesap geneli seçimi (null = yok, eski backend de null).
// effectiveDefault: kanalda seçim yoksa çalışan sürüm (eski backend'de default).
export interface BotPipelinesDto {
  versions: string[];
  default: string;
  tenantDefault: string | null;
  tenantDefaultShadow: string | null;
  effectiveDefault: string;
}

// Boyut puanları 0..1 oranı; değerlendirilemeyen boyut null.
export interface EvalQuickScoreDto {
  turnSuccess: number | null;
  U: number | null;
  C: number | null;
  D: number | null;
  L: number | null;
  F: number | null;
  H: number | null;
  T: number | null;
}

export type EvalScoreKey = keyof EvalQuickScoreDto;

export interface EvalRunDto {
  id: number;
  name: string;
  pipelineVersion: string;
  status: number;
  conversations: number;
  turnsTotal: number;
  turnsDone: number;
  turnsFailed: number;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  createdByName: string | null;
  quickScore: EvalQuickScoreDto | null;
  // Koşu başarısız olduysa sebebi (ör. "N tur yazılamadı; sürdürerek tekrar deneyin").
  error: string | null;
}

export interface EvalRunPageDto {
  items: EvalRunDto[];
  total: number;
}

export interface ShadowSideDto {
  traceId: number;
  version: string;
  replyTexts: string[];
  outcome: number;
  path: string;
}

export interface ShadowComparisonDto {
  conversationId: number;
  channelName: string;
  createdAt: string;
  customerText: string;
  live: ShadowSideDto | null;
  shadow: ShadowSideDto | null;
}

export interface ShadowComparisonPageDto {
  items: ShadowComparisonDto[];
  total: number;
}

export interface ShadowComparisonQuery {
  channelId: number | null;
  from: string | null;
  to: string | null;
  skip: number;
  take: number;
}

export interface EvalRunStartInput {
  file: File;
  pipelineVersion: string;
  name: string;
  // Turların sunucuda yapay zekâyla hızlı puanlanması (ek token); kapalıysa alan hiç gönderilmez.
  serverScoring?: boolean;
}

// ── Normalleştirme ─────────────────────────────────────────────────────────────

const SCORE_KEYS: readonly EvalScoreKey[] = ['turnSuccess', 'U', 'C', 'D', 'L', 'F', 'H', 'T'];

function normalizeToolCall(value: unknown): BotToolCallDto {
  const raw = asRecord(value);
  return { name: str(raw.name, '?'), args: str(raw.args), status: str(raw.status), durationMs: numOrNull(raw.durationMs) };
}

export function normalizeTrace(value: unknown): BotTurnTraceDto {
  const raw = asRecord(value);
  return {
    id: num(raw.id),
    createdAt: str(raw.createdAt),
    pipelineVersion: str(raw.pipelineVersion),
    mode: num(raw.mode),
    path: str(raw.path),
    outcome: num(raw.outcome),
    durationMs: numOrNull(raw.durationMs),
    model: strOrNull(raw.model),
    promptTokens: numOrNull(raw.promptTokens),
    completionTokens: numOrNull(raw.completionTokens),
    inboundMessageId: numOrNull(raw.inboundMessageId),
    replyTexts: strings(raw.replyTexts),
    toolCalls: list(raw.toolCalls).map(normalizeToolCall),
    failureReason: strOrNull(raw.failureReason),
    shadowOfTraceId: numOrNull(raw.shadowOfTraceId),
  };
}

export function normalizeQuickScore(value: unknown): EvalQuickScoreDto | null {
  if (typeof value !== 'object' || value === null) return null;
  const raw = asRecord(value);
  const score = {} as EvalQuickScoreDto;
  for (const key of SCORE_KEYS) score[key] = numOrNull(raw[key]);
  return score;
}

export function normalizeEvalRun(value: unknown): EvalRunDto {
  const raw = asRecord(value);
  return {
    id: num(raw.id),
    name: str(raw.name),
    pipelineVersion: str(raw.pipelineVersion),
    status: num(raw.status),
    conversations: num(raw.conversations),
    turnsTotal: num(raw.turnsTotal),
    turnsDone: num(raw.turnsDone),
    turnsFailed: num(raw.turnsFailed),
    createdAt: str(raw.createdAt),
    startedAt: strOrNull(raw.startedAt),
    completedAt: strOrNull(raw.completedAt),
    createdByName: strOrNull(raw.createdByName),
    quickScore: normalizeQuickScore(raw.quickScore),
    error: strOrNull(raw.error),
  };
}

function normalizeShadowSide(value: unknown): ShadowSideDto | null {
  if (typeof value !== 'object' || value === null) return null;
  const raw = asRecord(value);
  return {
    traceId: num(raw.traceId), version: str(raw.version), replyTexts: strings(raw.replyTexts),
    outcome: num(raw.outcome), path: str(raw.path),
  };
}

export function normalizeShadowComparison(value: unknown): ShadowComparisonDto {
  const raw = asRecord(value);
  return {
    conversationId: num(raw.conversationId),
    channelName: str(raw.channelName),
    createdAt: str(raw.createdAt),
    customerText: str(raw.customerText),
    live: normalizeShadowSide(raw.live),
    shadow: normalizeShadowSide(raw.shadow),
  };
}

export function normalizePipelines(value: unknown): BotPipelinesDto {
  const raw = asRecord(value);
  const versions = strings(raw.versions);
  // Sürümler eskiden yeniye sıralı; varsayılan gelmezse en yeni.
  const fallback = str(raw.default, versions.at(-1) ?? '');
  return {
    versions,
    default: fallback,
    tenantDefault: strOrNull(raw.tenantDefault),
    tenantDefaultShadow: strOrNull(raw.tenantDefaultShadow),
    effectiveDefault: str(raw.effectiveDefault, fallback),
  };
}

// ── Adres ve gövde kurucular ───────────────────────────────────────────────────

export function tracesUrl(conversationId: number, beforeId: number | null, take = TRACE_PAGE_SIZE): string {
  const params = new URLSearchParams({ take: String(take) });
  if (beforeId !== null) params.set('beforeId', String(beforeId));
  return `${ROOT}/conversations/${conversationId}/traces?${params}`;
}

export const evalRunsUrl = (skip: number, take = EVAL_RUN_PAGE_SIZE): string => `${EVAL_RUNS}?skip=${skip}&take=${take}`;

export function shadowComparisonsUrl(query: ShadowComparisonQuery): string {
  const params = new URLSearchParams({ skip: String(query.skip), take: String(query.take) });
  if (query.channelId !== null) params.set('channelId', String(query.channelId));
  if (query.from) params.set('from', query.from);
  if (query.to) params.set('to', query.to);
  return `${ROOT}/shadow-comparisons?${params}`;
}

// Boş ad gönderilmez (sunucu kendi adını verir). Sunucu puanlaması yalnız açıkça istenince eklenir; eski backend
// alanı tanımaz ve yok sayar.
export function evalRunForm({ file, pipelineVersion, name, serverScoring }: EvalRunStartInput): FormData {
  const form = new FormData();
  form.append('file', file);
  form.append('pipelineVersion', pipelineVersion);
  const trimmedName = name.trim();
  if (trimmedName) form.append('name', trimmedName);
  if (serverScoring) form.append('serverScoring', 'true');
  return form;
}

export const evalResultsFileName = (runId: number): string => `degerlendirme-${runId}-sonuclar.json`;
export const judgePackageFileName = (runId: number): string => `dis-yargic-paketi-${runId}.json`;

export function fileNameFrom(res: Response, fallback: string): string {
  const match = res.headers.get('Content-Disposition')?.match(/filename\*?=(?:UTF-8''|")?([^";]+)/i);
  return match ? decodeURIComponent(match[1]) : fallback;
}

export const omnichannelEvalApi = {
  getTraces: async (conversationId: number, beforeId: number | null): Promise<BotTracePageDto> => {
    const raw = asRecord(await request<unknown>(tracesUrl(conversationId, beforeId)));
    return { items: list(raw.items).map(normalizeTrace), nextBeforeId: numOrNull(raw.nextBeforeId) };
  },

  getPipelines: async (): Promise<BotPipelinesDto> => normalizePipelines(await request<unknown>(`${ROOT}/bot-pipelines`)),

  getEvalRuns: async (skip = 0): Promise<EvalRunPageDto> => {
    const raw = asRecord(await request<unknown>(evalRunsUrl(skip)));
    const items = list(raw.items).map(normalizeEvalRun);
    return { items, total: num(raw.total, items.length) };
  },

  // Dosya yükleme: request() JSON başlığı ekler; FormData için başlık tarayıcıya bırakılır.
  startEvalRun: async (input: EvalRunStartInput): Promise<EvalRunDto> => {
    const res = await fetch(`${BASE}${EVAL_RUNS}`, {
      method: 'POST', headers: uploadHeaders(), body: evalRunForm(input), credentials: 'include',
    });
    await throwIfNotOk(res);
    return normalizeEvalRun(await res.json());
  },

  cancelEvalRun: (id: number) => request<void>(`${EVAL_RUNS}/${id}/cancel`, { method: 'POST' }),
  // Yarıda kalan (başarısız/iptal) koşu kaldığı turdan sürer.
  resumeEvalRun: (id: number) => request<unknown>(`${EVAL_RUNS}/${id}/resume`, { method: 'POST' }),
  deleteEvalRun: (id: number) => request<void>(`${EVAL_RUNS}/${id}`, { method: 'DELETE' }),

  downloadEvalResults: async (id: number): Promise<{ fileName: string; blob: Blob }> => {
    const res = await fetch(`${BASE}${EVAL_RUNS}/${id}/results`, { headers: uploadHeaders(), credentials: 'include' });
    await throwIfNotOk(res);
    return { fileName: fileNameFrom(res, evalResultsFileName(id)), blob: await res.blob() };
  },

  // Dış yargıç (Claude) paketi: sonuç dosyası + ölçek başlığı; maskPii açıkken kişisel veri gizlenir.
  downloadJudgePackage: async (id: number, maskPii: boolean): Promise<{ fileName: string; blob: Blob }> => {
    const res = await fetch(`${BASE}${EVAL_RUNS}/${id}/judge-package?maskPii=${maskPii}`, {
      headers: uploadHeaders(), credentials: 'include',
    });
    await throwIfNotOk(res);
    return { fileName: fileNameFrom(res, judgePackageFileName(id)), blob: await res.blob() };
  },

  getShadowComparisons: async (query: ShadowComparisonQuery): Promise<ShadowComparisonPageDto> => {
    const raw = asRecord(await request<unknown>(shadowComparisonsUrl(query)));
    const items = list(raw.items).map(normalizeShadowComparison);
    return { items, total: num(raw.total, items.length) };
  },
};
