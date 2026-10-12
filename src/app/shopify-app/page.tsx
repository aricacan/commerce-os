import { ShopifyEmbeddedApp } from '../../features/shopify/ShopifyEmbeddedApp';

// Shopify admin'de gömülü açılış sayfası (Dev Dashboard "App URL"). Panel girişi (app) grubunda; bu rota
// ONUN DIŞINDA: Shopify iframe'inde çerezsiz açılır, kimlik App Bridge oturum token'ıyla kanıtlanır.
export default function Page() {
  return <ShopifyEmbeddedApp />;
}
