import type { ExportRow } from '../../components/ui/ExportMenu';
import type { ExportColumn } from '../../lib/export';
import {
  IMPORT_APPLY_CHUNK_SIZE, IMPORT_MAX_ROWS, IMPORT_OUTCOME,
  type ShopifyImportResultDto, type ShopifyImportRowDto, type ShopifyImportRowResultDto,
} from '../../lib/api/shopify-import';

// Toplu içe aktarmanın saf kuralları (test edilir): sütun eşleme tahmini, satır üretimi, gruplama, sonuç CSV'si.
// Asıl doğrulama (sayı biçimi, SKU eşleme, eşik) sunucuda.

export const IMPORT_FIELD = {
  Sku: 'sku', Price: 'price', Stock: 'stock', Title: 'title', Description: 'description', Status: 'status',
} as const;
export type ImportField = (typeof IMPORT_FIELD)[keyof typeof IMPORT_FIELD];

export interface ImportFieldMeta {
  key: ImportField;
  label: string;
  required: boolean;
  // Katalog yetkisi ERP olan mağazada sunucu bu alanları reddeder.
  catalogOnly: boolean;
  // Başlık tahmini için kabul edilen adlar (normalize edilmiş, tam eşleşme).
  aliases: string[];
}

export const IMPORT_FIELDS: readonly ImportFieldMeta[] = [
  { key: 'sku', label: 'SKU', required: true, catalogOnly: false, aliases: ['sku', 'stok kodu', 'urun kodu', 'kod', 'variant sku'] },
  { key: 'price', label: 'Fiyat', required: false, catalogOnly: true, aliases: ['fiyat', 'price', 'satis fiyati', 'variant price'] },
  { key: 'stock', label: 'Stok', required: false, catalogOnly: true, aliases: ['stok', 'adet', 'stock', 'quantity', 'miktar', 'variant inventory qty'] },
  { key: 'title', label: 'Başlık', required: false, catalogOnly: false, aliases: ['baslik', 'title', 'urun adi', 'ad', 'name'] },
  { key: 'description', label: 'Açıklama', required: false, catalogOnly: false, aliases: ['aciklama', 'description', 'body html', 'detay'] },
  { key: 'status', label: 'Durum', required: false, catalogOnly: false, aliases: ['durum', 'status'] },
];

// Sütun dizini ya da null (eşlenmedi).
export type ColumnMapping = Record<ImportField, number | null>;

export interface ParsedSheet {
  headers: string[];
  rows: string[][];
}

export const EMPTY_MAPPING: ColumnMapping = { sku: null, price: null, stock: null, title: null, description: null, status: null };

// "Fiyat ", "FİYAT", "Satış Fiyatı" → karşılaştırma için sade biçim.
export function normalizeHeader(text: string): string {
  return text.trim().toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ı/g, 'i').replace(/\s+/g, ' ');
}

export function guessMapping(headers: string[]): ColumnMapping {
  const normalized = headers.map(normalizeHeader);
  const mapping = { ...EMPTY_MAPPING };
  for (const field of IMPORT_FIELDS) {
    const index = normalized.findIndex((header, i) => field.aliases.includes(header) && !Object.values(mapping).includes(i));
    mapping[field.key] = index >= 0 ? index : null;
  }
  return mapping;
}

// ERP yetkili mağazada fiyat/stok eşlemeleri kaldırılır (sunucu zaten reddeder; kullanıcıya baştan kapalı gösterilir).
export function withoutCatalogFields(mapping: ColumnMapping): ColumnMapping {
  const next = { ...mapping };
  for (const field of IMPORT_FIELDS) if (field.catalogOnly) next[field.key] = null;
  return next;
}

export function validateMapping(mapping: ColumnMapping, catalogLocked: boolean, rowCount: number): string | null {
  if (mapping.sku === null) return 'SKU sütununu seçin.';
  const mapped = IMPORT_FIELDS.filter((f) => !f.required && mapping[f.key] !== null);
  if (mapped.length === 0) return 'SKU dışında en az bir sütun (fiyat, stok, başlık…) seçin.';
  if (catalogLocked && mapped.some((f) => f.catalogOnly)) {
    return 'Bu mağazanın katalog yetkisi ERP: fiyat ve stok sütunları içe aktarılamaz. Bu sütunların eşlemesini kaldırın.';
  }
  if (rowCount === 0) return 'Dosyada veri satırı yok.';
  if (rowCount > IMPORT_MAX_ROWS) return `En fazla ${IMPORT_MAX_ROWS} satır içe aktarılabilir (dosyada ${rowCount}). Dosyayı bölün.`;
  return null;
}

