// Klavye kısayolları — tek tanım noktası. Yardım penceresi (?) de buradan üretilir,
// böylece kısayol eklenince yardım listesi kendiliğinden güncellenir.
//
// Gmail/GitHub modeli: `g` sonra `s` → Siparişler. İki tuşlu diziler tek harfli
// kısayolların yazı alanlarıyla çakışmasını da azaltıyor.

import type { TranslationKey } from './translations/tr';

export interface SequenceShortcut {
  /** `g` sonrası basılacak tuş. */
  key: string;
  href: string;
  labelKey: TranslationKey;
}

/** `g` ile başlayan gezinme dizileri. */
export const GO_TO_SHORTCUTS: SequenceShortcut[] = [
  { key: 'd', href: '/dashboard',  labelKey: 'nav_dashboard' },
  { key: 's', href: '/orders',     labelKey: 'nav_orders' },
  { key: 'u', href: '/products',   labelKey: 'nav_products' },
  { key: 'k', href: '/products/categories/catalog', labelKey: 'nav_categories' },
  // SellingView'in artik kendi URL'i yok (diger Uygulamalar paneli gibi salt
  // workspace) - "g t" kisayolu bu yuzden kaldirildi, href tabanli degil.
  { key: 'f', href: '/finance/pnl', labelKey: 'nav_pnl' },
  { key: 'a', href: '/settings',   labelKey: 'nav_system' },
];

/** Dizi bekleme süresi — `g` basıp vazgeçen kullanıcı kilitli kalmasın. */
export const SEQUENCE_TIMEOUT_MS = 1200;

/**
 * Kısayol, yazı yazılan bir alandayken tetiklenmemeli.
 * contentEditable de dahil — zengin metin alanları input/textarea değil.
 */
export function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName?.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable;
}
