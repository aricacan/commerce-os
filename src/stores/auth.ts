import { create } from 'zustand';
import type { UserInfo } from '../types/api';
import { setAccessToken, getAccessToken } from '../lib/api';
import { beginTelemetrySession } from '../lib/telemetry';

interface AuthState {
  user: UserInfo | null;
  isLoading: boolean;
  setUser: (user: UserInfo | null) => void;
  login: (user: UserInfo, accessToken: string) => void;
  logout: () => void;
  initFromStorage: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,

  setUser: (user) => set({ user }),

  login: (user, accessToken) => {
    setAccessToken(accessToken);
    beginTelemetrySession();
    // Refresh token backend tarafından HttpOnly cookie'ye yazıldı (login yanıtı). JS yalnızca
    // hassas OLMAYAN "oturum var" ipucunu tutar (token'ı asla görmez) — açılışta gereksiz
    // /auth/refresh çağrısını önlemek için.
    try {
      localStorage.setItem('hasSession', '1');
    } catch (e) {
      console.error('Failed to set session hint in localStorage:', e);
    }
    set({ user, isLoading: false });
  },

  logout: () => {
    setAccessToken(null);
    // HttpOnly refresh cookie'sini JS silemez — onu backend (/auth/logout) veya süre dolumu
    // temizler (bkz. Topbar.handleLogout). Burada yalnız client state + ipucu temizlenir.
    try {
      localStorage.removeItem('hasSession');
      // SecureAccessBarrier'ın (Moderasyon, Kategori Uyuşmazlığı vb.) oturum-bazlı kilidi de
      // sıfırlanır — paylaşımlı bir cihazda logout sonrası bir sonraki kullanıcı bu bölgelere
      // eski oturumun açtığı kilitle girmesin.
      sessionStorage.removeItem('secure-access-unlocked');
    } catch (e) {
      console.error('Failed to clear session state from storage:', e);
    }
    set({ user: null, isLoading: false });
  },

  initFromStorage: async () => {
    if (get().user && getAccessToken()) {
      set({ isLoading: false });
      return;
    }

    // Token artık JS'te yok (HttpOnly cookie). Gereksiz /auth/refresh çağrısı yapmamak için
    // hassas olmayan "oturum var" ipucuna bakarız; yoksa anonim kabul edip çıkarız.
    let hasSession = false;
    try {
      if (typeof window !== 'undefined') {
        hasSession = localStorage.getItem('hasSession') === '1';
      }
    } catch (e) {
      console.error('Failed to read session hint from localStorage:', e);
    }

    if (!hasSession) {
      set({ isLoading: false });
      return;
    }

    try {
      // authApi.refresh()'i doğrudan çağırmak yerine api.ts'teki tek-uçuş tryRefresh()
      // kilidi kullanılır — açılışta bu ve 401 sonrası otomatik retry aynı anda tetiklenirse
      // aynı (rotasyonlu) refresh token'ın iki kez kullanılıp ikinci isteğin reddedilmesini
      // (ve kullanıcının gereksiz yere logout olmasını) önler.
      const { authApi, tryRefresh } = await import('../lib/api');
      const refreshed = await tryRefresh();
      if (!refreshed) throw new Error('Refresh failed');
      const user = await authApi.me();
      set({ user, isLoading: false });
    } catch (err) {
      console.error('Failed to refresh token during init:', err);
      try {
        localStorage.removeItem('hasSession');
      } catch (e) {
        console.error('Failed to clear session hint from localStorage:', e);
      }
      set({ user: null, isLoading: false });
    }
  },
}));
