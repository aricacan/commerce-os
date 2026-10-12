// Kullanım telemetrisi — "kim hangi sayfada, ne kadar, hangi anlamlı eylemi yaptı" ve
// "kullanıcının ekranında sessizce ne patladı".
//
// VERİYİ ŞİŞİRMEME KURALLARI (bilerek, sıkı):
//   • Her tıklama DEĞİL: yalnız sayfa değişimi (PageView) ve anlamlı eylemler (dışa aktarım,
//     "şimdi çalıştır" gibi — trackAction ile açıkça işaretlenenler).
//   • Bir ziyaret = bir kayıt. Aynı sayfaya art arda dönüş, sekmeyi gizleyip geri açmak
//     yeni ziyaret SAYILMAZ (önceden her gizlenişte kayıt düşüyordu: bir sekme 80 dk'da
//     1.010 "açılma" üretti). 2 saniyeden kısa uğramalar sayılmaz.
//   • Olaylar tarayıcıda biriktirilir, 30 sn'de bir TOPLU gönderilir (istek başına değil).
//   • Aynı hata dakikada bir kez gönderilir (bir döngüde patlayan sorgu yüz satır üretmesin).
//   • Form değerleri, arama metinleri, sorgu parametreleri ASLA gönderilmez — yalnız yol.
//
// Nabız: 30 sn'lik gönderim aynı zamanda "hâlâ buradayım" demek. Son 5 dakikada fare/klavye
// hareketi yoksa kullanıcı "boşta" sayılır ve aktif süreye eklenmez.

import { BASE, authHeader, getAccessToken } from './api/core';

type TelemetryEvent =
  | { type: 'PageView'; path: string; durationMs: number; occurredAt: string }
  | { type: 'Action'; path: string; action: string; label?: string; occurredAt: string };

interface ClientErrorPayload {
  message: string;
  stack?: string;
  path: string;
  source: 'boundary' | 'window' | 'promise' | 'query';
  status?: number;
  correlationId?: string;
}

const FLUSH_INTERVAL_MS = 30_000;
const IDLE_AFTER_MS = 5 * 60_000;
const MIN_PAGE_VIEW_MS = 2_000;
const MAX_BATCH = 50;
const ERROR_DEDUPE_MS = 60_000;
const MAX_STACK_LENGTH = 4_000;
const MAX_MESSAGE_LENGTH = 500;

const SESSION_KEY_STORAGE = 'demo.telemetry.sessionKey';

let queue: TelemetryEvent[] = [];
let currentPath: string | null = null;
// Ziyaretin görünür geçen süresi: sekme gizliyken sayaç durur.
let visibleSince: number | null = null;
let accumulatedMs = 0;
let currentEmitted = false;
let lastInteractionAt = Date.now();
let started = false;
const recentErrors = new Map<string, number>();

// Tarayıcı başına oturum anahtarı: sunucu "Oturumlar" ekranındaki satırı bununla bulur.
// Sekmeler arasında paylaşılır (localStorage) — aynı tarayıcıdaki iki sekme tek oturumdur.
function sessionKey(): string {
  try {
    const existing = localStorage.getItem(SESSION_KEY_STORAGE);
    if (existing) return existing;
    const created = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY_STORAGE, created);
    return created;
  } catch {
    return 'no-storage-session';
  }
}

/** Girişte çağrılır: önceki kullanıcının oturumu bu tarayıcıda devam etmesin. */
export function beginTelemetrySession(): void {
  try {
    localStorage.removeItem(SESSION_KEY_STORAGE);
  } catch {
    // Depolama kapalıysa sabit anahtar kullanılır; oturumlar yine nabızla ayrışır.
  }
}

/** Çıkıştan ÖNCE çağrılır (token hâlâ geçerliyken): oturumu "çıkış yaptı" diye kapatır. */
export async function endTelemetrySession(): Promise<void> {
  await flushTelemetry(true);
  try {
    await send(`${BASE}/telemetry/session/end`, { sessionKey: sessionKey() });
  } catch {
    // Kapatılamayan oturum 30 dk nabızsızlıktan sonra zaten bitmiş sayılır.
  }
  beginTelemetrySession();
}

// Sorgu parametreleri ve fragment ATILIR: "?search=müşteri adı" gibi değerler gizli kalır.
function sanitizePath(path: string): string {
  const withoutQuery = path.split(/[?#]/)[0] ?? '/';
  return withoutQuery.length > 200 ? withoutQuery.slice(0, 200) : withoutQuery;
}

function isActive(): boolean {
  return typeof document !== 'undefined'
    && document.visibilityState === 'visible'
    && Date.now() - lastInteractionAt < IDLE_AFTER_MS;
}

function visibleMs(): number {
  return accumulatedMs + (visibleSince === null ? 0 : Date.now() - visibleSince);
}

// Ziyareti (en fazla BİR kez) kuyruğa yazar. Süre, yazıldığı ana kadar görünür geçen süredir.
function closeCurrentPage(): void {
  if (!currentPath || currentEmitted) return;
  const durationMs = visibleMs();
  if (durationMs < MIN_PAGE_VIEW_MS) return;
  queue.push({ type: 'PageView', path: currentPath, durationMs, occurredAt: new Date(Date.now() - durationMs).toISOString() });
  currentEmitted = true;
}

// Sekme gizlendi: sayaç durur ve ziyaret yazılır (sekme kapanıyor olabilir). Geri dönülünce
// sayaç devam eder ama aynı ziyaret tekrar yazılmaz.
function pauseCurrentPage(): void {
  if (visibleSince !== null) {
    accumulatedMs += Date.now() - visibleSince;
    visibleSince = null;
  }
  closeCurrentPage();
}

function resumeCurrentPage(): void {
  if (currentPath && visibleSince === null) visibleSince = Date.now();
}

/** Sayfa değişimi — uygulama kabuğundan çağrılır (bkz. TelemetryTracker). */
export function trackPageView(path: string): void {
  const clean = sanitizePath(path);
  if (clean === currentPath) return;

  closeCurrentPage();
  currentPath = clean;
  accumulatedMs = 0;
  currentEmitted = false;
  visibleSince = typeof document === 'undefined' || document.visibilityState === 'visible' ? Date.now() : null;
}

/**
 * Anlamlı bir eylem: dışa aktarım, "şimdi çalıştır", toplu işlem. Her düğmeye DEĞİL —
 * yalnız "kim ne zaman bunu yaptı" sorusunun cevabı gereken yerlere.
 */
export function trackAction(action: string, label?: string): void {
  queue.push({
    type: 'Action',
    path: currentPath ?? sanitizePath(typeof window === 'undefined' ? '/' : window.location.pathname),
    action,
    label: label?.slice(0, 120),
    occurredAt: new Date().toISOString(),
  });
}

// keepalive: sekme kapanırken de istek tamamlanır. sendBeacon KULLANILMAZ — Authorization
// başlığı taşıyamaz, kimliksiz istek 401 alır.
async function send(url: string, body: unknown): Promise<void> {
  if (!getAccessToken()) return;

  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify(body),
    credentials: 'include',
    keepalive: true,
  });
}

