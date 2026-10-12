'use client';

import type { LucideIcon } from 'lucide-react';
import { palette, softTint } from '../features/shared/design';
import { moduleLogo } from '../components/ui/ModuleLogos';
import { useModuleAccess } from './useModuleAccess';
import { useModuleCatalog } from './useModuleCatalog';
import type { WorkspaceKey } from '../stores/workspace-panel';
import { TAB_GATED_WORKSPACES, workspaceKeyOfModule } from '../lib/workspace-routes';

// Uygulama kataloğu — LİSTE ARTIK BACKEND'DEN GELİR (bkz. useModuleCatalog).
//
// Önceden burada elle yazılmış 17 satırlık bir liste vardı ve backend'in modül kataloğuyla
// aynı değildi: Sonar menüde görünüyordu ama kapatılamıyordu, warehouse/forecast/partnerhub
// ne kapatılabiliyor ne kısıtlanabiliyordu. Burada kalan TEK şey ikon eşlemesi — ikon
// backend'e ait bir bilgi değil.

export type AppTone = 'module' | 'admin';

export interface AppEntry {
  key: string;
  name: string;
  /** Kartın altındaki tek cümlelik "ne işe yarar" açıklaması. */
  description: string;
  /** Üye bazlı erişim — false ise kart kilitli görünür (gizlenmez). */
  allowed: boolean;
  /** Günlük iş modülü mü, yönetici aracı mı — panelde gruplamayı bu belirler. */
  tone: AppTone;
  iconBg: string;
  iconColor: string;
  Icon: LucideIcon;
  workspaceKey: WorkspaceKey;
}

const TONE_STYLE: Record<AppTone, { iconBg: string; iconColor: string }> = {
  // Renk MODÜLÜ değil DURUMU anlatır: aksan = çalışan modül, gri = yönetici aracı.
  module: { iconBg: softTint(palette.accent, 14), iconColor: palette.accent },
  admin: { iconBg: palette.chipBg, iconColor: palette.textMuted },
};

// Modül anahtarı → logo: components/ui/ModuleLogos.tsx (tanımsız modül jenerik ikonla çıkar;
// eksik logo yüzünden modülün menüden DÜŞMESİ, listeyi ikinci bir kaynağa bağlamak olurdu).

export function useAppCatalog(): AppEntry[] {
  const { isModuleAllowed } = useModuleAccess();
  const { enabled } = useModuleCatalog();

  // SIRA backend'deki ModuleRegistry sırasıdır: günlük işten altyapıya. En çok tıklanan en az
  // yol gitsin diye sık kullanılanlar üstte, yönetici araçları en altta.
  //
  // KAPALI modül listede HİÇ yer almaz (kilitli değil, gizli) — `enabled` zaten kiracı bazlı
  // süzülmüş geliyor. Üye bazlı erişim (allowed) ise kartı KİLİTLİ gösterir: iki ayrı kavram.
  return enabled
    .filter((entry) => entry.kind === 'Workspace' || entry.kind === 'AdminTool' || entry.kind === 'Hub')
    .flatMap((entry) => {
      const workspaceKey = workspaceKeyOfModule(entry.key);
      // Rotası çözülemeyen modülü kart olarak göstermek, tıklayınca hiçbir yere gitmeyen
      // bir kutu demekti.
      if (workspaceKey === null) return [];

      const tone: AppTone = entry.kind === 'AdminTool' ? 'admin' : 'module';
      return [{
        key: entry.key,
        name: entry.displayName,
        description: entry.description,
        // Hub'da kilit sekme bazındadır (bkz. TAB_GATED_WORKSPACES): kart açık, hub içini süzer.
        allowed: TAB_GATED_WORKSPACES.has(workspaceKey) || isModuleAllowed(entry.key),
        tone,
        Icon: moduleLogo(entry.key),
        workspaceKey,
        ...TONE_STYLE[tone],
      }];
    });
}
