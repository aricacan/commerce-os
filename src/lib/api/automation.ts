import { request } from './core';

export interface AutomationCondition {
  field: string;
  op: string;
  value: string | null;
}

export interface AutomationActionSpec {
  type: string;
  params: Record<string, string | null>;
}

export interface AutomationRule {
  id: number;
  name: string;
  triggerEvent: string;
  isActive: boolean;
  priority: number;
  conditions: AutomationCondition[];
  actions: AutomationActionSpec[];
  lastRunAt: string | null;
  lastErrorMessage: string | null;
}

export interface AutomationRun {
  id: number;
  ruleId: number;
  ruleName: string;
  triggerEvent: string;
  subjectType: string;
  subjectId: number;
  matched: boolean;
  isSimulation: boolean;
  outcome: string;
  detail: string | null;
  errorMessage: string | null;
  createdAt: string;
}

export interface AutomationCatalog {
  events: Array<{ event: string; subjectType: string; fields: string[] }>;
  operators: string[];
  actions: string[];
}

export interface UpsertAutomationRule {
  name: string;
  triggerEvent: string;
  isActive: boolean;
  priority: number;
  conditions: AutomationCondition[];
  actions: AutomationActionSpec[];
}

// ─── Otomasyon kuralları (FAZ 7) ──────────────────────────────────────────────
// Katalog SUNUCUDAN gelir: ekranın kendi alan/aksiyon listesini tutması, kodda olmayan
// bir seçeneği kullanıcıya sunup çalışmayan kural yazdırırdı.
export const automationApi = {
  catalog: () => request<AutomationCatalog>('/automation/catalog'),

  rules: () => request<AutomationRule[]>('/automation/rules'),

  createRule: (body: UpsertAutomationRule) =>
    request<AutomationRule>('/automation/rules', { method: 'POST', body: JSON.stringify(body) }),

  updateRule: (id: number, body: UpsertAutomationRule) =>
    request<AutomationRule>(`/automation/rules/${id}`, { method: 'PUT', body: JSON.stringify(body) }),

  deleteRule: (id: number) =>
    request<void>(`/automation/rules/${id}`, { method: 'DELETE' }),

  /** Prova: kuralı gerçek bir kayıt üzerinde değerlendirir, hiçbir aksiyon yürütmez. */
  simulate: (id: number, subjectId: number) =>
    request<AutomationRun>(`/automation/rules/${id}/simulate?subjectId=${subjectId}`, {
      method: 'POST',
    }),

  runs: (subjectType?: string, subjectId?: number) => {
    const params = new URLSearchParams();
    if (subjectType) params.set('subjectType', subjectType);
    if (subjectId !== undefined) params.set('subjectId', String(subjectId));
    const query = params.toString();
    return request<AutomationRun[]>(`/automation/runs${query ? `?${query}` : ''}`);
  },
};
