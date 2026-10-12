'use client';

import { useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';
import { useI18n } from '../../lib/i18n';
import { usePagePermissions } from '../../hooks/usePagePermissions';
import { BottomSheet } from './BottomSheet';
import type { NavGroup } from '../../lib/nav-groups';

// Bir sidebar grubunun alt sayfalarını mobilde ızgara olarak gösterir.
// Panel iskeleti (arka plan, sürükleyerek kapatma, Escape) BottomSheet'te —
// burada yalnızca içerik var.
const TILE_COLORS = ['#3b82f6', '#a855f7', '#ef4444', '#10b981', '#f59e0b', '#0ea5e9', '#ec4899', '#84cc16'];

export function GroupSheet({ group, onClose }: { group: NavGroup; onClose: () => void }) {
  const router = useRouter();
  const { t } = useI18n();
  const { isAllowed } = usePagePermissions();

  function go(href: string) {
    onClose();
    router.push(href);
  }

  return (
    <BottomSheet open onClose={onClose} title={t(group.key)} aboveBottomNav>
      {/* Bölümlü grup (Ayarlar, 15 madde) mobilde tek bir 15'li ızgara olarak taranamıyordu;
          bölüm başlıklarıyla ayrılıyor. Bölümsüz gruplar tek ızgara olarak çizilmeye devam
          eder — sections yoksa grubun tamamı tek isimsiz bölüm gibi ele alınır. */}
      {(group.sections ?? [{ key: group.key, children: group.children }]).map((section) => (
        <div key={section.key}>
          {group.sections && (
            <div className="px-5 pt-2 pb-1.5 text-ui-xs font-bold tracking-wide text-[var(--fg-muted)] uppercase">
              {t(section.key)}
            </div>
          )}
          <div className="grid grid-cols-3 gap-2.5 px-4 pb-2">
            {section.children.map((item, i) => {
              const locked = !isAllowed(item.pageKey);
              const color = TILE_COLORS[i % TILE_COLORS.length];
              return (
                <button
                  key={item.href}
                  onClick={() => { if (!locked) go(item.href); }}
                  title={locked ? t('nav_locked_hint') : undefined}
                  aria-disabled={locked}
                  className={`flex flex-col items-center gap-2 rounded-[14px] border border-[var(--border)] bg-[var(--bg-subtle)] px-2 py-3.5 text-center transition-colors ${
                    locked ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                  }`}
                >
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]"
                    style={{ background: `${color}22` }}
                  >
                    {locked ? <Lock size={16} color={color} /> : <item.Icon size={18} color={color} />}
                  </span>
                  <span className="text-ui-xs leading-tight font-bold text-[var(--fg)]">{t(item.key)}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </BottomSheet>
  );
}
