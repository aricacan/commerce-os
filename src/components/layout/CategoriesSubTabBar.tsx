'use client';

/**
 * Kategoriler bölümünün alt sekme çubuğu.
 *
 * Eskiden bu dört ekran tek sayfada `?tab=` query paramıyla değişiyordu; her sekmenin
 * kendi URL'i olmadığı için ne derin link verilebiliyor ne de tarayıcı geçmişi
 * doğru çalışıyordu. Artık her sekme gerçek bir rota (bkz. products/categories/*).
 *
 * TEK KAYNAK: sekme listesi de etiketleri de nav-groups.ts'ten gelir (sectionTabItems).
 * Burada elle liste tutmak, sol paneldeki adla sekme adının ayrışmasına yol açıyordu.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useI18n } from '../../lib/i18n';
import { sectionTabItems } from '../../lib/nav-groups';

const SECTION_HREF = '/products/categories';

export function CategoriesSubTabBar() {
  const pathname = usePathname();
  const { t } = useI18n();
  const tabs = sectionTabItems(SECTION_HREF);

  return (
    <div className="flex shrink-0 items-center gap-1.5 overflow-x-auto [-webkit-overflow-scrolling:touch] [scrollbar-width:none]">
      {tabs.map(({ href, key, Icon }) => {
        const active = pathname === href || pathname.startsWith(href + '/');
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={`flex shrink-0 items-center gap-1.5 rounded-[4px] px-3 py-1.5 text-ui-xs font-bold transition ${
              active
                ? 'bg-[var(--card)] text-[var(--fg)] shadow-xs border border-[var(--border)]'
                : 'border border-transparent text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)]'
            }`}
          >
            <Icon size={13} />
            <span>{t(key)}</span>
          </Link>
        );
      })}
    </div>
  );
}
