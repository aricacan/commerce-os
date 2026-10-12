import { request, BASE, uploadHeaders, throwIfNotOk } from './core';

// ── DEMO SentosTrack — çok hesaplı (StoreA + StoreB) Sentos stok takibi ──────────
// Tüm uçlar mağaza koduyla (?store=storea|storeb) scope'lanır.

export interface SentosStore {
  code: string;
  displayName: string;
}

export interface SentosTrackImportResult {
  totalRows: number;
  created: number;
  updated: number;
  skipped: number;
  warnings: string[];
}

export interface PotentialStockItem {
  id: number;
  storeCode: string;
  sku: string;
  productName: string | null;
  baselineQty: number;
  consumedQty: number;
  remainingQty: number;
  baselineAtUtc: string;
  updatedAtUtc: string;
}

export interface PotentialStockMovement {
  id: number;
  source: string;
  qtyDelta: number;
  remainingAfter: number;
  note: string | null;
  createdBy: string | null;
  createdAtUtc: string;
}

export interface SentosStockItem {
  sku: string;
  productName: string | null;
  qty: number;
  syncedAtUtc: string;
}

export interface StockWarning {
  storeCode: string;
  storeDisplayName: string;
  sku: string;
  productName: string | null;
  baselineQty: number;
  orderedQty: number;
  remainingQty: number;
  shortageQty: number;
  level: 'red' | 'orange' | 'yellow' | 'green';
  lastOrderAtUtc: string | null;
  // Satış hızına dayalı tükenme tahmini — level'daki sabit miktar eşiklerinden BAĞIMSIZ.
  // Son 30 günde satış yoksa (tahmin edilemez) ikisi de null olur, 0 değil.
  dailyConsumptionRate: number | null;
  daysUntilStockout: number | null;
  // remainingQty > 0 (henüz kırmızı değil) ama satış hızıyla yakında bitecek.
  isDepletionRisk: boolean;
}

export interface StockWarningSummary {
  red: number;
  orange: number;
  yellow: number;
  green: number;
  totalShortage: number;
  // Filtreden bağımsız toplam izlenen ürün sayısı — 0 ise "her şey sağlıklı" değil,
  // "bu mağaza için hiç Excel yüklenmemiş" demektir.
  itemCount: number;
  lastCheckedAtUtc: string | null;
}

export interface SentosTrackSettings {
  orangeThreshold: number;
  yellowThreshold: number;
  depletionDaysThreshold: number;
}

export interface SentosTrackOverview {
  storeCode: string;
  storeDisplayName: string;
  potentialSkuCount: number;
  sentosSkuCount: number;
  warningRed: number;
  warningOrange: number;
  totalShortage: number;
  lastUploadAtUtc: string | null;
  lastConsumptionAtUtc: string | null;
}

// Excel yükleme — request() JSON gönderdiği için multipart burada elle kurulur.
async function uploadPotentialStock(store: string, file: File): Promise<SentosTrackImportResult> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(
    `${BASE}/sentostrack/potential-stock/import?store=${encodeURIComponent(store)}`,
    { method: 'POST', headers: uploadHeaders(), body: formData },
  );
  await throwIfNotOk(res);
  return res.json();
}

const q = (store: string, search?: string) => {
  const p = new URLSearchParams({ store });
  if (search) p.set('search', search);
  return p.toString();
};

export const sentosTrackApi = {
  stores: () => request<SentosStore[]>('/sentostrack/stores'),
  overview: () => request<SentosTrackOverview[]>('/sentostrack/overview'),

  warnings: (store?: string, level?: string) => {
    const p = new URLSearchParams();
    if (store) p.set('store', store);
    if (level) p.set('level', level);
    const qs = p.toString();
    return request<{ summary: StockWarningSummary; items: StockWarning[] }>(
      `/sentostrack/warnings${qs ? `?${qs}` : ''}`,
    );
  },

  sentosStock: (store: string, search?: string) =>
    request<SentosStockItem[]>(`/sentostrack/sentos-stock?${q(store, search)}`),
  refreshSentosStock: (store: string, search?: string) =>
    request<SentosStockItem[]>(`/sentostrack/sentos-stock/refresh?${q(store, search)}`, { method: 'POST' }),

  potentialStock: (store: string, search?: string) =>
    request<PotentialStockItem[]>(`/sentostrack/potential-stock?${q(store, search)}`),
  movements: (id: number) =>
    request<PotentialStockMovement[]>(`/sentostrack/potential-stock/${id}/movements`),
  uploadPotentialStock,
  adjust: (dto: { storeCode: string; sku: string; qtyDelta: number; note?: string }) =>
    request<PotentialStockItem>('/sentostrack/potential-stock/adjust', {
      method: 'POST', body: JSON.stringify(dto),
    }),

  consume: (store: string) =>
    request<{ consumed: number }>(`/sentostrack/consume?store=${encodeURIComponent(store)}`, { method: 'POST' }),

  settings: (store: string) =>
    request<SentosTrackSettings>(`/sentostrack/settings?store=${encodeURIComponent(store)}`),
  updateSettings: (store: string, dto: SentosTrackSettings) =>
    request<SentosTrackSettings>(`/sentostrack/settings?store=${encodeURIComponent(store)}`, {
      method: 'PUT', body: JSON.stringify(dto),
    }),
};
