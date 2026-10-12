// Uygulama genelinde TEK export biçimlendirme kaynağı. Amaç: her "Dışarı Aktar" butonu
// aynı sütun/para/tarih kurallarına uysun ve GERÇEK .xlsx üretsin (eski HTML-tablo `.xls`
// hilesi değil — o Excel'de güvenlik uyarısı verip sayıları metne çeviriyordu).
//
// Kullanım: sayfa, satırlarını ExportRow[] olarak verir; opsiyonel olarak ExportColumn[]
// şeması ile her sütunun TİPİNİ bildirir (para/tarih/sayı). Şema verilmezse başlıklar
// satırdan çıkarılır ve tip otomatik sezilir.

import type { ExportRow } from '../components/ui/ExportMenu';
import { trackAction } from './telemetry';

export type ExportCellType = 'text' | 'int' | 'money' | 'decimal' | 'percent' | 'date';
export type ExportCurrency = 'TRY' | 'GBP';

export interface ExportColumn {
  key: string;
  header: string;
  type?: ExportCellType; // varsayılan: 'text'
  currency?: ExportCurrency; // type='money' için para birimi (varsayılan TRY)
  // true ise para birimi dönüşümünden MUAF tutulur — sütunun zaten yetkili bir GBP kardeşi
  // varsa (ör. siparişlerde originalTotal'dan gelen gerçek GBP) tekrar üretilmesin diye.
  noConvert?: boolean;
}

const NUMERIC_TYPES: readonly ExportCellType[] = ['int', 'money', 'decimal', 'percent'];
function isNumericType(type: ExportCellType): boolean {
  return NUMERIC_TYPES.includes(type);
}

// Excel hücre biçimleri — sembol/işaret Excel formatında gömülü, böylece hücre değeri SAYI kalır
// (matematik/pivot çalışır) ama görsel olarak "1.234,56 ₺" / "£1.234,56" / "12,3%" görünür.
// percent: değer zaten yüzde birimindedir (12.3 = %12,3), Excel'in *100 yapan '%' biçimi
// KULLANILMAZ; yerine sayının sonuna "%" eklenir.
const NUM_FMT_INT = '#,##0';
const NUM_FMT_TRY = '#,##0.00" ₺"';
const NUM_FMT_GBP = '"£"#,##0.00';
const NUM_FMT_DECIMAL = '#,##0.00';
const NUM_FMT_PERCENT = '#,##0.0"%"';
const NUM_FMT_DATE = 'dd.mm.yyyy hh:mm';
const NUM_FMT_TEXT = '@';

const HEADER_FILL_ARGB = 'FF2563EB';

function numFmtFor(col: ExportColumn): string | undefined {
  switch (col.type) {
    case 'int': return NUM_FMT_INT;
    case 'money': return col.currency === 'GBP' ? NUM_FMT_GBP : NUM_FMT_TRY;
    case 'decimal': return NUM_FMT_DECIMAL;
    case 'percent': return NUM_FMT_PERCENT;
    case 'date': return NUM_FMT_DATE;
    case 'text': return NUM_FMT_TEXT;
    default: return undefined;
  }
}

// Boş string / null / undefined -> boş hücre (0 veya "" değil). Sayısal tipte parse edilemezse
// yine boş bırakılır ki Excel'de yanlış bir 0 görünmesin.
function coerce(value: unknown, type: ExportCellType): string | number | Date | null {
  if (value === '' || value === null || value === undefined) return null;
  if (isNumericType(type)) {
    const n = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(n) ? n : null;
  }
  if (type === 'date') {
    const d = value instanceof Date ? value : new Date(String(value));
    return Number.isNaN(d.getTime()) ? String(value) : d;
  }
  return String(value);
}

// ─── İnsan-okur metin biçimi (CSV / Panoya Kopyala / PDF ortak) ───
// Excel numeric+numFmt yolundan AYRI: burada değer görsel string'e çevrilir (tr-TR).
function pad2(n: number): string { return n < 10 ? `0${n}` : String(n); }

