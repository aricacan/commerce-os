import { request } from './core';

export type OperationSeverity = 'Critical' | 'High' | 'Medium';
export type OperationStatus = 'Open' | 'InProgress' | 'Resolved' | 'Snoozed';
export type OperationDomain = 'Stock' | 'Finance' | 'Catalog' | 'Approval' | 'Integration' | 'Order' | 'Logistics';

export interface OperationNote { id: number; authorUserId: number; authorName: string; body: string; createdAt: string }
export interface OperationActivity { id: number; actorUserId: number | null; actorName: string; type: string; description: string; createdAt: string }
export interface OperationAssignee { id: number; name: string; email: string }

export interface OperationIssue {
  workItemId: number;
  id: string;
  type: string;
  domain: OperationDomain;
  severity: OperationSeverity;
  title: string;
  description: string;
  storeCode: string | null;
  entityType: string;
  entityId: string;
  detectedAt: string;
  lastDetectedAt: string;
  status: OperationStatus;
  assigneeUserId: number | null;
  assigneeName: string | null;
  dueAt: string | null;
  snoozedUntil: string | null;
  isOverdue: boolean;
  resolution: string | null;
  actionLabel: string;
  actionUrl: string;
  facts: Record<string, string>;
  notes: OperationNote[];
  activities: OperationActivity[];
}

// Günlük digest bildirimi için üretilen sayaçlar. Operasyon ekranı bunları GÖSTERMEZ —
// iş listesinin kendisi zaten filtrelenebilir durumda. Sözleşmenin tamamı ve kaldırılan
// alanların gerekçesi için backend'deki OperationsSummaryDto yorumuna bakın.
export interface OperationsSummary {
  open: number;
  inProgress: number;
  critical: number;
  overdue: number;
  unassigned: number;
}

export interface OperationsWorkspaceResponse {
  summary: OperationsSummary;
  issues: OperationIssue[];
  assignees: OperationAssignee[];
}

export interface UpdateOperationRequest {
  status?: OperationStatus;
  assigneeUserId?: number;
  clearAssignee?: boolean;
  dueAt?: string;
  clearDueAt?: boolean;
  snoozedUntil?: string;
  clearSnooze?: boolean;
  resolution?: string;
}

export const operationsApi = {
  getWorkspace: (limit = 250) => request<OperationsWorkspaceResponse>(`/operations?limit=${limit}`),
  update: (id: number, body: UpdateOperationRequest) =>
    request<OperationIssue>(`/operations/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  bulkUpdate: (body: UpdateOperationRequest & { workItemIds: number[] }) =>
    request<{ updated: number }>('/operations/bulk', { method: 'PATCH', body: JSON.stringify(body) }),
  addNote: (id: number, body: string) =>
    request<OperationNote>(`/operations/${id}/notes`, { method: 'POST', body: JSON.stringify({ body }) }),
};
