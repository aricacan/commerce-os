import type { ExportColumn } from '../../lib/export';

export const TOP_SELLERS_COLUMNS: ExportColumn[] = [
  { key: 'SKU', header: 'SKU', type: 'text' },
  { key: 'Ürün', header: 'Ürün', type: 'text' },
  { key: 'Marka', header: 'Marka', type: 'text' },
  { key: 'Adet', header: 'Adet', type: 'int' },
  { key: 'Ciro (TL)', header: 'Ciro (TL)', type: 'money', currency: 'TRY' },
  { key: 'Marj (%)', header: 'Marj (%)', type: 'percent' },
];
