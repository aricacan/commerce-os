// Kalite Merkezi demo verisi: değerlendirme koşuları, adaylar, veri setleri, onaylı cevaplar, altın set.
import type { EvalQuickScoreDto, EvalRunDto } from '../../api/omnichannel-eval';
import type {
  ApprovedAnswerDto, QualityCandidateDto, QualityDatasetDto,
} from '../../api/omnichannel-quality';
import type { GoldRunSummaryDto, GoldScenarioDto } from '../../api/omnichannel-gold';
import { ago } from '../seed';

const SCORE_BASE = 0.86;
const SCORE_STEP = 0.014;

function quickScore(runIndex: number): EvalQuickScoreDto {
  const lift = runIndex * SCORE_STEP;
  const score = (offset: number) => Number(Math.min(0.99, SCORE_BASE + lift + offset).toFixed(3));
  return {
    turnSuccess: score(0.05), U: score(0.04), C: score(0.02), D: score(-0.03), L: score(0.06), F: score(0.01), H: score(0.03), T: score(0.05),
  };
}

const RUN_DEFS: [string, string, number][] = [
  ['Haftalık regresyon #1', 'v3', 12], ['Haftalık regresyon #2', 'v3', 9], ['v4 aday koşusu', 'v4', 6],
  ['Haftalık regresyon #3', 'v3', 3], ['v4 aday koşusu #2', 'v4', 1],
];

export const EVAL_RUNS: EvalRunDto[] = RUN_DEFS.map(([name, version, daysAgo], index): EvalRunDto => ({
  id: index + 1, name, pipelineVersion: version, status: 2, conversations: 60, turnsTotal: 240, turnsDone: 240,
  turnsFailed: index === 2 ? 3 : 0, createdAt: ago(daysAgo), startedAt: ago(daysAgo), completedAt: ago(daysAgo, -1),
  createdByName: 'Demo Kullanıcı', quickScore: quickScore(index), error: null,
})).reverse();

export const QUALITY_TARGET = 0.95;

const CANDIDATE_REASONS = [
  'Temsilci botun cevabını düzeltti.', 'Müşteri cevabı yanlış olarak işaretledi.', 'Bot aynı soruya tekrar cevap veremedi.',
  'Cevap yedek metne düştü.', 'Temsilci devri sonrası doğru cevabı yazdı.', 'Denetim puanı düşük.',
];
const CANDIDATE_QUESTIONS = [
  'Taksit imkanı var mı?', 'Passat B8 için tavan barı kilitli mi?', 'Kapıda ödeme ücreti ne kadar?', 'Do you ship to Northern Ireland?',
  'Fatura kesiyor musunuz?', 'Ürün garantili mi?', 'Pazar günü kargo çıkar mı?', 'Hangi kargo ile gönderiyorsunuz?',
  'Montaj hizmeti veriyor musunuz?', 'Can I pay with PayPal?', 'Koltuk kılıfı 5 kişilik mi?', 'İade kargo ücretsiz mi?',
];
const SIGNAL_CYCLE = [1, 2, 4, 8, 16, 64];

export const CANDIDATES: QualityCandidateDto[] = CANDIDATE_QUESTIONS.map((question, index): QualityCandidateDto => ({
  id: index + 1,
  conversationId: (index * 3) % 36 + 1,
  channelId: index % 3 === 0 ? 2 : 1,
  channelName: index % 3 === 0 ? 'WhatsApp UK' : 'WhatsApp Türkiye',
  country: index % 3 === 0 ? 'UK' : 'TR',
  signals: SIGNAL_CYCLE[index % SIGNAL_CYCLE.length],
  status: index < 9 ? 0 : index === 9 ? 1 : 2,
  customerText: question,
  botText: index % 2 === 0 ? 'Bu konuda yardımcı olamıyorum, sizi temsilciye aktarıyorum.' : 'Ürün stoklarımızda mevcut.',
  reason: CANDIDATE_REASONS[index % CANDIDATE_REASONS.length],
  decisionPath: index % 2 === 0 ? 'handoff' : 'tool:search_products',
  suggestedAnswer: 'Evet, ürünlerimiz 2 yıl garantilidir; fatura ve garanti belgesi pakete eklenir.',
  expectedAnswer: index === 9 ? 'PayPal şu an desteklenmiyor; kart ve havale ile ödeyebilirsiniz.' : null,
  scenarioId: null,
  approvedAnswerId: index === 9 ? 3 : null,
  detectedAt: ago(0, index * 5),
  reviewedAt: index >= 9 ? ago(0, 2) : null,
}));

