import { request, BASE, uploadHeaders, throwIfNotOk } from './core';
import type { BackgroundJobStarted } from './background-jobs';

// ─── Product Cost Management ──────────────────────────────────────────────────

export interface CostItem {
  name: string;
  price: number;
}

export interface CostMatchItem {
  productId: number;
  productName: string;
  costItemName: string;
  price: number;
  confidence: number;
  reason: string;
  autoApplied: boolean;
  // Önizlemede "eski fiyat → yeni fiyat" göstermek için — ürünün önizleme anındaki
  // mevcut alış fiyatı (henüz DB'ye yazılmadı).
  oldPrice: number | null;
  // Ürünün kategorisi hiç atanmamışsa ve otomatik uygulanacaksa, onay (commit) anında
  // ürüne yazılacak kategori — backend bunu aynen geri bekler, frontend sadece taşır.
  categoryIdToBackfill: number | null;
}

export interface UnmatchedProduct {
  productId: number;
  productName: string;
  reason: string;
}

export interface MatchResult {
  matches: CostMatchItem[];
  pendingModeration: CostMatchItem[];
  // Önceden sessizce atlanıp hiçbir yere kaydedilmeyen ürünler — artık nedeniyle raporlanıyor.
  unmatched: UnmatchedProduct[];
  autoApplied: number;
  totalProducts: number;
  matchedCount: number;
  unmatchedCount: number;
}

export const productCostApi = {
  list: (params?: { page?: number; pageSize?: number; search?: string; sourceId?: number }) => {
    const q = new URLSearchParams();
    if (params?.sourceId) q.set('sourceId', String(params.sourceId));
    if (params?.page) q.set('page', String(params.page));
    if (params?.pageSize) q.set('pageSize', String(params.pageSize));
    if (params?.search) q.set('search', params.search);
    return request<{
      total: number;
      page: number;
      pageSize: number;
      items: Array<{
        productId: number; productName: string; supplierSku: string;
        barcode: string | null; category: string; basePrice: number;
        stockQuantity: number; buyingPrice: number | null;
        boxCode: string | null; boxPrice: number | null; modelYear: string | null; updatedAt: string | null;
        // Maliyetin kaynağı ve para birimi (ERP maliyeti ERP'nin kendi para biriminde, ör. GBP).
        // Opsiyonel: backend bu alanları göndermeden önce yayına çıkan frontend bozulmasın.
        costSource?: CostSource | null; costCurrency?: string | null; isLocked?: boolean;
      }>;
      overallTotal: number;
      overallFilled: number;
    }>(`/product-costs?${q}`);
  },

  update: (productId: number, body: { buyingPrice: number; modelYear?: string | null }) =>
    request<void>(`/product-costs/${productId}`, { method: 'PUT', body: JSON.stringify(body) }),

  // Kilitli maliyeti ERP senkronu ezmez; fiyat ve para birimi değişmez.
  setLock: (productId: number, isLocked: boolean) =>
    request<void>(`/product-costs/${productId}/lock`, { method: 'PUT', body: JSON.stringify({ isLocked }) }),

  parseExcel: async (file: File): Promise<{ items: CostItem[] }> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${BASE}/product-costs/parse-excel`, {
      method: 'POST',
      headers: uploadHeaders(),
      body: formData,
    });
    await throwIfNotOk(res);
    return res.json();
  },

  // Yan etkisiz: sadece hesaplar, DB'ye HİÇBİR ŞEY yazmaz — kullanıcı "kaç ürün etkilenecek"
  // sorusunu (Fiyat Güncelleme Önizlemesi) bu sonuçla cevaplar, sonra matchCommit ile onaylar.
  matchPreview: (costItems: CostItem[]) =>
    request<MatchResult>('/product-costs/match-preview', {
      method: 'POST',
      body: JSON.stringify({ costItems }),
    }),

  // matches, matchPreview'ın döndürdüğü `matches` dizisinin AYNEN geri gönderilmiş hali
  // olmalı — commit bunu yeniden hesaplamaz, doğrudan uygular (önizleme ile fiilen uygulanan
  // birebir aynı kalsın diye).
  matchCommit: (matches: CostMatchItem[]) =>
    request<{ autoApplied: number; pendingModeration: number; totalCommitted: number }>(
      '/product-costs/match-commit',
      { method: 'POST', body: JSON.stringify({ matches }) }
    ),

  applySuggestion: (body: { productId: number; buyingPrice: number; modelYear?: string | null }) =>
    request<void>('/product-costs/apply-suggestion', { method: 'POST', body: JSON.stringify(body) }),

  moderationQueue: () =>
    request<{ total: number; items: CostModerationItem[] }>('/product-costs/moderation'),

  approveModeration: (id: number) =>
    request<void>(`/product-costs/moderation/${id}/approve`, { method: 'POST' }),

  rejectModeration: (id: number) =>
    request<void>(`/product-costs/moderation/${id}/reject`, { method: 'POST' }),

  undoRejectModeration: (id: number) =>
    request<void>(`/product-costs/moderation/${id}/undo-reject`, { method: 'POST' }),

  // Büyük ürün setlerinde exportExcel()'in senkron indirmesi tarayıcıyı dondurabiliyordu — bu,
  // aynı raporu Hangfire'da arka planda üretip jobId döner (bkz. ExportDialog backgroundExport
  // prop'u + lib/api/export-jobs.ts polling). Eski exportExcel() KALDIRILMADI, hâlâ kullanılabilir.
  startExportExcel: () =>
    request<{ jobId: string }>('/product-costs/export/start', { method: 'POST' }),

  exportExcel: async (): Promise<void> => {
    const res = await fetch(`${BASE}/product-costs/export-excel`, {
      method: 'GET',
      headers: uploadHeaders(),
    });
    await throwIfNotOk(res);
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'AlisFiyatlari.xlsx';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },

  importExcel: async (file: File): Promise<{ inserted: number; updated: number; skipped: number }> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${BASE}/product-costs/import-excel`, {
      method: 'POST',
      headers: uploadHeaders(),
      body: formData,
    });
    await throwIfNotOk(res);
    return res.json();
  },
};

