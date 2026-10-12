import { request } from './core';
import type { PaymentScopeLevel } from './omnichannel-channel-settings';

// ─── Omnichannel › "Siparişler nereye yazılsın" ──────────────────────────────────
//
// Kapsam başına TEK hedef: Shopify mağazası, ERP kaynağı ya da "yalnız panelde tut". Çözümleme sırası sunucuda
// (kanal > profil > marka+ülke > marka > ülke > genel > yerleşik varsayılan = ülkenin Shopify mağazası).
// Backend enum'ları SAYI olarak gönderir/bekler; kazanan kapsam (level) metin gelir.

export const ORDER_DESTINATION_KIND = { None: 0, ShopifyStore: 1, ErpSource: 2 } as const;
export type OrderDestinationKind = (typeof ORDER_DESTINATION_KIND)[keyof typeof ORDER_DESTINATION_KIND];

export interface OrderDestinationRuleDto {
  id: number;
  channelId: number | null;
  catalogProfileId: number | null;
  brandId: number | null;
  /** Ülke kodu ya da "*" (kanal/profil kapsamında her zaman "*"). */
  country: string;
  kind: OrderDestinationKind;
  targetId: number | null;
  targetLabel: string;
  updatedAt: string;
}

export interface OrderDestinationRuleSaveDto {
  channelId?: number | null;
  catalogProfileId?: number | null;
  brandId?: number | null;
  country: string;
  kind: OrderDestinationKind;
  targetId: number | null;
}

export interface OrderDestinationOptionDto {
  kind: OrderDestinationKind;
  /** "Yalnız panelde tut" için null. */
  id: number | null;
  label: string;
  country: string | null;
  brandName: string | null;
  selectable: boolean;
  disabledReason: string | null;
  warnings: string[];
}

export interface OrderDestinationEffectiveDto {
  level: PaymentScopeLevel;
  kind: OrderDestinationKind;
  targetId: number | null;
  label: string;
  /** Kazanan kuralın kimliği (kural yokken null). */
  ruleId: number | null;
  /** Hedefin bugünkü sınırı (ERP gönderimi etkin değil, mağaza yok…); null = sorun yok. */
  notice: string | null;
}

/** "ERP'ye sohbet siparişi gönderimi (test aşamasında)" anahtarının durumu; varsayılan kapalı. */
export interface ErpChatOrderSendStateDto {
  enabled: boolean;
  notice: string;
}

const BASE = '/omnichannel/order-destinations';

export const omnichannelOrderDestinationsApi = {
  list: () => request<OrderDestinationRuleDto[]>(BASE),
  /** country boş/"*" = ülkeden bağımsız kapsam (ülke süzmesi yok). */
  options: (country?: string) =>
    request<OrderDestinationOptionDto[]>(`${BASE}/options${country ? `?country=${encodeURIComponent(country)}` : ''}`),
  erpSend: () => request<ErpChatOrderSendStateDto>(`${BASE}/erp-send`),
  effective: (channelId: number) => request<OrderDestinationEffectiveDto>(`${BASE}/effective?channelId=${channelId}`),
  create: (body: OrderDestinationRuleSaveDto) =>
    request<OrderDestinationRuleDto>(BASE, { method: 'POST', body: JSON.stringify(body) }),
  update: (id: number, body: OrderDestinationRuleSaveDto) =>
    request<OrderDestinationRuleDto>(`${BASE}/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  remove: (id: number) => request<void>(`${BASE}/${id}`, { method: 'DELETE' }),
};
