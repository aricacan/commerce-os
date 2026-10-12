import { request } from './core';

// ─── ERP Kaynak Kataloğu (Topbar kaskad seçicisi: Ülke → ERP → Firma) ─────────
// selectorCode, X-Store header'ının beklediği mevcut kodları taşır (base-storea vb.) —
// tel protokolü değişmez, yalnızca seçicinin gösterdiği metadata dinamikleşir.
export interface ErpSourceInfo {
  id: number;
  code: string;         // DataSource.Code — ProductErpVariant.sourceCode ile birebir eşleşir
  selectorCode: string;
  erp: string;          // "Sentos" | "Base"
  country: string;      // "UK" | "TR" | ...
  displayName: string;  // Kullanıcıya görünen firma adı (Ayarlar'dan düzenlenebilir)
  storeCode: string;
  storeName: string;
  storeColor: string | null;
}

export const erpSourcesApi = {
  list: () => request<ErpSourceInfo[]>('/erp-sources'),
  update: (id: number, body: { displayName: string; country?: string }) =>
    request<void>(`/erp-sources/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
};
