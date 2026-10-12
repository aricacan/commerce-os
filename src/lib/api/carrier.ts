import { request } from './core';

// Kargo/taşıyıcı VKN-unvan kataloğu (FAZ 7.4) — bkz. backend CarriersController yorumu.
// MatchKeywords: küçük harfli, virgülle ayrılmış anahtar kelimeler; kargo takip
// entegrasyonunda taşıyıcı adı bu kelimelerle ALT DİZE eşleşmesi yapılarak bulunur.

export interface Carrier {
  id: number;
  vkn: string;
  title: string;
  matchKeywords: string;
  isDefaultFallback: boolean;
  isActive: boolean;
}

export interface CreateCarrierBody {
  vkn: string;
  title: string;
  matchKeywords: string;
  isDefaultFallback?: boolean;
}

export interface UpdateCarrierBody {
  vkn: string;
  title: string;
  matchKeywords: string;
  isDefaultFallback: boolean;
  isActive: boolean;
}

export const carrierApi = {
  list: () => request<Carrier[]>('/carriers'),

  create: (body: CreateCarrierBody) =>
    request<Carrier>('/carriers', { method: 'POST', body: JSON.stringify(body) }),

  update: (id: number, body: UpdateCarrierBody) =>
    request<Carrier>(`/carriers/${id}`, { method: 'PUT', body: JSON.stringify(body) }),

  remove: (id: number) => request<void>(`/carriers/${id}`, { method: 'DELETE' }),
};
