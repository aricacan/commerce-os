// Kalite Merkezi uçları: genel bakış, adaylar, kıyas, veri setleri, onaylı cevaplar, değerlendirme koşuları, gölge kıyası, altın set.
import type { ShadowComparisonDto } from '../../api/omnichannel-eval';
import type {
  DatasetConversationDto, EvalCompareDto, EvalCompareRowDto, QualityCandidatePageDto, QualityOverviewDto, TurnScores,
} from '../../api/omnichannel-quality';
import type { GoldRunDetailDto } from '../../api/omnichannel-gold';
import {
  APPROVED_ANSWERS, CANDIDATES, DATASETS, EVAL_RUNS, GOLD_RUNS, GOLD_SCENARIOS, QUALITY_TARGET,
} from '../data/omnichannel-quality-data';
import { listRecords } from '../data/omnichannel-conversations';
import { ago } from '../seed';
import { get, type DemoRequest, type DemoRoute } from '../router';
import { daysQuery, idParam, notFound, numberQuery, sliceSkipTake } from './omnichannel-http';

const PAGE_TAKE = 50;
const SHADOW_COMPARISONS = 10;
const RUBRIC = ['U', 'C', 'D', 'L', 'F', 'H', 'T'] as const;
const SIGNAL_BITS = [1, 2, 4, 8, 16, 32, 64];

function overview(request: DemoRequest): QualityOverviewDto {
  const sorted = [...EVAL_RUNS].sort((left, right) => (left.completedAt ?? '').localeCompare(right.completedAt ?? ''));
  return {
    target: QUALITY_TARGET,
    latestRuns: EVAL_RUNS.slice(0, 3).map((run) => ({
      runId: run.id, name: run.name, pipelineVersion: run.pipelineVersion, completedAt: run.completedAt, turnsDone: run.turnsDone,
      quickScore: run.quickScore, handoffRate: 0.12, duplicateSuppressed: 2, avgLatencyMs: 5400, tokensPerTurn: 1850,
    })),
    trend: sorted.map((run) => ({ runId: run.id, name: run.name, pipelineVersion: run.pipelineVersion, at: run.completedAt ?? run.createdAt, score: run.quickScore })),
    live: {
      days: daysQuery(request, 7), turns: 1420,
      outcomes: [{ outcome: 0, count: 1180 }, { outcome: 1, count: 170 }, { outcome: 2, count: 14 }, { outcome: 3, count: 36 }, { outcome: 4, count: 20 }],
      paths: [{ key: 'tool', label: 'Araçla cevap', count: 860 }, { key: 'faq', label: 'SSS', count: 240 }, { key: 'menu', label: 'Menü', count: 120 }, { key: 'handoff', label: 'Devir', count: 200 }],
      fallbacks: 18, fallbackRate: 0.013, duplicateSuppressed: 9, handoffs: 170,
      handoffReasons: [{ key: '1', label: 'Temsilci istendi', count: 72 }, { key: '2', label: 'Şikâyet', count: 41 }, { key: '3', label: 'Fiyat talebi', count: 33 }],
      avgLatencyMs: 5400, tokensPerTurn: 1850,
    },
  };
}

function candidatePage(request: DemoRequest): QualityCandidatePageDto {
  const status = numberQuery(request, 'status') ?? 0;
  const signal = numberQuery(request, 'signal');
  const search = request.query.get('search')?.toLocaleLowerCase('tr') ?? '';
  const inStatus = CANDIDATES.filter((candidate) => candidate.status === status);
  const rows = inStatus
    .filter((candidate) => signal === null || (candidate.signals & signal) !== 0)
    .filter((candidate) => !search || candidate.customerText.toLocaleLowerCase('tr').includes(search));
  return {
    items: sliceSkipTake(rows, request, PAGE_TAKE), total: rows.length,
    signalCounts: SIGNAL_BITS.map((bit) => ({ signal: bit, count: inStatus.filter((candidate) => (candidate.signals & bit) !== 0).length })),
  };
}

function scores(base: number): TurnScores {
  const rubric = Object.fromEntries(RUBRIC.map((key, index) => [key, Number((base - index * 0.01).toFixed(2))])) as Record<(typeof RUBRIC)[number], number>;
  return { turnSuccess: base > 0.9, ...rubric };
}

function compareRow(index: number): EvalCompareRowDto {
  const improved = index % 3 !== 0;
  const side = (reply: string, base: number) => ({ replies: [reply], scores: scores(base), issues: [] as string[], path: 'tool', outcome: 'Sent', error: null });
  return {
    conversationKey: `c-${index + 1}`, conversationId: index + 1, turnNumber: 1 + (index % 3), country: index % 4 === 0 ? 'UK' : 'TR',
    channel: index % 4 === 0 ? 'WhatsApp UK' : 'WhatsApp Türkiye', customerText: CANDIDATES[index % CANDIDATES.length].customerText,
    base: side('Bu konuda yardımcı olamıyorum.', 0.82), target: side('Evet, ürünümüz stokta ve 1-2 iş gününde kargoda.', improved ? 0.93 : 0.8),
    deltas: Object.fromEntries(RUBRIC.map((key) => [key, improved ? 0.11 : -0.02])) as EvalCompareRowDto['deltas'],
    textChanged: true, scoreChanged: true, direction: improved ? 0 : 1,
  };
}

