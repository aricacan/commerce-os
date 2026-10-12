import { useEffect } from 'react';
import { usePageShortcutsStore, type Shortcut } from '../stores/page-shortcuts';

export function useRegisterPageShortcuts(shortcuts: Shortcut[]) {
  const setShortcuts = usePageShortcutsStore((s) => s.setShortcuts);
  const clearShortcuts = usePageShortcutsStore((s) => s.clearShortcuts);

  useEffect(() => {
    setShortcuts(shortcuts);
    return () => clearShortcuts();
  }, [shortcuts, setShortcuts, clearShortcuts]);
}
