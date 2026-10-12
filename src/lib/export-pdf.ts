// PDF export — GERÇEK PDF (jsPDF + autotable), tablo verisi için. Türkçe karakterler (ç ş ğ İ ı ö ü)
// standart PDF fontlarında bozulduğu için Roboto TTF gömülür (public/fonts/Roboto-Regular.ttf).
//
// jspdf + autotable + font AĞIRDIR (~350KB) — bu modül SADECE PDF'e tıklanınca dynamic import
// edilir (bkz. ExportMenu), böylece ilk sayfa yükü etkilenmez.

import type { ExportRow } from '../components/ui/ExportMenu';
import { formatCellText, resolveColumns, type ExportColumn } from './export';
import { trackAction } from './telemetry';

const FONT_URL = '/fonts/Roboto-Regular.ttf';
const FONT_VFS = 'Roboto-Regular.ttf';
const FONT_NAME = 'Roboto';
const HEADER_FILL: [number, number, number] = [37, 99, 235]; // #2563EB

// ArrayBuffer -> base64 (parçalı; büyük fontlarda call-stack taşmasını önler).
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunk = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

// Font bir kez çekilip base64'e çevrilir, sonra bellekte tutulur (aynı oturumda tekrar PDF
// alınırsa yeniden indirilmez).
let cachedFontBase64: string | null = null;
async function loadFontBase64(): Promise<string> {
  if (cachedFontBase64) return cachedFontBase64;
  const res = await fetch(FONT_URL);
  if (!res.ok) throw new Error(`Font yüklenemedi: ${res.status}`);
  cachedFontBase64 = arrayBufferToBase64(await res.arrayBuffer());
  return cachedFontBase64;
}

// Saf doc üretimi (save YOK) — birim testi buradan çalışır.
export async function buildPdfDoc(
  rows: ExportRow[],
  columns?: ExportColumn[],
  title?: string,
) {
  const cols = resolveColumns(rows, columns);
  if (!cols.length) return null;

  const [{ jsPDF }, autoTableMod, fontBase64] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
    loadFontBase64(),
  ]);
  const autoTable = autoTableMod.default;

  // Çok sütunlu tablolar: >14 sütunda A3 landscape kullanılır.
  // A4 landscape = 841pt, A3 landscape = 1190pt.
  // Sipariş gibi 25+ sütunlu tablolar A4'te ~32pt/sütuna sıkışır → dikey karakter sarılması.
  const isWide = cols.length > 14;
  const orientation = cols.length > 6 ? 'landscape' : 'portrait';
  const format = isWide ? 'a3' : 'a4';
  const fontSize = isWide ? 7 : 8;
  const doc = new jsPDF({ orientation, unit: 'pt', format });

  doc.addFileToVFS(FONT_VFS, fontBase64);
  doc.addFont(FONT_VFS, FONT_NAME, 'normal');
  doc.setFont(FONT_NAME);

  let startY = 40;
  if (title) {
    doc.setFontSize(14);
    doc.text(title, 40, 28);
    startY = 48;
  }

  // Sayısal sütunlar sağa yaslanır.
  const numericAlign = new Set(['int', 'money', 'decimal', 'percent']);

  autoTable(doc, {
    startY,
    head: [cols.map((c) => c.header)],
    body: rows.map((r) => cols.map((c) => formatCellText(r[c.key], c))),
    styles: { font: FONT_NAME, fontSize, cellPadding: 3, overflow: 'ellipsize' },
    headStyles: { font: FONT_NAME, fillColor: HEADER_FILL, textColor: 255, fontStyle: 'normal' },
    columnStyles: Object.fromEntries(
      cols.map((c, i) => {
        const isNum = numericAlign.has(c.type ?? 'text');
        return [i, {
          halign: isNum ? 'right' : 'left',
          minCellWidth: isNum ? 38 : 55,
        }];
      }),
    ),
    margin: { top: startY, left: 24, right: 24 },
  });

  return doc;
}

export async function downloadPdf(
  filename: string,
  rows: ExportRow[],
  columns?: ExportColumn[],
  title?: string,
): Promise<void> {
  const doc = await buildPdfDoc(rows, columns, title);
  if (!doc) return;
  doc.save(filename);
  trackAction('Export', filename);
}

// Aivar'ın sohbette çizdiği veri kartını (AiDataCard) PDF'e indirir — hücreler zaten sunucuda
// biçimlenmiş metin olduğu için (bkz. AivarCardBuilder) tip/para dönüşümü yapılmaz, hepsi
// 'text' sütunu olarak geçer; buildPdfDoc'un geri kalanı (Türkçe font, hizalama) aynen kullanılır.
export async function downloadAiCardPdf(card: {
  title: string;
  subtitle?: string | null;
  columns: string[];
  rows: string[][];
}): Promise<void> {
  const columns: ExportColumn[] = card.columns.map((header, i) => ({ key: String(i), header, type: 'text' }));
  const rows: ExportRow[] = card.rows.map((row) =>
    Object.fromEntries(row.map((cell, i) => [String(i), cell])),
  );
  const doc = await buildPdfDoc(rows, columns, card.subtitle ? `${card.title} — ${card.subtitle}` : card.title);
  if (!doc) return;
  const filename = `${sanitizeFilename(card.title)}.pdf`;
  doc.save(filename);
  trackAction('Export', filename);
}

// Aivar'ın düz metin cevabını (👍/👎 yanındaki "PDF indir") tek sayfalık bir PDF'e yazar —
// tablo yok, sadece Türkçe destekli kaydırmalı metin. Saf doc üretimi (save YOK) —
// buildPdfDoc ile AYNI ayrım: birim testi doc'u burada, indirmeyi downloadAiTextPdf'te sınar.
export async function buildAiTextPdfDoc(title: string, text: string) {
  const [{ jsPDF }, fontBase64] = await Promise.all([import('jspdf'), loadFontBase64()]);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });

  doc.addFileToVFS(FONT_VFS, fontBase64);
  doc.addFont(FONT_VFS, FONT_NAME, 'normal');
  doc.setFont(FONT_NAME);

  const marginX = 40;
  const maxWidth = doc.internal.pageSize.getWidth() - marginX * 2;

  doc.setFontSize(14);
  doc.text(doc.splitTextToSize(title, maxWidth), marginX, 40);

  doc.setFontSize(11);
  doc.text(doc.splitTextToSize(text, maxWidth), marginX, 70);

  return doc;
}

export async function downloadAiTextPdf(title: string, text: string): Promise<void> {
  const doc = await buildAiTextPdfDoc(title, text);
  const filename = `${sanitizeFilename(title)}.pdf`;
  doc.save(filename);
  trackAction('Export', filename);
}

function sanitizeFilename(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '').trim().slice(0, 80) || 'aivar';
}
