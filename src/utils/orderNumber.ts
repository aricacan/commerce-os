const SHOPIFY_ORDER_GID_PREFIX = 'gid://shopify/Order/';
const HASH = '#';

function isShopifyGid(value: string): boolean {
  return value.toLowerCase().startsWith(SHOPIFY_ORDER_GID_PREFIX.toLowerCase());
}

/**
 * Sipariş numarasının kullanıcıya gösterilen biçimi. Bazı kaynaklar (Sentos üzerinden gelen Shopify
 * siparişleri) Shopify GraphQL kimliğini ("gid://shopify/Order/123") numara olarak saklıyor; saklanan
 * değer eşleşme anahtarı olduğu için DEĞİŞTİRİLMEZ, yalnız gösterimde dönüştürülür.
 *
 * Kaynak okunur numarayı ayrı alanda taşıyorsa (`orderCode`, örn. "#11092") GID yerine o gösterilir;
 * yoksa GID sayısal kimliğe indirilir.
 */
export function formatOrderNumber(
  orderNumber: string | null | undefined,
  orderCode?: string | null,
): string {
  const value = (orderNumber ?? '').trim();
  if (!isShopifyGid(value)) return value;

  const readable = (orderCode ?? '').trim().replace(/^#/, '');
  if (readable) return readable;

  return value.slice(SHOPIFY_ORDER_GID_PREFIX.length).split('?')[0];
}

/** "#" önekli gösterim; numara boşsa boş metin döner. */
export function formatOrderNumberWithHash(
  orderNumber: string | null | undefined,
  orderCode?: string | null,
): string {
  const formatted = formatOrderNumber(orderNumber, orderCode);
  return formatted ? `${HASH}${formatted}` : '';
}
