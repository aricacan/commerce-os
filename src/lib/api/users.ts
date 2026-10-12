import { request } from './core';

export interface UserRole {
  id: number;
  name: string;
}

export interface ManagedUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  companyEmail: string | null;
  isActive: boolean;
  roles: UserRole[];
}

// ─── Users & Roles ────────────────────────────────────────────────────────────
export const userApi = {
  list: () => request<ManagedUser[]>('/user'),
  listWithSignal: (signal: AbortSignal) => request<ManagedUser[]>('/user', { signal }),
  roles: () => request<UserRole[]>('/user/roles'),
  rolesWithSignal: (signal: AbortSignal) => request<UserRole[]>('/user/roles', { signal }),
  create: (body: { email: string; password?: string; firstName?: string; lastName?: string; roleIds?: number[] }) =>
    request<void>('/user', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: number, body: { firstName?: string; lastName?: string; companyEmail?: string | null }) =>
    request<{ message: string }>(`/user/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (id: number) => request<void>(`/user/${id}`, { method: 'DELETE' }),
  assignRole: (id: number, roleId: number) =>
    request<void>(`/user/${id}/role`, { method: 'POST', body: JSON.stringify({ roleId }) }),
  removeRole: (id: number, roleId: number) =>
    request<void>(`/user/${id}/role/${roleId}`, { method: 'DELETE' }),
  changePassword: (id: number, newPassword: string) =>
    request<{ message: string }>(`/user/${id}/password`, { method: 'PUT', body: JSON.stringify({ newPassword }) }),
  changeMyPassword: (currentPassword: string, newPassword: string) =>
    request<{ message: string }>('/user/me/password', { method: 'PUT', body: JSON.stringify({ currentPassword, newPassword }) }),
  toggleActive: (id: number) =>
    request<{ message: string; isActive: boolean }>(`/user/${id}/toggle-active`, { method: 'PUT' }),
  setCompanyEmail: (id: number, companyEmail: string | null) =>
    request<{ message: string; companyEmail: string | null }>(`/user/${id}/company-email`, {
      method: 'PATCH', body: JSON.stringify({ companyEmail }),
    }),
};
