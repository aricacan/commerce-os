'use client';

import { useStoreSelector } from '../../stores/store-selector';
import { IS_DEMO, installDemoServer } from '../demo';

// Demo modunda istekler tarayıcıda cevaplanır (bkz. lib/demo); gerçek ağa çıkılmaz.
if (IS_DEMO) installDemoServer();

const getBaseUrl = () => {
  if (IS_DEMO) return '/api';
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== 'undefined') {
    return `http://${window.location.hostname}:5000/api`;
  }
  return 'http://localhost:5100/api';
};

export const BASE = getBaseUrl();

// SignalR hub'ları REST API ile aynı host'ta çalışır — BASE'in "/api" sonekini
// atıp hub path'ini ekliyoruz. Böylece Connect/Nexus hub bağlantıları hardcoded
// bir LAN IP'ye değil, REST client'la aynı host çözümleme mantığına bağlı kalır.
export function getHubUrl(hubPath: string): string {
  return getBackendUrl(hubPath);
}

// Backend kökü (BASE'in "/api" soneki atılmış) + yol — "/api" altında OLMAYAN uçlar için
// (SignalR hub'ları, gömülü Hangfire paneli girişi).
export function getBackendUrl(path: string): string {
  return `${BASE.replace(/\/api\/?$/, '')}${path}`;
}

let _accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  _accessToken = token;
}
export function getAccessToken() {
  return _accessToken;
}

// Diğer domain dosyalarında (dosya yükleme vb.) doğrudan fetch yapılan yerler için —
// aynı canlı değeri okuyabilsinler diye burada da erişilebilir tutulur. `getAccessToken()`
// çağıranların çoğu senkron kullanım için doğrudan bu fonksiyonu tercih eder.
export function authHeader(): Record<string, string> {
  return _accessToken ? { Authorization: `Bearer ${_accessToken}` } : {};
}

// Seçili mağaza(ları) (StoreA/StoreB/Base/Tümü) her isteğe header olarak ekler — backend'deki
// StoreContextMiddleware bunu okuyup okuma uçlarını otomatik filtreler. Çoklu seçim virgülle
// birleştirilir ("storea,base"). Zustand store'un vanilla .getState() metodu React dışından da
// okunabildiği için burada hook kullanmaya gerek yok (bkz. useStoreSelector).
export function getStoreHeaders(): Record<string, string> {
  const { selectedStores, selectedPlatformIds, selectedMp } = useStoreSelector.getState();

  // MP (doğrudan pazaryeri entegrasyonu) aktifse ERP seçimini GEÇERSİZ kılar — filtre
  // tamamen o (Store, Platform) çiftine döner (bkz. store-selector.ts setMp).
  if (selectedMp) {
    return { 'X-Store': selectedMp.storeCode, 'X-Platform': String(selectedMp.platformId) };
  }

  const headers: Record<string, string> = {};
  if (selectedStores.length > 0) headers['X-Store'] = selectedStores.join(',');
  if (selectedPlatformIds.length > 0) headers['X-Platform'] = selectedPlatformIds.join(',');
  return headers;
}

// AI paneli gibi tek seferlik sorgularda kullanıcı ambient Topbar seçiminden BAĞIMSIZ bir
// mağaza belirtebilsin diye — request()'in `options.headers` merge sırası (ambient header'ın
// üzerine yazar) sayesinde backend'e hiç dokunmadan çalışır (StoreContextMiddleware zaten
// X-Store header'ını okuyor).
export function storeOverrideHeaders(storeCode?: string): Record<string, string> {
  return storeCode ? { 'X-Store': storeCode } : {};
}

// Multipart/form-data (dosya) yükleyen domain dosyalarının ortak header setini (mağaza +
// auth) tekrarlamaması için — Content-Type kasıtlı olarak eklenmez (fetch, FormData boundary'sini
// kendisi ayarlar).
export function uploadHeaders(): Record<string, string> {
  return { ...getStoreHeaders(), ...authHeader() };
}

