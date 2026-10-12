'use client';

import { useEffect, useState } from 'react';
import { omnichannelApi, type ChannelDto } from '../../lib/api/omnichannel';
import { omnichannelCatalogApi, type CatalogProfileDto } from '../../lib/api/omnichannel-catalog';

// Ödeme yöntemi kapsamı olarak seçilebilen kanallar ve katalog profilleri. Biri alınamazsa
// (ör. ön yüz arka yüzden önce yayına çıktı) o liste boş kalır; ülke/marka kapsamları yine çalışır.
export function usePaymentTargets() {
  const [channels, setChannels] = useState<ChannelDto[]>([]);
  const [profiles, setProfiles] = useState<CatalogProfileDto[]>([]);

  useEffect(() => {
    let cancelled = false;
    void Promise.allSettled([omnichannelApi.getChannels(), omnichannelCatalogApi.getProfiles()]).then(
      ([channelResult, profileResult]) => {
        if (cancelled) return;
        if (channelResult.status === 'fulfilled') setChannels(channelResult.value);
        if (profileResult.status === 'fulfilled') setProfiles(profileResult.value);
      },
    );
    return () => { cancelled = true; };
  }, []);

  return { channels, profiles };
}
