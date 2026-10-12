import { request } from './core';
import type { ErpisPage } from './erpis-query';

// ── Erpis ayrıştırma bilgi kaynağı ────────────────────────────────────────────
//
// Sorgu uçlarından (erpis-query.ts) ayrı: orası veriyi gösterir, burası veriyi üreten
// kuralları düzenler — SKU segment sözlüğü, ERP kategori ağacı, ayrıştırma sözlükleri.

export const ERPIS_DICTIONARY_KINDS = [
  'Brand', 'Model', 'ProductType', 'Color', 'Material', 'Pattern', 'Variant', 'Unit', 'Side',
] as const;

export type ErpisDictionaryKind = (typeof ERPIS_DICTIONARY_KINDS)[number];

export interface ErpisApproveCandidatesResult {
  added: number;
  skipped: number;
  reparse: ErpisReparseResult | null;
}

export const ERPIS_DICTIONARY_KIND_LABELS: Record<ErpisDictionaryKind, string> = {
  Brand: 'Marka',
  Model: 'Model',
  ProductType: 'Ürün Tipi',
  Color: 'Renk',
  Material: 'Malzeme',
  Pattern: 'Desen',
  Variant: 'Varyant',
  Unit: 'Birim',
  Side: 'Yön',
};

// Aday önerisi yalnız metin sözlükleri için anlamlı: yön ayrı bir enum kolonunda tutuluyor
// ve çözülemeyen metinden çıkarılamıyor.
export const ERPIS_CANDIDATE_KINDS: readonly ErpisDictionaryKind[] =
  ERPIS_DICTIONARY_KINDS.filter((k) => k !== 'Side');

export interface ErpisSkuSegment {
  id: number;
  position: number;
  code: string;
  label: string | null;
  kind: string | null;
  itemCount: number;
  suggestedLabel: string | null;
  samples: string[];
  updatedBy: string | null;
  updatedAt: string | null;
}

export interface ErpisCategoryNode {
  id: number;
  code: string;
  name: string;
  level: number;
  parentId: number | null;
  source: string;
  itemCount: number;
  children: ErpisCategoryNode[];
}

export interface ErpisDictionaryEntry {
  id: number;
  kind: ErpisDictionaryKind;
  value: string;
  aliases: string[];
  isSeed: boolean;
  isActive: boolean;
  usageCount: number;
}

export interface ErpisDictionaryCandidate {
  value: string;
  occurrences: number;
  samples: string[];
}

export interface ErpisReparseResult {
  scanned: number;
  updated: number;
  skippedManual: number;
  brandedBefore: number;
  brandedAfter: number;
  parserVersion: number;
  /** Stok KODU biçimi yeniden okunduğunda düzelen kart sayısı. */
  skuKindsFixed: number;
}

export interface ErpisParseStatus {
  /** Eski ayrıştırıcı sürümüyle kalmış (otomatik) kart sayısı. */
  outdatedCount: number;
  parserVersion: number;
}

export interface ErpisSegmentQuery {
  position?: number | null;
  onlyUnlabeled?: boolean;
  search?: string | null;
  page?: number;
  pageSize?: number;
}

// Stok kodu KALIBI → firma kuralı.
//
// Erpis tek dosyada bütün fabrikaların kartlarını veriyor ve hangi kartın hangi şirkete
// ait olduğunu söyleyen bir kolon yok; tek ipucu kodun biçimi. Kural veride duruyor,
// kodda değil — yeni bir fabrika çıktığında kimse derleyip dağıtmasın diye.
export interface ErpisSkuRoute {
  id: number;
  /** Biçim maskesi: rakam → 9, harf → A. */
  pattern: string;
  /** Kullanıcının verdiği okunabilir ad — filtrede bu görünür. */
  label: string | null;
  sample: string | null;
  companyId: number;
  companyName: string;
  /** Bu kalıba uyan kayıtlı kart sayısı — kuralın gerçekten neyi etkilediği. */
  itemCount: number;
  createdAt: string;
}

export interface ErpisRouteMove {
  pattern: string;
  fromCompany: string;
  toCompany: string;
  itemCount: number;
}

export interface ErpisApplyRoutesResult {
  scanned: number;
  moved: number;
  moves: ErpisRouteMove[];
  /** Hedef firmada aynı stok kodu olduğu için taşınamayan kart sayısı. */
  blocked: number;
  /** Çakışan kodlardan ilk birkaçı — kullanıcı hedefteki kopyayı bulabilsin diye. */
  blockedSamples: string[] | null;
}

// Yeniden ayrıştırma tüm kataloğu (17 bin+ kart) tek istekte işliyor; global 25 sn
// yetmiyordu ve istemci isteği kesince sunucu da iptal edip hiçbir şey kaydetmiyordu.
const REPARSE_TIMEOUT_MS = 10 * 60_000;

// ── Kart adı kuralları ───────────────────────────────────────────────────────
//
// Kartın filtrede hangi adla görüneceğini (kod kalıbı, kart tipi) ÇİFTİ belirler.
// Tek eksen ayırmıyor: aynı kod kalıbında hem mamul hem yarı mamul, aynı tipte hem
// merkez ürünü hem levha var.
//
// AYNI ADI TAŞIYAN ÇİFTLER filtrede TEK kutuda birleşir.

