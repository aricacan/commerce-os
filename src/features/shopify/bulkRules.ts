import {
  SHOPIFY_BULK_MAX_ITEMS, type ShopifyBulkItemResultDto, type ShopifyBulkResultDto, type ShopifyStockAlertsDto,
} from '../../lib/api/shopify-bulk';

// Toplu işlem ekranlarının saf kuralları (sunucudaki ShopifyBulkPlanner ile aynı mantık; test edilir).

// Seçime kimlik ekler; sınırı aşan kısım yok sayılır.
export function addWithinLimit(selected: ReadonlySet<number>, ids: readonly number[]): Set<number> {
  const next = new Set(selected);
  for (const id of ids) {
    if (next.size >= SHOPIFY_BULK_MAX_ITEMS) break;
    next.add(id);
  }
  return next;
}

export function removeIds(selected: ReadonlySet<number>, ids: readonly number[]): Set<number> {
  const drop = new Set(ids);
  return new Set([...selected].filter((id) => !drop.has(id)));
}

// Sayfadaki her kayıt seçili mi (başlık onay kutusunun durumu).
export function allSelected(selected: ReadonlySet<number>, pageIds: readonly number[]): boolean {
  return pageIds.length > 0 && pageIds.every((id) => selected.has(id));
}

// Virgülle ayrılmış etiketler: kırpılır, boşlar atılır, büyük/küçük harf farkıyla tekrarlar tek sayılır.
export function parseTags(text: string): string[] {
  const seen = new Set<string>();
  return text
    .split(',')
    .map((tag) => tag.trim())
    .filter((tag) => {
      const key = tag.toLowerCase();
      if (tag === '' || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

// Takip numaraları: her satır (ya da virgüllü parça) bir numara.
export function parseTrackingNumbers(text: string): string[] {
  return text.split(/[\n,]/).map((line) => line.trim()).filter((line) => line !== '');
}

// null = geçerli. Sunucu kuralı: boş, tek ya da sipariş sayısı kadar numara.
export function trackingCountError(orderCount: number, numbers: readonly string[]): string | null {
  if (numbers.length <= 1 || numbers.length === orderCount) return null;
  return `${numbers.length} takip numarası girildi ama ${orderCount} sipariş seçili: tek numara ya da her sipariş için bir satır girin.`;
}

export function failedItems(result: ShopifyBulkResultDto): ShopifyBulkItemResultDto[] {
  return result.items.filter((item) => !item.applied);
}

export function appliedIds(result: ShopifyBulkResultDto): number[] {
  return result.items.filter((item) => item.applied).map((item) => item.id);
}

export function bulkSummaryText(result: ShopifyBulkResultDto): string {
  return result.failed === 0
    ? `${result.succeeded} kaydın tümü uygulandı.`
    : `${result.total} kayıttan ${result.succeeded} tanesi uygulandı, ${result.failed} tanesi başarısız.`;
}

// Ürünün Shopify yönetimindeki düzenleme sayfası (alan adı sunucuda küçük harf/protokolsüz saklanır).
export function adminProductUrl(shopDomain: string, productId: number): string {
  return `https://${shopDomain}/admin/products/${productId}`;
}

// Stok kartı özeti: uyarı yoksa null.
export function stockAlertText(alerts: ShopifyStockAlertsDto): string | null {
  if (alerts.outOfStockCount === 0 && alerts.lowStockCount === 0) return null;
  return `${alerts.outOfStockCount} ürün stoksuz, ${alerts.lowStockCount} ürün düşük stokta (${alerts.threshold} ve altı).`;
}
