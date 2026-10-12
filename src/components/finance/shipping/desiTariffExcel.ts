import { downloadExcel } from '../../../lib/export';
import { excelHeaders, toExcelRows, type DesiBandDraft } from './desiTariff';

// Desi tarifesinin Excel giriş/çıkışı (tarayıcıda). Biçim kuralları desiTariff.ts'te.

export async function downloadTariffExcel(filename: string, drafts: DesiBandDraft[], zones: string[]): Promise<void> {
  const headers = excelHeaders(zones);
  const columns = headers.map((header) => ({ key: header, header, type: 'decimal' as const }));
  await downloadExcel(filename, toExcelRows(drafts, zones), columns, 'Desi tarifesi');
}

/** İlk sayfayı başlık → hücre metni satırlarına çevirir. */
export async function readTariffExcel(file: File): Promise<Record<string, string>[]> {
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(await file.arrayBuffer());
  } catch {
    throw new Error('Dosya okunamadı — geçerli bir .xlsx dosyası seçin.');
  }

  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error('Excel sayfası bulunamadı.');

  const headers: string[] = [];
  sheet.getRow(1).eachCell((cell, column) => { headers[column - 1] = cell.text.trim(); });

  const rows: Record<string, string>[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const values: Record<string, string> = {};
    headers.forEach((header, index) => {
      if (header) values[header] = row.getCell(index + 1).text;
    });
    rows.push(values);
  });
  return rows;
}
