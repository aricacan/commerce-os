import { create } from 'zustand';
import type { AdPlatform } from '../lib/api/adshub';

// 17 kanonik modül anahtarı = rota segmenti (bkz. lib/workspace-routes.ts). Ekran adları
// işlevi anlatır (b2b-outreach, oem-matcher, …); backend'deki teknik modül anahtarı farklı
// olabilir — eşleme workspace-routes.ts'teki MODULE_KEY_BY_WORKSPACE'tedir.
export type WorkspaceKey =
  | 'b2b-outreach' | 'ai-copilot' | 'base' | 'sentos' | 'monitoring' | 'omnichannel'
  | 'logistics' | 'photo-studio' | 'sitehub' | 'shopify' | 'wms' | 'adshub' | 'sellingview'
  | 'partnerhub' | 'oem-matcher' | 'erpis' | 'trendyol';

// AdsHub'ın "Connect with X" dönüş yolu (bkz. AdsHubOAuthController.Callback)
// bu paneli tam sayfa yönlendirmeyle açar — Topbar mount olduğunda URL'deki
// ?oauthSession=...&platform=... çiftini buraya yazar, AdsHubWorkspace de
// açılışta OKUYUP TEMİZLER (tek kullanımlık — bkz. AdsHubWorkspace useEffect).
export interface PendingAdsHubOAuthSession {
  sessionId: string;
  platform: AdPlatform;
}

// Modülleri panel-durumu (activeWorkspace/open/close) üzerinden açan yol
// KALDIRILDI: her modülün artık gerçek bir rotası var (bkz. workspace-routes.ts,
// WorkspaceRoutePage) — açmak router.push(workspaceRoute(key)) demek, adres
// çubuğunda görünür ve paylaşılabilir. Bu store artık yalnızca AdsHub OAuth
// dönüşünün (yukarıdaki not) tek kullanımlık durumunu taşıyor.
interface WorkspacePanelState {
  pendingAdsHubOAuthSession: PendingAdsHubOAuthSession | null;
  setPendingAdsHubOAuthSession: (session: PendingAdsHubOAuthSession) => void;
  clearPendingAdsHubOAuthSession: () => void;
}

export const useWorkspacePanel = create<WorkspacePanelState>((set) => ({
  pendingAdsHubOAuthSession: null,
  setPendingAdsHubOAuthSession: (session) => set({ pendingAdsHubOAuthSession: session }),
  clearPendingAdsHubOAuthSession: () => set({ pendingAdsHubOAuthSession: null }),
}));