/**
 * Biriken olayları gönderir; aktifse bu aynı zamanda oturumun nabzıdır.
 * `closing`: sekme gizleniyor — açık sayfanın süresi de kapatılıp gönderilir.
 */
export async function flushTelemetry(closing = false): Promise<void> {
  if (closing) pauseCurrentPage();

  const batch = queue.slice(0, MAX_BATCH);
  queue = queue.slice(batch.length);
  const active = !closing && isActive();

  // Ne olay var ne de kullanıcı aktif: sunucuya boşuna istek gitmez.
  if (batch.length === 0 && !active) return;

  try {
    await send(`${BASE}/telemetry/events`, { sessionKey: sessionKey(), events: batch, active });
  } catch {
    // Telemetri asla kullanıcı işini bozmaz; kaybolan bir parti kabul edilebilir.
  }
}

/**
 * Kullanıcının ekranında olan ama sunucuya ulaşmayan hata ("filtre seçtim, tablo boş
 * geldi"). Aynı hata dakikada bir kez gönderilir.
 */
export function reportClientError(payload: Omit<ClientErrorPayload, 'path'> & { path?: string }): void {
  const path = sanitizePath(payload.path ?? (typeof window === 'undefined' ? '/' : window.location.pathname));
  const key = `${payload.source}|${path}|${payload.message.slice(0, 120)}`;
  const now = Date.now();
  const last = recentErrors.get(key);
  if (last && now - last < ERROR_DEDUPE_MS) return;
  recentErrors.set(key, now);

  const body: ClientErrorPayload = {
    message: payload.message.slice(0, MAX_MESSAGE_LENGTH),
    stack: payload.stack?.slice(0, MAX_STACK_LENGTH),
    path,
    source: payload.source,
    status: payload.status,
    correlationId: payload.correlationId,
  };

  void send(`${BASE}/telemetry/client-errors`, body).catch(() => undefined);
}

/** Uygulama kabuğu açılınca bir kez: zamanlayıcı, etkinlik ve kapanış dinleyicileri. */
export function startTelemetry(): () => void {
  if (started || typeof window === 'undefined') return () => undefined;
  started = true;

  const markInteraction = () => {
    lastInteractionAt = Date.now();
  };
  const onVisibilityChange = () => {
    if (document.visibilityState === 'hidden') void flushTelemetry(true);
    else resumeCurrentPage();
  };
  const onWindowError = (event: ErrorEvent) => {
    reportClientError({ message: event.message || 'Bilinmeyen hata', stack: event.error?.stack, source: 'window' });
  };
  const onRejection = (event: PromiseRejectionEvent) => {
    const reason = event.reason;
    const message = reason instanceof Error ? reason.message : String(reason ?? 'Bilinmeyen hata');
    reportClientError({ message, stack: reason instanceof Error ? reason.stack : undefined, source: 'promise' });
  };

  const interactionEvents = ['pointerdown', 'keydown', 'scroll', 'mousemove'] as const;
  interactionEvents.forEach((name) => window.addEventListener(name, markInteraction, { passive: true }));
  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('error', onWindowError);
  window.addEventListener('unhandledrejection', onRejection);
  const timer = window.setInterval(() => void flushTelemetry(false), FLUSH_INTERVAL_MS);

  return () => {
    interactionEvents.forEach((name) => window.removeEventListener(name, markInteraction));
    document.removeEventListener('visibilitychange', onVisibilityChange);
    window.removeEventListener('error', onWindowError);
    window.removeEventListener('unhandledrejection', onRejection);
    window.clearInterval(timer);
    started = false;
  };
}

/**
 * "500: {...ProblemDetails...}" biçimindeki API hatasından (bkz. api/core request) durum kodunu
 * ve sunucunun verdiği correlationId'yi çıkarır — ekrandaki hata sunucu kaydıyla eşleşsin.
 */
export function parseApiError(error: unknown): { status?: number; correlationId?: string } {
  const message = error instanceof Error ? error.message : '';
  const status = /^(\d{3}):/.exec(message)?.[1];
  const correlationId = /"correlationId"\s*:\s*"([^"]{1,64})"/.exec(message)?.[1];
  return { status: status ? Number(status) : undefined, correlationId };
}
