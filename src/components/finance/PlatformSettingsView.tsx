'use client';

import { VatModeCard } from './VatModeCard';
import { ChannelFeesCard } from './ChannelFeesCard';

// Finans → Platform ayarları: KDV davranışı ve kanal (ERP × pazaryeri × marka) kesintileri.
// Tüm kanallar tek tabloda; üstteki ERP seçicisi bu sayfada gizli (bkz. topbar-config).
export function PlatformSettingsView() {
  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="flex flex-col gap-4 p-4 md:p-6">
        <div data-tour="platforms-vat"><VatModeCard /></div>
        <ChannelFeesCard />
      </div>
    </div>
  );
}
