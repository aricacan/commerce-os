import type { ShopifyTotalDto } from '../../lib/api/shopify-explorer';

const LOWER_BOUND_SUFFIX = '+';

function formatCount(count: number): string {
  return count.toLocaleString('tr-TR');
}

// Toplam sayfa sayısı (en az 1); sayfa boyutu geçersizse hesaplanamaz.
export function pageCount(total: ShopifyTotalDto): number | null {
  if (total.pageSize < 1) return null;
  return Math.max(1, Math.ceil(total.count / total.pageSize));
}

// "Sayfa 2 / 5 · 120 kayıt". Toplam yoksa (sayılamadıysa) yalnız "Sayfa 2" — sessiz sıfır yok.
// Sayım tavanına ulaşıldıysa alt sınır belirtilir: "Sayfa 2 / 400+ · 10.000+ kayıt".
export function describePager(pageNumber: number, total?: ShopifyTotalDto | null): string {
  if (!total) return `Sayfa ${pageNumber}`;
  const pages = pageCount(total);
  const suffix = total.isLowerBound ? LOWER_BOUND_SUFFIX : '';
  const pagePart = pages === null ? `Sayfa ${pageNumber}` : `Sayfa ${pageNumber} / ${formatCount(pages)}${suffix}`;
  return `${pagePart} · ${formatCount(total.count)}${suffix} kayıt`;
}
