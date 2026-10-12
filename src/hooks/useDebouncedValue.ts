import { useEffect, useState } from 'react';

// Arama kutularının her tuş vuruşunda ayrı bir backend isteği atmasını önler — Suppliers/
// RawMaterials/BOM ürün arama kutuları bunu paylaşır (bkz. code review bulgusu: her keystroke
// tam tablo taraması tetikliyordu).
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
