import type { KeyboardEvent } from 'react';

// WAI-ARIA ağaç klavye modeli (menü ve koleksiyon ağaçları ortak): ↑/↓ görünür düğümler arası, → aç / ilk alt öğeye,
// ← kapat / ebeveyne, Home/End ilk/son. Yalnız treeitem'ın kendisi odaktayken çalışır (içindeki kutularda yazmayı bozmaz).
// Düğümler `role="treeitem"`, `data-tree-key` ve (alt öğesi varsa) `aria-expanded` taşımalıdır.

const ITEM_SELECTOR = '[role="treeitem"]';

const isVisible = (element: HTMLElement) => element.closest('[inert]') === null;

export function handleTreeKeyDown(event: KeyboardEvent<HTMLElement>, onToggle: (key: string) => void): void {
  const current = event.target as HTMLElement;
  if (current.getAttribute('role') !== 'treeitem') return;
  const visible = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(ITEM_SELECTOR)).filter(isVisible);
  const index = visible.indexOf(current);
  const expanded = current.getAttribute('aria-expanded');
  const key = current.dataset.treeKey ?? '';

  const focusAt = (target: HTMLElement | null | undefined) => {
    if (!target) return;
    event.preventDefault();
    target.focus();
  };

  const toggleCurrent = () => {
    event.preventDefault();
    onToggle(key);
  };

  switch (event.key) {
    case 'ArrowDown': return focusAt(visible[index + 1]);
    case 'ArrowUp': return focusAt(visible[index - 1]);
    case 'Home': return focusAt(visible[0]);
    case 'End': return focusAt(visible[visible.length - 1]);
    case 'ArrowRight':
      if (expanded === 'false') return toggleCurrent();
      return focusAt(expanded === 'true' ? current.querySelector<HTMLElement>(ITEM_SELECTOR) : null);
    case 'ArrowLeft':
      if (expanded === 'true') return toggleCurrent();
      return focusAt(current.parentElement?.closest<HTMLElement>(ITEM_SELECTOR));
    default:
  }
}
