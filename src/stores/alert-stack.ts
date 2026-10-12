import { create } from 'zustand';

// Global, sol-altta üst üste binen, kısa süre sonra kaybolan "alert" kuyruğu — kullanıcı
// talebi: "excel çıktısı indi / şu analiz yapılıyor / yapıldı" gibi geçici bildirimler için.
// Mevcut NotificationPanel'deki KALICI bildirim listesinden (okundu/okunmadı, DB'de saklanır)
// AYRI bir kavram — bu tamamen istemci-taraflı, sayfa yenilenince kaybolur.
export type AlertType = 'success' | 'info' | 'warning' | 'error';

export interface AlertItem {
  id: string;
  message: string;
  type: AlertType;
  /** 0 = yapışkan: kendiliğinden kapanmaz, elle dismiss/update edilir. */
  durationMs: number;
  /** Sürmekte olan bir iş — süre yerine spinner gösterilir. */
  pending?: boolean;
  /** Bildirimin içindeki tek eylem — "Geri Al" gibi. Tıklanınca bildirim kapanır. */
  action?: { label: string; onClick: () => void };
}

/** `push` için isteğe bağlı ekler — konumsal parametre yığmamak için tek nesne. */
export type AlertExtras = Pick<AlertItem, 'pending' | 'action'>;

interface AlertStackState {
  alerts: AlertItem[];
  push: (message: string, type?: AlertType, durationMs?: number, extras?: AlertExtras) => string;
  /** Var olan bir bildirimi yerinde değiştirir (toast.promise: yükleniyor → sonuç). */
  update: (id: string, patch: Partial<Omit<AlertItem, 'id'>>) => void;
  dismiss: (id: string) => void;
  clear: () => void;
}

const DEFAULT_DURATION_MS = 4500;

/** Kendiliğinden kapanmayan bildirim süresi. */
export const STICKY = 0;

export const useAlertStack = create<AlertStackState>((set) => ({
  alerts: [],
  push: (message, type = 'info', durationMs = DEFAULT_DURATION_MS, extras) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    set((s) => ({ alerts: [...s.alerts, { id, message, type, durationMs, ...extras }] }));
    return id;
  },
  update: (id, patch) =>
    set((s) => ({ alerts: s.alerts.map((a) => (a.id === id ? { ...a, ...patch } : a)) })),
  dismiss: (id) => set((s) => ({ alerts: s.alerts.filter((a) => a.id !== id) })),
  clear: () => set({ alerts: [] }),
}));

// React dışından (api.ts, event handler'lar) da çağrılabilsin diye — bileşen içinde
// useAlertStack() hook'una gerek yok, doğrudan pushAlert('Excel indirildi') yeterli.
export function pushAlert(
  message: string,
  type: AlertType = 'info',
  durationMs?: number,
  extras?: AlertExtras,
): string {
  return useAlertStack.getState().push(message, type, durationMs, extras);
}

/** React dışından çağrılabilen update/dismiss — bkz. lib/toast.ts */
export function updateAlert(id: string, patch: Partial<Omit<AlertItem, 'id'>>): void {
  useAlertStack.getState().update(id, patch);
}

export function dismissAlert(id: string): void {
  useAlertStack.getState().dismiss(id);
}

export function clearAlerts(): void {
  useAlertStack.getState().clear();
}