const cell = (row: string[], index: number | null): string | undefined => {
  if (index === null) return undefined;
  const value = (row[index] ?? '').trim();
  return value === '' ? undefined : value;
};

// Tamamen boş satırlar atlanır; satır numarası Excel'deki gibi (başlık = 1).
export function buildImportRows(sheet: ParsedSheet, mapping: ColumnMapping): ShopifyImportRowDto[] {
  const header = 1;
  return sheet.rows
    .map((row, index) => ({ row, rowNumber: index + header + 1 }))
    .filter(({ row }) => row.some((value) => value.trim() !== ''))
    .map(({ row, rowNumber }) => ({
      rowNumber,
      sku: cell(row, mapping.sku) ?? '',
      price: cell(row, mapping.price),
      stock: cell(row, mapping.stock),
      title: cell(row, mapping.title),
      description: cell(row, mapping.description),
      status: cell(row, mapping.status),
    }));
}

export function chunk<T>(items: readonly T[], size: number): T[][] {
  const groups: T[][] = [];
  for (let start = 0; start < items.length; start += size) groups.push(items.slice(start, start + size));
  return groups;
}

export const applyGroups = (rows: ShopifyImportRowDto[]) => chunk(rows, IMPORT_APPLY_CHUNK_SIZE);

export function mergeResults(parts: ShopifyImportResultDto[]): ShopifyImportResultDto {
  const rows = parts.flatMap((part) => part.rows).sort((a, b) => a.rowNumber - b.rowNumber);
  const count = (outcome: number) => rows.filter((r) => r.outcome === outcome).length;
  return { rows, applied: count(IMPORT_OUTCOME.Applied), skipped: count(IMPORT_OUTCOME.Skipped), failed: count(IMPORT_OUTCOME.Failed) };
}

// Bir grubun isteği başarısız olursa (ağ, onay gerekir…) o grubun satırları "başarısız" olarak raporlanır.
export function failedGroup(rows: ShopifyImportRowDto[], reason: string): ShopifyImportResultDto {
  const results: ShopifyImportRowResultDto[] = rows.map((r) => ({ rowNumber: r.rowNumber, sku: r.sku, outcome: IMPORT_OUTCOME.Failed, message: reason }));
  return { rows: results, applied: 0, skipped: 0, failed: results.length };
}

const OUTCOME_LABEL: Record<number, string> = {
  [IMPORT_OUTCOME.Applied]: 'Başarılı',
  [IMPORT_OUTCOME.Skipped]: 'Atlandı',
  [IMPORT_OUTCOME.Failed]: 'Başarısız',
};

// Sonuç raporunun CSV şeması: indirme ortak dışa aktarma katmanından (downloadCsvFile) geçer.
export const RESULT_COLUMNS: ExportColumn[] = [
  { key: 'row', header: 'Satır' },
  { key: 'sku', header: 'SKU' },
  { key: 'outcome', header: 'Sonuç' },
  { key: 'message', header: 'Mesaj' },
];

export function resultsToExportRows(result: ShopifyImportResultDto): ExportRow[] {
  return result.rows.map((r) => ({ row: String(r.rowNumber), sku: r.sku ?? '', outcome: OUTCOME_LABEL[r.outcome] ?? '', message: r.message }));
}

// Basit CSV ayrıştırıcı: tırnaklı alan, çift tırnak kaçışı; ayraç ilk satırdan (; , veya sekme) seçilir.
export function parseCsv(text: string): string[][] {
  const source = text.replace(/^﻿/, '');
  const firstLine = source.split(/\r?\n/, 1)[0] ?? '';
  const delimiter = [';', '\t', ','].reduce((best, d) => (count(firstLine, d) > count(firstLine, best) ? d : best), ',');
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (quoted) {
      if (char === '"' && source[i + 1] === '"') { field += '"'; i += 1; } else if (char === '"') quoted = false; else field += char;
    } else if (char === '"') quoted = true;
    else if (char === delimiter) { row.push(field); field = ''; }
    else if (char === '\n' || char === '\r') {
      if (char === '\r' && source[i + 1] === '\n') i += 1;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += char;
  }
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

function count(text: string, char: string): number {
  return text.split(char).length - 1;
}

export function sheetFromRows(all: string[][]): ParsedSheet {
  const [headers = [], ...rows] = all;
  return { headers: headers.map((h) => h.trim()), rows };
}