// Fetch başarısızsa response body'sini (varsa) okuyup standart bir Error fırlatır — tüm
// manuel fetch (dosya yükleme/indirme) akışlarında tekrarlanan hata işleme mantığını tekilleştirir.
export async function throwIfNotOk(res: Response): Promise<void> {
  if (!res.ok) {
    const body = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status}: ${body}`);
  }
}

// ── Backend erişilebilirlik sinyali ─────────────────────────────────────────
//
// OfflineBanner yalnızca TARAYICI seviyesinde çevrimdışı olmayı yakalar
// (navigator.onLine). İnternet açık ama backend çökmüş/CORS patlamış gibi
// durumlarda kullanıcı sessiz kalıyordu — sayfa sonsuza dek "yükleniyor"
// görünüyordu. Burada art arda ağ-seviyesi hatayı (fetch'in kendisi patladı,
// bir HTTP durum kodu bile dönmedi) sayıp eşik aşılınca global olarak
// yayınlıyoruz; tek bir başarılı yanıt geldiğinde sinyal geri alınır.
const API_UNREACHABLE_THRESHOLD = 2;
let consecutiveNetworkFailures = 0;
let apiUnreachable = false;
const apiHealthListeners = new Set<(unreachable: boolean) => void>();

function notifyApiHealth() {
  for (const listener of apiHealthListeners) listener(apiUnreachable);
}

function reportApiSuccess() {
  consecutiveNetworkFailures = 0;
  if (apiUnreachable) {
    apiUnreachable = false;
    notifyApiHealth();
  }
}

function reportApiFailure() {
  consecutiveNetworkFailures += 1;
  if (!apiUnreachable && consecutiveNetworkFailures >= API_UNREACHABLE_THRESHOLD) {
    apiUnreachable = true;
    notifyApiHealth();
  }
}

/** Backend erişilebilirlik durumuna abone ol. Geri dönen fonksiyon aboneliği kaldırır. */
export function subscribeApiHealth(listener: (unreachable: boolean) => void): () => void {
  apiHealthListeners.add(listener);
  listener(apiUnreachable);
  return () => apiHealthListeners.delete(listener);
}

export const REQUEST_TIMEOUT_MS = 25_000;

// Low-level fetch with JWT Bearer header. On 401, attempts a refresh once.
// Bir istek REQUEST_TIMEOUT_MS içinde yanıt vermezse iptal edilip net bir hata fırlatılır —
// aksi halde yavaş/donmuş bir istek sayfayı süresiz "yükleniyor" durumunda bırakabilir.
export async function request<T>(
  path: string,
  options: RequestInit = {},
  retry = true,
  timeoutMs: number = REQUEST_TIMEOUT_MS,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...getStoreHeaders(),
    ...(options.headers as Record<string, string> ?? {}),
  };
  if (_accessToken) headers['Authorization'] = `Bearer ${_accessToken}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const requestSignal = options.signal
    ? AbortSignal.any([controller.signal, options.signal])
    : controller.signal;

  let res: Response;
  try {
    // credentials:'include' — refresh token artık HttpOnly cookie'de; 401→refresh retry'ının
    // ve auth uçlarının cookie'yi taşıyabilmesi için gerekli. Bearer'lı çağrılarda zararsız.
    res = await fetch(`${BASE}${path}`, { ...options, headers, credentials: 'include', signal: requestSignal });
    // Bir HTTP yanıtı ALINDI (durum kodu 4xx/5xx bile olsa) — backend erişilebilir,
    // sorun varsa o ayrı bir katmanda (describeError/ErrorState) ele alınır.
    reportApiSuccess();
  } catch (err: unknown) {
    // Fetch'in KENDİSİ patladı (bağlantı kurulamadı) ya da zaman aşımına uğradı —
    // ikisi de "backend'e ulaşılamıyor" sinyali sayılır.
    reportApiFailure();
    if (err instanceof DOMException && err.name === 'AbortError' && controller.signal.aborted) {
      throw new Error(`İstek zaman aşımına uğradı (${timeoutMs / 1000}sn): ${path}`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  if (res.status === 401 && retry) {
    // If the request itself is the refresh request, do not attempt to refresh again
    if (path === '/auth/refresh') {
      _accessToken = null;
      throw new Error('Session expired');
    }

    const refreshed = await tryRefresh();
    if (refreshed) return request<T>(path, options, false, timeoutMs);

    // Refresh başarısız — client state'i temizle. Refresh token HttpOnly cookie'de olduğu
    // için JS onu silemez; logout() aşağıda hasSession ipucunu ve access token'ı temizler
    // (cookie'yi sunucu, /auth/logout veya süre dolumunda temizler).
    _accessToken = null;
    try {
      const { useAuthStore } = await import('../../stores/auth');
      useAuthStore.getState().logout();
    } catch (e) {
      console.error('Failed to logout user after refresh failure:', e);
    }
    throw new Error('Session expired');
  }

  if (!res.ok) {
    const body = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status}: ${body}`);
  }

  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

let refreshPromise: Promise<boolean> | null = null;

// Dışa açık: initFromStorage (stores/auth.ts) da aynı tek-uçuş kilidi kullanmalı — önceden
// authApi.refresh()'i doğrudan çağırıyordu, bu da bu kilidi bypass edip aynı refresh token'ın
// (rotation nedeniyle) iki kez kullanılıp ikinci isteğin reddedilmesi riskini doğuruyordu.
export async function tryRefresh(): Promise<boolean> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      // Refresh token artık JS'te değil, HttpOnly cookie'de — credentials:'include' ile
      // tarayıcı otomatik gönderir; gövde/Content-Type gerekmez. Backend rotasyonla üretilen
      // yeni token'ı yine Set-Cookie ile döndürür (JS görmez).
      const res = await fetch(`${BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) return false;
      const data = await res.json();
      _accessToken = data.accessToken;
      return true;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}