function formatDateCell(value: string | number): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function num(value: string | number, minFrac: number, maxFrac: number): string {
  const n = typeof value === 'number' ? value : Number(value);
  return n.toLocaleString('tr-TR', { minimumFractionDigits: minFrac, maximumFractionDigits: maxFrac });
}

export function formatCellText(value: string | number, col: ExportColumn): string {
  if (value === '' || value === null || value === undefined) return '';
  const type = col.type ?? 'text';
  if (isNumericType(type) && !Number.isFinite(typeof value === 'number' ? value : Number(value))) return '';
  switch (type) {
    case 'money':
      return col.currency === 'GBP' ? `£${num(value, 2, 2)}` : `${num(value, 2, 2)} ₺`;
    case 'int': return num(value, 0, 0);
    case 'decimal': return num(value, 2, 2);
    case 'percent': return `${num(value, 1, 1)}%`;
    case 'date': return formatDateCell(value);
    default: return String(value);
  }
}

// Şema verilmediğinde satırdan kolon çıkar; hem CSV/Copy hem PDF/Excel ortak kullanır.
export function resolveColumns(rows: ExportRow[], columns?: ExportColumn[]): ExportColumn[] {
  return columns ?? inferColumns(rows);
}

// ─── CSV (noktalı virgül ayraç + BOM; TR ondalık virgülü ayraçla çakışmasın diye alanlar tırnaklı) ───
export function toCsv(rows: ExportRow[], columns?: ExportColumn[]): string {
  const cols = resolveColumns(rows, columns);
  if (!cols.length) return '';
  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const lines = [
    cols.map((c) => esc(c.header)).join(';'),
    ...rows.map((r) => cols.map((c) => esc(formatCellText(r[c.key], c))).join(';')),
  ];
  return lines.join('\n');
}

// ─── Panoya kopyala (Excel'e yapıştırılabilir TSV) ───
export function toClipboardTsv(rows: ExportRow[], columns?: ExportColumn[]): string {
  const cols = resolveColumns(rows, columns);
  if (!cols.length) return '';
  const lines = [
    cols.map((c) => c.header).join('\t'),
    ...rows.map((r) => cols.map((c) => formatCellText(r[c.key], c)).join('\t')),
  ];
  return lines.join('\n');
}

// ─── Export Seçenekleri: satır sıralama + kapsam (saf/DOM'suz — ExportDialog buradan besler) ───
export interface RowScopeOptions {
  scope: 'all' | 'first' | 'range';
  firstN?: number;
  rangeFrom?: number; // 1-tabanlı, dahil
  rangeTo?: number; // 1-tabanlı, dahil
  sortKey?: string;
  sortDir?: 'asc' | 'desc';
}

// Dışa aktarımda sunucudan kaç satır ÇEKİLECEĞİNİ belirler. Yalnızca "İlk N" ve sıralama YOKKEN
// çekmeyi N ile sınırlamak güvenlidir — sıralama ya da "Aralık"/"Hepsi" tüm veriyi gerektirir.
export function resolveFetchLimit(
  opts: Pick<RowScopeOptions, 'scope' | 'sortKey' | 'firstN'>,
): number | undefined {
  return opts.scope === 'first' && !opts.sortKey ? opts.firstN : undefined;
}

