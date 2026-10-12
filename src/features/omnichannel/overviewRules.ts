import {
  CONVERSATION_TOPIC_LABELS, HANDOFF_REASON_LABELS, type OverviewInsightsDto, type OverviewSummaryDto,
} from '../../lib/api/omnichannel';
import { formatMinutes } from './overviewFormat';
import { CONVERSATION_STAGE_LABELS } from './stageRules';

// Genel Bakış için saf hesaplamalar: grafik verisi, grafiklerin altındaki "ne görüyorum?" cümleleri ve
// tek cümlelik özet. Bileşenler yalnız çizer. Kutu (KPI) hesapları overviewKpis.ts'te.

// ── Grafik verisi ───────────────────────────────────────────────────────────

export interface DailyPoint {
  label: string;
  inbound: number;
  botReplies: number;
  agentReplies: number;
}

export const shortDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });

export const toDailyPoints = (daily: OverviewSummaryDto['daily']): DailyPoint[] =>
  daily.map((d) => ({ label: shortDate(d.date), inbound: d.inbound, botReplies: d.botReplies, agentReplies: d.agentReplies }));

// Sıralı çubuk grafiğin (aşama, kanal, devir sebebi, konu) ortak satırı.
export interface RankedBar {
  key: string;
  label: string;
  count: number;
}

// Boş satırlar çizilmez.
const nonEmpty = (bars: RankedBar[]) => bars.filter((b) => b.count > 0);

// Aşamalar akış sırasıyla (backend enum sırası) gelir.
export const toStageBars = (stages: OverviewSummaryDto['stages']): RankedBar[] =>
  nonEmpty(stages.map((s) => ({ key: `stage-${s.stage}`, label: CONVERSATION_STAGE_LABELS[s.stage], count: s.count })));

export const toChannelBars = (channels: OverviewSummaryDto['channels']): RankedBar[] =>
  nonEmpty(channels.map((c) => ({ key: `channel-${c.channelId}`, label: c.name, count: c.conversations })));

export const toReasonBars = (reasons: OverviewSummaryDto['handoffReasons']): RankedBar[] =>
  nonEmpty(reasons.map((r) => ({
    key: `reason-${r.reason}`, label: HANDOFF_REASON_LABELS[r.reason] ?? `Sebep ${r.reason}`, count: r.count,
  })));

export const toTopicBars = (topics: OverviewSummaryDto['topics']): RankedBar[] =>
  nonEmpty(topics.map((t) => ({ key: `topic-${t.topic}`, label: CONVERSATION_TOPIC_LABELS[t.topic], count: t.count })));

const UNKNOWN_COUNTRY = 'Bilinmiyor';

// Ülke kodu ("KS") yerine adı ("Kosova") gösterir; ad listesi yüklenmediyse kod kalır.
export const toCountryBars = (
  countries: OverviewInsightsDto['countries'], names: Record<string, string> = {},
): RankedBar[] =>
  nonEmpty(countries.map((c) => ({
    key: `country-${c.country ?? 'none'}`,
    label: c.country ? (names[c.country] ?? c.country) : UNKNOWN_COUNTRY,
    count: c.conversations,
  })));

export const toBrandBars = (brands: OverviewInsightsDto['brands']): RankedBar[] =>
  nonEmpty(brands.map((b) => ({ key: `brand-${b.brandId ?? 'none'}`, label: b.name, count: b.conversations })));

// İlk cevap süresi trendi: bot dahil ve yalnız temsilci, dakika. Cevaplanan konuşma olmayan gün boşluk bırakır (0 yazılmaz).
export interface ResponsePoint {
  label: string;
  overall: number | null;
  agent: number | null;
}

export const toResponsePoints = (daily: OverviewInsightsDto['firstResponse']['daily']): ResponsePoint[] =>
  daily.map((d) => ({ label: shortDate(d.date), overall: d.averageMinutes, agent: d.agentAverageMinutes }));

export interface HourPoint {
  label: string;
  count: number;
}

export const toHourPoints = (hourly: number[]): HourPoint[] =>
  hourly.map((count, hour) => ({ label: String(hour).padStart(2, '0'), count }));

