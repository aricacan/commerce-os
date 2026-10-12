import { toast } from '../toast';
import { DEMO_BLOCKED_MESSAGE, DEMO_LATENCY_MS } from './config';
import { DemoHttpResponse, findRoute, type DemoRequest, type HttpMethod } from './router';
import { isBlockedWrite, unhandledWriteResponse } from './write-guard';
import { demoRoutes } from './mocks';

const API_PREFIX = '/api';
const HUB_PREFIX = '/hubs/';
const JSON_HEADERS = { 'Content-Type': 'application/json' };
const NOT_FOUND_STATUS = 404;
const WARNED_PATHS = new Set<string>();

let installed = false;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseBody(init: RequestInit | undefined): unknown {
  if (typeof init?.body !== 'string') return undefined;
  try {
    return JSON.parse(init.body);
  } catch {
    return undefined;
  }
}

function readStores(init: RequestInit | undefined): string[] {
  const headers = new Headers(init?.headers);
  const value = headers.get('X-Store');
  return value ? value.split(',').filter(Boolean) : [];
}

function toResponse(result: unknown): Response {
  if (result instanceof DemoHttpResponse) {
    const body = result.body === undefined ? null : JSON.stringify(result.body);
    return new Response(body, { status: result.status, headers: JSON_HEADERS });
  }
  return new Response(JSON.stringify(result ?? null), { status: 200, headers: JSON_HEADERS });
}

function handle(url: URL, init: RequestInit | undefined): DemoHttpResponse | unknown {
  const method = (init?.method ?? 'GET').toUpperCase() as HttpMethod;
  const path = url.pathname.slice(API_PREFIX.length) || '/';
  const found = findRoute(demoRoutes, method, path);

  if (found) {
    const request: DemoRequest = {
      method,
      path,
      params: found.params,
      query: url.searchParams,
      body: parseBody(init),
      stores: readStores(init),
    };
    return found.route.handle(request);
  }

  if (method !== 'GET') return unhandledWriteResponse(path);

  if (!WARNED_PATHS.has(path)) {
    WARNED_PATHS.add(path);
    console.warn(`[demo] mock yok: GET ${path}`);
  }
  return [];
}

async function demoFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url, window.location.origin);
  if (url.pathname.startsWith(HUB_PREFIX)) return new Response(null, { status: NOT_FOUND_STATUS });

  await sleep(DEMO_LATENCY_MS);
  const result = handle(url, init);
  if (result instanceof DemoHttpResponse && isBlockedWrite(result)) toast.warning(DEMO_BLOCKED_MESSAGE);
  return toResponse(result);
}

/** window.fetch'i yakalar: "/api/..." ve "/hubs/..." istekleri tarayıcıda cevaplanır. */
export function installDemoServer(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  const realFetch = window.fetch.bind(window);

  window.fetch = (input, init) => {
    const target = new URL(typeof input === 'string' || input instanceof URL ? input : input.url, window.location.origin);
    const isDemoTarget =
      target.origin === window.location.origin &&
      (target.pathname.startsWith(`${API_PREFIX}/`) || target.pathname.startsWith(HUB_PREFIX));
    return isDemoTarget ? demoFetch(input, init) : realFetch(input, init);
  };
}