export const DATASETS: QualityDatasetDto[] = [
  { id: 1, name: 'Şikâyet konuşmaları', version: 2, source: 0, conversations: 48, turns: 190, description: 'Son 30 günde devredilen şikâyetler.', createdByName: 'Demo Kullanıcı', createdAt: ago(14) },
  { id: 2, name: 'Sipariş akışları', version: 1, source: 0, conversations: 60, turns: 240, description: 'Sipariş toplama ve onay konuşmaları.', createdByName: 'Ece Operasyon', createdAt: ago(9) },
  { id: 3, name: 'UK müşteri soruları', version: 1, source: 1, conversations: 25, turns: 88, description: null, createdByName: 'Demo Kullanıcı', createdAt: ago(4) },
];

const APPROVED_SEED: [string, string, string, string][] = [
  ['tr', 'Kargo ne kadar sürer?', 'Siparişler 1-2 iş günü içinde kargoya verilir; teslimat 1-3 iş günüdür.', 'TR'],
  ['tr', 'İade koşulları nelerdir?', 'Kullanılmamış ürünleri 14 gün içinde iade edebilirsiniz; iade kargosu ücretsizdir.', 'TR'],
  ['tr', 'Ödeme seçenekleri neler?', 'Kredi kartı, havale/EFT ve kapıda ödeme seçeneklerimiz var.', 'TR'],
  ['en', 'How long does delivery take?', 'UK mainland delivery takes 2-3 working days.', 'UK'],
  ['en', 'Can I return an item?', 'Yes, unused items can be returned within 30 days for a full refund.', 'UK'],
  ['tr', 'Fatura kesiyor musunuz?', 'Evet, e-fatura veya e-arşiv faturanız sipariş sonrası e-postanıza gönderilir.', 'TR'],
];

export const APPROVED_ANSWERS: ApprovedAnswerDto[] = APPROVED_SEED.map(([language, question, answer, country], index): ApprovedAnswerDto => ({
  id: index + 1, channelId: null, channelName: null, country, language, question, answer, isActive: index !== 5,
  sourceCandidateId: index + 1, createdAt: ago(30 - index * 3), updatedAt: ago(10 - index),
}));

const GOLD_TITLES = [
  'Stok sorgusu: Passat B8 paspas', 'Fiyat itirazı ve indirim talebi', 'Hasarlı ürün şikâyeti', 'Sipariş onayı ve adres toplama',
  'Kargo takip sorusu', 'UK: returns request', 'UK: stock enquiry', 'Taksit ve ödeme yöntemi',
];

export const GOLD_SCENARIOS: GoldScenarioDto[] = GOLD_TITLES.map((title, index): GoldScenarioDto => ({
  id: index + 1, title, language: title.startsWith('UK') ? 'en' : 'tr', countryCode: title.startsWith('UK') ? 'UK' : 'TR',
  steps: ['Merhaba, bilgi almak istiyorum', 'Devam edelim'],
  referenceReply: 'Elbette, size yardımcı olayım. Hangi araç için bakıyorsunuz?',
  expectations: {
    expectedTools: index % 2 === 0 ? ['search_products'] : [], expectedStage: null, mustContain: ['yardımcı'], mustNotContain: ['bilmiyorum'],
    requiresPrice: index === 0, requiresLink: false,
  },
  isActive: index !== 7, createdAt: ago(40 - index * 4),
}));

export const GOLD_RUNS: GoldRunSummaryDto[] = [
  { id: 1, startedAt: ago(14), finishedAt: ago(14, -1), versionLabel: 'v3-baz', averageScore: 8.1, previousAverageScore: null, delta: null, gatePassed: true, scenarioCount: 8, judgeFailedCount: 0, deterministicFailedCount: 1 },
  { id: 2, startedAt: ago(7), finishedAt: ago(7, -1), versionLabel: 'v3-fix1', averageScore: 8.4, previousAverageScore: 8.1, delta: 0.3, gatePassed: true, scenarioCount: 8, judgeFailedCount: 0, deterministicFailedCount: 0 },
  { id: 3, startedAt: ago(1), finishedAt: ago(1, -1), versionLabel: 'v4-aday', averageScore: 8.8, previousAverageScore: 8.4, delta: 0.4, gatePassed: true, scenarioCount: 8, judgeFailedCount: 0, deterministicFailedCount: 0 },
];
