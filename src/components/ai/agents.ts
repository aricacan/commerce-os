import { orderApi, productApi, logisticsApi, categoryApi, platformApi } from '../../lib/api';
import { BRAND_OPTIONS } from '../../stores/store-selector';

// Hazır ajanlar: kullanıcının çip'e dokunarak BİLEREK başlattığı, soru-cevap sihirbazıyla
// filtre toplayıp gerçek API'den kart üreten deterministik akışlar.
//
// ESKİDEN burada bir anahtar-kelime/regex niyet tespiti (detectIntent) vardı ve serbest
// metin de bu ajanlara yönlendiriliyordu: "sipariş sistemi nasıl çalışır?" 3 soruluk sihirbaz
// açıyor, "kar" deseni "kargo"/"karşılaştır" kelimelerini yakalayıp Kâr Analizi'ni tetikliyordu.
// Kullanıcının "mantıksız davranıyor" şikâyetinin kaynaklarından biriydi. Artık serbest metin
// HER ZAMAN Aivar'a (backend araç-çağırma) gider; ajanlar yalnızca çip ile başlar.

export interface AgentOption {
  label: string;
  value: string;
}

export interface AgentQuestion {
  key: string;
  prompt: string;
  options: AgentOption[];
  allowFreeText?: boolean;
  searchable?: boolean;
}

export interface AgentResultRow {
  rank?: number;
  label: string;
  value: string;
  sub?: string;
  badge?: string;
}

export interface AgentResultTableColumn {
  key: string;
  header: string;
}

export interface AgentResult {
  agentName: string;
  paramSummary: string;
  rows: AgentResultRow[];
  tableColumns?: AgentResultTableColumn[];
  tableData?: Record<string, unknown>[];
  summary?: string;
  type: 'list' | 'stat' | 'table';
}

export interface AgentDef {
  id: string;
  name: string;
  description: string;
  group: 'Satış' | 'Ürün' | 'Finans' | 'Lojistik';
  getQuestions: () => Promise<AgentQuestion[]>;
  execute: (answers: Record<string, string>, dateFrom: string, dateTo: string, days: number) => Promise<AgentResult>;
}

const STORE_QUESTION: AgentQuestion = {
  key: 'store',
  prompt: 'Hangi mağaza için?',
  options: [
    { label: 'Tüm Mağazalar', value: 'all' },
    ...BRAND_OPTIONS.map((s) => ({ label: s.label, value: s.code })),
  ],
};

function resolveStoreCode(answers: Record<string, string>): string | undefined {
  return answers.store && answers.store !== 'all' ? answers.store : undefined;
}

