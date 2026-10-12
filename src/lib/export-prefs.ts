// Dışa aktarım tercihlerinin ve sütun şablonlarının kalıcılığı (localStorage). Her export noktası
// kendi `filename`'i ile ayrılır — böylece "siparişler" ve "ürünler" ayrı tercih/şablon tutar.
//
// Saf ve DOM-güvenli: localStorage yoksa (SSR/gizli mod) sessizce boş döner, asla patlamaz.

export type ExportFormatPref = 'excel' | 'csv' | 'pdf';

export interface ExportPrefs {
  format?: ExportFormatPref;
  // Kapsanan değil KAPSANMAYAN sütunlar tutulur → sonradan eklenen yeni sütunlar varsayılan
  // olarak DAHİL kalır (ileri-uyumlu).
  excludedCols?: string[];
  sortKey?: string;
  sortDir?: 'asc' | 'desc';
  currencyMode?: 'try' | 'gbp' | 'both';
  withTotals?: boolean;
}

export interface ColumnPreset {
  name: string;
  columns: string[]; // dahil edilecek sütun key'leri
}

const PREFS_NS = 'export-prefs:';
const PRESETS_NS = 'export-presets:';

function safeGet<T>(k: string): T | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const s = localStorage.getItem(k);
    return s ? (JSON.parse(s) as T) : null;
  } catch {
    return null;
  }
}

function safeSet(k: string, v: unknown): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* kota/gizli-mod → sessizce yut */
  }
}

export function loadPrefs(key: string): ExportPrefs {
  return safeGet<ExportPrefs>(PREFS_NS + key) ?? {};
}

export function savePrefs(key: string, prefs: ExportPrefs): void {
  safeSet(PREFS_NS + key, prefs);
}

export function loadPresets(key: string): ColumnPreset[] {
  const list = safeGet<ColumnPreset[]>(PRESETS_NS + key);
  return Array.isArray(list) ? list : [];
}

// Aynı isim varsa ÜZERİNE yazar (upsert). Güncel listeyi döndürür.
export function savePreset(key: string, name: string, columns: string[]): ColumnPreset[] {
  const trimmed = name.trim();
  if (!trimmed) return loadPresets(key);
  const next = [...loadPresets(key).filter((p) => p.name !== trimmed), { name: trimmed, columns }];
  safeSet(PRESETS_NS + key, next);
  return next;
}

export function deletePreset(key: string, name: string): ColumnPreset[] {
  const next = loadPresets(key).filter((p) => p.name !== name);
  safeSet(PRESETS_NS + key, next);
  return next;
}

// Kaydedilmiş "excluded" setinden güncel kolonlar için included haritası üretir.
// Bilinmeyen (silinmiş) excluded key'ler yok sayılır; yeni kolonlar DAHİL gelir.
export function resolveIncluded(allKeys: string[], excluded?: string[]): Record<string, boolean> {
  const ex = new Set(excluded ?? []);
  return Object.fromEntries(allKeys.map((k) => [k, !ex.has(k)]));
}

// included haritasından, tüm kolon listesine göre KAPSANMAYAN key'leri çıkarır (kalıcılık için).
export function excludedFrom(allKeys: string[], included: Record<string, boolean>): string[] {
  return allKeys.filter((k) => !included[k]);
}
