import { request } from './core';

// ─── ANA SİSTEM (kiracı üstü) ────────────────────────────────────────────────
// Bu uçlar YALNIZCA SystemAdmin rolüyle çağrılabilir. Kasıtlı olarak yalnızca kiracı
// META VERİSİ döndürürler: liste ve sayaçlar. Hiçbir kiracının iş verisi (sipariş, ürün,
// ciro, kimlik bilgisi) buradan erişilebilir DEĞİLDİR ve eklenmemelidir.

export interface TenantSummary {
  id: number;
  code: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  storeCount: number;
  erpConnectionCount: number;
  marketplaceConnectionCount: number;
  userCount: number;
  /** Kiracı açılırken uygulanan sektör şablonu — bkz. category-templates.ts. Yoksa null. */
  categoryTemplateKey: string | null;
}

export interface CreatedTenantAdmin {
  userId: number;
  email: string;
  /** Yalnizca olusturma yanitinda gelir; sunucuda saklanmaz, bir daha alinamaz. */
  password: string;
}

export const systemTenantsApi = {
  list: () => request<TenantSummary[]>('/system/tenants'),
  listWithSignal: (signal: AbortSignal) => request<TenantSummary[]>('/system/tenants', { signal }),

  create: (code: string, name: string, categoryTemplateKey?: string) =>
    request<TenantSummary>('/system/tenants', {
      method: 'POST',
      body: JSON.stringify({ code, name, categoryTemplateKey: categoryTemplateKey || null }),
    }),

  createAdmin: (tenantId: number, email: string, firstName: string, lastName: string) =>
    request<CreatedTenantAdmin>(`/system/tenants/${tenantId}/admins`, {
      method: 'POST',
      body: JSON.stringify({ email, firstName, lastName }),
    }),
};