/** Matrisin tek satırı: verideki gerçek bir (kalıp, tip) çifti. */
export interface ErpisCardMatrixRow {
  skuPattern: string;
  /** Maskenin örnek kodu; maske tek başına kimseye bir şey anlatmıyor. */
  sample: string | null;
  itemTypeKey: string;
  itemCount: number;
  /** Bu çiftin karşılığı. Boşsa kural henüz yazılmamış. */
  label: string | null;
  isDefaultVisible: boolean;
  tagId: number | null;
}

/** Kod kalıbı grubu: firma yönlendirmesi kalıp başına, isimlendirme satır başına. */
export interface ErpisCardMatrixGroup {
  skuPattern: string;
  sample: string | null;
  patternLabel: string | null;
  companyId: number | null;
  companyName: string | null;
  routeId: number | null;
  itemCount: number;
  rows: ErpisCardMatrixRow[];
}

export interface ErpisCardMatrix {
  groups: ErpisCardMatrixGroup[];
  /** Hiçbir kurala uymayan kart sayısı; 0 olmalı. */
  untaggedCount: number;
}

/** Ad boş gönderilirse kural silinir. */
export interface ErpisSaveCardTag {
  skuPattern: string;
  itemTypeKey: string;
  label?: string | null;
  isDefaultVisible?: boolean | null;
}

export const erpisCatalogApi = {
  segments: (query: ErpisSegmentQuery) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value == null || value === '' || value === false) continue;
      params.set(key, String(value));
    }
    return request<ErpisPage<ErpisSkuSegment>>(`/erpis/sku-segments?${params}`);
  },

  updateSegment: (id: number, body: { label: string | null; kind: string | null }) =>
    request<ErpisSkuSegment>(`/erpis/sku-segments/${id}`, {
      method: 'PUT', body: JSON.stringify(body),
    }),

  categories: () => request<ErpisCategoryNode[]>('/erpis/categories'),

  renameCategory: (id: number, name: string) =>
    request<ErpisCategoryNode>(`/erpis/categories/${id}`, {
      method: 'PUT', body: JSON.stringify({ name }),
    }),

  dictionaries: (kind?: ErpisDictionaryKind | null) =>
    request<ErpisDictionaryEntry[]>(`/erpis/dictionaries${kind ? `?kind=${kind}` : ''}`),

  // Önerileri TOPLU onayla ve (varsayılan olarak) hemen yeniden ayrıştır.
  //
  // Tek tek onay kimse tarafından kullanılmıyordu: on iki değer için on iki tıklama.
  // Sistemin öğrenmesi, öğrenmenin ucuz olmasına bağlı.
  approveCandidates: (kind: ErpisDictionaryKind, values: string[], reparse = true) =>
    request<ErpisApproveCandidatesResult>('/erpis/dictionaries/candidates/approve', {
      method: 'POST',
      body: JSON.stringify({ kind, values, reparse }),
    }, true, REPARSE_TIMEOUT_MS),

  candidates: (kind: ErpisDictionaryKind, limit = 20) =>
    request<ErpisDictionaryCandidate[]>(
      `/erpis/dictionaries/candidates?kind=${kind}&limit=${limit}`),

  createDictionaryEntry: (body: { kind: ErpisDictionaryKind; value: string; aliases?: string[] }) =>
    request<ErpisDictionaryEntry>('/erpis/dictionaries', {
      method: 'POST', body: JSON.stringify(body),
    }),

  updateDictionaryEntry: (
    id: number, body: { value: string; aliases: string[]; isActive: boolean },
  ) => request<ErpisDictionaryEntry>(`/erpis/dictionaries/${id}`, {
    method: 'PUT', body: JSON.stringify(body),
  }),

  deleteDictionaryEntry: (id: number) =>
    request<void>(`/erpis/dictionaries/${id}`, { method: 'DELETE' }),

  routes: () => request<ErpisSkuRoute[]>('/erpis/routes'),

  saveRoute: (body: {
    pattern?: string | null;
    companyId: number;
    sample?: string | null;
    /** Yalnız gönderildiğinde yazılır — firma değişikliğinde ad silinmesin diye. */
    label?: string | null;
  }) =>
    request<ErpisSkuRoute>('/erpis/routes', { method: 'POST', body: JSON.stringify(body) }),

  deleteRoute: (id: number) => request<void>(`/erpis/routes/${id}`, { method: 'DELETE' }),

  cardMatrix: () => request<ErpisCardMatrix>('/erpis/card-matrix'),

  saveCardTag: (body: ErpisSaveCardTag) =>
    request<void>('/erpis/card-tags', { method: 'POST', body: JSON.stringify(body) }),

  // Adsız kalan tüm çiftlere tek seferde ad verir; doldurulan satır sayısını döner.
  // Ad verilmezse sunucu kod şemasından türetir (DEMO / DEMO Levha / Diğer).
  fillUnnamedCardTags: (label?: string | null) =>
    request<number>('/erpis/card-tags/fill-unnamed', {
      method: 'POST', body: JSON.stringify({ label: label ?? null }),
    }),

  // dryRun=true yalnız ne olacağını söyler, hiçbir şey değiştirmez.
  applyRoutes: (dryRun: boolean) =>
    request<ErpisApplyRoutesResult>(`/erpis/routes/apply?dryRun=${dryRun}`, { method: 'POST' }),

  parseStatus: () => request<ErpisParseStatus>('/erpis/items/parse-status'),

  reparse: (body: { itemIds?: number[] | null; onlyOutdated: boolean }) =>
    request<ErpisReparseResult>('/erpis/items/reparse', {
      method: 'POST', body: JSON.stringify(body),
    }, true, REPARSE_TIMEOUT_MS),
};
