'use client';

import { useEffect, useState } from 'react';
import { omnichannelApi } from '../../lib/api/omnichannel';
import type { ChannelTeamSettings } from './channelTeamRules';

// "Kanal ekipleri" kartlarındaki SLA ve "Sabit kişi" yedek davranışı kanal ayarlarından gelir (ekip özeti bunları
// taşımaz). Uç erişilemezse (yetki, eski backend) boş harita: kartlar bu alanları göstermeden çalışır.
export function useChannelTeamSettings(): ReadonlyMap<number, ChannelTeamSettings> {
  const [settings, setSettings] = useState<ReadonlyMap<number, ChannelTeamSettings>>(new Map());
  useEffect(() => {
    let cancelled = false;
    omnichannelApi.getChannels()
      .then((channels) => {
        if (cancelled) return;
        setSettings(new Map(channels.map((c) => [c.id, {
          fixedAgentFallback: c.fixedAgentFallback, firstResponseSlaMinutes: c.firstResponseSlaMinutes,
        }])));
      })
      .catch(() => { if (!cancelled) setSettings(new Map()); });
    return () => { cancelled = true; };
  }, []);
  return settings;
}
