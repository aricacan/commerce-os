'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { omnichannelEvalApi, type BotPipelinesDto } from '../../lib/api/omnichannel-eval';
import { botPipelinesApi, type BotPipelineChannelDto } from '../../lib/api/omnichannel-pipelines';

export interface BotVersionOverview {
  pipelines: BotPipelinesDto | null;
  // null = liste alınamadı (eski backend ya da hata): rozet hesap varsayılanıyla yetinir.
  channels: BotPipelineChannelDto[] | null;
  reload: () => void;
}

// Rozetin verisi. İki istek birbirinden bağımsızdır: biri düşerse (ör. kanal ucu henüz yok) diğeri yine gösterilir.
// Rozet bilgi amaçlı olduğu için hata gösterilmez, sessizce eksik kalır.
export function useBotVersionOverview(): BotVersionOverview {
  const [pipelines, setPipelines] = useState<BotPipelinesDto | null>(null);
  const [channels, setChannels] = useState<BotPipelineChannelDto[] | null>(null);
  const requestId = useRef(0);

  const reload = useCallback(() => {
    const id = ++requestId.current;
    const isCurrent = () => id === requestId.current;
    omnichannelEvalApi.getPipelines()
      .then((value) => { if (isCurrent()) setPipelines(value); })
      .catch(() => { if (isCurrent()) setPipelines(null); });
    botPipelinesApi.getChannels()
      .then((value) => { if (isCurrent()) setChannels(value); })
      .catch(() => { if (isCurrent()) setChannels(null); });
  }, []);

  useEffect(() => {
    reload();
    // Sayfadan çıkınca geç dönen yanıt yazılmasın.
    return () => { requestId.current += 1; };
  }, [reload]);

  return { pipelines, channels, reload };
}
