'use client';

import { useCallback, useState } from 'react';
import { DEFAULT_BOARD_VIEW, parseBoardView, type BoardView } from './assignmentBoardRules';

const STORAGE_KEY = 'omnichannel:assignments-view';

// Tarayıcı depolaması kapalı olabilir (gizli pencere, engellenmiş site verisi): hata varsayılan görünüme düşer.
function readStoredView(): BoardView {
  try {
    return parseBoardView(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return DEFAULT_BOARD_VIEW;
  }
}

// Atananlar görünümü (Kişiye göre / Kanal ekipleri): son seçim bu tarayıcıda hatırlanır.
export function useStoredBoardView(): [BoardView, (view: BoardView) => void] {
  const [view, setView] = useState(readStoredView);

  const change = useCallback((next: BoardView) => {
    setView(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Kaydedilemezse seçim yalnız bu oturumda geçerli kalır.
    }
  }, []);

  return [view, change];
}
