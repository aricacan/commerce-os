import { request } from './core';

// ─── Page Permissions ─────────────────────────────────────────────────────────
export const permissionsApi = {
  list: () => request<Array<{ pageKey: string; pageLabel: string; allowedRoles: string; sortOrder: number }>>('/permissions/pages'),
  listWithSignal: (signal: AbortSignal) => request<Array<{ pageKey: string; pageLabel: string; allowedRoles: string; sortOrder: number }>>('/permissions/pages', { signal }),
  update: (pageKey: string, allowedRoles: string, pageLabel?: string) =>
    request<void>(`/permissions/pages/${encodeURIComponent(pageKey)}`, { method: 'PUT', body: JSON.stringify({ allowedRoles, pageLabel }) }),
};

// DEMO Connect/Nexus/Radar/Intelligent — rol yerine üye (kullanıcı) bazlı modül erişimi.
export const moduleAccessApi = {
  list: () => request<Array<{ moduleKey: string; userIds: number[] }>>('/module-access'),
  setAccess: (moduleKey: string, userIds: number[]) =>
    request<void>(`/module-access/${moduleKey}`, { method: 'PUT', body: JSON.stringify({ userIds }) }),
};