export interface CostModerationItem {
  id: number;
  productId: number;
  productName: string;
  costItemName: string;
  price: number;
  confidence: number;
  reason: string | null;
  createdAt: string;
}

// ─── Alış maliyeti kaynak politikası (backend CostSourcePoliciesController) ───
export type CostSource = 'Excel' | 'Erp' | 'Manual';
export type CostSourcePolicy = 'ErpFirst' | 'ExcelFirst' | 'ManualOnly';

export interface CostSourceSummary {
  dataSourceId: number;
  displayName: string;
  erp: string;
  country: string;
  currency: string;
  policy: CostSourcePolicy;
  productCount: number;
  withCost: number;
  withErpPrice: number;
  fromErp: number;
  fromExcel: number;
  fromManual: number;
  locked: number;
}

export const costSourcesApi = {
  list: () => request<CostSourceSummary[]>('/product-costs/sources'),
  setPolicy: (dataSourceId: number, policy: CostSourcePolicy) =>
    request<void>(`/product-costs/sources/${dataSourceId}/policy`, { method: 'PUT', body: JSON.stringify({ policy }) }),
  // Kaynağın ürünlerini ERP'den yeniden çeker (güncel alış fiyatları) ve politikaya göre uygular.
  // Arka plan işini başlatır; sonucu (CostSourceSummary) BackgroundJobWatcher bekler.
  refresh: (dataSourceId: number) =>
    request<BackgroundJobStarted>(`/product-costs/sources/${dataSourceId}/refresh`, { method: 'POST' }),
  applyErp: (dataSourceId?: number) =>
    request<{ updated: number }>(
      dataSourceId === undefined ? '/product-costs/sources/apply-erp' : `/product-costs/sources/apply-erp?dataSourceId=${dataSourceId}`,
      { method: 'POST' }),
};
