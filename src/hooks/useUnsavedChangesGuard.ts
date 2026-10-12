'use client';

import { useCallback, useState } from 'react';

export interface UnsavedChangesGuard {
  /** Panel icerigine `onDirtyChange` olarak verilir. setState oldugu icin referansi kararlidir. */
  setDirty: (dirty: boolean) => void;
  /** Panelin `onClose`'u. Kirliyse kapatmaz, once onay diyalogunu acar. */
  requestClose: () => void;
  /** Onay diyalogu goruntuleniyor mu. */
  confirmOpen: boolean;
  /** "Vazgec ve kapat" — degisiklikler atilir. */
  confirmDiscard: () => void;
  /** "Duzenlemeye don" — panel acik kalir. */
  cancelDiscard: () => void;
}

/**
 * URL degistirmeden acilan tam ekran calisma panelleri (FullScreenPanel) icin
 * kaydedilmemis degisiklik korumasi.
 *
 * Neden ayri hook: ayni akis hem Siparisler hem Urunler sayfasinda gerekiyor; mantigi
 * tek yerde tutmak iki sayfada kopyalamaktan iyi.
 *
 * @param close Paneli gercekten kapatan fonksiyon. KARARLI olmali (useCallback).
 */
export function useUnsavedChangesGuard(close: () => void): UnsavedChangesGuard {
  const [dirty, setDirty] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const requestClose = useCallback(() => {
    if (dirty) {
      setConfirmOpen(true);
      return;
    }
    close();
  }, [dirty, close]);

  const confirmDiscard = useCallback(() => {
    setConfirmOpen(false);
    setDirty(false);
    close();
  }, [close]);

  const cancelDiscard = useCallback(() => setConfirmOpen(false), []);

  return { setDirty, requestClose, confirmOpen, confirmDiscard, cancelDiscard };
}
