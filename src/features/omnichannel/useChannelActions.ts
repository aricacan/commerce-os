'use client';

import { useState } from 'react';
import { omnichannelApi, CHANNEL_STATUS, type ChannelDto } from '../../lib/api/omnichannel';
import { describeError } from '../../lib/errors';
import { useFeedback } from '../shared/Feedback';

export interface TestOutcome {
  ok: boolean;
  text: string;
}

// Backend yalnızca "kanalın konuşma geçmişi var" durumunda 409 döner.
const HAS_HISTORY_PREFIX = '409:';

// Kanal kartı eylemleri: sil (geçmiş varsa ikinci onay), aktif/pasif, bağlantı testi.
// Her başarılı değişiklikten sonra liste `reload` ile yenilenir.
export function useChannelActions(reload: () => Promise<void>) {
  const { notify, confirm } = useFeedback();
  const [testingId, setTestingId] = useState<number | null>(null);
  const [testResults, setTestResults] = useState<Record<number, TestOutcome>>({});

  const remove = async (channel: ChannelDto) => {
    const ok = await confirm({
      title: `"${channel.displayName}" kanalı silinsin mi?`,
      body: 'Kanal ve bağlantısı kalıcı olarak silinir. Konuşma geçmişi varsa ayrıca onay istenir; yalnızca durdurmak için kart menüsünden Pasife al\'ı seçin.',
      confirmLabel: 'Sil',
      danger: true,
    });
    if (!ok) return;

    try {
      await omnichannelApi.deleteChannel(channel.id);
      notify.success('Kanal silindi.');
      await reload();
    } catch (e) {
      if (e instanceof Error && e.message.startsWith(HAS_HISTORY_PREFIX)) {
        await removeWithHistory(channel);
        return;
      }
      notify.error(describeError(e));
    }
  };

  const removeWithHistory = async (channel: ChannelDto) => {
    const forceOk = await confirm({
      title: 'Kanalın mesaj geçmişi var',
      body: 'Bu kanala ait geçmiş konuşmalar ve mesajlar da silinsin mi?',
      confirmLabel: 'Geçmişiyle kalıcı sil',
      danger: true,
    });
    if (!forceOk) return;
    try {
      await omnichannelApi.deleteChannel(channel.id, true);
      notify.success('Kanal geçmişiyle birlikte silindi.');
      await reload();
    } catch (e) {
      notify.error(describeError(e));
    }
  };

  const toggleActive = async (channel: ChannelDto) => {
    try {
      await omnichannelApi.setChannelActive(channel.id, !channel.isActive);
      notify.success(channel.isActive ? 'Kanal pasife alındı.' : 'Kanal aktif edildi.');
      await reload();
    } catch (e) {
      notify.error(describeError(e));
    }
  };

  const testConnection = async (channel: ChannelDto) => {
    if (testingId !== null) return;
    setTestingId(channel.id);
    try {
      const result = await omnichannelApi.testChannelConnection(channel.id);
      const ok = result.status === CHANNEL_STATUS.Connected;
      setTestResults((prev) => ({
        ...prev,
        [channel.id]: { ok, text: ok ? 'Bağlantı başarılı.' : result.error ?? 'Bağlantı kurulamadı.' },
      }));
      await reload();
    } catch (e) {
      setTestResults((prev) => ({ ...prev, [channel.id]: { ok: false, text: describeError(e) } }));
    } finally {
      setTestingId(null);
    }
  };

  return { testingId, testResults, remove, toggleActive, testConnection };
}
