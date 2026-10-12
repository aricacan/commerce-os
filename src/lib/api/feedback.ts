import { request } from './core';

// ─── Feedback ─────────────────────────────────────────────────────────────────
export const feedbackApi = {
  list: () => request<import('../../types/api').Feedback[]>('/feedback'),
  create: (message: string) =>
    request<import('../../types/api').Feedback>('/feedback', { method: 'POST', body: JSON.stringify({ message }) }),
  updateMessage: (id: number, message: string) =>
    request<void>(`/feedback/${id}/message`, { method: 'PUT', body: JSON.stringify({ message }) }),
  updateStatus: (id: number, status: import('../../types/api').FeedbackStatus) =>
    request<void>(`/feedback/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  remove: (id: number) => request<void>(`/feedback/${id}`, { method: 'DELETE' }),
};
