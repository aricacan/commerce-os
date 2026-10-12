import {
  MonitoringBackendOutdatedError, type BotKpiDto, type ChannelHealthRowDto, type MonitoringQuery,
} from '../../lib/api/omnichannel-monitoring';
import { describeError, httpStatusOf } from '../../lib/errors';
import { HANDOFF_REASON_LABELS, type HandoffReason } from '../../lib/api/handoff';
import { localDateStr, resolveDatePreset, type DatePreset } from '../../utils/date';
import { localDayRange } from './chatOrderListRules';

// İzleme ekranının saf kuralları: tarih seçimi → sorgu, Test Alanı süzgeci, sayı/süre biçimi, hata metni.

const HTTP_NOT_FOUND = 404;
const HTTP_FORBIDDEN = 403;
const MS_PER_SECOND = 1000;
const MINUTES_PER_HOUR = 60;
const MS_PER_DAY = 86_400_000;
const PERCENT = 100;
const TWO_DECIMALS = 100;
const ONE_DECIMAL = 10;
const DEFAULT_RANGE_DAYS = 7;
// Sunucudaki MonitoringRange.MaxDays ile aynı: daha geniş seçim kırpılır, kullanıcıya önceden söylenir.
export const MONITORING_MAX_DAYS = 90;
// Backend ChannelType.Sandbox. Sunucu zaten dışarıda bırakır; bu ikinci emniyet (eski/yeni sürüm karışırsa).
const SANDBOX_CHANNEL_TYPE = 99;
// Bu süreden uzun bildirim gelmeyen kanal "sessiz" sayılır (trafik olan kanalda anlamlı).
export const QUIET_CHANNEL_HOURS = 72;
export const MS_PER_HOUR = 3_600_000;
// Bu oranın üstündeki gönderim hatası kırmızı gösterilir.
export const SEND_FAILURE_WARN_PERCENT = 5;

export interface MonitoringRangeValue {
  preset: DatePreset;
  customFrom: string;
  customTo: string;
}

// Seçicide "son 7 gün" ön ayarı yok (hafta = takvim haftası); varsayılan bu yüzden bugün dahil son 7 günü elle aralık olarak kurar.
export function defaultMonitoringRange(now: Date = new Date()): MonitoringRangeValue {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (DEFAULT_RANGE_DAYS - 1));
  return { preset: 'custom', customFrom: localDateStr(start), customTo: localDateStr(now) };
}

// Seçilen yerel günler → sunucunun beklediği UTC anları (bitiş günü dahil → ertesi gün 00:00, hariç). Çözülemezse null.
export function toMonitoringQuery(range: MonitoringRangeValue): MonitoringQuery | null {
  const { from, to } = resolveDatePreset(range.preset, range.customFrom, range.customTo);
  return localDayRange(from, to);
}

export function rangeDayCount(query: MonitoringQuery): number {
  return Math.round((new Date(query.to).getTime() - new Date(query.from).getTime()) / MS_PER_DAY);
}

export const exceedsMaxRange = (query: MonitoringQuery): boolean => rangeDayCount(query) > MONITORING_MAX_DAYS;

export const withoutSandbox = (channels: readonly ChannelHealthRowDto[]): ChannelHealthRowDto[] =>
  channels.filter((channel) => (channel.type as number) !== SANDBOX_CHANNEL_TYPE);

// 404 = sunucu bu sürümü henüz almamış (frontend backend'den önce yayına çıkar); sessiz boş ekran gösterilmez.
export function monitoringErrorText(error: unknown): string {
  if (error instanceof MonitoringBackendOutdatedError) return error.message;
  const status = httpStatusOf(error);
  if (status === HTTP_NOT_FOUND) return 'İzleme verisi sunucuda henüz yok (backend güncel değil).';
  if (status === HTTP_FORBIDDEN) return 'Bu bölümü görmek için yetkin yok.';
  return describeError(error);
}

