// Panonun yatay kaydırması sütun adımıyla ilerler: ok düğmeleri yarım sütunda durmaz, telefonda
// "kaçıncı sütundayım" göstergesi kaydırma konumundan türetilir. Saf hesaplar (DOM yok).

// Kaydırma konumuna en yakın sütunun sırası (0'dan). Adım ölçülemediyse ilk sütun.
export function pageIndexOf(scrollLeft: number, step: number, count: number): number {
  if (step <= 0 || count <= 0) return 0;
  return Math.min(count - 1, Math.max(0, Math.round(scrollLeft / step)));
}

// Bir sütun ileri/geri gidilecek hedef konum: önce en yakın sütun sınırına oturur, sonra bir adım
// atar; uçlarda taşmaz.
export function steppedScrollLeft(scrollLeft: number, step: number, direction: -1 | 1, maxScrollLeft: number): number {
  if (step <= 0) return scrollLeft;
  const target = (Math.round(scrollLeft / step) + direction) * step;
  return Math.min(Math.max(0, maxScrollLeft), Math.max(0, target));
}
