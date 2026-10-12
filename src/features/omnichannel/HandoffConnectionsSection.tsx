'use client';

import { useEffect, useState } from 'react';
import { Plug } from 'lucide-react';
import {
  handoffDeliveryApi, toSaveBody,
  type HandoffDeliverySettingsDto, type HandoffDeliverySettingsSaveBody,
} from '../../lib/api/omnichannel-handoff-delivery';
import { describeError } from '../../lib/errors';
import { useFeedback } from '../shared/Feedback';
import { HandoffSlackCard } from './HandoffSlackCard';
import { HandoffSmtpCard } from './HandoffSmtpCard';

// Hesap geneli › Devir bildirim bağlantıları: devir bildirimlerinin kendi SMTP / Slack hesabı.
// Her kart yalnız kendi alanlarını kaydeder; diğer kartın kayıtlı değerleri korunur.
export function HandoffConnectionsSection() {
  const [settings, setSettings] = useState<HandoffDeliverySettingsDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { notify } = useFeedback();

  useEffect(() => {
    handoffDeliveryApi.get().then(setSettings).catch((e: unknown) => setError(describeError(e)));
  }, []);

  const save = async (patch: Partial<HandoffDeliverySettingsSaveBody>): Promise<boolean> => {
    if (!settings) return false;
    setSaving(true);
    try {
      setSettings(await handoffDeliveryApi.save({ ...toSaveBody(settings), ...patch }));
      notify.success('Bağlantı ayarları kaydedildi.');
      return true;
    } catch (e) {
      notify.error(describeError(e));
      return false;
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="flex w-full flex-1 flex-col gap-3 p-4 text-xs sm:p-5">
      <div>
        <div className="flex items-center gap-2">
          <Plug size={16} className="text-[var(--fg-muted)]" />
          <h2 className="text-sm font-bold text-[var(--fg)]">Devir bildirim bağlantıları</h2>
        </div>
        <p className="mt-0.5 text-[11px] text-[var(--fg-muted)]">
          Devir bildirimleri için ayrı e-posta ve Slack hesabı. Doldurulmazsa sistemin genel e-posta/Slack ayarı kullanılır.
        </p>
      </div>

      {error && <div className="rounded-[4px] border border-rose-500/30 bg-rose-500/10 p-3 text-rose-500">{error}</div>}
      {!settings && !error && <div className="py-4 text-center text-[var(--fg-muted)]">Bağlantılar yükleniyor…</div>}

      {settings && (
        <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-2">
          <HandoffSmtpCard settings={settings} saving={saving} onSave={save} />
          <HandoffSlackCard settings={settings} saving={saving} onSave={save} />
        </div>
      )}
    </section>
  );
}
