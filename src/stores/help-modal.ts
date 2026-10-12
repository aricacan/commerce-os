import { create } from 'zustand';

interface HelpModalState {
  open: boolean;
  tab: 'shortcuts' | 'help';
  setOpen: (open: boolean) => void;
  setTab: (tab: 'shortcuts' | 'help') => void;
  toggle: () => void;
  close: () => void;
}

export const useHelpModal = create<HelpModalState>((set) => ({
  open: false,
  tab: 'shortcuts',
  setOpen: (open) => set({ open }),
  setTab: (tab) => set({ tab }),
  toggle: () => set((s) => ({ open: !s.open })),
  close: () => set({ open: false }),
}));
