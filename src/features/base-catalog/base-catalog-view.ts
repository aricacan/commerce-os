import type { BaseCatalogMake, BaseCoverageCategory, BaseCoverageRow } from '../../lib/api/base-catalog';

/** Model kolonunun tek satırı: bir model + o modelin tek bir yıl aralığı. */
export interface ModelYearEntry {
  model: string;
  modelIsBucket: boolean;
  year: string;
  yearIsBucket: boolean;
  productCount: number;
}

// Marka ve model adları ASCII'dir (Audi, BMW, Volkswagen, A3, X5). Türkçe locale ile
// küçültmek "AUDI" -> "audı" (noktasız ı) üretip aramayı bozuyordu; bu yüzden BİLEREK
// locale'siz toLowerCase kullanılır.
function normalize(value: string): string {
  return value.trim().toLowerCase();
}

export function filterMakes(makes: BaseCatalogMake[], search: string): BaseCatalogMake[] {
  const needle = normalize(search);
  if (!needle) return makes;
  return makes.filter((m) => normalize(m.make).includes(needle));
}

/**
 * Model → yıl ağacını düz bir listeye çevirir. Backend zaten sıralı gönderdiği için
 * burada YENİDEN SIRALANMAZ — iki yerde sıralama kuralı olması kaymaya yol açar.
 */
export function flattenModelYears(make: BaseCatalogMake | null): ModelYearEntry[] {
  if (!make) return [];
  return make.models.flatMap((model) =>
    model.years.map((year) => ({
      model: model.model,
      modelIsBucket: model.isBucket,
      year: year.label,
      yearIsBucket: year.isBucket,
      productCount: year.productCount,
    })),
  );
}

interface CoverageFilterOptions {
  search: string;
  /** true ise en az bir kategorisi boş olan satırlar — yani doldurulacak boşluğu olanlar. */
  onlyGaps: boolean;
  categories: BaseCoverageCategory[];
}

export function filterCoverageRows(
  rows: BaseCoverageRow[],
  { search, onlyGaps, categories }: CoverageFilterOptions,
): BaseCoverageRow[] {
  const needle = normalize(search);

  return rows.filter((row) => {
    if (needle && !normalize(`${row.make} ${row.model}`).includes(needle)) return false;

    if (onlyGaps) {
      const hasGap = categories.some((category) => !row.counts[String(category.id)]);
      if (!hasGap) return false;
    }

    return true;
  });
}
