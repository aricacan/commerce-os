import { request } from './core';

// ─── QR Code Types ─────────────────────────────────────────────────────────────

export type QrCodeType = 0 | 1 | 2 | 3 | 4;
export const QR_TYPE_LABELS: Record<QrCodeType, string> = {
  0: 'URL / Link',
  1: 'WhatsApp',
  2: 'Telefon',
  3: 'E-posta',
  4: 'Özel',
};

export interface QrCodeDto {
  id: string;
  slug: string;
  title: string;
  qrType: QrCodeType;
  targetUrl: string;
  isUploaded: boolean;
  isActive: boolean;
  createdAt: string;
  scanCount: number;
  qrImageBase64: string | null;
}

export interface CreateQrCodeRequest {
  title: string;
  qrType: QrCodeType;
  targetUrl: string;
}

export interface UploadQrCodeRequest {
  title: string;
  targetUrl: string;
  imageBase64: string;
  mimeType: string;
}

export interface QrDailyStat {
  date: string;
  count: number;
}

export interface QrCountryStat {
  country: string;
  countryCode: string;
  count: number;
}

export interface QrDeviceStat {
  deviceType: string;
  count: number;
}

export interface QrBrowserStat {
  browser: string;
  count: number;
}

export interface QrAnalyticsDto {
  totalScans: number;
  uniqueCountries: number;
  last7DayScans: number;
  dailyScans: QrDailyStat[];
  topCountries: QrCountryStat[];
  deviceBreakdown: QrDeviceStat[];
  browserBreakdown: QrBrowserStat[];
}

export const qrCodeApi = {
  getAll: () => request<QrCodeDto[]>('/qr-codes'),

  getById: (id: string) => request<QrCodeDto>(`/qr-codes/${id}`),

  create: (body: CreateQrCodeRequest) =>
    request<QrCodeDto>('/qr-codes', { method: 'POST', body: JSON.stringify(body) }),

  upload: (body: UploadQrCodeRequest) =>
    request<QrCodeDto>('/qr-codes/upload', { method: 'POST', body: JSON.stringify(body) }),

  toggle: (id: string) =>
    request<{ isActive: boolean }>(`/qr-codes/${id}/toggle`, { method: 'PATCH' }),

  delete: (id: string) =>
    request<void>(`/qr-codes/${id}`, { method: 'DELETE' }),

  getAnalytics: (id: string, days = 30) =>
    request<QrAnalyticsDto>(`/qr-codes/${id}/analytics?days=${days}`),
};
