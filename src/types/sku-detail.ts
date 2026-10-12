export interface SkuPlatform {
  name: string;
  isActive: boolean;
  connectorType: string;
  storeName: string;
  orderCount: number;
}

export interface SkuStockByErp {
  erpName: string;
  storeCode: string;
  quantity: number;
}

export interface SkuSalesDay {
  date: string;
  quantity: number;
}

export interface SkuCost {
  buyingPrice: number;
  currency: string | null;
}

export interface ProductSkuDetail {
  sku: string;
  barcode: string | null;
  name: string;
  brand: string | null;
  model: string | null;
  modelYear: string | null;
  imageUrl: string | null;
  // Tüm ürün görselleri — backend her zaman en az imageUrl'i içeren bir liste döner (boşsa []).
  imageUrls: string[];
  description: string | null;
  basePrice: number;
  currency: string | null;
  platforms: SkuPlatform[];
  stockByErp: SkuStockByErp[];
  erpVariants: import('./api').ProductErpVariant[];
  salesTotal: number;
  sales30d: number;
  sales60d: number;
  sales90d: number;
  salesTimeline: SkuSalesDay[];
  cost: SkuCost | null;
}
