import type { OverviewPeriodParams } from '../../lib/api/omnichannel';
import { resolveDatePreset, type DatePreset } from '../../utils/date';

// Genel Bakış'ın dönem seçimi: ortak DateRangePicker'ın değeri (preset + elle aralık) ve sunucuya giden karşılığı.

export interface OverviewRange {
  preset: DatePreset;
  customFrom: string;
  customTo: string;
}

export const DEFAULT_OVERVIEW_RANGE: OverviewRange = { preset: '30days', customFrom: '', customTo: '' };

// Tarihi çözülemeyen seçim (ör. "tümü"; seçici bunu sunmaz) için güvenli gün sayısı.
const FALLBACK_DAYS = 30;

export function toPeriodParams(range: OverviewRange): OverviewPeriodParams {
  const { from, to, days } = resolveDatePreset(range.preset, range.customFrom, range.customTo);
  if (!from || !to) return { days: FALLBACK_DAYS };
  return { days, from, to };
}

const shortDay = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });

// "Son 30 günde", "Bugün", "1 Eyl – 30 Eyl arasında": özet cümlesinin ve boş durum metinlerinin dönem ifadesi.
export function periodPhrase(range: OverviewRange, period: OverviewPeriodParams): string {
  if (range.preset === 'today') return 'Bugün';
  if (range.preset === '30days') return `Son ${period.days} günde`;
  if (!period.from || !period.to) return `Son ${period.days} günde`;
  if (period.from === period.to) return `${shortDay(period.from)} günü`;
  return `${shortDay(period.from)} – ${shortDay(period.to)} arasında`;
}
