// Öğrenme sekmesi (SSS/terim önerileri, düzeltme raporu) ve Kalite Merkezi sözlük bölümü.
import type { CorrectionReportDto, LearningSuggestionsDto } from '../../api/omnichannel-learning';
import type { LexiconCandidateDto, LexiconTermDto } from '../../api/omnichannel-lexicon';
import { ago } from '../seed';
import { get, type DemoRequest, type DemoRoute } from '../router';
import { daysQuery, numberQuery, sliceSkipTake } from './omnichannel-http';

const PAGE_TAKE = 50;

function learningSuggestions(): LearningSuggestionsDto {
  return {
    pendingCount: 5,
    autoAppliedThisWeek: 2,
    faqDrafts: [
      {
        id: 1, question: 'Taksit yapabiliyor musunuz?', title: 'Taksit seçenekleri', triggers: ['taksit', 'vade'],
        answerTr: 'Kredi kartına 3 aya kadar taksit yapabiliyoruz.', answerEn: 'We offer up to 3 instalments on credit cards.', answerSq: null,
        evidenceCount: 6, sourceConversationIds: [2, 9, 14], createdAt: ago(1),
      },
      {
        id: 2, question: 'Montaj hizmeti var mı?', title: 'Montaj hizmeti', triggers: ['montaj', 'taktırma'],
        answerTr: 'Ürünlerimiz kolay montaj içindir; montaj videosu pakette yer alır.', answerEn: null, answerSq: null,
        evidenceCount: 4, sourceConversationIds: [5, 12], createdAt: ago(2),
      },
      {
        id: 3, question: 'Do you ship to Ireland?', title: 'Shipping to Ireland', triggers: ['ireland', 'eire'],
        answerTr: null, answerEn: 'We currently ship within the UK only.', answerSq: null,
        evidenceCount: 3, sourceConversationIds: [30], createdAt: ago(3),
      },
    ],
    aliasSuggestions: [
      { id: 11, wrongTerm: 'pasbas', correctTerm: 'paspas', candidates: ['paspas', 'pas pas'], confidence: 0.74, evidenceCount: 7, autoAppliedAt: null, createdAt: ago(1) },
      { id: 12, wrongTerm: 'sileceg', correctTerm: null, candidates: ['silecek', 'silecek takımı'], confidence: 0.58, evidenceCount: 4, autoAppliedAt: null, createdAt: ago(2) },
    ],
    autoApplied: [
      { id: 13, wrongTerm: 'bagaj havuzzu', correctTerm: 'bagaj havuzu', candidates: ['bagaj havuzu'], confidence: 0.96, evidenceCount: 9, autoAppliedAt: ago(1), createdAt: ago(3) },
      { id: 14, wrongTerm: 'direksyon kılıfı', correctTerm: 'direksiyon kılıfı', candidates: ['direksiyon kılıfı'], confidence: 0.94, evidenceCount: 6, autoAppliedAt: ago(2), createdAt: ago(4) },
    ],
  };
}

function corrections(request: DemoRequest): CorrectionReportDto {
  return {
    days: daysQuery(request, 7),
    totalCount: 37,
    bySignal: [{ signal: 1, count: 18 }, { signal: 2, count: 9 }, { signal: 3, count: 6 }, { signal: 4, count: 4 }],
    latestDigest: {
      weekStart: ago(7).slice(0, 10), correctionCount: 37, createdAt: ago(1),
      patterns: [
        { pattern: 'Taksit sorularına cevap verilemiyor', category: 5, suggestedFixType: 3, example: 'Taksit yapabiliyor musunuz?', count: 8 },
        { pattern: 'Yazım hataları ürün aramasını bozuyor', category: 1, suggestedFixType: 1, example: 'pasbas', count: 7 },
        { pattern: 'Cevap tonu fazla resmi', category: 4, suggestedFixType: 4, example: 'Sayın müşterimiz...', count: 5 },
      ],
    },
  };
}

