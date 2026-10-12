'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useCommandPalette } from '../stores/command-palette';
import { useHelpModal } from '../stores/help-modal';
import { GO_TO_SHORTCUTS, SEQUENCE_TIMEOUT_MS, isTypingTarget } from '../lib/shortcuts';

// Uygulama genelindeki tek klavye dinleyicisi. Tek yerde olması önemli: birden fazla
// bileşen `keydown` dinlerse aynı tuş iki iş birden yapar ve hangisinin kazandığı
// mount sırasına bağlı hale gelir.
//
// Kısayollar:
//   Ctrl/Cmd+K → komut paleti (yazı alanında da çalışır, arama kutusundan da açılsın)
//   g sonra X  → sayfaya git (bkz. GO_TO_SHORTCUTS)
//   /          → komut paletini arama modunda aç
//   ? / F1     → kısayol ve yardım modalı
//   Escape     → açık pencereyi kapat
export function useKeyboardShortcuts(): { helpOpen: boolean; closeHelp: () => void } {
  const router = useRouter();
  const helpOpen = useHelpModal((s) => s.open);
  const closeHelp = useHelpModal((s) => s.close);
  const pendingGoRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // Ctrl/Cmd+K yazı alanında DA çalışmalı — diğer kontrollerden önce.
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        useCommandPalette.getState().toggle();
        return;
      }

      // F1 ile yardım penceresi
      if (e.key === 'F1') {
        e.preventDefault();
        useHelpModal.getState().toggle();
        return;
      }

      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;

      if (e.key === 'Escape') {
        if (useHelpModal.getState().open) {
          useHelpModal.getState().close();
          return;
        }
      }

      // `g` bekliyorsak bu tuş hedef sayfayı seçer.
      if (pendingGoRef.current) {
        clearTimeout(pendingGoRef.current);
        pendingGoRef.current = null;
        const match = GO_TO_SHORTCUTS.find((s) => s.key === e.key.toLowerCase());
        if (match) { e.preventDefault(); router.push(match.href); }
        return;
      }

      if (e.key.toLowerCase() === 'g') {
        e.preventDefault();
        // Süre dolarsa dizi iptal — kullanıcı `g` basıp vazgeçtiyse takılı kalmasın.
        pendingGoRef.current = setTimeout(() => { pendingGoRef.current = null; }, SEQUENCE_TIMEOUT_MS);
        return;
      }

      if (e.key === '/') { e.preventDefault(); useCommandPalette.getState().setOpen(true); return; }
      if (e.key === '?') { e.preventDefault(); useHelpModal.getState().toggle(); }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (pendingGoRef.current) clearTimeout(pendingGoRef.current);
    };
  }, [router]);

  return { helpOpen, closeHelp };
}
