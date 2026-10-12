import {
  ORDER_DESTINATION_KIND,
  type OrderDestinationKind,
  type OrderDestinationOptionDto,
  type OrderDestinationRuleSaveDto,
} from '../../lib/api/omnichannel-order-destinations';
import { CHAT_ORDER_STATUS, type ChatOrderDto } from '../../lib/api/omnichannel-chat-orders';
import { ANY_COUNTRY } from './paymentScope';

// "Siparişler nereye yazılsın" saf kuralları: seçenek anahtarı, kayıt gövdesi, onay metni ve Siparişler
// ekranındaki hedef rozeti. Etkin hedef ve kazanan kapsam sunucudan gelir; burada yeniden hesaplanmaz.

export const ORDER_DESTINATION_EXPLANATION =
  'Her kapsam için tek hedef seçilir: Kanal > Katalog profili > Marka + ülke > Marka > Ülke > Genel. ' +
  'Üstteki kapsamda kural varsa alttakiler o kanal için kullanılmaz. Kural yoksa siparişler ülkenin ' +
  'sipariş senkronu açık Shopify mağazasına yazılır.';

export const ERP_NOT_ENABLED_TEXT = 'ERP gönderimi henüz etkin değil';

/** Seçim kutusundaki bir seçeneğin anahtarı ("1:12" = Shopify mağazası 12, "0:" = yalnız panelde). */
export const optionKey = (kind: OrderDestinationKind, id: number | null) => `${kind}:${id ?? ''}`;

export const findOption = (options: readonly OrderDestinationOptionDto[], key: string) =>
  options.find((option) => optionKey(option.kind, option.id) === key);

/** Seçenek bir kayda çevrilirken kapsam alanları korunur; "yalnız panelde" hedef kimliği taşımaz. */
export function ruleBodyFor(
  scope: Pick<OrderDestinationRuleSaveDto, 'channelId' | 'catalogProfileId' | 'brandId'> & { country?: string },
  option: Pick<OrderDestinationOptionDto, 'kind' | 'id'>,
): OrderDestinationRuleSaveDto {
  return {
    channelId: scope.channelId ?? null,
    catalogProfileId: scope.catalogProfileId ?? null,
    brandId: scope.brandId ?? null,
    country: scope.country ?? ANY_COUNTRY,
    kind: option.kind,
    targetId: option.kind === ORDER_DESTINATION_KIND.None ? null : option.id,
  };
}

/** Kayıt öncesi onay penceresi: canlı siparişlere etkisini açıkça söyler (geriye dönük gitmez). */
export function saveConfirmText(option: Pick<OrderDestinationOptionDto, 'kind' | 'label'>): string {
  if (option.kind === ORDER_DESTINATION_KIND.None)
    return 'Bu kapsamda onaylanacak yeni siparişler hiçbir yere gönderilmeyecek, yalnız panelde kalacak.';
  return `Bu kapsamda onaylanacak yeni siparişler ${option.label} hedefine yazılacak; ` +
    'bugüne kadar onaylanmış siparişler otomatik gönderilmez.';
}

export interface DestinationBadge {
  label: string;
  tone: 'neutral' | 'info' | 'warning';
}

/** Siparişler ekranındaki hedef rozeti. Hedef henüz çözülmediyse (hiç denenmedi) rozet yok. */
export function destinationBadge(order: Pick<ChatOrderDto, 'destinationKind'>): DestinationBadge | null {
  switch (order.destinationKind) {
    case ORDER_DESTINATION_KIND.ShopifyStore: return { label: 'Hedef: Shopify', tone: 'info' };
    case ORDER_DESTINATION_KIND.ErpSource: return { label: 'Hedef: ERP', tone: 'warning' };
    case ORDER_DESTINATION_KIND.None: return { label: 'Hedef: yalnız panel', tone: 'neutral' };
    default: return null;
  }
}

/** ERP'ye gitmiş siparişte düzenleme/iptal kilitlenmez; yalnız değişikliğin ERP'ye yansımayacağı söylenir. */
export function showErpChangeWarning(order: Pick<ChatOrderDto, 'destinationKind' | 'status'>): boolean {
  return order.destinationKind === ORDER_DESTINATION_KIND.ErpSource
    && (order.status === CHAT_ORDER_STATUS.SentToShopify || order.status === CHAT_ORDER_STATUS.Shipped);
}
