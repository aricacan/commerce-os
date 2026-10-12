import { request } from './core';

// ─── Müşteri 360: isim/sipariş no/e-posta ile tek arama, iki bağımsız sonuç seti ───────────
// Sipariş ↔ Omnichannel konuşması otomatik bağlanmaz (Order hiç telefon tutmuyor) — bkz.
// backend Customer360Controller üstündeki gerekçe.

export interface CustomerOrderRow {
  orderId: number;
  customerName: string;
  storeName: string;
  platformName: string;
  platformOrderNumber: string;
  orderDate: string;
  universalStatus: string;
  revenue: number;
  netProfit: number;
}

export interface CustomerGroup {
  customerName: string;
  orderCount: number;
  totalRevenue: number;
  totalNetProfit: number;
}

export interface ConversationSummary {
  conversationId: number;
  status: string;
  isUrgent: boolean;
  unreadCount: number;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
}

export interface ContactMatch {
  contactId: number;
  displayName: string;
  phoneNumber: string | null;
  channelName: string;
  conversations: ConversationSummary[];
}

export interface Customer360SearchResult {
  orderCustomers: CustomerGroup[];
  orders: CustomerOrderRow[];
  contacts: ContactMatch[];
}

export const customer360Api = {
  search: (q: string) => request<Customer360SearchResult>(`/customer360/search?q=${encodeURIComponent(q)}`),
};
