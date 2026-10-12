import { create } from 'zustand';

interface NotificationPanelState {
  open: boolean;
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;
}

// ai-panel.ts ile aynı desen — Bildirim paneli artık masaüstü/mobil her yerde
// tek bir yan panel bileşeni (NotificationPanel.tsx) üzerinden açılıp kapanıyor.
export const useNotificationPanel = create<NotificationPanelState>((set) => ({
  open: false,
  openPanel: () => set({ open: true }),
  closePanel: () => set({ open: false }),
  togglePanel: () => set((s) => ({ open: !s.open })),
}));
