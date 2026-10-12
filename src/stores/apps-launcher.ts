import { create } from 'zustand';

// Uygulamalara ulaşmanın İKİ yolu var ve ikisi de aynı katalogtan beslenir
// (bkz. hooks/useAppCatalog.ts):
//
//   1. menu      — Topbar'daki ızgara ikonunun küçük açılır menüsü (hızlı geçiş).
//   2. directory — Pano'daki "Uygulamalar" kartının açtığı BÜYÜK panel: her
//                  uygulamanın ne işe yaradığını okuyabileceğiniz keşif ekranı.
//
// İkisi ayrı durumlar: KPI kartı küçük menüyü uzaktan açtığında kullanıcı
// ekranın öbür ucunda beliren dar bir listeye bakıyordu — kartın kendisi de
// menüyü açıp kapatan bir anahtar gibi davranıyordu.
interface AppsLauncherState {
  menuOpen: boolean;
  directoryOpen: boolean;
  toggleMenu: () => void;
  closeMenu: () => void;
  openDirectory: () => void;
  closeDirectory: () => void;
}

export const useAppsLauncher = create<AppsLauncherState>((set) => ({
  menuOpen: false,
  directoryOpen: false,
  toggleMenu: () => set((state) => ({ menuOpen: !state.menuOpen })),
  closeMenu: () => set({ menuOpen: false }),
  openDirectory: () => set({ directoryOpen: true }),
  closeDirectory: () => set({ directoryOpen: false }),
}));
