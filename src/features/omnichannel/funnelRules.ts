import { FUNNEL_STEP, type CrossSellFunnelDto, type FunnelStep, type FunnelStepDto } from '../../lib/api/omnichannel';

export const FUNNEL_STEP_LABELS: Record<FunnelStep, string> = {
  [FUNNEL_STEP.Conversations]: 'Yazan müşteri',
  [FUNNEL_STEP.OrderStarted]: 'Sipariş başladı',
  [FUNNEL_STEP.Confirmed]: 'Müşteri onayladı',
  [FUNNEL_STEP.PaymentSettled]: 'Ödeme / kapıda onay',
  [FUNNEL_STEP.SentToShopify]: "Shopify'da",
  [FUNNEL_STEP.Shipped]: 'Kargoda',
};

export interface FunnelBar {
  step: FunnelStep;
  count: number;
  // İlk adıma göre genişlik (%) — çubuk uzunluğu.
  widthPercent: number;
  // Bir önceki adımdan geçenlerin oranı (%); ilk adımda null.
  passPercent: number | null;
}

const PERCENT = 100;

// %100'ü aşmaz: marka kırılımında bir adım öncekinden büyük çıkabilir (ör. konuşma başka markadan).
const percentOf = (part: number, whole: number) =>
  (whole === 0 ? 0 : Math.min(PERCENT, Math.round((part / whole) * PERCENT)));

export function toFunnelBars(steps: FunnelStepDto[]): FunnelBar[] {
  const first = steps[0]?.count ?? 0;
  return steps.map((s, i) => ({
    step: s.step,
    count: s.count,
    widthPercent: percentOf(s.count, first),
    passPercent: i === 0 ? null : percentOf(s.count, steps[i - 1].count),
  }));
}

// Takip mesajlarının dönüşü: gönderilenlerin yüzde kaçına müşteri sonradan yazdı. null = hiç gönderilmedi.
export const followUpReturnPercent = (sent: number, replied: number): number | null =>
  (sent === 0 ? null : percentOf(replied, sent));

// Çapraz satış satırı (P38): "Çapraz satış: 12 öneri, 4 kabul (%33)". Eski backend alanı göndermezse null.
export function crossSellSummary(crossSell: CrossSellFunnelDto | undefined): string | null {
  if (!crossSell) return null;
  const percent = crossSell.offered === 0 ? null : percentOf(crossSell.accepted, crossSell.offered);
  return `Çapraz satış: ${crossSell.offered} öneri, ${crossSell.accepted} kabul${percent === null ? '' : ` (%${percent})`}`;
}
