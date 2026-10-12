'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useI18n } from '../../lib/i18n';
import { PageHelpButton } from '../../features/tour/PageHelpButton';

export function AccountingSubTabBar() {
  const pathname = usePathname();
  const { lang } = useI18n();
  const tr = lang === 'tr';

  const tabs = [
    { href: '/accounting/chart-of-accounts', label: tr ? 'Hesap Planı' : 'Chart of Accounts' },
    { href: '/accounting/journal-entries', label: tr ? 'Muhasebe Fişleri' : 'Journal Entries' },
    { href: '/accounting/trial-balance', label: tr ? 'Mizan' : 'Trial Balance' },
    { href: '/accounting/vat-summary', label: tr ? 'KDV Özeti' : 'VAT Summary' },
    { href: '/accounting/e-ledger', label: tr ? 'e-Defter Özeti' : 'e-Ledger' },
    { href: '/accounting/e-archive-daily-report', label: tr ? 'e-Arşiv Günlük Rapor' : 'e-Archive Daily Report' },
    { href: '/accounting/marketplace-reconciliation', label: tr ? 'Pazaryeri Mutabakatı' : 'Marketplace Reconciliation' },
    { href: '/accounting/settings', label: tr ? 'Muhasebe Ayarları' : 'Ledger Settings' },
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
        <div data-tour="accounting-subtabs" className="flex items-center gap-1 overflow-x-auto scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
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
