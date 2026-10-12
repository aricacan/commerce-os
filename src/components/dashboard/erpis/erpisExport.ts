import type { ExportColumn } from '@/lib/export';
import type { ExportRow } from '@/components/ui/ExportMenu';

// Bir pano kartının dışa aktarılabilir hâli: sütun şeması + satırlar.
//
// Kartlar bunu FONKSİYON olarak veriyor (bkz. ErpisCard.exportData) — menü açılmadıkça
// tablo kurulmasın, her render'da boşuna satır üretilmesin.
export interface ErpisExportData {
  columns: ExportColumn[];
  rows: ExportRow[];
}
