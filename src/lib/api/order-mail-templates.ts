import { request } from './core';

// Sipariş maili şablonları ve tetikleyicileri.
//
// ⚠️ GÖNDERİM YOK. Bu uçlar şablonu ve "hangi durumda tetiklensin" kararını saklar,
// önizleme üretir. Hiçbir kod bu şablonlarla mail göndermez — kullanıcının kararı
// böyleydi: önce şablon + tetikleyici, gönderime sonra geçilecek.

/** 0 = yalnızca gerçek adresler, 1 = gerçek + pazaryeri proxy adresleri. */
export type OrderMailAudience = 0 | 1;

export const MAIL_AUDIENCE = {
  DirectOnly: 0,
  DirectAndProxy: 1,
} as const satisfies Record<string, OrderMailAudience>;

export interface OrderMailTemplate {
  id: number;
  key: string;
  name: string;
  triggerStatus: string | null;
  subject: string;
  htmlBody: string;
  audience: OrderMailAudience;
  isEnabled: boolean;
  /** Şablonda geçen ama tanımlı olmayan {{yerTutucu}}'lar — yazım hatası uyarısı. */
  unknownPlaceholders: string[];
  updatedAt: string;
}

export interface SaveOrderMailTemplate {
  id?: number;
  key: string;
  name: string;
  triggerStatus: string | null;
  subject: string;
  htmlBody: string;
  audience: OrderMailAudience;
  isEnabled: boolean;
}

export interface OrderMailPlaceholder {
  name: string;
  description: string;
}

export interface OrderMailPreview {
  orderId: number;
  platformOrderNumber: string;
  recipient: string | null;
  recipientKind: 'None' | 'Direct' | 'MarketplaceProxy';
  /** Gönderim AÇIK OLSAYDI bu siparişe mail gider miydi? */
  wouldSend: boolean;
  blockReason: string | null;
  subject: string;
  htmlBody: string;
}

export const orderMailTemplateApi = {
  list: () => request<OrderMailTemplate[]>('/order-mail-templates'),
  placeholders: () => request<OrderMailPlaceholder[]>('/order-mail-templates/placeholders'),
  save: (body: SaveOrderMailTemplate) =>
    request<OrderMailTemplate>('/order-mail-templates', { method: 'POST', body: JSON.stringify(body) }),
  remove: (id: number) =>
    request<void>(`/order-mail-templates/${id}`, { method: 'DELETE' }),
  preview: (id: number, orderId?: number) =>
    request<OrderMailPreview>(`/order-mail-templates/${id}/preview${orderId ? `?orderId=${orderId}` : ''}`),
};

/** Tetikleyici olarak seçilebilecek kanonik sipariş durumları (bkz. OrderRepository.MapStatus). */
export const TRIGGER_STATUSES = [
  'Yeni',
  'Onaylandı',
  'Kargolandı',
  'Kargoya Verildi',
  'Teslim Edildi',
  'İptal',
] as const;
