'use client';

import { CHANNEL_TYPE, type ChannelType } from '../../lib/api/omnichannel';
import { MetaPagesConnectButton } from './MetaPagesConnect';
import { WhatsAppConnectButton, type ChannelConnectSettings } from './WhatsAppEmbeddedSignup';

interface Props {
  type: ChannelType;
  /** Kapsam alanlarında seçilen ülke / mağaza / katalog / marka: bağlanan kanal bunlarla açılır. */
  settings: ChannelConnectSettings;
  onConnected: () => Promise<void> | void;
}

// Önerilen yol: Meta ile tek tıkla bağlama. Kimlik ve anahtarlar elle girilmez.
export function ChannelConnectSection({ type, settings, onConnected }: Props) {
  return (
    <div className="flex flex-col gap-2 rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)]/40 p-3">
      <div className="text-[10px] text-[var(--fg-muted)]">
        Yukarıdaki ülke ve kaynak seçimiyle bağlanır; kimlik ve anahtarları elle girmenize gerek kalmaz.
      </div>
      {type === CHANNEL_TYPE.WhatsApp
        ? <WhatsAppConnectButton onConnected={onConnected} settings={settings} />
        : <MetaPagesConnectButton onConnectedAction={onConnected} settings={settings} />}
    </div>
  );
}
