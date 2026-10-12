// Shopify Hub'daki sipariş detayına derin bağlantı: Omnichannel müşteri paneli bu adresi üretir,
// Hub çalışma alanı açılırken aynı adresten mağazayı ve siparişi okur.

const ORDERS_PATH = '/shopify/orders';
const STORE_PARAM = 'store';
const ORDER_PARAM = 'order';

export interface ShopifyOrderLink {
  storeId: number;
  orderId: number;
}

export function shopifyOrderHref({ storeId, orderId }: ShopifyOrderLink): string {
  const params = new URLSearchParams({ [STORE_PARAM]: String(storeId), [ORDER_PARAM]: String(orderId) });
  return `${ORDERS_PATH}?${params.toString()}`;
}

function positiveInteger(value: string | null): number | null {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

// Bağlantı bu mağazanın siparişini gösteriyorsa sipariş kimliği; başka mağazanınsa null (sekme açık siparişle başlamaz).
export function linkedOrderOfStore(params: URLSearchParams, storeId: number): number | null {
  const link = readShopifyOrderLink(params);
  return link !== null && link.storeId === storeId ? link.orderId : null;
}

// İkisi de geçerli değilse null — yarım bağlantı (yalnız mağaza ya da yalnız sipariş) yok sayılır.
export function readShopifyOrderLink(params: URLSearchParams): ShopifyOrderLink | null {
  const storeId = positiveInteger(params.get(STORE_PARAM));
  const orderId = positiveInteger(params.get(ORDER_PARAM));
  return storeId !== null && orderId !== null ? { storeId, orderId } : null;
}
