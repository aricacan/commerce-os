import type { FilterSelectOption } from '../../components/ui/FilterSelect';
import {
  OUTBOUND_EMAIL_KIND, OUTBOUND_EMAIL_STATUS,
  type OutboundEmailKind, type OutboundEmailQuery, type OutboundEmailStatus,
} from '../../lib/api/omnichannel-email-outbound';
import { describeError, httpStatusOf } from '../../lib/errors';

// Gönderilen e-postalar ekranının saf kuralları: filtre → sorgu, Türkçe etiketler, hata metni.

export const OUTBOUND_EMAIL_PAGE_SIZE = 25;
const HTTP_NOT_FOUND = 404;
const HTTP_FORBIDDEN = 403;
const MS_PER_MINUTE = 60_000;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;

export const DATE_RANGE = { All: 'all', Today: 'today', Week: 'week', Month: 'month', LastMonth: 'lastMonth', Custom: 'custom' } as const;
export type DateRange = (typeof DATE_RANGE)[keyof typeof DATE_RANGE];

// Gün sayısı bugün dahil: "7 gün" = bugün ve önceki 6 gün.
const RANGE_DAYS = { today: 1, week: 7, month: 30 } as const;

export interface OutboundEmailFilters {
  kind: OutboundEmailKind | null;
  status: OutboundEmailStatus | null;
  channelId: number | null;
  range: DateRange;
  // Özel aralık: yerel "yyyy-MM-dd" (bitiş günü dahil).
  customFrom: string;
  customTo: string;
}

export const EMPTY_OUTBOUND_FILTERS: OutboundEmailFilters = {
  kind: null, status: null, channelId: null, range: DATE_RANGE.All, customFrom: '', customTo: '',
};

export const OUTBOUND_KIND_LABELS: Readonly<Record<OutboundEmailKind, string>> = {
  [OUTBOUND_EMAIL_KIND.Handoff]: 'Devir',
  [OUTBOUND_EMAIL_KIND.Order]: 'Sipariş',
  [OUTBOUND_EMAIL_KIND.Notification]: 'Bildirim',
  [OUTBOUND_EMAIL_KIND.Reply]: 'Cevap',
};

export const OUTBOUND_STATUS_LABELS: Readonly<Record<OutboundEmailStatus, string>> = {
  [OUTBOUND_EMAIL_STATUS.Sent]: 'Gönderildi',
  [OUTBOUND_EMAIL_STATUS.Failed]: 'Hata',
};

const RANGE_LABELS: Readonly<Record<Exclude<DateRange, 'all'>, string>> = {
  [DATE_RANGE.Today]: 'Bugün',
  [DATE_RANGE.Week]: 'Son 7 gün',
  [DATE_RANGE.Month]: 'Son 30 gün',
  [DATE_RANGE.LastMonth]: 'Geçen ay',
  [DATE_RANGE.Custom]: 'Özel aralık',
};

const toOptions = (labels: Readonly<Record<string, string>>): FilterSelectOption[] =>
  Object.entries(labels).map(([value, label]) => ({ value, label }));

export const OUTBOUND_KIND_OPTIONS = toOptions(OUTBOUND_KIND_LABELS);
export const OUTBOUND_STATUS_OPTIONS = toOptions(OUTBOUND_STATUS_LABELS);
export const OUTBOUND_RANGE_OPTIONS = toOptions(RANGE_LABELS);

export const outboundKindLabel = (kind: string): string =>
  (OUTBOUND_KIND_LABELS as Record<string, string | undefined>)[kind] ?? kind;

export const outboundStatusLabel = (status: string): string =>
  (OUTBOUND_STATUS_LABELS as Record<string, string | undefined>)[status] ?? status;

// "yyyy-MM-dd" yerel gün başlangıcı; geçersiz girdi null.
function localDayStart(day: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

const addDays = (date: Date, days: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

interface UtcRange { from?: string; to?: string }

/** Yerel gün sınırlarını UTC aralığına çevirir (to = bitiş gününün ertesi başlangıcı, dahil değil). */
export function dateRangeToUtc(filters: OutboundEmailFilters, now: Date = new Date()): UtcRange {
  if (filters.range === DATE_RANGE.All) return {};
  if (filters.range === DATE_RANGE.Custom) {
    const from = localDayStart(filters.customFrom);
    const lastDay = localDayStart(filters.customTo);
    return { from: from?.toISOString(), to: lastDay ? addDays(lastDay, 1).toISOString() : undefined };
  }
  if (filters.range === DATE_RANGE.LastMonth) {
    // Önceki takvim ayının ilk günü ile bu ayın ilk günü (dahil değil) arası.
    return {
      from: new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString(),
      to: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
    };
  }
  return { from: addDays(now, 1 - RANGE_DAYS[filters.range]).toISOString() };
}

export function outboundEmailQuery(filters: OutboundEmailFilters, page: number, now: Date = new Date()): OutboundEmailQuery {
  const { from, to } = dateRangeToUtc(filters, now);
  return {
    channelId: filters.channelId ?? undefined,
    kind: filters.kind ?? undefined,
    status: filters.status ?? undefined,
    from, to, page, pageSize: OUTBOUND_EMAIL_PAGE_SIZE,
  };
}

export const outboundPageCount = (total: number): number => Math.max(1, Math.ceil(total / OUTBOUND_EMAIL_PAGE_SIZE));

// 404 = sunucu bu sürümü henüz almamış (frontend backend'den önce yayına çıkar); sessiz boş liste gösterilmez.
export function outboundEmailErrorText(error: unknown): string {
  const status = httpStatusOf(error);
  if (status === HTTP_NOT_FOUND) return 'Gönderilen e-posta listesi sunucuda henüz yok (backend güncel değil).';
  if (status === HTTP_FORBIDDEN) return 'Bu listeyi görmek için Omnichannel yöneticisi olman gerekiyor.';
  return describeError(error);
}

/** "5 dk önce" biçimi; tam zaman ayrıca tooltip'te gösterilir. */
export function formatSentAgo(iso: string, now: Date = new Date()): string {
  const minutes = Math.floor((now.getTime() - new Date(iso).getTime()) / MS_PER_MINUTE);
  if (minutes < 1) return 'şimdi';
  if (minutes < MINUTES_PER_HOUR) return `${minutes} dk önce`;
  const hours = Math.floor(minutes / MINUTES_PER_HOUR);
  if (hours < HOURS_PER_DAY) return `${hours} sa önce`;
  return `${Math.floor(hours / HOURS_PER_DAY)} gün önce`;
}

export const formatSentFull = (iso: string): string =>
  new Date(iso).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' });
