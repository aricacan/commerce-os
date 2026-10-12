import { create } from 'zustand';

// Her login'de gösterilen büyük, sağ-alt karşılama toast'ı — küçük sol-alt alert yığınından
// (alert-stack.ts) AYRI bir kavram. Login sayfası redirect'te unmount olduğundan, karşılamayı
// burada işaretleyip global mount edilmiş <WelcomeToast> (Providers) gösterir.
interface WelcomeToastState {
  name: string | null;
  show: (name: string) => void;
  clear: () => void;
}

export const useWelcomeToast = create<WelcomeToastState>((set) => ({
  name: null,
  show: (name) => set({ name }),
  clear: () => set({ name: null }),
}));
