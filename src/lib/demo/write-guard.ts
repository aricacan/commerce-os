import { DEMO_BLOCKED_MESSAGE } from './config';
import { DemoHttpResponse } from './router';

const FORBIDDEN_STATUS = 403;
const NO_CONTENT_STATUS = 204;

// Zararsız yazmalar: kullanıcıya hissettirmeden sessizce kabul edilir (izleme, push, tercih).
const SILENT_WRITE_PREFIXES = [
  '/telemetry',
  '/push',
  '/auth/logout',
  '/preferences',
  '/notifications',
  '/feedback',
  '/page-views',
];

function isSilentWrite(path: string): boolean {
  return SILENT_WRITE_PREFIXES.some((prefix) => path.toLowerCase().startsWith(prefix));
}

/** Eşleşen handler'ı olmayan yazma isteğinin cevabı: zararsızsa 204, değilse demo uyarısı (403). */
export function unhandledWriteResponse(path: string): DemoHttpResponse {
  if (isSilentWrite(path)) return new DemoHttpResponse(NO_CONTENT_STATUS);
  return new DemoHttpResponse(FORBIDDEN_STATUS, { title: DEMO_BLOCKED_MESSAGE, detail: DEMO_BLOCKED_MESSAGE });
}

export function isBlockedWrite(response: DemoHttpResponse): boolean {
  return response.status === FORBIDDEN_STATUS;
}
