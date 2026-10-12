// Yapay zekâ yardımcıları: Aivar sohbeti, ajan kadrosu ve Eureka (RAG) çalışma alanı.
import type { AiAgentInfo, AiChatResponse, AiDataCard } from '../../api/ai';
import type {
  IntelligentChatMessage,
  IntelligentDocument,
  IntelligentDocumentChunk,
  ProductImageDetailedStats,
  ProductImageSearchResult,
  ProductImageStats,
} from '../../api/intelligent';
import { ago, dayAgo } from '../seed';
import { DEMO_PRODUCTS, DEMO_STORES } from '../data/core';
import { sessionGet, sessionSet } from '../session-store';
import { del, get, post, type DemoRoute } from '../router';
import { buildProfitSummary } from './dashboard-orders';

const REPORT_DAYS = 7;
const LOW_STOCK_LIMIT = 6;
const LOW_STOCK_THRESHOLD = 20;
const IMAGE_LIMIT = 24;
const HISTORY_PREFIX = 'intelligent.history.';

const AGENTS: AiAgentInfo[] = [
  { key: 'genel', name: 'Aivar', description: 'Sipariş, stok ve finans sorularınızı yanıtlar.', scope: 'Tüm modüller' },
  { key: 'siparis', name: 'Sipariş Uzmanı', description: 'Sipariş durumu, iade ve kargo sorguları.', scope: 'Siparişler' },
  { key: 'stok', name: 'Stok Uzmanı', description: 'Kritik stok ve tedarik önerileri.', scope: 'Ürünler' },
  { key: 'finans', name: 'Finans Uzmanı', description: 'Ciro, marj ve kârlılık analizi.', scope: 'Finans' },
];

const money = (value: number): string => `${Math.round(value).toLocaleString('tr-TR')} ₺`;

function salesCard(): { reply: string; card: AiDataCard } {
  const range = { from: dayAgo(REPORT_DAYS - 1), to: dayAgo(0) };
  const summary = buildProfitSummary(range, []);
  return {
    reply: `Son ${REPORT_DAYS} günde ${summary.orderCount} sipariş aldınız; toplam ciro ${money(summary.totalRevenue)}, brüt kâr ${money(summary.grossProfit)} (%${summary.grossMarginPct}).`,
    card: {
      title: 'Günlük satış özeti',
      subtitle: `Son ${REPORT_DAYS} gün`,
      columns: ['Tarih', 'Sipariş', 'Ciro', 'Brüt kâr'],
      rows: summary.daily.map((day) => [day.date, String(day.orderCount), money(day.revenue), money(day.grossProfit)]),
    },
  };
}

function stockCard(): { reply: string; card: AiDataCard } {
  const low = DEMO_PRODUCTS.filter((product) => product.stock <= LOW_STOCK_THRESHOLD).slice(0, LOW_STOCK_LIMIT);
  return {
    reply: `Stoğu ${LOW_STOCK_THRESHOLD} adedin altına düşen ${low.length} ürün buldum. Öncelik sırasına göre listeledim.`,
    card: {
      title: 'Kritik stoklu ürünler',
      columns: ['SKU', 'Ürün', 'Stok'],
      rows: low.map((product) => [product.sku, product.name, String(product.stock)]),
    },
  };
}

function answerFor(message: string): { reply: string; card: AiDataCard | null } {
  const text = message.toLocaleLowerCase('tr');
  if (/stok|tedarik/.test(text)) return stockCard();
  if (/ciro|satış|sipariş|kâr|kar\b|marj/.test(text)) return salesCard();
  return {
    reply: 'Şu an bu panelde örnek verilerle çalışıyorum. Son günlerin cirosunu, siparişleri ya da kritik stokları sorabilirsiniz; örneğin "bu hafta ciro nasıl?" veya "stoğu azalan ürünler".',
    card: null,
  };
}

function chat(body: unknown): AiChatResponse {
  const { message } = body as { message?: string };
  const answer = answerFor(message ?? '');
  return { reply: answer.reply, cards: answer.card ? [answer.card] : [], actions: [], interactionId: 0 };
}

