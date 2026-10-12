'use client';

import { useState } from 'react';
import { PermissionsWorkspace } from '../../../../features/system/PermissionsWorkspace';
import { RolesWorkspace } from '../../../../features/system/RolesWorkspace';

// İki ayrı yetki sistemi BİLEREK yan yana:
//   Sayfa Yetkileri  → kullanıcı bu sayfayı GÖREBİLİR mi (PagePermission, sidebar bunu okur)
//   Roller ve İzinler → sayfayı gören kullanıcı orada NE YAPABİLİR (Permission/RolePermission)
// İkincisi FAZ 1'de eklendi; birincisi kaldırılmadı çünkü sidebar hâlâ ona bağlı.
type Tab = 'pages' | 'roles';

const TABS: ReadonlyArray<{ id: Tab; label: string }> = [
  { id: 'pages', label: 'Sayfa Yetkileri' },
  { id: 'roles', label: 'Roller ve İzinler' },
];

export default function SystemPermissionsPage() {
  const [tab, setTab] = useState<Tab>('pages');

  return (
    <div className="flex h-full flex-col overflow-hidden bg-transparent">
      {/* Top Section Tabs */}
      <div className="flex shrink-0 items-center gap-1.5 border-b border-[var(--border-soft)] bg-[var(--card)] px-4 py-2">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            aria-current={tab === item.id ? 'page' : undefined}
            className={`flex shrink-0 items-center gap-1.5 rounded-[4px] px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
              tab === item.id
                ? 'bg-[var(--card)] text-[var(--fg)] shadow-xs border border-[var(--border)]'
                : 'border border-transparent text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)]'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Workspace Content */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5">
        {tab === 'pages' ? <PermissionsWorkspace /> : <RolesWorkspace />}
      </div>
    </div>
  );
}
