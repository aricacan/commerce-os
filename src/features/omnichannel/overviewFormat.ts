// Genel Bakış'ın ortak biçimleyicileri: süre ve para. Saf; bileşen ve kurallar aynı metni üretir.

const MINUTES_PER_HOUR = 60;
const MINUTES_PER_DAY = 1440;
const SHORT_RESPONSE_MINUTES = 1;
const DECIMAL_MINUTES_LIMIT = 10;

export const NO_DATA_TEXT = 'Veri yok';

// "<1 dk", "4,5 dk", "38 dk", "2,5 sa", "3 gün". null = süre hesaplanamadı.
export function formatMinutes(minutes: number | null): string {
  if (minutes === null) return NO_DATA_TEXT;
  if (minutes < SHORT_RESPONSE_MINUTES) return '<1 dk';
  if (minutes < DECIMAL_MINUTES_LIMIT) return `${decimal(minutes)} dk`;
  if (minutes < MINUTES_PER_HOUR) return `${Math.round(minutes)} dk`;
  if (minutes < MINUTES_PER_DAY) return `${decimal(minutes / MINUTES_PER_HOUR)} sa`;
  return `${decimal(minutes / MINUTES_PER_DAY)} gün`;
}

const decimal = (value: number) => new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 1 }).format(value);

const CURRENCY_SYMBOLS: Record<string, string> = { EUR: '€', TRY: '₺', GBP: '£', USD: '$' };

// "12.450 € · 3.200 ₺": ciro para birimine göre ayrı yazılır, çevrilmez.
export function formatRevenue(revenue: { currency: string; total: number }[]): string {
  const whole = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 });
  return revenue.map((r) => `${whole.format(r.total)} ${CURRENCY_SYMBOLS[r.currency] ?? r.currency}`).join(' · ');
}
