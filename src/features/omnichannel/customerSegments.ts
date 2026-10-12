import type { CustomerSegment, CustomerSummaryDto } from '../../lib/api/customers';

type SummaryCountKey = 'total' | 'withVehicle' | 'withAddress' | 'withPhone' | 'complete' | 'incomplete' | 'withOrder';

interface SegmentMeta {
  label: string;
  hint: string;
  countKey: SummaryCountKey;
}

// Müşteriler sekme çubuğu — sıra burada belirlenir. Tanımlar backend CustomerSegmentRules ile aynı.
export const SEGMENT_META = {
  all:        { label: 'Tümü',              hint: 'Bütün müşteriler',                                  countKey: 'total' },
  hasVehicle: { label: 'Araç bilgisi var',  hint: 'En az bir aracı kayıtlı',                           countKey: 'withVehicle' },
  hasAddress: { label: 'Adres var',         hint: 'Kayıtlı teslimat adresi olan',                      countKey: 'withAddress' },
  hasPhone:   { label: 'Telefon var',       hint: 'Telefon numarası bilinen',                          countKey: 'withPhone' },
  complete:   { label: 'Bilgisi tam',       hint: 'Ad, telefon, adres ve araç bilgisinin hepsi var',   countKey: 'complete' },
  incomplete: { label: 'Eksik bilgili',     hint: 'Ad, telefon, adres ya da araçtan en az biri eksik', countKey: 'incomplete' },
  hasOrder:   { label: 'Siparişi var',      hint: 'Sohbetten onaylanmış siparişi olan',                countKey: 'withOrder' },
} as const satisfies Record<CustomerSegment, SegmentMeta>;

export function segmentCount(summary: CustomerSummaryDto | null, segment: CustomerSegment): number | null {
  return summary ? summary[SEGMENT_META[segment].countKey] : null;
}

// Toplamın yüzde kaçı — tam sayı; toplam sıfırsa 0 (bölme hatası yok).
export function sharePercent(count: number, total: number): number {
  return total > 0 ? Math.round((count / total) * 100) : 0;
}
