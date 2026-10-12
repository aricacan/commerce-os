'use client';

// ⚠️ BU BILESEN SU AN HICBIR YERDEN RENDER EDILMIYOR (3 Eyl 2026 olu-kod taramasi).
//
// Mobil alt gezinme cubugu. Sol panelin mobil karsiligiydi.
//
// SILINMEDI cunku kullaniciya gorunen bir OZELLIGI temsil ediyor ve kaldirilmasinin
// bilincli mi kazara mi oldugu belirsiz. Mobil yeniden tasarim sirasinda eklenmisti; bugun mobilde gezinme yalnizca Topbar uzerinden yapiliyor.
//
// Karar verilene kadar burada duruyor. Kullanilmayacaksa silinmeli — dosyayi
// yorumla birlikte birakmak, ozelligin var oldugu yanilgisini surdurur.

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutGrid } from 'lucide-react';
import { useI18n } from '../../lib/i18n';
import { findGroup, type NavGroup } from '../../lib/nav-groups';
import { GroupSheet } from '../ui/GroupSheet';
import type { TranslationKey } from '../../lib/translations/tr';

// Sıra: sol iki, ortada belirgin Kontrol Paneli, sağda iki — kullanıcı isteğiyle sabitlendi.
const LEFT_GROUP_KEYS: TranslationKey[] = ['nav_system', 'nav_operations'];
const RIGHT_GROUP_KEYS: TranslationKey[] = ['nav_finance', 'nav_analytics'];

function groupIsActive(group: NavGroup, pathname: string): boolean {
  return group.children.some((c) => pathname.startsWith(c.href.split('?')[0]));
}

export function BottomNav() {
  const pathname = usePathname();
  const { t } = useI18n();
  const [openGroupKey, setOpenGroupKey] = useState<TranslationKey | null>(null);

  // Pano artık üç rota: seçici (/dashboard) ve iki görünüm. Üçünde de sekme aktif kalmalı.
  const dashboardActive = pathname === '/dashboard' || pathname.startsWith('/dashboard/');
  const openGroup = openGroupKey ? findGroup(openGroupKey) : undefined;

  function renderGroupButton(key: TranslationKey) {
    const group = findGroup(key);
    if (!group) return null;
    const active = groupIsActive(group, pathname);
    const isOpen = openGroupKey === key;
    const highlighted = active || isOpen;
    return (
      <button
        key={key}
        onClick={() => setOpenGroupKey(isOpen ? null : key)}
        aria-expanded={isOpen}
        className={`flex flex-1 cursor-pointer flex-col items-center justify-center gap-[3px] border-none bg-transparent pt-2.5 text-ui-2xs transition-colors ${
          highlighted ? 'font-bold text-[var(--accent)]' : 'font-normal text-[var(--sidebar-fg-muted)]'
        }`}
      >
        <group.Icon size={20} strokeWidth={highlighted ? 2.2 : 1.5} />
        <span>{t(key)}</span>
      </button>
    );
  }

  return (
    <>
      {openGroup && <GroupSheet group={openGroup} onClose={() => setOpenGroupKey(null)} />}

      {/* Yükseklik ve alt boşluk telefonun çentik/ev-çubuğu alanını (safe-area) hesaba katar,
          yoksa iPhone'da butonlar ev çubuğunun altında kalıyor. */}
      <nav className="fixed inset-x-0 bottom-0 z-50 flex h-[calc(60px+env(safe-area-inset-bottom))] items-start border-t border-[var(--border)] bg-[var(--sidebar)] pb-[env(safe-area-inset-bottom)]">
        {LEFT_GROUP_KEYS.map(renderGroupButton)}

        {/* Kontrol Paneli — ortada, diğerlerinden belirgin şekilde yükseltilmiş */}
        <Link href="/dashboard" className="flex flex-1 flex-col items-center justify-start gap-1 no-underline">
          <span className="-mt-[22px] flex h-[52px] w-[52px] items-center justify-center rounded-full border-4 border-[var(--sidebar)] bg-[linear-gradient(135deg,var(--accent),var(--accent-h))] shadow-[0_6px_16px_rgba(229,37,33,0.4)]">
            <LayoutGrid size={24} strokeWidth={2.2} className="text-white" />
          </span>
          <span
            className={`-mt-0.5 text-ui-2xs font-extrabold ${
              dashboardActive ? 'text-[var(--accent)]' : 'text-[var(--sidebar-fg)]'
            }`}
          >
            {t('nav_dashboard')}
          </span>
        </Link>

        {RIGHT_GROUP_KEYS.map(renderGroupButton)}
      </nav>
    </>
  );
}
