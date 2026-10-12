import { request } from './core';

export interface NotificationDto {
  id: number;
  storeId: number;
  title: string;
  body: string;
  type: string;
  severity: string;
  createdAt: string;
  isRead: boolean;
  url: string | null;
  userId: number | null;
}

export interface PushSubscriptionRequest {
  endpoint: string;
  keys: {
    p256dh?: string;
    auth?: string;
  };
}

// Bildirim tipi ayarı — backend'deki NotificationTypeSettingDto ile birebir.
// Managed: alıcılar yöneticinin seçtikleri (boşsa yöneticiler). Personal: yalnız ilgili kişi.
export type NotificationRecipientMode = 'Managed' | 'Personal';

export interface NotificationTypeSetting {
  key: string;
  label: string;
  description: string;
  recipientMode: NotificationRecipientMode;
  isEnabled: boolean;
  pushEnabled: boolean;
  recipientUserIds: number[];
}

export interface UpdateNotificationTypeSetting {
  isEnabled: boolean;
  pushEnabled: boolean;
  recipientUserIds: number[];
}

// Kişi bazlı tercih: tip ayarı "kim alabilir" der, bu satır kişinin kendi seçimidir.
// Satır yoksa katalog varsayılanı geçerli (push yalnız kişisel tiplerde açık başlar).
export interface UserNotificationPreference {
  typeKey: string;
  label: string;
  category: string;
  inApp: boolean;
  push: boolean;
}

export const notificationSettingsApi = {
  list: () => request<NotificationTypeSetting[]>('/notification-settings'),
  userPreferences: (userId: number) =>
    request<UserNotificationPreference[]>(`/notification-settings/users/${userId}`),
  saveUserPreferences: (userId: number, body: Array<Pick<UserNotificationPreference, 'typeKey' | 'inApp' | 'push'>>) =>
    request<UserNotificationPreference[]>(`/notification-settings/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  // Kendi tercihlerim AYRI uçta: ayar ucu yönetici şartı taşıyor, kullanıcı oradan
  // kendi bildirimini kısamazdı (bkz. MyNotificationPreferencesController).
  myPreferences: () => request<UserNotificationPreference[]>('/my-notification-preferences'),
  saveMyPreferences: (body: Array<Pick<UserNotificationPreference, 'typeKey' | 'inApp' | 'push'>>) =>
    request<UserNotificationPreference[]>('/my-notification-preferences', {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  update: (key: string, body: UpdateNotificationTypeSetting) =>
    request<NotificationTypeSetting>(`/notification-settings/${encodeURIComponent(key)}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
};

// ─── Notifications ────────────────────────────────────────────────────────────
export const notificationApi = {
  list: () => request<NotificationDto[]>('/notification'),
  markAsRead: (id: number) => request<void>(`/notification/${id}/read`, { method: 'PUT' }),
  markAllAsRead: () => request<{ updated: number }>('/notification/read-all', { method: 'PUT' }),
  deleteAll: () => request<{ deleted: number }>('/notification/all', { method: 'DELETE' }),
  subscribe: (body: PushSubscriptionRequest) => request<void>('/notification/subscribe', { method: 'POST', body: JSON.stringify(body) }),
  getVapidPublicKey: () => request<{ publicKey: string }>('/notification/vapid-public-key'),
  triggerTest: (customZScore?: number) => {
    const q = new URLSearchParams();
    if (customZScore !== undefined) q.set('customZScore', customZScore.toString());
    const qs = q.toString();
    return request<unknown>(`/notification/trigger-test-anomaly${qs ? `?${qs}` : ''}`, { method: 'POST' });
  }
};
