import { create } from 'zustand';

// Komut paletinin açık/kapalı durumu. Ayrı store olmasının sebebi: kısayolu dinleyen
// yer (layout) ile paleti çizen yer (CommandPalette) farklı — prop zinciri kurmak yerine
// tek durum noktası. Topbar'daki arama kutusu da buradan açabilir.
interface CommandPaletteState {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  close: () => void;
}

export const useCommandPalette = create<CommandPaletteState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
  toggle: () => set((s) => ({ open: !s.open })),
  close: () => set({ open: false }),
}));
