'use client';

import { useEffect, useState } from 'react';
import { CHANNEL_MEMBER_ROLE, omnichannelApi, type ChannelMemberDto } from '../../lib/api/omnichannel';

// "Sabit kişi" sorumlusu adayları: kanal ekibinin yazan üyeleri (sahip/temsilci; gözlemci olamaz).
// channelId yoksa (yeni kanal ya da politika seçili değil) istek atılmaz.
export function useFixedAgentCandidates(channelId: number | undefined): ChannelMemberDto[] {
  const [members, setMembers] = useState<ChannelMemberDto[]>([]);

  useEffect(() => {
    if (channelId === undefined) return;
    let cancelled = false;
    omnichannelApi.getChannelMembers(channelId)
      .then((list) => { if (!cancelled) setMembers(list.filter((m) => m.role !== CHANNEL_MEMBER_ROLE.Observer)); })
      // Ekip okunamazsa seçici boş kalır; kayıt sunucuda yine doğrulanır.
      .catch(() => { if (!cancelled) setMembers([]); });
    return () => { cancelled = true; };
  }, [channelId]);

  return channelId === undefined ? [] : members;
}