export function processRows(
  rows: ExportRow[],
  columns: ExportColumn[],
  opts: RowScopeOptions,
): ExportRow[] {
  let out = rows;
  if (opts.sortKey) {
    const col = columns.find((c) => c.key === opts.sortKey);
    const numeric = isNumericType(col?.type ?? 'text');
    const dir = opts.sortDir === 'desc' ? -1 : 1;
    out = [...rows].sort((a, b) => {
      const av = a[opts.sortKey!], bv = b[opts.sortKey!];
      const cmp = numeric
        ? (Number(av) || 0) - (Number(bv) || 0)
        : String(av ?? '').localeCompare(String(bv ?? ''), 'tr');
      return cmp * dir;
    });
  }
  if (opts.scope === 'first') return out.slice(0, Math.max(0, opts.firstN ?? out.length));
  if (opts.scope === 'range') {
    return out.slice(Math.max(0, (opts.rangeFrom ?? 1) - 1), Math.max(0, opts.rangeTo ?? out.length));
  }
  return out;
}

// ─── Para birimi modu (TL / GBP / ikisi) ───
// Tutarlar TL saklanır; GBP = TL / kur. Yalnızca type='money' + currency TRY + noConvert olmayan
// sütunlar dönüştürülür (zaten GBP olan ya da yetkili GBP kardeşi olan sütunlar korunur).
export type CurrencyMode = 'try' | 'gbp' | 'both';

const GBP_SUFFIX = '__gbp';

function gbpHeader(header: string): string {
  return header.includes('(TL)') ? header.replace('(TL)', '(GBP)') : `${header} (GBP)`;
}

function toGbpValue(value: string | number | undefined, rate: number): string | number {
  if (value === '' || value === null || value === undefined) return '';
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return '';
  return Math.round((n / rate) * 100) / 100;
}

function isConvertible(c: ExportColumn): boolean {
  return c.type === 'money' && (c.currency ?? 'TRY') === 'TRY' && !c.noConvert;
}

export function hasConvertibleMoney(columns: ExportColumn[]): boolean {
  return columns.some(isConvertible);
}

export function applyCurrencyMode(
  rows: ExportRow[],
  columns: ExportColumn[],
  mode: CurrencyMode,
  rate: number,
): { rows: ExportRow[]; columns: ExportColumn[] } {
  if (mode === 'try' || !(rate > 0)) return { rows, columns };
  const convertible = columns.filter(isConvertible);
  if (!convertible.length) return { rows, columns };
  const keys = convertible.map((c) => c.key);

  if (mode === 'gbp') {
    const keySet = new Set(keys);
    return {
      columns: columns.map((c) =>
        keySet.has(c.key) ? { ...c, currency: 'GBP' as ExportCurrency, header: gbpHeader(c.header) } : c,
      ),
      rows: rows.map((r) => {
        const out: ExportRow = { ...r };
        for (const k of keys) out[k] = toGbpValue(r[k], rate);
        return out;
      }),
    };
  }

  // 'both': her TL para sütununun HEMEN ARDINA GBP kardeşi eklenir.
  const nextColumns: ExportColumn[] = [];
  for (const c of columns) {
    nextColumns.push(c);
    if (isConvertible(c)) {
      nextColumns.push({ ...c, key: c.key + GBP_SUFFIX, currency: 'GBP', header: gbpHeader(c.header) });
    }
  }
  return {
    columns: nextColumns,
    rows: rows.map((r) => {
      const out: ExportRow = { ...r };
      for (const k of keys) out[k + GBP_SUFFIX] = toGbpValue(r[k], rate);
      return out;
    }),
  };
}

// ─── Toplam satırı ───
// Sayısal sütunlar toplanır; yüzde HARİÇ (yüzdelerin toplamı anlamsız). Etiket ilk metin sütununa.
const SUMMABLE: readonly ExportCellType[] = ['int', 'money', 'decimal'];

export function appendTotalsRow(
  rows: ExportRow[],
  columns: ExportColumn[],
  label = 'TOPLAM',
): ExportRow[] {
  if (!rows.length) return rows;
  const totals: ExportRow = {};
  let labelPlaced = false;
  for (const c of columns) {
    const type = c.type ?? 'text';
    if (SUMMABLE.includes(type)) {
      totals[c.key] = rows.reduce((sum, r) => {
        const n = Number(r[c.key]);
        return Number.isFinite(n) ? sum + n : sum;
      }, 0);
    } else if (!labelPlaced && type === 'text') {
      totals[c.key] = label;
      labelPlaced = true;
    } else {
      totals[c.key] = '';
    }
  }
  return [...rows, totals];
}

