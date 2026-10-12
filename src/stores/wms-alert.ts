import { create } from 'zustand';

export interface WmsToast {
  id: number;
  type: 'error' | 'success' | 'info';
  message: string;
}

interface WmsConfirmRequest {
  message: string;
  resolve: (ok: boolean) => void;
}

interface WmsAlertState {
  toasts: WmsToast[];
  confirmRequest: WmsConfirmRequest | null;
  show: (message: string, type?: WmsToast['type']) => void;
  dismiss: (id: number) => void;
  confirm: (message: string) => Promise<boolean>;
  resolveConfirm: (ok: boolean) => void;
}

// Fiziksel depo modülünde native alert()/confirm() yerine kullanılan uygulama-içi
// bildirim — panel tam ekran overlay olduğu için tarayıcının kendi alert()'i
// arkasında kalıp görünmez oluyor, ayrıca akışı tamamen bloke ediyordu.
export const useWmsAlert = create<WmsAlertState>((set, get) => ({
  toasts: [],
  confirmRequest: null,
  show: (message, type = 'error') => {
    const id = get().toasts.length ? Math.max(...get().toasts.map((t) => t.id)) + 1 : 1;
    set((s) => ({ toasts: [...s.toasts, { id, type, message }] }));
    setTimeout(() => get().dismiss(id), 4000);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  confirm: (message) => new Promise<boolean>((resolve) => {
    set({ confirmRequest: { message, resolve } });
  }),
  resolveConfirm: (ok) => {
    get().confirmRequest?.resolve(ok);
    set({ confirmRequest: null });
  },
}));
