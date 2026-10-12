import { request } from './core';

// Şifre Kasası (Sistem Ayarları). password: kayıtlıysa maskelenmiş bir gösterge
// ("••••••••••"), yoksa boş string — gerçek değer ASLA bu üzerinden gelmez, yalnız
// revealPassword'dan gelir (her çağrı backend'de loglanır).
export interface CredentialDto {
  id: number;
  mainGroup: string;
  platform: string;
  emailOrUsername: string;
  password: string;
  url: string;
  sortOrder: number;
}

export interface UpsertCredentialBody {
  mainGroup: string;
  platform: string;
  emailOrUsername: string;
  password: string;
  url: string;
  sortOrder?: number | null;
}

export const credentialsApi = {
  list: () => request<CredentialDto[]>('/credentials'),
  revealPassword: (id: number) =>
    request<{ password: string }>(`/credentials/${id}/reveal`, { method: 'POST' }),
  create: (body: UpsertCredentialBody) =>
    request<CredentialDto>('/credentials', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: number, body: UpsertCredentialBody) =>
    request<CredentialDto>(`/credentials/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  remove: (id: number) =>
    request<void>(`/credentials/${id}`, { method: 'DELETE' }),
  reorder: (orderedIds: number[]) =>
    request<void>('/credentials/reorder', { method: 'POST', body: JSON.stringify({ orderedIds }) }),
  bulkCreate: (body: UpsertCredentialBody[]) =>
    request<CredentialDto[]>('/credentials/bulk', { method: 'POST', body: JSON.stringify(body) }),
};
