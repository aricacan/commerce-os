'use client';

import { useState } from 'react';
import { Hash } from 'lucide-react';
import {
  handoffDeliveryApi, type HandoffDeliverySettingsDto, type HandoffDeliverySettingsSaveBody,
} from '../../lib/api/omnichannel-handoff-delivery';
import { inputClass, labelClass, primaryButtonClass } from './formClasses';
import { ConnectionCard, SecretField, TestRow } from './HandoffConnectionParts';

interface Props {
  settings: HandoffDeliverySettingsDto;
  saving: boolean;
  onSave: (patch: Partial<HandoffDeliverySettingsSaveBody>) => Promise<boolean>;
}

// Devir Slack mesajlarının kendi bot token'ı. Token yoksa sistemin genel Slack botu kullanılır.
export function HandoffSlackCard({ settings, saving, onSave }: Props) {
  const [token, setToken] = useState('');
  const [clearToken, setClearToken] = useState(false);
  const [defaultChannel, setDefaultChannel] = useState(settings.slackDefaultChannelId ?? '');

  const submit = async () => {
    const ok = await onSave({
      slackBotToken: token.trim() || null,
      clearSlackToken: clearToken,
      slackDefaultChannelId: defaultChannel.trim() || null,
    });
    if (!ok) return;
    setToken('');
    setClearToken(false);
  };

  return (
    <ConnectionCard title="Slack" icon={<Hash size={14} className="text-[var(--fg-muted)]" />} custom={settings.usesCustomSlack}>
      <SecretField label="Bot token" value={token} onChange={setToken} stored={settings.hasSlackToken}
        clear={clearToken} onClearChange={setClearToken} placeholder="xoxb-…" />

      <div>
        <label className={labelClass}>Varsayılan kanal</label>
        <input value={defaultChannel} onChange={(e) => setDefaultChannel(e.target.value)}
          placeholder="C0123ABCD" className={`${inputClass} font-mono`} />
        <div className="mt-1 text-[10.5px] text-[var(--fg-muted)]">
          Test mesajı kanal yazılmazsa buraya gider. Bot (chat:write izniyle) hedef kanallara eklenmiş olmalı.
        </div>
      </div>

      <div className="flex justify-end">
        <button type="button" onClick={() => void submit()} disabled={saving} className={primaryButtonClass}>
          {saving ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
      </div>

      <TestRow placeholder="Kanal kimliği (boşsa varsayılan kanal)" buttonLabel="Test mesajı gönder"
        successMessage="Test mesajı Slack'e gönderildi." onTest={(channel) => handoffDeliveryApi.testSlack(channel || null)} />
    </ConnectionCard>
  );
}
