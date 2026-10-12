import { request } from './core';

// ─── Moderation ───────────────────────────────────────────────────────────────
export const moderationApi = {
  pending: () => request<import('../../types/api').PendingModeration[]>('/moderation/pending'),
  approve: (body: { logId: number; platformName: string; rawCategoryName: string; approvedCategoryId: number }) =>
    request<void>('/moderation/approve', { method: 'POST', body: JSON.stringify(body) }),
  // Onaylamadan, sadece kuyruktan çıkar — ör. eski/bozuk bir AI denemesini incelemeden temizlemek için.
  dismiss: (logId: number) => request<void>(`/moderation/${logId}`, { method: 'DELETE' }),
  // O an ekranda görünen TÜM "onay bekleyen" kayıtları tek seferde temizler.
  dismissAll: () => request<{ deleted: number }>('/moderation/pending', { method: 'DELETE' }),
};
