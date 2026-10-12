import type { ExportRow } from '../../components/ui/ExportMenu';
import type { ExportColumn } from '../../lib/export';
import type { DemandOutcome, DemandSignalFilter, DemandSignalGroupDto } from '../../lib/api/omnichannel-demand';

// Talep sinyalleri sayfasının saf kuralları: etiketler, araç adı, dışa aktarım satırları (testten DOM'suz geçer).

export const DEMAND_OUTCOME_LABELS: Readonly<Record<DemandOutcome, string>> = {
  ModelNoProducts: 'Araç için ürün yok',
  VehicleUnknown: 'Model tanınmadı',
  OtherGenerationsOnly: 'Başka kuşak/yıl var',
  PartNotForVehicle: 'Bu parça yok',
  NoResults: 'Sonuçsuz arama',
};

export const DEMAND_OUTCOME_OPTIONS = (Object.keys(DEMAND_OUTCOME_LABELS) as DemandOutcome[])
  .map((value) => ({ value, label: DEMAND_OUTCOME_LABELS[value] }));

export const DEMAND_PERIOD_OPTIONS = [
  { value: '7', label: 'Son 7 gün' },
  { value: '30', label: 'Son 30 gün' },
  { value: '90', label: 'Son 90 gün' },
  { value: '365', label: 'Son 1 yıl' },
];

const DEFAULT_PERIOD_DAYS = 30;

export const DEFAULT_DEMAND_FILTER: DemandSignalFilter = {
  days: DEFAULT_PERIOD_DAYS, country: null, channelId: null, outcome: null,
};

const UNKNOWN_VEHICLE = 'Araç belirsiz';
const UNKNOWN_CATEGORY = 'Tür belirsiz';

/** "Volkswagen Passat B5" — tanınmayan araç için açık etiket. */
export function vehicleLabel(group: DemandSignalGroupDto): string {
  const parts = [group.make, group.model, group.generation].filter((p): p is string => Boolean(p));
  return parts.length > 0 ? parts.join(' ') : UNKNOWN_VEHICLE;
}

export function categoryLabel(group: DemandSignalGroupDto): string {
  return group.categoryName ?? UNKNOWN_CATEGORY;
}

/** Sorulan yıllar: "2014, 2016" ya da tek yıl; yıl verilmediyse boş. */
export function yearsLabel(group: DemandSignalGroupDto): string {
  return group.years.join(', ');
}

export const DEMAND_EXPORT_COLUMNS: ExportColumn[] = [
  { key: 'vehicle', header: 'Araç' },
  { key: 'years', header: 'Yıllar' },
  { key: 'category', header: 'Ürün türü' },
  { key: 'count', header: 'Talep', type: 'int' },
  { key: 'customers', header: 'Müşteri', type: 'int' },
  { key: 'outcomes', header: 'Sonuç' },
  { key: 'countries', header: 'Ülke' },
  { key: 'lastAt', header: 'Son talep', type: 'date' },
  { key: 'samples', header: 'Örnek sorgular' },
];

export function toExportRows(groups: DemandSignalGroupDto[]): ExportRow[] {
  return groups.map((group) => ({
    vehicle: vehicleLabel(group),
    years: yearsLabel(group),
    category: categoryLabel(group),
    count: group.count,
    customers: group.uniqueCustomers,
    outcomes: group.outcomes.map((o) => DEMAND_OUTCOME_LABELS[o]).join(', '),
    countries: group.countries.join(', '),
    lastAt: group.lastAt,
    samples: group.samples.map((s) => `#${s.conversationId} ${s.query}`).join(' | '),
  }));
}
