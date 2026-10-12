import {
  CONVERSATION_FILTER, type ConversationFilter, type OverviewInsightsDto, type OverviewSummaryDto,
} from '../../lib/api/omnichannel';
import { formatMinutes, formatRevenue, NO_DATA_TEXT } from './overviewFormat';

// Genel Bakış'ın üst şeridindeki kutular (KPI). Saf: veriden metin üretir, uydurma yapmaz — veri yoksa "Veri yok" der.

export interface KpiSpec {
  id: string;
  label: string;
  value: string;
  hint: string;
  warn?: boolean;
  // Küçük çizgi grafik için günlük seri (en az 2 nokta çizilir).
  storea?: number[];
  // Verilirse kutu tıklanır ve gelen kutusunu bu filtreyle açar.
  openFilter?: ConversationFilter;
}

// Ağır hesaplar (insights) ayrı gelir: henüz gelmediyse ya da hata verdiyse o kutular bunu açıkça söyler.
export interface InsightsSlice {
  data: OverviewInsightsDto | null;
  error: string | null;
}

const PERCENT_TOTAL = 100;
const DECIMAL_SCALE = 10;
const PENDING_VALUE = '…';
const PENDING_HINT = 'Yükleniyor';
const FAILED_HINT = 'Yüklenemedi';

const percent = (value: number | null) => (value === null ? NO_DATA_TEXT : `%${value}`);

function conversationsKpi(summary: OverviewSummaryDto): KpiSpec {
  const { kpis } = summary;
  return {
    id: 'conversations', label: 'Yazan müşteri', value: String(kpis.conversations),
    hint: `${kpis.inboundMessages} mesaj`, storea: summary.daily.map((d) => d.inbound),
  };
}

function waitingKpis(summary: OverviewSummaryDto): KpiSpec[] {
  const { waitingForReply, slaBreached } = summary.kpis;
  return [
    {
      id: 'waiting', label: 'Cevap bekleyen', value: String(waitingForReply), warn: waitingForReply > 0,
      hint: 'Şu an, dönemden bağımsız', openFilter: CONVERSATION_FILTER.WaitingReply,
    },
    {
      id: 'sla', label: 'Süresi geçen', value: String(slaBreached), warn: slaBreached > 0,
      hint: 'Cevap süresi hedefini aşanlar', openFilter: CONVERSATION_FILTER.SlaBreached,
    },
  ];
}

function botKpis(summary: OverviewSummaryDto): KpiSpec[] {
  const { handoffCount, handoffRatePercent, botSharePercent } = summary.kpis;
  const solved = handoffRatePercent === null ? null : Math.round((PERCENT_TOTAL - handoffRatePercent) * DECIMAL_SCALE) / DECIMAL_SCALE;
  return [
    {
      id: 'handoff', label: 'Devir', value: String(handoffCount),
      hint: handoffRatePercent === null ? 'Yazan müşteri yok' : `Yazanların ${percent(handoffRatePercent)}'i temsilciye gitti`,
    },
    {
      id: 'bot-solved', label: 'Bot çözüm oranı', value: percent(solved),
      hint: botSharePercent === null ? 'Devire gitmeyen konuşmalar' : `Devire gitmeyenler · giden mesajların %${botSharePercent}'i bot`,
    },
  ];
}

function firstResponseKpi(insights: InsightsSlice): KpiSpec {
  const base = { id: 'first-response', label: 'Ort. ilk yanıt süresi' };
  if (!insights.data) return { ...base, value: PENDING_VALUE, hint: insights.error ? FAILED_HINT : PENDING_HINT };
  const first = insights.data.firstResponse;
  if (first.answeredCount === 0) return { ...base, value: NO_DATA_TEXT, hint: 'Cevaplanan konuşma yok' };
  const agent = first.agentAverageMinutes === null ? 'Temsilci cevabı yok' : `Temsilci ${formatMinutes(first.agentAverageMinutes)}`;
  return {
    ...base, value: formatMinutes(first.averageMinutes), hint: `Bot dahil · ${agent}`,
    storea: first.daily.map((d) => d.averageMinutes).filter((v): v is number => v !== null),
  };
}

function ordersKpi(insights: InsightsSlice): KpiSpec {
  const base = { id: 'orders', label: 'Sohbet siparişi' };
  if (!insights.data) return { ...base, value: PENDING_VALUE, hint: insights.error ? FAILED_HINT : PENDING_HINT };
  const { confirmedCount, revenue } = insights.data.orders;
  if (confirmedCount === 0) return { ...base, value: '0', hint: 'Onaylanan sipariş yok' };
  return { ...base, value: String(confirmedCount), hint: `Onaylanan · ${formatRevenue(revenue)}` };
}

function channelsKpi(summary: OverviewSummaryDto): KpiSpec {
  const base = { id: 'channels', label: 'Aktif kanal' };
  const top = summary.channels[0];
  if (!top) return { ...base, value: '0', hint: 'Yazan müşteri yok' };
  return { ...base, value: String(summary.channels.length), hint: `En çok ${top.name} (${top.conversations})` };
}

export function buildKpis(summary: OverviewSummaryDto, insights: InsightsSlice): KpiSpec[] {
  return [
    conversationsKpi(summary), ...waitingKpis(summary), ...botKpis(summary),
    firstResponseKpi(insights), ordersKpi(insights), channelsKpi(summary),
  ];
}
