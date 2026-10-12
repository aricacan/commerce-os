import { create } from 'zustand';

interface AiPanelState {
  open: boolean;
  currentPagePath: string;
  openPanel: (path?: string) => void;
  closePanel: () => void;
  togglePanel: (path?: string) => void;
  setCurrentPagePath: (path: string) => void;
}

export const useAiPanel = create<AiPanelState>((set) => ({
  open: false,
  currentPagePath: '/dashboard',
  openPanel: (path) => set((s) => ({ open: true, currentPagePath: path ?? s.currentPagePath })),
  closePanel: () => set({ open: false }),
  togglePanel: (path) => set((s) => ({ open: !s.open, currentPagePath: path ?? s.currentPagePath })),
  setCurrentPagePath: (path) => set({ currentPagePath: path }),
}));
