import type { QualityDayDto, QualityTrendDto } from '../../lib/api/omnichannel';
import { shortDate } from './overviewRules';

// Kalite kartının saf yardımcıları (P39): grafik noktaları, puan biçimi ve "ne görüyorum?" cümlesi.

export const QUALITY_TREND_DAYS = 7;

// Bu puanın altı "incele" sayılır (sunucudaki eşikle aynı).
export const QUALITY_REVIEW_THRESHOLD = 6;

export interface QualityPoint {
  label: string;
  // Denetimsiz gün: null — çizgide boşluk kalır, sıfıra düşmez.
  average: number | null;
}

export const formatScore = (score: number): string =>
  score.toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export const isLowScore = (score: number): boolean => score < QUALITY_REVIEW_THRESHOLD;

export const toQualityPoints = (daily: QualityDayDto[]): QualityPoint[] =>
  daily.map((d) => ({ label: shortDate(d.day), average: d.average }));

// Ortalaması en düşük gün; en az iki günde denetim yoksa karşılaştırma anlamsız olduğu için null.
function lowestDay(daily: QualityDayDto[]): QualityDayDto | null {
  const scored = daily.filter((d) => d.average !== null);
  if (scored.length < 2) return null;
  return scored.reduce((lowest, d) => ((d.average ?? 0) < (lowest.average ?? 0) ? d : lowest));
}

export function qualityCaption(trend: QualityTrendDto): string {
  if (trend.average === null) {
    return 'Henüz puanlanmış konuşma yok. Denetim her gün dünün kapanmış bot konuşmalarından küçük bir örnek alır.';
  }

  const parts = [`Ortalama ${formatScore(trend.average)}`];
  const worst = lowestDay(trend.daily);
  if (worst?.average != null) parts.push(`en düşük gün ${shortDate(worst.day)} (${formatScore(worst.average)})`);

  const review = trend.needsReview.length > 0
    ? ` ${trend.needsReview.length} konuşma ${QUALITY_REVIEW_THRESHOLD} puanın altında, incelenmeli.`
    : '';
  return `${parts.join(' — ')}. ${trend.auditedCount} konuşma puanlandı.${review}`;
}
