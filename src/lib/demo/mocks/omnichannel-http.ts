// Omnichannel mock route'ları için küçük ortak yardımcılar (gövde okuma, durum kodları, sayfalama).
import type { ShopifyPageDto } from '../../api/shopify-explorer';
import { DemoHttpResponse, type DemoRequest } from '../router';

const NOT_FOUND = 404;
const NO_CONTENT = 204;
const BAD_REQUEST = 400;
const CURSOR_PAGE_SIZE = 20;

export const notFound = (): DemoHttpResponse => new DemoHttpResponse(NOT_FOUND, { title: 'Kayıt bulunamadı.' });
export const noContent = (): DemoHttpResponse => new DemoHttpResponse(NO_CONTENT);
export const badRequest = (detail: string): DemoHttpResponse => new DemoHttpResponse(BAD_REQUEST, { title: detail, error: detail });

/** İstek gövdesini düz nesne olarak okur; gövde yoksa boş nesne. */
export function bodyOf(request: DemoRequest): Record<string, unknown> {
  return typeof request.body === 'object' && request.body !== null ? (request.body as Record<string, unknown>) : {};
}

export const idParam = (request: DemoRequest, name = 'id'): number => Number(request.params[name]);

export function numberQuery(request: DemoRequest, name: string): number | null {
  const raw = request.query.get(name);
  if (raw === null || raw === '') return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

/** skip/take sorgusu ile dilimleme (omnichannel uçlarının sayfalama biçimi). */
export function sliceSkipTake<T>(items: T[], request: DemoRequest, defaultTake: number): T[] {
  const skip = Math.max(0, numberQuery(request, 'skip') ?? 0);
  const take = Math.max(1, numberQuery(request, 'take') ?? defaultTake);
  return items.slice(skip, skip + take);
}

/** page/pageSize sorgusu ile dilimleme. */
export function slicePage<T>(items: T[], request: DemoRequest, defaultSize: number): { items: T[]; page: number; pageSize: number } {
  const page = Math.max(1, numberQuery(request, 'page') ?? 1);
  const pageSize = Math.max(1, numberQuery(request, 'pageSize') ?? defaultSize);
  return { items: items.slice((page - 1) * pageSize, page * pageSize), page, pageSize };
}

/** Gün sayısı kadar geriye dönük sorgu parametresi ("days"). */
export const daysQuery = (request: DemoRequest, fallback: number): number => numberQuery(request, 'days') ?? fallback;

/** `after` imleci demo'da düz bir başlangıç sırasıdır. */
export function cursorPage<T>(items: T[], request: DemoRequest, size = CURSOR_PAGE_SIZE): ShopifyPageDto<T> {
  const start = Number(request.query.get('after') ?? 0) || 0;
  const slice = items.slice(start, start + size);
  const end = start + slice.length;
  return {
    items: slice, hasNextPage: end < items.length, endCursor: end < items.length ? String(end) : null,
    total: { count: items.length, isLowerBound: false, pageSize: size },
  };
}

