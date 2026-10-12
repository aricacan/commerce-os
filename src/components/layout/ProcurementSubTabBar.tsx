'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useI18n } from '../../lib/i18n';
import { PageHelpButton } from '../../features/tour/PageHelpButton';

export function ProcurementSubTabBar() {
  const pathname = usePathname();
  const { lang } = useI18n();
  const tr = lang === 'tr';

  const tabs = [
    { href: '/purchase-orders', label: tr ? 'Satın Alma Siparişleri' : 'Purchase Orders' },
    { href: '/suppliers', label: tr ? 'Tedarikçiler' : 'Suppliers' },
    { href: '/raw-materials', label: tr ? 'Hammaddeler' : 'Raw Materials' },
    { href: '/bom', label: tr ? 'Ürün Reçeteleri' : 'Bill of Materials' },
  ];

  function isActive(href: string) {
    const cleanPath = pathname.split('?')[0];
    const cleanHref = href.split('?')[0];
    if (cleanPath === cleanHref) return true;
    if (cleanPath.startsWith(cleanHref + '/')) return true;
    return false;
  }

  return (
    <div className="relative shrink-0 border-b border-[var(--border-soft)] bg-transparent px-4">
      <div className="flex items-center justify-between gap-3">
        <div data-tour="procurement-subtabs" className="flex items-center gap-1 overflow-x-auto scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {tabs.map((tab) => {
            const active = isActive(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`shrink-0 px-3.5 py-2.5 text-xs font-semibold whitespace-nowrap transition-all border-b-2 -mb-[1px] no-underline ${
                  active
                    ? 'border-[var(--fg)] text-[var(--fg)] font-bold'
                    : 'border-transparent text-[var(--fg-muted)] hover:text-[var(--fg)]'
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
        <div className="shrink-0 py-1.5">
          <PageHelpButton />
        </div>
      </div>
    </div>
  );
}
