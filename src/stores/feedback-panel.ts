import { create } from 'zustand';

// Geri Bildirim panelinin (modal) aç/kapa durumu — hem karşılama toast'ındaki "problem bildir"
// butonundan hem de başka yerlerden global olarak açılabilsin diye ayrı bir store.
interface FeedbackPanelState {
  open: boolean;
  openPanel: () => void;
  closePanel: () => void;
}

export const useFeedbackPanel = create<FeedbackPanelState>((set) => ({
  open: false,
  openPanel: () => set({ open: true }),
  closePanel: () => set({ open: false }),
}));
