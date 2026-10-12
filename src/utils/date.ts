/**
 * Formats a Date as a "YYYY-MM-DD" string using its LOCAL calendar date
 * (year/month/day as the browser clock shows them) — not the UTC date.
 *
 * `date.toISOString().split('T')[0]` looks equivalent but is not: it converts
 * to UTC first, so for the ~3 hours after Turkey midnight (00:00-02:59, since
 * Turkey is UTC+3) it silently returns YESTERDAY's date instead of today's.
 * Use this helper anywhere a "today"/"which calendar day" string is needed.
 */
export function localDateStr(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export type DatePreset = 'today' | 'yesterday' | 'week' | 'month' | 'lastMonth' | 'year' | '30days' | '3month' | '6month' | '9month' | '365days' | 'all' | 'custom';

// Bir preset'i (+ "custom" ise elle girilen aralığı) gerçek {from, to} tarih string'lerine
// çevirir. `dashboard-filters.ts` ve `DateRangePicker.tsx` bunu paylaşıyor — mantık tek yerde.
//
// 'week'/'month'/'year' TAKVİME hizalıdır (takvim başından bugüne).
// '30days'/'3month'/'365days' KAYAN penceredir (son N gün tam olarak).
export function resolveDatePreset(
  preset: DatePreset,
  customFrom?: string,
  customTo?: string,
): { from: string; to: string; days: number } {
  const now = new Date();
  const to = localDateStr(now);
  const daysBetween = (from: Date) => Math.floor((now.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  if (preset === 'all') {
    return { from: '', to: '', days: 0 };
  }

  if (preset === 'custom' && customFrom && customTo) {
    const diff = Math.ceil((new Date(customTo).getTime() - new Date(customFrom).getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return { from: customFrom, to: customTo, days: Math.max(diff, 1) };
  }

  if (preset === 'today') {
    return { from: to, to, days: 1 };
  }

  if (preset === 'yesterday') {
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    const yStr = localDateStr(y);
    return { from: yStr, to: yStr, days: 1 };
  }

  if (preset === 'week') {
    // Pazartesi başlangıçlı takvim haftası: getDay() 0=Pazar..6=Cumartesi.
    const dow = now.getDay();
    const diffToMonday = dow === 0 ? 6 : dow - 1;
    const monday = new Date(now);
    monday.setDate(monday.getDate() - diffToMonday);
    return { from: localDateStr(monday), to, days: diffToMonday + 1 };
  }

  if (preset === 'month') {
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: localDateStr(first), to, days: daysBetween(first) };
  }

  // Bir önceki TAKVİM ayının tamamı. Tek "bugünde bitmeyen" ay preset'i — `to`
  // önceki ayın son günü (bu ayın 0. günü = önceki ayın son günü).
  if (preset === 'lastMonth') {
    const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const last = new Date(now.getFullYear(), now.getMonth(), 0);
    return { from: localDateStr(first), to: localDateStr(last), days: last.getDate() };
  }

  if (preset === 'year') {
    const first = new Date(now.getFullYear(), 0, 1);
    return { from: localDateStr(first), to, days: daysBetween(first) };
  }

  if (preset === '30days') {
    const fromDate = new Date(now);
    fromDate.setDate(fromDate.getDate() - 29);
    return { from: localDateStr(fromDate), to, days: 30 };
  }

  // Ay tabanlı pencereler TAKVİM ayıyla geriye gidiyor, 30 günün katıyla değil:
  // "son 3 ay" denince kullanıcı 90 günü değil üç takvim ayını kastediyor ve şubat
  // 28 çektiğinde 90 gün dört aya taşıyor.
  if (preset === '3month' || preset === '6month' || preset === '9month') {
    const months = preset === '3month' ? 3 : preset === '6month' ? 6 : 9;
    const fromDate = new Date(now);
    fromDate.setMonth(fromDate.getMonth() - months);
    fromDate.setDate(fromDate.getDate() + 1);
    return { from: localDateStr(fromDate), to, days: daysBetween(fromDate) };
  }

  if (preset === '365days') {
    const fromDate = new Date(now);
    fromDate.setDate(fromDate.getDate() - 364);
    return { from: localDateStr(fromDate), to, days: 365 };
  }

  // custom fallback
  return { from: '', to, days: 0 };
}