const DOCUMENTS: IntelligentDocument[] = [
  { id: 1, fileName: 'iade-politikasi.pdf', contentType: 'application/pdf', sizeBytes: 184_320, status: 'Ready', errorMessage: null, chunkCount: 14, uploadedAt: ago(20), processedAt: ago(20) },
  { id: 2, fileName: 'kargo-sureleri.docx', contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', sizeBytes: 96_256, status: 'Ready', errorMessage: null, chunkCount: 9, uploadedAt: ago(11), processedAt: ago(11) },
  { id: 3, fileName: 'urun-kataloglari.pdf', contentType: 'application/pdf', sizeBytes: 2_412_544, status: 'Ready', errorMessage: null, chunkCount: 63, uploadedAt: ago(4), processedAt: ago(4) },
];

function chunksOf(documentId: number): IntelligentDocumentChunk[] {
  const document = DOCUMENTS.find((item) => item.id === documentId) ?? DOCUMENTS[0];
  return Array.from({ length: Math.min(document.chunkCount, 6) }, (_, index) => ({
    id: documentId * 100 + index,
    chunkIndex: index,
    textPreview: `${document.fileName} — bölüm ${index + 1}: örnek içerik özeti. Bu metin demo amaçlı üretilmiştir.`,
    createdAt: document.uploadedAt,
  }));
}

function historyOf(sessionId: string): IntelligentChatMessage[] {
  return sessionGet<IntelligentChatMessage[]>(`${HISTORY_PREFIX}${sessionId}`, () => []);
}

function intelligentChat(body: unknown): { reply: string } {
  const { message, sessionId } = body as { message: string; sessionId: string };
  const reply = 'Yüklü dokümanlara göre: iade talepleri teslimattan sonraki 14 gün içinde kabul edilir; ürün kullanılmamış ve ambalajı açılmamış olmalıdır. (Demo yanıtı)';
  const now = new Date().toISOString();
  sessionSet(`${HISTORY_PREFIX}${sessionId}`, [
    ...historyOf(sessionId),
    { role: 'user', content: message, createdAt: now },
    { role: 'assistant', content: reply, createdAt: now },
  ]);
  return { reply };
}

const IMAGE_STATS: ProductImageStats = {
  totalProducts: DEMO_PRODUCTS.length,
  totalImages: DEMO_PRODUCTS.length * 2,
  lastSyncedAt: ago(0, 4),
  storeBreakdown: Object.fromEntries(DEMO_STORES.map((store, index) => [store.name, 70 - index * 22])),
  imageStoreBreakdown: Object.fromEntries(DEMO_STORES.map((store, index) => [store.name, 140 - index * 44])),
};

function imageOverview(): ProductImageDetailedStats {
  return {
    totalActive: DEMO_PRODUCTS.length,
    uniqueSkuCount: DEMO_PRODUCTS.length,
    totalReady: DEMO_PRODUCTS.length - 6,
    totalVectorized: DEMO_PRODUCTS.length - 6,
    totalVectorizedImages: (DEMO_PRODUCTS.length - 6) * 2,
    perStore: DEMO_STORES.map((store, index) => ({
      storeCode: store.code,
      totalActive: 70 - index * 22,
      withSku: 70 - index * 22,
      withImage: 68 - index * 22,
      ready: 66 - index * 22,
      vectorized: 66 - index * 22,
      vectorizedImages: 132 - index * 44,
    })),
    lastSync: {
      startedAt: ago(0, 4, 12),
      finishedAt: ago(0, 4),
      totalCandidates: DEMO_PRODUCTS.length,
      embedded: 6,
      skipped: DEMO_PRODUCTS.length - 6,
      errors: 0,
      deleted: 0,
      embeddedByStore: { [DEMO_STORES[0].name]: 6 },
      rebuild: false,
      legacyCollectionDropped: false,
    },
  };
}

function productImages(): ProductImageSearchResult[] {
  return DEMO_PRODUCTS.slice(0, IMAGE_LIMIT).map((product, index) => ({
    productId: product.id,
    sourceId: 1,
    sku: product.sku,
    productName: product.name,
    storeCode: DEMO_STORES[index % DEMO_STORES.length].code,
    imageUrl: '',
    brand: product.brand,
    category: product.category,
    score: 1,
  }));
}

export const dashboardAiRoutes: DemoRoute[] = [
  get('/ai/agents', () => AGENTS),
  post('/ai/chat', ({ body }) => chat(body)),
  get('/ai/memory', () => ({ notes: ['Raporları tablo olarak görmeyi tercih eder.', 'Ana ilgi alanı: iç aksesuar ve paspas kategorileri.'] })),
  post('/ai/feedback', () => undefined),
  get('/intelligent/status', () => ({ ollama: true, qdrant: true })),
  get('/intelligent/documents', () => DOCUMENTS),
  get('/intelligent/documents/:id/chunks', ({ params }) => chunksOf(Number(params.id))),
  get('/intelligent/chat/history/:sessionId', ({ params }) => historyOf(params.sessionId)),
  post('/intelligent/chat', ({ body }) => intelligentChat(body)),
  get('/intelligent/product-images/stats', () => IMAGE_STATS),
  get('/intelligent/product-images/overview', imageOverview),
  get('/intelligent/product-images', productImages),
  del('/ai/memory', () => ({ removed: 0 })),
];