export const handoffReasonLabel = (reason: number): string =>
  (HANDOFF_REASON_LABELS as Record<number, string | undefined>)[reason as HandoffReason] ?? `Sebep ${reason}`;

export const formatSeconds = (ms: number | null): string => (ms === null ? '—' : `${(ms / MS_PER_SECOND).toFixed(1)} sn`);

export const formatPercent = (value: number | null): string => (value === null ? '—' : `%${value}`);

export function formatMinutes(minutes: number | null): string {
  if (minutes === null) return '—';
  if (minutes < MINUTES_PER_HOUR) return `${Math.round(minutes)} dk`;
  return `${(minutes / MINUTES_PER_HOUR).toFixed(1)} sa`;
}

// Payı yüzdeye çevirir; payda 0 ise null (oran uydurulmaz).
export const shareOf = (part: number, total: number): number | null =>
  total === 0 ? null : Math.round((part * PERCENT) / total);

export type DeltaTone = 'good' | 'bad' | 'flat';

export interface KpiDelta { text: string; tone: DeltaTone }

// Önceki dönemle kıyas: iki dönemde de veri yoksa kıyas gösterilmez (null).
// lowerIsBetter: süre/hata oranı gibi azalması iyi olan göstergeler.
export function kpiDelta(current: number | null, previous: number | null, lowerIsBetter: boolean, unit: string): KpiDelta | null {
  if (current === null || previous === null) return null;
  const diff = Math.round((current - previous) * TWO_DECIMALS) / TWO_DECIMALS;
  if (diff === 0) return { text: 'önceki dönemle aynı', tone: 'flat' };
  const improved = lowerIsBetter ? diff < 0 : diff > 0;
  return { text: `${diff > 0 ? '+' : ''}${diff}${unit} önceki döneme göre`, tone: improved ? 'good' : 'bad' };
}

export interface KpiCard {
  key: string;
  label: string;
  value: string;
  hint: string;
  ok: boolean;
  delta: KpiDelta | null;
}

const msToSeconds = (ms: number | null): number | null => (ms === null ? null : Math.round((ms / MS_PER_SECOND) * ONE_DECIMAL) / ONE_DECIMAL);

export function buildKpiCards(
  current: BotKpiDto, previous: BotKpiDto, targets: { p95Ms: number; handoffPercent: number },
): KpiCard[] {
  return [
    {
      key: 'p95', label: 'Bot cevap süresi (p95)', value: formatSeconds(current.p95DurationMs),
      hint: `Hedef < ${targets.p95Ms / MS_PER_SECOND} sn · medyan ${formatSeconds(current.p50DurationMs)}`,
      ok: current.p95DurationMs === null || current.p95DurationMs <= targets.p95Ms,
      delta: kpiDelta(msToSeconds(current.p95DurationMs), msToSeconds(previous.p95DurationMs), true, ' sn'),
    },
    {
      key: 'handoff', label: 'Devir oranı', value: formatPercent(current.handoffRatePercent),
      hint: `Hedef < %${targets.handoffPercent}`,
      ok: current.handoffRatePercent === null || current.handoffRatePercent <= targets.handoffPercent,
      delta: kpiDelta(current.handoffRatePercent, previous.handoffRatePercent, true, ' puan'),
    },
    {
      key: 'send', label: 'Gönderim hatası', value: formatPercent(current.sendFailureRatePercent),
      hint: 'Kanala ulaşmayan giden mesajlar',
      ok: current.sendFailureRatePercent === null || current.sendFailureRatePercent < SEND_FAILURE_WARN_PERCENT,
      delta: kpiDelta(current.sendFailureRatePercent, previous.sendFailureRatePercent, true, ' puan'),
    },
    {
      key: 'turns', label: 'Bot turu', value: String(current.botTurnCount),
      hint: 'Botun cevap verdiği müşteri mesajı', ok: true,
      delta: kpiDelta(current.botTurnCount, previous.botTurnCount, false, ''),
    },
  ];
}
