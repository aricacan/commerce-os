'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useI18n } from '../../lib/i18n';
import { PageHelpButton } from '../../features/tour/PageHelpButton';

export function PriceComparisonSubTabBar() {
  const pathname = usePathname();
  const { lang } = useI18n();
  const tr = lang === 'tr';

  const tabs = [
    { href: '/price-comparison/readiness', label: tr ? 'Veri Hazırlığı' : 'Data Readiness' },
    { href: '/price-comparison/competitors', label: tr ? 'Rakip Eşleştirme' : 'Competitor Matching' },
    { href: '/price-comparison/decisions', label: tr ? 'Fiyat Kararı' : 'Price Decision' },
    { href: '/price-comparison/prices', label: tr ? 'Kategori Fiyatları' : 'Category Prices' },
    { href: '/price-comparison/compare', label: tr ? 'Karşılaştırma' : 'Comparison' },
    { href: '/price-comparison/over-limit', label: tr ? 'Sınırı Aşanlar' : 'Over Limit' },
  ];

  return (
    <div className="flex shrink-0 items-center justify-between border-b border-[var(--border-soft)] bg-transparent px-4 py-1.5">
      <div data-tour="price-comparison-subtabs" className="flex shrink-0 gap-1 overflow-x-auto [-webkit-overflow-scrolling:touch] [scrollbar-width:none]">
        {tabs.map(({ href, label }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={`inline-flex h-7 shrink-0 items-center justify-center rounded-[3px] px-3 text-xs no-underline transition ${
                active
                  ? 'border border-[var(--border)] bg-[var(--bg-subtle)] font-bold text-[var(--fg)] shadow-xs'
                  : 'border border-transparent font-medium text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)]/40'
              }`}
            >
              {label}
            </Link>
          );
        })}
      </div>
      <PageHelpButton pageId="price-comparison" />
    </div>
  );
}
