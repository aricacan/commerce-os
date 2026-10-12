'use client';

import { useCallback, useSyncExternalStore } from 'react';

// Tarayıcı "bu site kurulabilir" dediğinde fırlattığı olay. lib.dom'da tanımlı
// olmadığı için burada tipliyoruz (any kullanmamak için).
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
  interface Navigator {
    /** iOS Safari'ye özel: ana ekrandan açıldıysa true. Standart değil. */
    standalone?: boolean;
  }
}

const SNOOZE_KEY = 'pwa-install-snoozed-until';
const SNOOZE_DAYS = 14;

// ─── beforeinstallprompt yakalayıcı ──────────────────────────────────────────
//
// Olay sayfa yüklendikten HEMEN sonra bir kez fırlar ve yakalanmazsa kaybolur —
// React ağacı monte olana kadar beklersek kaçırabiliriz. Bu yüzden dinleyici
// modül seviyesinde, import anında kurulur; React tarafı sonucu
// useSyncExternalStore ile okur.

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const subscribers = new Set<() => void>();

function emit() {
  for (const cb of subscribers) cb();
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    // Chrome'un kendi mini info bar'ını bastırıp teklifi biz yönetiyoruz.
    e.preventDefault();
    deferredPrompt = e;
    emit();
  });

  // Kurulum tamamlandı — teklif artık geçersiz, buton kaybolmalı.
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    emit();
  });
}

function subscribePrompt(cb: () => void) {
  subscribers.add(cb);
  return () => {
    subscribers.delete(cb);
  };
}

const getPromptSnapshot = () => deferredPrompt !== null;
const getPromptServerSnapshot = () => false;

// ─── Ortam tespiti ───────────────────────────────────────────────────────────

function subscribeDisplayMode(cb: () => void) {
  const mq = window.matchMedia('(display-mode: standalone)');
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
}

function getStandaloneSnapshot() {
  return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
}

const noopSubscribe = () => () => {};
const getServerFalse = () => false;

// iOS Safari beforeinstallprompt DESTEKLEMEZ — kurulum yalnızca elle
// "Paylaş → Ana Ekrana Ekle" ile yapılır. O yüzden ayrıca tespit ediyoruz.
// iPadOS 13+ kendini "Macintosh" olarak tanıttığı için dokunma noktası sayısına da bakılır.
function getIosSnapshot() {
  const ua = navigator.userAgent;
  const isIphone = /iPad|iPhone|iPod/.test(ua);
  const isIpadOs = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  return isIphone || isIpadOs;
}

export interface PwaInstallState {
  /** Tarayıcı kurulum teklifi verdi — "Yükle" butonu gösterilebilir. */
  canPrompt: boolean;
  /** Uygulama ana ekrandan / kurulu olarak çalışıyor. */
  isStandalone: boolean;
  /** iOS: otomatik teklif yok, elle talimat gösterilmeli. */
  isIos: boolean;
  /** Kurulum akışını başlatır. Kabul edildiyse true döner. */
  promptInstall: () => Promise<boolean>;
  /** Teklifi SNOOZE_DAYS gün ertele. */
  snooze: () => void;
  /** Erteleme süresi dolmuş mu (yani teklif gösterilebilir mi). */
  isSnoozed: boolean;
}

function readSnoozed(): boolean {
  try {
    const until = window.localStorage.getItem(SNOOZE_KEY);
    return until !== null && Number(until) > Date.now();
  } catch {
    // Gizli sekme / storage kapalı — erteleme yok say, teklifi göster.
    return false;
  }
}

function subscribeSnooze(cb: () => void) {
  // Başka bir sekmede ertelenirse burada da gizlensin.
  window.addEventListener('storage', cb);
  subscribers.add(cb);
  return () => {
    window.removeEventListener('storage', cb);
    subscribers.delete(cb);
  };
}

export function usePwaInstall(): PwaInstallState {
  const canPrompt = useSyncExternalStore(subscribePrompt, getPromptSnapshot, getPromptServerSnapshot);
  const isStandalone = useSyncExternalStore(subscribeDisplayMode, getStandaloneSnapshot, getServerFalse);
  const isIos = useSyncExternalStore(noopSubscribe, getIosSnapshot, getServerFalse);
  const isSnoozed = useSyncExternalStore(subscribeSnooze, readSnoozed, getServerFalse);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return false;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      // Olay TEK KULLANIMLIK — prompt() çağrıldıktan sonra tekrar kullanılamaz.
      deferredPrompt = null;
      emit();
      return outcome === 'accepted';
    } catch {
      // Tarayıcı prompt() için kullanıcı hareketi (tık) şart koşabilir — otomatik
      // tetikleme reddedilirse patlamadan false dön; teklif korunur, kullanıcı butona basar.
      return false;
    }
  }, []);

  const snooze = useCallback(() => {
    try {
      window.localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_DAYS * 86_400_000));
    } catch {
      // Storage yoksa erteleme kalıcı olmaz; teklif sonraki açılışta tekrar çıkar.
    }
    emit();
  }, []);

  return { canPrompt, isStandalone, isIos, promptInstall, snooze, isSnoozed };
}