function parseNumber(value: string | undefined): number | undefined {
  if (!value || value === 'all') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function money(value: number, fractionDigits = 0): string {
  return '₺' + value.toLocaleString('tr-TR', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

function dash(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
}

async function categoryQuestion(prompt = 'Kategori filtresi?'): Promise<AgentQuestion> {
  const categories = await categoryApi.master().catch(() => []);
  return {
    key: 'category',
    prompt,
    searchable: true,
    options: [
      { label: 'Tüm Kategoriler', value: 'all' },
      ...categories.map((category) => ({ label: category.name, value: String(category.id) })),
    ],
  };
}

async function platformQuestion(prompt = 'Platform filtresi?'): Promise<AgentQuestion> {
  const platforms = await platformApi.list().catch(() => []);
  return {
    key: 'platform',
    prompt,
    searchable: true,
    options: [
      { label: 'Tüm Platformlar', value: 'all' },
      ...platforms.filter((platform) => platform.name !== 'Sentos').map((platform) => ({
        label: platform.name,
        value: String(platform.id),
      })),
    ],
  };
}

function filterSummary(answers: Record<string, string>): string {
  const parts = [
    answers.categoryLabel ?? 'Tüm Kategoriler',
    answers.platformLabel ?? 'Tüm Platformlar',
    answers.storeLabel ?? 'Tüm Mağazalar',
  ].filter(Boolean);
  return parts.join(' · ');
}

export const AGENTS: Record<string, AgentDef> = {
  orders: {
    id: 'orders',
    name: 'Sipariş Analizi',
    description: 'Sipariş, ciro ve günlük ortalama',
    group: 'Satış',
    getQuestions: async () => [
      await categoryQuestion('Hangi kategoride siparişlere bakalım?'),
      await platformQuestion('Hangi platformda?'),
      STORE_QUESTION,
    ],
    execute: async (answers, from, to, days) => {
      const categoryId = parseNumber(answers.category);
      const platformId = parseNumber(answers.platform);
      const stats = await orderApi.statsSimple(from, to, resolveStoreCode(answers), platformId, categoryId);
      const daily = days > 0 ? (stats.totalOrderCount / days).toFixed(1) : '—';

      return {
        agentName: 'Sipariş Analizi',
        paramSummary: filterSummary(answers),
        type: 'stat',
        rows: [
          { label: 'Toplam Sipariş', value: stats.totalOrderCount.toLocaleString('tr-TR') },
          { label: 'Günlük Ortalama', value: `${daily} sipariş/gün` },
          { label: 'Toplam Ciro', value: money(stats.totalRevenue, 2) },
          { label: 'İade Sayısı', value: stats.returnCount.toLocaleString('tr-TR') },
          { label: 'Aktif Ürün', value: `${stats.activeProductCount.toLocaleString('tr-TR')} ürün` },
        ],
        summary: `Seçilen aralıkta günde ortalama ${daily} sipariş oluştu.`,
      };
    },
  },

  revenue: {
    id: 'revenue',
    name: 'Ciro Analizi',
    description: 'Ciro, günlük ortalama ve zirve günler',
    group: 'Satış',
    getQuestions: async () => [
      await categoryQuestion('Ciroyu hangi kategori için hesaplayalım?'),
      await platformQuestion('Hangi platformda?'),
      STORE_QUESTION,
    ],
    execute: async (answers, from, to, days) => {
      const categoryId = parseNumber(answers.category);
      const platformId = parseNumber(answers.platform);
      const stats = await orderApi.statsSimple(from, to, resolveStoreCode(answers), platformId, categoryId);
      const topDays = [...(stats.dailyOrderCounts ?? [])]
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 3);
      const dailyRevenue = days > 0 ? stats.totalRevenue / days : 0;

      return {
        agentName: 'Ciro Analizi',
        paramSummary: filterSummary(answers),
        type: 'list',
        rows: [
          { label: 'Toplam Ciro', value: money(stats.totalRevenue, 2) },
          { label: 'Günlük Ortalama', value: money(dailyRevenue, 0) },
          ...topDays.map((day) => ({
            label: day.date.slice(5),
            value: money(day.revenue, 0),
            badge: `${day.count} sipariş`,
          })),
        ],
        summary: topDays.length > 0 ? `En yüksek ciro günü: ${topDays[0].date.slice(5)}.` : 'Bu aralıkta ciro kaydı bulunamadı.',
      };
    },
  },

  topSellers: {
    id: 'topSellers',
    name: 'En Çok Satanlar',
    description: 'Satış adedine göre ürün sıralaması',
    group: 'Ürün',
    getQuestions: async () => [
      await categoryQuestion('Kategori filtresi?'),
      {
        key: 'count',
        prompt: 'Kaç ürün listeleyelim?',
        options: [
          { label: 'İlk 5', value: '5' },
          { label: 'İlk 10', value: '10' },
          { label: 'İlk 20', value: '20' },
        ],
      },
      STORE_QUESTION,
    ],
    execute: async (answers) => {
      const count = Number(answers.count ?? '10');
      const categoryId = parseNumber(answers.category);
      const result = await productApi.list({
        page: 1,
        pageSize: count,
        categoryId,
        sortBy: 'sales_desc',
        storeCode: resolveStoreCode(answers),
      });

      return {
        agentName: 'En Çok Satanlar',
        paramSummary: `${answers.categoryLabel ?? 'Tüm Kategoriler'} · İlk ${count}`,
        type: 'list',
        rows: result.items.map((product, index) => ({
          rank: index + 1,
          label: product.productName,
          value: `${product.salesCount.toLocaleString('tr-TR')} satış`,
          sub: `${money(product.price, 2)} · SKU: ${dash(product.supplierSKU)}`,
          badge: product.mappedCategoryName ?? undefined,
        })),
        summary: result.items.length > 0
          ? `${result.totalCount.toLocaleString('tr-TR')} ürün içinde satışa göre ilk ${result.items.length} kayıt.`
          : 'Bu filtreyle satış kaydı olan ürün bulunamadı.',
      };
    },
  },

  productSearch: {
    id: 'productSearch',
    name: 'Ürün Arama',
    description: 'Ad, SKU veya barkod ile ürün bul',
    group: 'Ürün',
    getQuestions: async () => [
      {
        key: 'query',
        prompt: 'Ürün adı, SKU veya barkod yazın:',
        options: [],
        allowFreeText: true,
      },
      STORE_QUESTION,
    ],
    execute: async (answers) => {
      const query = answers.query?.trim() ?? '';
      if (!query) {
        return {
          agentName: 'Ürün Arama',
          paramSummary: 'Boş arama',
          type: 'list',
          rows: [{ label: 'Aranacak değer girilmedi', value: '—' }],
          summary: 'Ürün aramak için ürün adı, SKU veya barkod yazın.',
        };
      }

      const result = await productApi.list({
        search: query,
        page: 1,
        pageSize: 10,
        storeCode: resolveStoreCode(answers),
      });

      return {
        agentName: 'Ürün Arama',
        paramSummary: `"${query}"`,
        type: 'list',
        rows: result.items.length === 0
          ? [{ label: 'Sonuç bulunamadı', value: '—' }]
          : result.items.map((product, index) => ({
              rank: index + 1,
              label: product.productName,
              value: `${product.stockQuantity.toLocaleString('tr-TR')} stok`,
              sub: `${money(product.price, 2)} · SKU: ${dash(product.supplierSKU)}`,
              badge: `${product.salesCount.toLocaleString('tr-TR')} satış`,
            })),
        summary: result.items.length > 0
          ? `${result.totalCount.toLocaleString('tr-TR')} eşleşme bulundu.`
          : 'Ad, SKU veya barkod ile eşleşen ürün bulunamadı.',
      };
    },
  },

  profit: {
    id: 'profit',
    name: 'Kâr Analizi',
    description: 'Brüt/net kâr ve marj',
    group: 'Finans',
    getQuestions: async () => [
      await categoryQuestion('Kârı hangi kategori için hesaplayalım?'),
      await platformQuestion('Hangi platformda?'),
      STORE_QUESTION,
    ],
    execute: async (answers, from, to) => {
      const categoryId = parseNumber(answers.category);
      const platformId = parseNumber(answers.platform);
      const data = await orderApi.profitSummary(from, to, platformId, categoryId, resolveStoreCode(answers));

      return {
        agentName: 'Kâr Analizi',
        paramSummary: filterSummary(answers),
        type: 'stat',
        rows: [
          { label: 'Toplam Ciro', value: money(data.totalRevenue, 0) },
          { label: 'Brüt Kâr', value: money(data.grossProfit, 0), badge: `%${data.grossMarginPct.toFixed(1)}` },
          { label: 'Net Kâr', value: money(data.netProfit, 0), badge: `%${data.netMarginPct.toFixed(1)}` },
          { label: 'Sipariş', value: `${data.orderCount.toLocaleString('tr-TR')} adet` },
          { label: 'Komisyon', value: money(data.totalCommission, 0) },
          { label: 'KDV', value: money(data.totalVat, 0) },
        ],
        summary: `Net marj %${data.netMarginPct.toFixed(1)}. Seçilen filtrelerde net kâr ${money(data.netProfit, 0)}.`,
      };
    },
  },

  logistics: {
    id: 'logistics',
    name: 'Şehir Dağılımı',
    description: 'Siparişlerin şehir dağılımı',
    group: 'Lojistik',
    getQuestions: async () => [
      await categoryQuestion('Hangi kategori için şehir dağılımı?'),
      await platformQuestion('Hangi platformda?'),
      {
        key: 'top',
        prompt: 'Kaç şehir listeleyelim?',
        options: [
          { label: 'İlk 5', value: '5' },
          { label: 'İlk 10', value: '10' },
          { label: 'Tümü', value: '81' },
        ],
      },
      STORE_QUESTION,
    ],
    execute: async (answers, from, to) => {
      const categoryId = parseNumber(answers.category);
      const platformId = parseNumber(answers.platform);
      const top = Number(answers.top ?? '10');
      const mapData = await logisticsApi.map(from, to, platformId, categoryId, resolveStoreCode(answers));
      const cities = [...mapData.ordersByCity]
        .sort((a, b) => b.count - a.count)
        .slice(0, top);

      return {
        agentName: 'Şehir Dağılımı',
        paramSummary: `${filterSummary(answers)} · İlk ${top}`,
        type: 'list',
        rows: cities.map((city, index) => ({
          rank: index + 1,
          label: city.city,
          value: `${city.count.toLocaleString('tr-TR')} sipariş`,
          sub: money(city.revenue ?? 0, 0),
        })),
        summary: `${mapData.ordersByCity.length.toLocaleString('tr-TR')} şehirde sipariş kaydı var.`,
      };
    },
  },

  platformCompare: {
    id: 'platformCompare',
    name: 'Platform Karşılaştırma',
    description: 'İki platformu gerçek sipariş verisiyle karşılaştır',
    group: 'Satış',
    getQuestions: async () => {
      const platforms = await platformApi.list().catch(() => []);
      const options = platforms
        .filter((platform) => platform.name !== 'Sentos')
        .map((platform) => ({ label: platform.name, value: String(platform.id) }));

      return [
        {
          key: 'p1',
          prompt: 'Birinci platformu seçin:',
          searchable: true,
          options: options.length > 0 ? options : [{ label: 'Platform 1', value: '1' }],
        },
        {
          key: 'p2',
          prompt: 'İkinci platformu seçin:',
          searchable: true,
          options: options.length > 0 ? options : [{ label: 'Platform 2', value: '2' }],
        },
        await categoryQuestion('Kategori filtresi?'),
        STORE_QUESTION,
      ];
    },
    execute: async (answers, from, to) => {
      const p1 = parseNumber(answers.p1);
      const p2 = parseNumber(answers.p2);
      const categoryId = parseNumber(answers.category);
      const storeCode = resolveStoreCode(answers);

      if (!p1 || !p2 || p1 === p2) {
        return {
          agentName: 'Platform Karşılaştırma',
          paramSummary: 'Eksik seçim',
          type: 'table',
          rows: [],
          tableColumns: [{ key: 'metric', header: 'Metrik' }, { key: 'value', header: 'Değer' }],
          tableData: [{ metric: 'Durum', value: 'Karşılaştırma için iki farklı platform seçin.' }],
          summary: 'Aynı platform iki kez seçildiği için karşılaştırma yapılmadı.',
        };
      }

      const [p1Stats, p2Stats] = await Promise.all([
        orderApi.statsSimple(from, to, storeCode, p1, categoryId),
        orderApi.statsSimple(from, to, storeCode, p2, categoryId),
      ]);
      const p1Label = answers.p1Label ?? 'Platform 1';
      const p2Label = answers.p2Label ?? 'Platform 2';
      const p1Average = p1Stats.totalOrderCount > 0 ? p1Stats.totalRevenue / p1Stats.totalOrderCount : 0;
      const p2Average = p2Stats.totalOrderCount > 0 ? p2Stats.totalRevenue / p2Stats.totalOrderCount : 0;
      const winner = p1Stats.totalRevenue === p2Stats.totalRevenue
        ? 'Ciro eşit.'
        : `${p1Stats.totalRevenue > p2Stats.totalRevenue ? p1Label : p2Label} ciroda önde.`;

      return {
        agentName: 'Platform Karşılaştırma',
        paramSummary: `${p1Label} vs ${p2Label}`,
        type: 'table',
        rows: [],
        tableColumns: [
          { key: 'metric', header: 'Metrik' },
          { key: 'p1', header: p1Label },
          { key: 'p2', header: p2Label },
        ],
        tableData: [
          { metric: 'Toplam Sipariş', p1: `${p1Stats.totalOrderCount.toLocaleString('tr-TR')} adet`, p2: `${p2Stats.totalOrderCount.toLocaleString('tr-TR')} adet` },
          { metric: 'Toplam Ciro', p1: money(p1Stats.totalRevenue, 0), p2: money(p2Stats.totalRevenue, 0) },
          { metric: 'Ortalama Sepet', p1: money(p1Average, 0), p2: money(p2Average, 0) },
          { metric: 'İade Sayısı', p1: p1Stats.returnCount.toLocaleString('tr-TR'), p2: p2Stats.returnCount.toLocaleString('tr-TR') },
        ],
        summary: winner,
      };
    },
  },
};

/** Ajanlar panelin o anki tarih filtresiyle çalışır; kart başlığında bu etiket görünür. */
export const CURRENT_PERIOD_LABEL = 'Geçerli Dönem';
