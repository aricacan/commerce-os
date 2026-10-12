import { request } from './core';

export type ReturnStatusName = 'Draft' | 'Approved' | 'Completed' | 'Rejected';
export type ReturnLineConditionName = 'Saglam' | 'Arizali';

export interface ReturnLine {
  id: number;
  productId: number;
  orderItemId: number | null;
  quantity: number;
  unitPrice: number;
  condition: ReturnLineConditionName;
  // Onaylayan kişi NEYİ onayladığını görmeli. Yalnızca productId göstermek ("Ürün #4312")
  // bu soruyu yanıtlamıyordu. Ürün silinmişse null kalır.
  productName: string | null;
  productSku: string | null;
}

export interface ReturnDocument {
  id: number;
  orderId: number | null;
  customerId: number | null;
  claimId: number | null;
  status: ReturnStatusName;
  reason: string | null;
  currency: string;
  refundAmount: number;
  stockHandledAt: string | null;
  creditNoteInvoiceId: number | null;
  createdAt: string;
  completedAt: string | null;
  lines: ReturnLine[];
  // Return'de StoreId kolonu yok — bağlı siparişten, o da yoksa pazaryeri talebinden
  // çözülür (ikisi de yoksa null). Satır ekleme formu ürün aramasını bununla sınırlar:
  // aynı SKU başka mağazada başka üründür.
  storeId: number | null;
}

export interface BulkShipResult {
  orderId: number;
  success: boolean;
  shipmentId: number | null;
  error: string | null;
  skipped: boolean;
  /** Siparişin taşıyıcıya iletilememiş eski taslağı vardı; yeni kayıt açılmadan o yeniden gönderildi. */
  resubmittedDraft: boolean;
}

// ─── İade belgeleri ───────────────────────────────────────────────────────────
// Pazaryeri iade TALEBİ (claims) ayrı bir şeydir: o salt okunur bir aynadır, bu ise
// bizim ticari belgemiz. İkisi ekranda iki ayrı sekmede durur.
export const returnsApi = {
  list: (status?: ReturnStatusName) =>
    request<ReturnDocument[]>(`/returns${status ? `?status=${status}` : ''}`),
  get: (id: number) => request<ReturnDocument>(`/returns/${id}`),
  // İade modülünün PRATİK giriş kapısı. Elle boş belge açmak (create) hiçbir ekranda
  // kullanılmıyordu ve tablo üretimde hep boş kalıyordu — belge artık bir pazaryeri
  // talebinden türer, satırları o talebin verisinden kurulur.
  createFromClaim: (claimId: number) =>
    request<ReturnDocument>(`/returns/from-claim/${claimId}`, { method: 'POST' }),
  create: (body: {
    orderId?: number | null;
    customerId?: number | null;
    claimId?: number | null;
    reason?: string | null;
    currency?: string;
  }) => request<ReturnDocument>('/returns', { method: 'POST', body: JSON.stringify(body) }),
  addLine: (id: number, body: {
    productId: number;
    orderItemId?: number | null;
    quantity: number;
    unitPrice: number;
    condition: ReturnLineConditionName;
  }) => request<ReturnDocument>(`/returns/${id}/lines`, { method: 'POST', body: JSON.stringify(body) }),
  // Yanlış girilen satırın tek düzeltme yolu. Yalnızca taslak belgede çalışır — onaylanmış
  // belgenin içeriği değişmez (onaylayan kişi neyi onayladığını bilmeli).
  removeLine: (id: number, lineId: number) =>
    request<ReturnDocument>(`/returns/${id}/lines/${lineId}`, { method: 'DELETE' }),
  // Belgenin PARA tarafı buna bağlı: iade tamamlandığında alacak YALNIZCA cari bağlıysa
  // yazılır. Talepten üretilen belgelerde cari çoğu zaman otomatik çözülemez (pazaryeri
  // proxy e-postaları carilerimizde bulunmuyor), bu yüzden elle bağlama yolu zorunlu.
  setCustomer: (id: number, customerId: number | null) =>
    request<ReturnDocument>(`/returns/${id}/customer`, {
      method: 'PUT',
      body: JSON.stringify({ customerId }),
    }),
  approve: (id: number) => request<void>(`/returns/${id}/approve`, { method: 'POST' }),
  reject: (id: number, reason?: string) =>
    request<void>(`/returns/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }),
  complete: (id: number) => request<void>(`/returns/${id}/complete`, { method: 'POST' }),
  creditNote: (id: number) =>
    request<{ invoiceId: number }>(`/returns/${id}/credit-note`, { method: 'POST' }),
  markStockHandled: (id: number) =>
    request<void>(`/returns/${id}/stock-handled`, { method: 'POST' }),
};

export const bulkShippingApi = {
  ship: (carrierId: number, orderIds: number[]) =>
    request<BulkShipResult[]>('/order/bulk-ship', {
      method: 'POST',
      body: JSON.stringify({ carrierId, orderIds }),
    }),
};
