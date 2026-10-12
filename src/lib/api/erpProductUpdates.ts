import { request } from './core';

/**
 * ERP'deki VAR OLAN ürünün alanlarını güncelleme isteği.
 *
 * Alanların hepsi opsiyonel ve bu kasıtlı: gönderilmeyen alan ERP'de DEĞİŞMEZ.
 * "Sadece fiyatı güncelle" isteği ürünün açıklamasını silmemeli.
 *
 * Stok bilerek YOK: iki writer da stok gövdesini kurmak için hedef hesaba özgü depo
 * kimliğini (warehouseId) bekliyor ve o kimlik burada çözülemiyor — çözemeden göndermek
 * stoğu yanlış depoya yazmak olurdu.
 */
export interface ErpProductUpdateRequest {
  productId: number;
  price?: number;
  currency?: string;
  name?: string;
  description?: string;
  barcode?: string;
  brand?: string;
  vatRate?: number;
  desi?: number;
  invoiceName?: string;
}

export interface ErpProductUpdateResult {
  productId: number;
  operationId: string;
  targetName: string;
  fields: string[];
  notice: string;
}

// Dış istek burada ATILMAZ: uç yalnızca ErpOperations kuyruğuna kayıt düşer, gönderimi
// arka plandaki dispatcher yapar (bkz. ErpDispatchService). Sonuç ERP İşlemleri panelinde.
export const erpProductUpdatesApi = {
  queue: (body: ErpProductUpdateRequest) =>
    request<ErpProductUpdateResult>('/erp-product-updates', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};
