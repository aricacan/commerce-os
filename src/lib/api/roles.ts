import { request } from './core';

export interface RoleResponse {
  id: number;
  name: string;
  description: string | null;
  isSystem: boolean;
  isActive: boolean;
  permissionCount: number;
}

export interface RoleDetail {
  id: number;
  name: string;
  description: string | null;
  isSystem: boolean;
  isActive: boolean;
  permissionKeys: string[];
}

export interface PermissionCatalogItem {
  groupKey: string;
  featureKey: string;
  actionKey: string;
  label: string;
  key: string;
}

// ─── Roller ve işlem bazlı izinler ────────────────────────────────────────────
// Sayfa görünürlüğü permissionsApi'de (/permissions/pages) kalır; bu ayrı sistem
// "sayfayı gören ne YAPABİLİR" sorusunu yanıtlar.
export const rolesApi = {
  list: () => request<RoleResponse[]>('/roles'),
  catalog: () => request<PermissionCatalogItem[]>('/roles/catalog'),
  get: (id: number) => request<RoleDetail>(`/roles/${id}`),
  create: (body: { name: string; description?: string }) =>
    request<RoleDetail>('/roles', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: number, body: { description?: string; isActive: boolean }) =>
    request<void>(`/roles/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  remove: (id: number) => request<void>(`/roles/${id}`, { method: 'DELETE' }),
  setPermissions: (id: number, permissionKeys: string[]) =>
    request<void>(`/roles/${id}/permissions`, {
      method: 'PUT',
      body: JSON.stringify({ permissionKeys }),
    }),
};
