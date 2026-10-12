'use client';

import { useCallback, useState } from 'react';
import { INBOX_PAGE_SIZE, parseInboxPageSize } from './inboxPagination';

const STORAGE_KEY = 'omnichannel:inbox-page-size';

// Tarayıcı depolaması kapalı/dolu olabilir (gizli pencere, kota): okuma ya da yazma hatası listeyi bozmaz.
function readStoredPageSize(): number {
  try {
    return parseInboxPageSize(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return INBOX_PAGE_SIZE;
  }
}

// Gelen kutusunun sayfa boyutu (25/50/100): kullanıcının tercihi bu tarayıcıda hatırlanır.
export function useInboxPageSize(): [number, (size: number) => void] {
  const [pageSize, setPageSize] = useState(readStoredPageSize);

  const change = useCallback((size: number) => {
    const next = parseInboxPageSize(String(size));
    setPageSize(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, String(next));
    } catch {
      // Kaydedilemezse yalnız bu oturumda geçerli kalır.
    }
  }, []);

  return [pageSize, change];
}
