'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useI18n } from '../../lib/i18n';
import { PageHelpButton } from '../../features/tour/PageHelpButton';

export function InvoicingSubTabBar() {
  const pathname = usePathname();
  const { lang } = useI18n();
  const tr = lang === 'tr';

  const tabs = [
    { href: '/invoicing/ledger', label: tr ? 'Cari Hesap' : 'Ledger' },
    { href: '/invoicing/invoices', label: tr ? 'Faturalar' : 'Invoices' },
    { href: '/invoicing/delivery-notes', label: tr ? 'İrsaliyeler' : 'Delivery Notes' },
    { href: '/invoicing/billing-entities', label: tr ? 'Fatura Kesen Şirketler' : 'Billing Entities' },
    { href: '/invoicing/series', label: tr ? 'Fatura Serileri' : 'Invoice Series' },
    { href: '/invoicing/commercial-responses', label: tr ? 'Ticari Yanıt ve İtiraz' : 'Responses & Objections' },
    { href: '/invoicing/purchase-matching', label: tr ? '3-Yönlü Eşleştirme' : '3-Way Matching' },
    { href: '/invoicing/address-book', label: tr ? 'Adres Defteri' : 'Address Book' },
    { href: '/invoicing/envelopes', label: tr ? 'Zarflar' : 'Envelopes' },
    { href: '/invoicing/tax-codes', label: tr ? 'Vergi Kodları' : 'Tax Codes' },
    { href: '/invoicing/carriers', label: tr ? 'Kargo Firmaları' : 'Carriers' },
    { href: '/invoicing/settings', label: tr ? 'Fatura Ayarları' : 'Invoicing Settings' },
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
        <div data-tour="invoicing-subtabs" className="flex items-center gap-1 overflow-x-auto scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
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
