export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface DemoRequest {
  method: HttpMethod;
  /** "/api" öneki atılmış yol, sorgusuz: "/orders/12". */
  path: string;
  params: Record<string, string>;
  query: URLSearchParams;
  body: unknown;
  /** X-Store başlığı (seçili mağaza kodları), yoksa boş dizi. */
  stores: string[];
}

/** Handler düz bir değer döndürürse 200 JSON olur; durum kodu gerekiyorsa bunu döndürür. */
export class DemoHttpResponse {
  constructor(
    readonly status: number,
    readonly body: unknown = undefined,
  ) {}
}

export interface DemoRoute {
  method: HttpMethod;
  /** "/orders/:id/notes" biçimi; sondaki "/*" kalan yolu eşler. */
  pattern: string;
  handle: (request: DemoRequest) => unknown;
}

export const get = (pattern: string, handle: DemoRoute['handle']): DemoRoute => ({ method: 'GET', pattern, handle });
export const post = (pattern: string, handle: DemoRoute['handle']): DemoRoute => ({ method: 'POST', pattern, handle });
export const put = (pattern: string, handle: DemoRoute['handle']): DemoRoute => ({ method: 'PUT', pattern, handle });
export const patch = (pattern: string, handle: DemoRoute['handle']): DemoRoute => ({ method: 'PATCH', pattern, handle });
export const del = (pattern: string, handle: DemoRoute['handle']): DemoRoute => ({ method: 'DELETE', pattern, handle });

const WILDCARD = '*';
const PARAM_PREFIX = ':';

function splitPath(path: string): string[] {
  return path.split('/').filter(Boolean);
}

/** Eşleşirse yol parametrelerini, eşleşmezse null döndürür. */
export function matchPattern(pattern: string, path: string): Record<string, string> | null {
  const patternParts = splitPath(pattern);
  const pathParts = splitPath(path);
  const params: Record<string, string> = {};

  for (let index = 0; index < patternParts.length; index += 1) {
    const part = patternParts[index];
    if (part === WILDCARD) return params;
    const actual = pathParts[index];
    if (actual === undefined) return null;
    if (part.startsWith(PARAM_PREFIX)) {
      params[part.slice(PARAM_PREFIX.length)] = decodeURIComponent(actual);
    } else if (part.toLowerCase() !== actual.toLowerCase()) {
      return null;
    }
  }
  return patternParts.length === pathParts.length ? params : null;
}

export function findRoute(
  routes: DemoRoute[],
  method: HttpMethod,
  path: string,
): { route: DemoRoute; params: Record<string, string> } | null {
  for (const route of routes) {
    if (route.method !== method) continue;
    const params = matchPattern(route.pattern, path);
    if (params) return { route, params };
  }
  return null;
}
