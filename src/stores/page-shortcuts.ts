import { create } from 'zustand';

export interface Shortcut {
  keys: string[];
  label: string;
}

interface PageShortcutsState {
  shortcuts: Shortcut[];
  setShortcuts: (shortcuts: Shortcut[]) => void;
  clearShortcuts: () => void;
}

export const usePageShortcutsStore = create<PageShortcutsState>((set) => ({
  shortcuts: [],
  setShortcuts: (shortcuts) => set({ shortcuts }),
  clearShortcuts: () => set({ shortcuts: [] }),
}));
