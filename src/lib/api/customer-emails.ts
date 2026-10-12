import { request } from './core';

// "Elimizde kimin e-postası var?" — mail otomasyonunun gerçek kapsamı.
//
// Canlı veride (3 Eyl 2026) 10.427 siparişin yalnızca 1.250'sinde adres vardı ve bunların
// 1.145'i pazaryeri PROXY adresiydi. Bu ayrım yapılmadan "e-postamız var" demek yanıltıcı
// olur: proxy adrese pazarlama maili atmak pazaryeri politikasını ihlal eder.

export type CustomerEmailKind = 'None' | 'Direct' | 'MarketplaceProxy';

export interface CustomerEmailRow {
  id: number;
  platformOrderNumber: string;
  orderDate: string;
  customerName: string | null;
  customerEmail: string;
  totalAmount: number;
  currency: string;
  platformName: string;
  storeName: string;
  kind: CustomerEmailKind;
}

export interface CustomerEmailSummary {
  totalOrders: number;
  withEmail: number;
  direct: number;
  marketplaceProxy: number;
  /** Benzersiz gerçek adres sayısı — "kaç kişiye ulaşabiliriz" sorusunun cevabı. */
  uniqueDirectAddresses: number;
}

export interface CustomerEmailPlatformRow {
  platform: string;
  withEmail: number;
  direct: number;
  marketplaceProxy: number;
}

export interface CustomerEmailReport {
  summary: CustomerEmailSummary;
  byPlatform: CustomerEmailPlatformRow[];
  items: CustomerEmailRow[];
  returnedCount: number;
  matchingCount: number;
}

export const customerEmailApi = {
  list: (kind: 'all' | CustomerEmailKind = 'all', limit = 200) =>
    request<CustomerEmailReport>(`/order/customer-emails?kind=${kind}&limit=${limit}`),
};
