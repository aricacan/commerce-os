import { create } from 'zustand';

interface LayoutState {
  sidebarOpen: boolean;
  sidebarPinned: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  togglePin: () => void;
}

export const useLayoutStore = create<LayoutState>((set) => ({
  sidebarOpen: true,
  sidebarPinned: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen, sidebarPinned: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open, sidebarPinned: open }),
  togglePin: () => set((s) => ({ sidebarPinned: !s.sidebarPinned, sidebarOpen: !s.sidebarPinned })),
}));
