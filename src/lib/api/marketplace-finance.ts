import { request } from './core';

// Pazaryeri finans beslemesinin TÜRETİLMİŞ raporları: ödeme takvimi ve hakediş raporu.
//
// Ham işlem listesi ("Pazaryeri Finansı" paneli) 3 Eyl 2026'da kaldırıldı — aynı veriyi
// zaten Trendyol > Raporlar sayfası özetliyordu ve ham liste hiçbir karara girdi olmuyordu.
// Kaldırılan yüzey: GET /marketplace-finance (liste), MarketplaceFinanceView.tsx,
// /marketplace/finance rotası. Alttaki iki uç KALDI, Trendyol > Raporlar bunları kullanıyor.

// ── Ödeme takvimi: "Trendyol bize ne zaman ne kadar ödeyecek?" ────────────────────────

export interface PaymentScheduleDay {
  // null = Trendyol henüz ödeme tarihi belirlememiş (mutabakat işlenmiş, ödeme dönemi
  // kapanmamış). Bu satır listenin sonunda "Tarihi belirsiz" olarak gösterilmeli.
  paymentDate: string | null;
  netAmount: number;
  transactionCount: number;
  // true = Trendyol'dan gelmedi, henüz mutabakatı işlenmemiş siparişlerden bizim
  // hesapladığımız tahmin (bkz. PaymentScheduleService — haftalık Çarşamba döngüsü).
  isForecast: boolean;
}

export interface PaymentSchedule {
  days: PaymentScheduleDay[];
  totalNet: number;
  accruedTotal: number;
  paidTotal: number;
  pendingBalance: number;
  nextPaymentDate: string | null;
  nextPaymentAmount: number | null;
  nextPaymentIsForecast: boolean;
}

export interface PaymentScheduleQuery {
  from?: string;
  to?: string;
  // Pazaryeri ADI (ör. "Trendyol") — gerekçe: OrderProfitabilityQuery.platformName.
  platformName?: string;
}

// ── Hazır ödeme raporu: "bu ay Trendyol'dan ne kadar alacağız?" ───────────────────────

export interface PayoutReportRow {
  platformId: number;
  platformName: string;
  salesCredit: number;
  returns: number;
  commission: number;
  deduction: number;
  advertising: number;
  other: number;
  netPayout: number;
  transactionCount: number;
  nextPaymentDate: string | null;
  nextPaymentAmount: number | null;
}

export interface PayoutReport {
  from: string;
  to: string;
  rows: PayoutReportRow[];
  totalNetPayout: number;
  // Ödeme tarihi henüz belirlenmemiş satırların net toplamı — pencere toplamına DAHİL DEĞİL.
  undatedNet: number;
}

export const marketplaceFinanceApi = {
  paymentSchedule: (query: PaymentScheduleQuery = {}) => {
    const params = new URLSearchParams();
    if (query.from) params.set('from', query.from);
    if (query.to) params.set('to', query.to);
    if (query.platformName) params.set('platformName', query.platformName);
    return request<PaymentSchedule>(`/marketplace-finance/payment-schedule?${params.toString()}`);
  },

  payoutReport: (query: PaymentScheduleQuery = {}) => {
    const params = new URLSearchParams();
    if (query.from) params.set('from', query.from);
    if (query.to) params.set('to', query.to);
    if (query.platformName) params.set('platformName', query.platformName);
    return request<PayoutReport>(`/marketplace-finance/payout-report?${params.toString()}`);
  },
};
