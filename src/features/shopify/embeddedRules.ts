// Shopify "App URL"e şu sorgularla gelir: shop, host, hmac, timestamp (+ gömülüyse embedded=1, id_token).
// Üst pencere kendisiyse (iframe değil) bu bir KURULUM başlangıcıdır → backend /oauth/install imza kontrolü yapar.
export type EmbeddedEntry =
  | { kind: 'install'; search: string }
  | { kind: 'embedded' }
  | { kind: 'panel' };

export function decideEmbeddedEntry(search: string, isTopLevel: boolean): EmbeddedEntry {
  const params = new URLSearchParams(search);
  if (!params.get('shop')) return { kind: 'panel' };
  if (isTopLevel && params.get('hmac')) return { kind: 'install', search };
  return { kind: 'embedded' };
}

export interface ShopifyEmbeddedStatus {
  shopDomain: string;
  connected: boolean;
  panelUrl: string;
}
