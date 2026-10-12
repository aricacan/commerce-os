// Gelen kutusu listesinin sayfalama kuralları. Saf fonksiyonlar — tarayıcıya dokunmaz.
// Sunucu tek istekte en çok 200 konuşma verir (OmnichannelInboxController.MaxConversationsTake).
export const INBOX_PAGE_SIZE = 50;
export const INBOX_PAGE_SIZES = [25, 50, 100] as const;
export const FIRST_INBOX_PAGE = 1;

// Sayfa düğmeleri: ilk, son, seçilinin iki yanı; arası "…" ile kısalır (1 … 4 5 6 … 20).
const PAGE_NEIGHBOURS = 1;
export const PAGE_GAP = 'gap' as const;
export type InboxPageItem = number | typeof PAGE_GAP;

export function inboxPageSkip(page: number, pageSize = INBOX_PAGE_SIZE): number {
  return (Math.max(page, FIRST_INBOX_PAGE) - FIRST_INBOX_PAGE) * pageSize;
}

// Toplam bilinmiyorsa (sayaç gelmedi) null: arayüz "Sayfa N" yazar, "/ toplam" yazmaz.
export function inboxTotalPages(total: number | undefined, pageSize = INBOX_PAGE_SIZE): number | null {
  if (total === undefined) return null;
  return Math.max(FIRST_INBOX_PAGE, Math.ceil(total / pageSize));
}

// Toplam biliniyorsa ona, bilinmiyorsa gelen sayfanın dolu olmasına bakılır (dolu sayfa = devamı olabilir).
export function hasNextInboxPage(
  page: number, loadedCount: number, total: number | undefined, pageSize = INBOX_PAGE_SIZE,
): boolean {
  const pages = inboxTotalPages(total, pageSize);
  return pages === null ? loadedCount >= pageSize : page < pages;
}

// Kayıtlı (localStorage) değer yalnız sunulan boyutlardan biriyse kullanılır; bozuk/eski değer varsayılana düşer.
export function parseInboxPageSize(raw: string | null): number {
  const value = Number(raw);
  return INBOX_PAGE_SIZES.some((size) => size === value) ? value : INBOX_PAGE_SIZE;
}

export function inboxPageItems(page: number, totalPages: number): InboxPageItem[] {
  const last = Math.max(FIRST_INBOX_PAGE, totalPages);
  const current = Math.min(Math.max(page, FIRST_INBOX_PAGE), last);
  const shown = new Set([FIRST_INBOX_PAGE, last]);
  for (let p = current - PAGE_NEIGHBOURS; p <= current + PAGE_NEIGHBOURS; p += 1) {
    if (p >= FIRST_INBOX_PAGE && p <= last) shown.add(p);
  }

  const items: InboxPageItem[] = [];
  let previous = 0;
  for (const p of [...shown].sort((a, b) => a - b)) {
    // Tek sayfalık boşluk "…" yerine sayfanın kendisiyle doldurulur (1 … 3 yerine 1 2 3).
    if (p - previous === 2) items.push(p - 1);
    else if (p - previous > 2) items.push(PAGE_GAP);
    items.push(p);
    previous = p;
  }
  return items;
}