function compare(request: DemoRequest): EvalCompareDto {
  const base = EVAL_RUNS.find((run) => run.id === numberQuery(request, 'baseRunId')) ?? EVAL_RUNS[EVAL_RUNS.length - 1];
  const target = EVAL_RUNS.find((run) => run.id === numberQuery(request, 'targetRunId')) ?? EVAL_RUNS[0];
  const rows = Array.from({ length: 12 }, (_, index) => compareRow(index));
  return {
    base, target, comparedTurns: 240, differentTurns: rows.length, improved: rows.filter((row) => row.direction === 0).length,
    regressed: rows.filter((row) => row.direction === 1).length,
    facets: { countries: ['TR', 'UK'], channels: ['WhatsApp Türkiye', 'WhatsApp UK'], issues: ['tone', 'accuracy'], paths: ['tool', 'faq', 'handoff'], outcomes: ['Sent', 'Handoff'] },
    items: sliceSkipTake(rows, request, PAGE_TAKE), total: rows.length,
  };
}

function datasetConversations(request: DemoRequest): { items: DatasetConversationDto[]; total: number } {
  const channelId = numberQuery(request, 'channelId');
  const country = request.query.get('country');
  const hasHandoff = request.query.get('hasHandoff');
  const rows = listRecords()
    .filter((record) => channelId === null || record.summary.channelId === channelId)
    .filter((record) => !country || record.summary.country === country)
    .filter((record) => hasHandoff === null || String(record.script.handoff !== undefined) === hasHandoff)
    .map((record): DatasetConversationDto => ({
      conversationId: record.summary.id, channelName: record.summary.channelName, country: record.summary.country ?? null,
      lastMessageAt: record.summary.lastMessageAt, messageCount: record.messages.length, hasHandoff: record.script.handoff !== undefined,
      flagged: record.summary.topic === 4, preview: record.summary.lastMessagePreview ?? '',
    }));
  return { items: sliceSkipTake(rows, request, PAGE_TAKE), total: rows.length };
}

function approvedAnswers(request: DemoRequest) {
  const includeInactive = request.query.get('includeInactive') === 'true';
  const search = request.query.get('search')?.toLocaleLowerCase('tr') ?? '';
  const rows = APPROVED_ANSWERS
    .filter((answer) => includeInactive || answer.isActive)
    .filter((answer) => !search || `${answer.question} ${answer.answer}`.toLocaleLowerCase('tr').includes(search));
  return { items: sliceSkipTake(rows, request, PAGE_TAKE), total: rows.length };
}

function evalRuns(request: DemoRequest) {
  return { items: sliceSkipTake(EVAL_RUNS, request, PAGE_TAKE), total: EVAL_RUNS.length };
}

function shadowComparisons(request: DemoRequest) {
  const items: ShadowComparisonDto[] = listRecords().slice(0, SHADOW_COMPARISONS).map((record, index) => ({
    conversationId: record.summary.id, channelName: record.summary.channelName, createdAt: ago(0, index + 1),
    customerText: record.messages[0].body ?? '',
    live: { traceId: 100 + index, version: 'v3', replyTexts: ['Size yardımcı olmak için birkaç bilgiye ihtiyacım var.'], outcome: 0, path: 'tool' },
    shadow: { traceId: 200 + index, version: 'v4', replyTexts: ['Elbette! Aracınızın marka, model ve yılını yazar mısınız?'], outcome: 0, path: 'tool' },
  }));
  return { items: sliceSkipTake(items, request, PAGE_TAKE), total: items.length };
}

function goldRunDetail(request: DemoRequest): GoldRunDetailDto | ReturnType<typeof notFound> {
  const run = GOLD_RUNS.find((candidate) => candidate.id === idParam(request));
  if (!run) return notFound();
  return {
    run,
    results: GOLD_SCENARIOS.filter((scenario) => scenario.isActive).map((scenario, index) => ({
      scenarioId: scenario.id, scenarioTitle: scenario.title, referenceReply: scenario.referenceReply,
      actualReply: 'Elbette, size yardımcı olayım. Aracınızın marka ve modelini yazar mısınız?', deterministicPassed: index !== 2,
      deterministicNotes: index === 2 ? 'Beklenen araç çağrılmadı.' : null, judgeFailed: false, accuracy: 8 + (index % 2), tone: 9,
      opportunity: 7 + (index % 3), score: 8 + (index % 3) * 0.3, previousScore: 7.8, scoreDelta: 0.4, diffNote: null,
    })),
  };
}

function goldCandidates() {
  return listRecords().filter((record) => record.messages.some((message) => message.senderType === 1)).slice(0, 5).map((record) => {
    const reply = record.messages.find((message) => message.senderType === 1);
    return {
      messageId: reply?.id ?? 0, conversationId: record.summary.id, language: record.ctx.country === 'UK' ? 'en' : 'tr',
      countryCode: record.ctx.country, customerPreview: record.messages[0].body ?? '', replyPreview: reply?.body ?? '',
    };
  });
}

export const qualityRoutes: DemoRoute[] = [
  get('/omnichannel/quality/overview', overview),
  get('/omnichannel/quality/compare', compare),
  get('/omnichannel/quality/candidates', candidatePage),
  get('/omnichannel/quality/datasets/conversations', datasetConversations),
  get('/omnichannel/quality/datasets', () => DATASETS),
  get('/omnichannel/quality/approved-answers', approvedAnswers),
  get('/omnichannel/gold-set/eval-runs', evalRuns),
  get('/omnichannel/shadow-comparisons', shadowComparisons),
  get('/omnichannel/gold-scenarios/candidates', goldCandidates),
  get('/omnichannel/gold-scenarios', () => GOLD_SCENARIOS),
  get('/omnichannel/gold-set/runs/:id', goldRunDetail),
  get('/omnichannel/gold-set/runs', () => GOLD_RUNS),
];
