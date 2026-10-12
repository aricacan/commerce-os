import { NAV, isGroup } from '../../lib/nav-groups';
import type { TranslationKey } from '../../lib/translations/tr';

// Sayfa kullanımı yolu ↔ sol panel satırı.
//
// Sunucu yolu şablon hâlinde yazar (/orders/[id]); ekranın göstermesi gereken ise sol
// paneldeki ad ("Siparişler"). Eşleme ayrı bir listede TUTULMAZ, doğrudan NAV'dan türer:
// sol panele eklenen her sayfa burada da kendiliğinden görünür.

export interface NavPage {
  href: string;
  labelKey: TranslationKey;
  /** Üst grup (Siparişler, Ürünler…). Tek başına duran satırda (Pano) null. */
  groupKey: TranslationKey | null;
}

export const NAV_PAGES: readonly NavPage[] = NAV.flatMap<NavPage>((entry) =>
  isGroup(entry)
    ? entry.children.map((item) => ({ href: item.href, labelKey: item.key, groupKey: entry.key }))
    : [{ href: entry.href, labelKey: entry.key, groupKey: null }],
);

function matches(path: string, href: string): boolean {
  return path === href || path.startsWith(`${href}/`);
}

/**
 * Yolu, önek olarak en UZUN eşleşen sol panel satırına bağlar:
 * "/products/categories/rules" → Kategoriler (Ürünler değil). Eşleşme yoksa null.
 */
export function resolveNavPage(path: string, pages: readonly NavPage[] = NAV_PAGES): NavPage | null {
  let best: NavPage | null = null;
  for (const page of pages) {
    if (!matches(path, page.href)) continue;
    if (!best || page.href.length > best.href.length) best = page;
  }
  return best;
}