const CANDIDATE_TOKENS: [string, string, string | null, number][] = [
  ['pasbas', 'pasbas takımı lazım', 'paspas', 7], ['tavanbarı', 'tavanbarı var mı', 'tavan barı', 5], ['b8', 'passat b8 için', 'Passat B8 nesli', 9],
  ['kapı eşiği', 'kapı eşiği koruyucu', null, 3], ['lastik parlatıcı', 'lastik parlatıcı sprey', null, 4], ['mk4', 'focus mk4 roof bar', 'Ford Focus 4. nesil', 3],
];

const LEXICON_CANDIDATES: LexiconCandidateDto[] = CANDIDATE_TOKENS.map(([token, exampleText, meaning, count], index) => ({
  id: index + 1, token, exampleText, count, lowConfidenceCount: Math.max(1, count - 3), suggestedMeaning: meaning,
  suggestedKind: (meaning ? (index === 2 ? 1 : 2) : null) as LexiconCandidateDto['suggestedKind'], suggestedMake: null, status: 0, lastSeenAt: ago(0, index * 4 + 2),
}));

const TERM_DEFS: [string, string, number, string | null][] = [
  ['vw', 'Volkswagen', 0, null], ['passat', 'Volkswagen Passat', 1, 'Volkswagen'], ['golf', 'Volkswagen Golf', 1, 'Volkswagen'],
  ['clio', 'Renault Clio', 1, 'Renault'], ['egea', 'Fiat Egea', 1, 'Fiat'], ['paspas', 'Araç paspası', 2, null],
  ['bagaj havuzu', 'Bagaj koruma havuzu', 2, null], ['tavan barı', 'Tavan taşıyıcı bar', 2, null], ['sedan', 'Sedan kasa tipi', 3, null],
  ['hb', 'Hatchback kasa tipi', 3, null], ['silecek', 'Silecek takımı', 2, null], ['far ampülü', 'Far ampulü', 2, null],
];

const LEXICON_TERMS: LexiconTermDto[] = TERM_DEFS.map(([term, meaning, kind, make], index) => ({
  id: index + 1, isGlobal: index < 8, term, meaning, kind: kind as LexiconTermDto['kind'], make, language: 'tr',
  source: (index < 6 ? 0 : index < 10 ? 1 : 2) as LexiconTermDto['source'], isActive: index !== 11, hits: 120 - index * 8,
}));

function lexiconCandidatePage(request: DemoRequest) {
  const status = numberQuery(request, 'status') ?? 0;
  const search = request.query.get('search')?.toLocaleLowerCase('tr') ?? '';
  const rows = LEXICON_CANDIDATES.filter((item) => item.status === status && (!search || item.token.includes(search)));
  return { items: sliceSkipTake(rows, request, PAGE_TAKE), total: rows.length };
}

function lexiconTermPage(request: DemoRequest) {
  const kind = numberQuery(request, 'kind');
  const source = numberQuery(request, 'source');
  const scope = numberQuery(request, 'scope') ?? 0;
  const search = request.query.get('search')?.toLocaleLowerCase('tr') ?? '';
  const rows = LEXICON_TERMS
    .filter((term) => kind === null || term.kind === kind)
    .filter((term) => source === null || term.source === source)
    .filter((term) => scope === 0 || (scope === 1 ? term.isGlobal : !term.isGlobal))
    .filter((term) => !search || `${term.term} ${term.meaning}`.toLocaleLowerCase('tr').includes(search));
  return { items: sliceSkipTake(rows, request, PAGE_TAKE), total: rows.length };
}

export const learningRoutes: DemoRoute[] = [
  get('/omnichannel/learning/suggestions', learningSuggestions),
  get('/omnichannel/learning/corrections', corrections),
  get('/omnichannel/lexicon/candidates', lexiconCandidatePage),
  get('/omnichannel/lexicon/terms', lexiconTermPage),
];
