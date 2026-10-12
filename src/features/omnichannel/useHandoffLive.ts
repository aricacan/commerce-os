'use client';

import { useEffect, useRef, useState } from 'react';
import { omnichannelApi } from '../../lib/api/omnichannel';
import { useOmnichannelHub } from './useOmnichannelHub';

// Bir dalgada gelen olaylar (toplu atama, SLA turu) tek tazelemede birleşir.
const REFRESH_DEBOUNCE_MS = 800;
const noop = () => undefined;

// Devirler ve Atananlar ekranlarının canlı güncellemesi (FAZ 7): görülebilen kanalların "HandoffChanged" olayında
// onChange tetiklenir. Bağlantı yeniden kurulunca da tazelenir (aradaki olaylar oynatılmaz).
export function useHandoffLive(onChange: () => void): void {
  const [channelIds, setChannelIds] = useState<number[]>([]);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    omnichannelApi.getMyChannels()
      .then((channels) => { if (!cancelled) setChannelIds(channels.map((c) => c.id)); })
      // Kanal listesi alınamazsa canlı güncelleme yok; ekran elle/yeniden açılışla tazelenir.
      .catch(noop);
    return () => { cancelled = true; };
  }, []);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const schedule = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onChangeRef.current(), REFRESH_DEBOUNCE_MS);
  };

  useOmnichannelHub(channelIds, {
    onMessage: noop,
    onStatusChanged: noop,
    onConversationUpdated: noop,
    onHandoffChanged: schedule,
    onReconnected: schedule,
  });
}
