import { request, BASE, uploadHeaders, throwIfNotOk } from './core';

// ─── DEMO Intelligent (self-hosted RAG chatbot) ─────────────────────────────────
export type IntelligentDocumentStatus = 'Processing' | 'Ready' | 'Failed';

export interface IntelligentDocument {
  id: number;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  status: IntelligentDocumentStatus;
  errorMessage: string | null;
  chunkCount: number;
  uploadedAt: string;
  processedAt: string | null;
}

export interface IntelligentDocumentChunk {
  id: number;
  chunkIndex: number;
  textPreview: string;
  createdAt: string;
}

export interface IntelligentChatMessage {
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface ProductImageStats {
  totalProducts: number; // vektörü olan tekil ürün satırı
  totalImages: number;   // toplam fotoğraf noktası
  lastSyncedAt: string | null;
  storeBreakdown: Record<string, number>;      // mağaza → ürün satırı
  imageStoreBreakdown: Record<string, number>; // mağaza → fotoğraf
}

export interface ProductImageSearchResult {
  // Aynı SKU birden çok ERP satırında olabildiği için isabet, ait olduğu satırı taşır.
  productId: number;
  sourceId: number | null;
  sku: string;
  productName: string;
  storeCode: string;
  imageUrl: string;
  brand: string;
  category: string;
  score: number;
}

// ERP bazında görsel-RAG kapsam dökümü.
export interface StoreImageBreakdown {
  storeCode: string;
  totalActive: number;
  withSku: number;
  withImage: number;
  ready: number;
  vectorized: number;       // vektörü olan ürün satırı (Hazır ile kıyaslanabilir)
  vectorizedImages: number; // toplam fotoğraf noktası (satır başına birden çok)
}

export interface ProductImageSyncSummary {
  startedAt: string;
  finishedAt: string;
  totalCandidates: number;
  embedded: number;
  skipped: number;
  errors: number;
  deleted: number;
  embeddedByStore: Record<string, number>;
  rebuild: boolean;
  legacyCollectionDropped: boolean;
}

export interface ProductImageDetailedStats {
  totalActive: number;
  uniqueSkuCount: number;
  totalReady: number;
  totalVectorized: number;
  totalVectorizedImages: number;
  perStore: StoreImageBreakdown[];
  lastSync: ProductImageSyncSummary | null;
}

export interface IntelligentSystemStatus {
  ollama: boolean;
  qdrant: boolean;
}

export const intelligentApi = {
  // Backend Ollama'ya 60sn'e kadar, üstüne LLM'in kendi süresi eklenince tek istek 90sn'e
  // kadar sürebiliyor — genel REQUEST_TIMEOUT_MS (25sn) burada kullanılırsa backend hâlâ
  // çalışırken istemci "zaman aşımı" hatası gösterirdi (kullanıcı arayüzündeki "30–90 sn
  // sürebilir" notuyla da çelişirdi). Sadece bu çağrı için uzatılmış zaman aşımı.
  chat: (message: string, sessionId: string) =>
    request<{ reply: string }>('/intelligent/chat', {
      method: 'POST',
      body: JSON.stringify({ message, sessionId }),
    }, true, 90_000),

  // Ollama/Qdrant'ın canlı olup olmadığını hızlıca kontrol eder — LLM çağrısı yapmaz.
  getStatus: () => request<IntelligentSystemStatus>('/intelligent/status'),

  getChatHistory: (sessionId: string) =>
    request<IntelligentChatMessage[]>(`/intelligent/chat/history/${sessionId}`),

  listDocuments: () => request<IntelligentDocument[]>('/intelligent/documents'),

  getChunks: (documentId: number) =>
    request<IntelligentDocumentChunk[]>(`/intelligent/documents/${documentId}/chunks`),

  deleteDocument: (documentId: number) =>
    request<void>(`/intelligent/documents/${documentId}`, { method: 'DELETE' }),

  retryDocument: (documentId: number) =>
    request<IntelligentDocument>(`/intelligent/documents/${documentId}/retry`, { method: 'POST' }),

  buildPrompt: (payload: { type: string; shortDescription: string; fields: Record<string, string> }) =>
    request<{ prompt: string }>('/intelligent/prompt-builder/generate', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getImageStats: () => request<ProductImageStats>('/intelligent/product-images/stats'),

  getImageOverview: () =>
    request<ProductImageDetailedStats>('/intelligent/product-images/overview'),

  listProductImages: (limit: number = 50) =>
    request<ProductImageSearchResult[]>(`/intelligent/product-images?limit=${limit}`),

  triggerImageSync: () =>
    request<{ message: string }>('/intelligent/product-images/sync', { method: 'POST' }),

  // Sıfırdan yeniden indeksleme (yalnız yönetici). Vektör anahtarı şeması değiştiğinde
  // eski indeksi yeniye taşımanın tek yolu budur; otomatik ÇALIŞMAZ.
  triggerImageReindex: () =>
    request<{ message: string }>('/intelligent/product-images/reindex', { method: 'POST' }),

  searchByImage: async (file?: File, imageUrl?: string) => {
    const formData = new FormData();
    if (file) {
      formData.append('file', file);
    }
    let query = '';
    if (imageUrl) {
      query = `?imageUrl=${encodeURIComponent(imageUrl)}`;
    }
    const res = await fetch(`${BASE}/intelligent/product-images/search${query}`, {
      method: 'POST',
      headers: uploadHeaders(),
      body: formData,
    });
    await throwIfNotOk(res);
    return res.json() as Promise<{
      queryHash: string;
      dimension: number;
      matches: ProductImageSearchResult[];
    }>;
  },

  upload: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${BASE}/intelligent/documents`, {
      method: 'POST',
      headers: uploadHeaders(),
      body: formData,
    });
    await throwIfNotOk(res);
    return res.json() as Promise<IntelligentDocument>;
  },
};

// Kategori motoru: yerel Ollama ya da bulut LLM (DeepSeek).
export type CategoryAiProvider = 'Ollama' | 'DeepSeek';

// Eski backend "Groq" döndürebilir (frontend önce yayına çıkar) — Ollama dışı her değer bulut LLM'dir.
export const toCategoryAiProvider = (value: string | undefined): CategoryAiProvider =>
  value === 'Ollama' ? 'Ollama' : 'DeepSeek';

// Ayarlar > Yapay Zekâ sekmesi — kategori motoru + token özeti.
export const aiSettingsApi = {
  usageSummary: () => request<{
    todayTokens: number;
    monthTokens: number;
    byModel: { model: string; provider: string; totalTokens: number; callCount: number }[];
    // Eski backend göndermez (frontend önce yayına çıkar) — opsiyonel okunur.
    byPanel?: { panelType: string; provider: string; model: string; totalTokens: number; callCount: number }[];
  }>('/ai-settings/usage-summary'),
  // Layer 3 (AI) kategori sınıflandırma sağlayıcısı — bkz. SwitchableAiCategoryMapper.
  getCategoryAiProvider: () => request<{ provider: string }>('/ai-settings/category-ai-provider'),
  setCategoryAiProvider: (provider: CategoryAiProvider) =>
    request<void>('/ai-settings/category-ai-provider', { method: 'PUT', body: JSON.stringify({ provider }) }),
};
