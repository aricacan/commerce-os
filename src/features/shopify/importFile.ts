import { parseCsv, sheetFromRows, type ParsedSheet } from './importRules';

// İçe aktarma dosyasını tarayıcıda okur (.xlsx → exceljs, .csv → metin). Sunucuya dosya gitmez, yalnız eşlenmiş satırlar gider.

const MAX_FILE_BYTES = 5 * 1024 * 1024;

async function readExcel(file: File): Promise<string[][]> {
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(await file.arrayBuffer());
  } catch {
    throw new Error('Dosya okunamadı — geçerli bir .xlsx dosyası seçin.');
  }
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error('Excel sayfası bulunamadı.');

  const rows: string[][] = [];
  sheet.eachRow({ includeEmpty: true }, (row) => {
    const cells: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell, column) => { cells[column - 1] = cell.text; });
    rows.push(Array.from(cells, (value) => value ?? ''));
  });
  return rows;
}

export async function readImportFile(file: File): Promise<ParsedSheet> {
  if (file.size > MAX_FILE_BYTES) throw new Error('Dosya çok büyük (en fazla 5 MB).');
  const name = file.name.toLowerCase();
  if (name.endsWith('.xlsx')) return sheetFromRows(await readExcel(file));
  if (name.endsWith('.csv')) return sheetFromRows(parseCsv(await file.text()));
  throw new Error('Yalnız .xlsx ve .csv dosyaları desteklenir.');
}
