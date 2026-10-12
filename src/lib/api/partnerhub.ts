import { BASE, request } from './core';

// ─── PartnerHub OAuth Client Yönetimi (İç Ekip) ─────────────────────────────
// Backend: DemoDashboard.PartnerHub.Api/Controllers/PartnerHubClientsController.cs
// Yalnızca SuperAdmin/Admin rolleri çağırabilir — partner'ların KENDİSİ bu uçları
// hiç göremez (client_credentials token'ları farklı bir auth scheme kullanır).

export interface PartnerHubClient {
  clientId: string;
  displayName: string | null;
  tenantId: number;
  tenantName: string | null;
  isEnabled: boolean;
}

/** Oluşturma ve secret yenileme yanıtı — düz metin secret YALNIZCA burada gelir. */
export interface PartnerHubClientSecret {
  clientId: string;
  clientSecret: string;
  displayName: string | null;
}

export interface PartnerHubClientStatus {
  clientId: string;
  isEnabled: boolean;
}

// "Aktivite" sekmesinin toplu MCP kullanım istatistiği — backend: PartnerHubActivityDto.
// from/to UTC takvim günleri (YYYY-MM-DD), ikisi de dahil. Kapsam: çağıranın kendi kiracısı.
export interface PartnerHubDailyCall {
  date: string;
  count: number;
}

export interface PartnerHubToolCallCount {
  toolName: string;
  count: number;
}

export interface PartnerHubClientCallCount {
  clientId: string;
  displayName: string;
  count: number;
}

export interface PartnerHubActivity {
  from: string;
  to: string;
  totalCalls: number;
  callsByDay: PartnerHubDailyCall[];
  callsByTool: PartnerHubToolCallCount[];
  callsByClient: PartnerHubClientCallCount[];
}

/** Aktivite kayıtları (AuditLogs) 90 gün saklanır — backend PartnerHubActivityLimits.MaxRangeDays. */
export const PARTNERHUB_ACTIVITY_MAX_DAYS = 90;

/** Partnerlere verilecek tam adresler. API kökü "/api" ile biter; PartnerHub uçları onun dışında. */
const API_ORIGIN = BASE.replace(/\/api\/?$/, '');
export const PARTNERHUB_TOKEN_URL = `${API_ORIGIN}/partnerhub/oauth/token`;
export const PARTNERHUB_MCP_URL = `${API_ORIGIN}/partnerhub/mcp`;

const clientPath = (clientId: string) => `/partnerhub/clients/${encodeURIComponent(clientId)}`;

export const partnerHubApi = {
  list: (signal?: AbortSignal) => request<PartnerHubClient[]>('/partnerhub/clients', { signal }),

  // Kiracı GÖNDERİLMEZ — backend onu personelin JWT'sinden çözer.
  create: (body: { displayName: string }) =>
    request<PartnerHubClientSecret>('/partnerhub/clients', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  disable: (clientId: string) =>
    request<PartnerHubClientStatus>(`${clientPath(clientId)}/disable`, { method: 'PATCH' }),

  enable: (clientId: string) =>
    request<PartnerHubClientStatus>(`${clientPath(clientId)}/enable`, { method: 'PATCH' }),

  rotateSecret: (clientId: string) =>
    request<PartnerHubClientSecret>(`${clientPath(clientId)}/rotate-secret`, { method: 'POST' }),

  remove: (clientId: string) => request<void>(clientPath(clientId), { method: 'DELETE' }),

  getActivity: (from: string, to: string, signal?: AbortSignal) =>
    request<PartnerHubActivity>(
      `/partnerhub/activity?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      { signal },
    ),
};