// CSV indirme — BOM + blob (data-URI'nin ~birkaç MB sınırı yok, büyük export'lar için güvenli).
const CSV_BOM = '﻿';
export function downloadCsvFile(filename: string, rows: ExportRow[], columns?: ExportColumn[]): void {
  const csv = toCsv(rows, columns);
  if (!csv) return;
  triggerDownload(new Blob([CSV_BOM + csv], { type: 'text/csv;charset=utf-8;' }), filename);
}

// Şema verilmediğinde: başlıkları ilk satırdan al, tipi değerden sez (number -> money varsaymadan
// düz 'int' değil 'text' bırakılır; sadece gerçek number ise sayısal, aksi metin).
function inferColumns(rows: ExportRow[]): ExportColumn[] {
  if (!rows.length) return [];
  return Object.keys(rows[0]).map((key) => {
    const sample = rows.find((r) => r[key] !== '' && r[key] != null)?.[key];
    if (isTextLikeIdentifierColumn(key)) return { key, header: key, type: 'text' };
    return { key, header: key, type: typeof sample === 'number' ? 'int' : 'text' };
  });
}

function isTextLikeIdentifierColumn(key: string): boolean {
  const normalized = key.toLocaleLowerCase('tr-TR');
  return normalized.includes('model')
    || normalized.includes('yil')
    || normalized.includes('yıl')
    || normalized.includes('year');
}

// Tüm istemci taraflı dışa aktarımlar buradan geçer — "kim neyi dışa aktardı" tek noktada izlenir.
function triggerDownload(blob: Blob, filename: string): void {
  trackAction('Export', filename);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

// Saf (DOM'suz) workbook üretimi — birim testi buradan yapılır. downloadExcel bunu sarıp
// tarayıcıda indirir.
export async function buildWorkbookBuffer(
  rows: ExportRow[],
  columns?: ExportColumn[],
  sheetName = 'Veri',
): Promise<ArrayBuffer | null> {
  const cols = columns ?? inferColumns(rows);
  if (!cols.length) return null;

  // ExcelJS yaklaşık 250 KB gzip. Kullanıcı gerçekten Excel dışa aktarımı
  // başlatana kadar ana uygulama bundle'ına yüklemiyoruz.
  const { default: ExcelJS } = await import('exceljs');
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheetName);

  ws.columns = cols.map((c) => ({
    header: c.header,
    key: c.key,
    width: Math.min(48, Math.max(12, c.header.length + 2)),
  }));

  // Başlık satırı stili (backend Excel Rapor ile aynı premium görünüm).
  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.alignment = { vertical: 'middle' };
  headerRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL_ARGB } };
  });

  // Sütun bazlı sayı/tarih biçimi.
  cols.forEach((c) => {
    const fmt = numFmtFor(c);
    if (fmt) ws.getColumn(c.key).numFmt = fmt;
  });

  for (const r of rows) {
    const values: Record<string, string | number | Date | null> = {};
    for (const c of cols) values[c.key] = coerce(r[c.key], c.type ?? 'text');
    ws.addRow(values);
  }

  ws.views = [{ state: 'frozen', ySplit: 1 }]; // başlık sabit
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: cols.length } };

  return wb.xlsx.writeBuffer();
}

export async function downloadExcel(
  filename: string,
  rows: ExportRow[],
  columns?: ExportColumn[],
  sheetName = 'Veri',
): Promise<void> {
  const buffer = await buildWorkbookBuffer(rows, columns, sheetName);
  if (!buffer) return;
  triggerDownload(new Blob([buffer], { type: XLSX_MIME }), filename);
}