// ── "Ne görüyorum?" cümleleri ───────────────────────────────────────────────

const HOUR_LABEL = (hour: number) => `${String(hour).padStart(2, '0')}:00`;

export function hourlyCaption(hourly: number[]): string {
  const total = hourly.reduce((sum, n) => sum + n, 0);
  if (total === 0) return 'Bu dönemde müşteri mesajı yok.';
  const peak = hourly.indexOf(Math.max(...hourly));
  return `En yoğun saat ${HOUR_LABEL(peak)}–${HOUR_LABEL((peak + 1) % hourly.length)}: mesajların %${Math.round((hourly[peak] / total) * 100)}'i bu saatte geldi.`;
}

export function dailyCaption(daily: DailyPoint[]): string {
  if (daily.length === 0) return 'Bu dönemde mesaj yok.';
  const busiest = daily.reduce((a, b) => (b.inbound > a.inbound ? b : a));
  return `En çok müşteri mesajı ${busiest.label} günü geldi (${busiest.inbound}). Çubuklar bizim cevaplarımız, çizgi müşteriden gelenler.`;
}

export function reasonCaption(bars: RankedBar[]): string {
  if (bars.length === 0) return 'Bu dönemde devir yok.';
  const total = bars.reduce((sum, b) => sum + b.count, 0);
  return `En sık devir sebebi "${bars[0].label}" (${bars[0].count} / ${total}). Bu sebebi azaltmak devir oranını en çok düşürür.`;
}

export function channelCaption(bars: RankedBar[]): string {
  if (bars.length === 0) return 'Bu dönemde yazan müşteri yok.';
  const total = bars.reduce((sum, b) => sum + b.count, 0);
  return `Müşterilerin %${Math.round((bars[0].count / total) * 100)}'i ${bars[0].label} kanalından yazdı.`;
}

export function responseCaption(first: OverviewInsightsDto['firstResponse']): string {
  if (first.answeredCount === 0) return 'Bu dönemde cevaplanan konuşma yok; süre hesaplanamadı.';
  const agent = first.agentAverageMinutes === null
    ? 'Temsilci cevabı olan konuşma yok.'
    : `Temsilci ilk cevabı ortalama ${formatMinutes(first.agentAverageMinutes)} (${first.agentAnsweredCount} konuşma).`;
  return `Bot dahil ilk cevap ortalama ${formatMinutes(first.averageMinutes)}, ortası ${formatMinutes(first.medianMinutes)}. ${agent}`;
}

export function stageCaption(summary: OverviewSummaryDto): string {
  const waiting = summary.kpis.waitingForReply;
  return waiting > 0
    ? `${waiting} konuşma temsilcinin cevabını bekliyor; önce onlara bakın.`
    : 'Cevap bekleyen konuşma yok. Aşama, sohbetin gidişatından otomatik belirlenir.';
}

// Sayılardan üretilen, insan diliyle özet. Veri yoksa dürüstçe söyler; uydurma yorum içermez.
// periodText: seçili dönemin ifadesi ("Son 30 günde", "1 Eyl – 10 Eyl arasında").
export function summarize(summary: OverviewSummaryDto, periodText: string): string {
  const { kpis } = summary;
  if (kpis.conversations === 0) return `${periodText} bu kapsamda müşteri yazmadı.`;

  const parts = [`${periodText} ${kpis.conversations} müşteri yazdı`];
  if (kpis.botSharePercent !== null) parts.push(`giden mesajların %${kpis.botSharePercent}'ini bot yazdı`);
  if (kpis.handoffCount > 0 && kpis.handoffRatePercent !== null) {
    parts.push(`${kpis.handoffCount} konuşma temsilciye devredildi (%${kpis.handoffRatePercent})`);
  }
  const sentence = `${parts.join('; ')}.`;

  return kpis.waitingForReply > 0
    ? `${sentence} Şu an ${kpis.waitingForReply} konuşma cevap bekliyor.`
    : `${sentence} Şu an cevap bekleyen konuşma yok.`;
}
