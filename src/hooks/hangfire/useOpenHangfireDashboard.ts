'use client';

import { useCallback } from 'react';
import { hangfireDashboardLoginUrl } from '../../lib/api';
import { useCreateHangfireDashboardSession } from './useHangfirePanel';

// "Hangfire'da aç": tek kullanımlık kod alınır, API alan adındaki giriş kapısı yeni sekmede
// açılır (oturum çerezi orada, yalnız /hangfire yoluna yazılır).
//
// Sekme TIKLAMA ANINDA boş açılır, adres kod gelince verilir: await sonrasında çağrılan
// window.open tarayıcıların açılır pencere engelleyicisine takılıyor.
export function useOpenHangfireDashboard() {
  const { mutate: createSession, isPending } = useCreateHangfireDashboardSession();

  const open = useCallback((returnPath?: string) => {
    const tab = window.open('', '_blank');
    if (tab) tab.opener = null;

    createSession(undefined, {
      onSuccess: ({ code }) => {
        const url = hangfireDashboardLoginUrl(code, returnPath);
        if (tab) tab.location.href = url;
        else window.open(url, '_blank', 'noopener');
      },
      onError: () => tab?.close(),
    });
  }, [createSession]);

  return { open, isOpening: isPending };
}
