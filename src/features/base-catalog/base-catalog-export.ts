// Base Katalog panellerinin Excel/CSV/PDF satırları. Saf dönüşümler — uygulama
// genelindeki TEK export biçimlendirme kaynağına (lib/export.ts) ExportRow olarak verilir,
// burada ayrı bir dosya üretme mantığı YOKTUR.

import type { ExportColumn } from '../../lib/export';
import type { ExportRow } from '../../components/ui/ExportMenu';
import type {
  BaseCatalogProduct,
  BaseCoverageCategory,
  BaseCoverageRow,
} from '../../lib/api/base-catalog';

// Backend kova satırlarında marka/model/yıl'ı null gönderir (ToProductDto). Excel'de boş
// hücre yerine ekranda görünen etiketin aynısı yazılır — aksi halde satır "hangi araç?"
// sorusuna cevap vermez. Metinler BaseCatalogBuckets ile birebir aynı olmalı.
const UNIVERSAL_MAKE = 'Universal';
const UNKNOWN_MODEL = 'Model belirsiz';
const UNKNOWN_YEAR = 'Yıl belirtilmemiş';

export const CATALOG_EXPORT_COLUMNS: ExportColumn[] = [
  { key: 'brand', header: 'Marka' },
  { key: 'model', header: 'Model' },
  { key: 'modelYear', header: 'Yıl' },
  { key: 'sku', header: 'SKU' },
  { key: 'name', header: 'Ürün Adı' },
  { key: 'categoryName', header: 'Kategori' },
  // Base ürünleri ZATEN GBP tutuluyor (DB'de tamamı Currency='GBP') — noConvert ile
  // TL->GBP dönüşümünden muaf, yoksa fiyat ikinci kez bölünürdü.
  { key: 'price', header: 'Fiyat', type: 'money', currency: 'GBP', noConvert: true },
  { key: 'stock', header: 'Stok', type: 'int' },
  { key: 'isActive', header: 'Durum' },
  { key: 'stores', header: 'Mağazalar' },
];

export function toCatalogExportRows(products: BaseCatalogProduct[]): ExportRow[] {
  return products.map((p) => ({
    brand: p.brand ?? UNIVERSAL_MAKE,
    model: p.model ?? UNKNOWN_MODEL,
    modelYear: p.modelYear ?? UNKNOWN_YEAR,
    sku: p.sku,
    name: p.name,
    categoryName: p.categoryName ?? '',
    price: p.price,
    stock: p.stock,
    isActive: p.isActive ? 'Aktif' : 'Pasif',
    stores: p.stores.join(', '),
  }));
}

/** Kategori sütun anahtarı — satır üreticisiyle sütun tanımı arasında tek kaynak. */
function categoryKey(categoryId: number): string {
  return `cat_${categoryId}`;
}

export function buildCoverageExportColumns(categories: BaseCoverageCategory[]): ExportColumn[] {
  return [
    { key: 'make', header: 'Marka' },
    { key: 'model', header: 'Model' },
    { key: 'total', header: 'Toplam', type: 'int' },
    ...categories.map((c) => ({
      key: categoryKey(c.id),
      header: c.name,
      type: 'int' as const,
    })),
  ];
}

export function toCoverageExportRows(
  rows: BaseCoverageRow[],
  categories: BaseCoverageCategory[],
): ExportRow[] {
  return rows.map((row) => {
    const out: ExportRow = { make: row.make, model: row.model, total: row.productCount };
    for (const category of categories) {
      // Seyrek sözlükteki eksik anahtar boş DEĞİL 0 olmalı: Excel'de koşullu
      // biçimlendirme ve SUM formülleri boş hücreyle çalışmaz.
      out[categoryKey(category.id)] = row.counts[String(category.id)] ?? 0;
    }
    return out;
  });
}
