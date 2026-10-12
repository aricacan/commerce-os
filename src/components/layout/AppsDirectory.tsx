'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Grid3x3, Lock, X } from 'lucide-react';
import { useAppsLauncher } from '../../stores/apps-launcher';
import { useModuleCatalog } from '../../hooks/useModuleCatalog';
import { useAppCatalog, type AppEntry, type AppTone } from '../../hooks/useAppCatalog';
import { useI18n } from '../../lib/i18n';
import { workspaceRoute } from '../../lib/workspace-routes';

// Pano'daki "Uygulamalar" KPI kartının açtığı BÜYÜK keşif paneli.
//
// Topbar'ın dar açılır menüsü hızlı geçiş içindir — ne işe yaradığını bilmediğiniz
// bir modülü orada keşfedemezsiniz. Bu panel aynı katalogtan (useAppCatalog)
// beslenir, ama her uygulamaya okunabilir bir açıklama ve nefes alacak yer verir.

const SECTIONS: { tone: AppTone; titleTr: string; titleEn: string }[] = [
  { tone: 'module', titleTr: 'Modüller', titleEn: 'Modules' },
  { tone: 'admin', titleTr: 'Yönetici Araçları', titleEn: 'Admin Tools' },
];

export function AppsDirectory() {
  const { lang } = useI18n();
  const isTr = lang === 'tr';
  const router = useRouter();
  const apps = useAppCatalog();
  // Katalog artık backend'den geliyor (bkz. useModuleCatalog). Yükleme sırasında liste boş
  // olduğu için panel BOMBOŞ açılıyordu — eski elle yazılmış liste anında geliyordu ve o
  // an yoktu. Boş panel "hiç modül yok" gibi okunur, bekleme durumu ayrıca söylenmeli.
  const { isLoading: catalogLoading } = useModuleCatalog();
  const isOpen = useAppsLauncher((s) => s.directoryOpen);
  const close = useAppsLauncher((s) => s.closeDirectory);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, close]);

  if (!isOpen) return null;

  function openApp(app: AppEntry) {
    if (!app.allowed) return;
    close();
    router.push(workspaceRoute(app.workspaceKey));
  }

  return (
    <div
      className="fixed inset-0 z-[20500] flex items-start justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-xs sm:p-8"
      onClick={close}
      role="presentation"
    >
      <div
        className="flex w-full max-w-5xl flex-col gap-5 rounded-xl border border-zinc-200 bg-white p-5 shadow-2xl sm:p-7 dark:border-zinc-800 dark:bg-[#18191e]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={isTr ? 'Uygulamalar' : 'Apps'}
      >
        <header className="flex items-start gap-3 border-b border-zinc-200 pb-4 dark:border-zinc-800">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
            <Grid3x3 size={17} />
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
              {isTr ? 'Uygulamalar' : 'Apps'}
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {isTr
                ? 'Panonun dışındaki tüm modüller — ne işe yaradıklarını okuyup doğrudan açabilirsiniz.'
                : 'Every module beyond the dashboard — read what each one does and open it directly.'}
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label={isTr ? 'Kapat' : 'Close'}
            className="ml-auto flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 dark:border-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            <X size={15} />
          </button>
        </header>

        {catalogLoading && (
          <p className="py-8 text-center text-xs text-zinc-500 dark:text-zinc-400">
            {isTr ? 'Modüller yükleniyor…' : 'Loading modules…'}
          </p>
        )}

        {!catalogLoading && apps.length === 0 && (
          <p className="py-8 text-center text-xs text-zinc-500 dark:text-zinc-400">
            {isTr
              ? 'Görüntüleyebileceğiniz modül yok. Ayarlar → Modüller bölümünden kapatılmış olabilirler.'
              : 'No modules available. They may be disabled under Settings → Modules.'}
          </p>
        )}

        {SECTIONS.map(({ tone, titleTr, titleEn }) => {
          const group = apps.filter((a) => a.tone === tone);
          if (group.length === 0) return null;

          return (
            <section key={tone} className="flex flex-col gap-2.5">
              <h3 className="text-ui-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                {isTr ? titleTr : titleEn}
              </h3>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {group.map((app) => (
                  <AppCard key={app.key} app={app} isTr={isTr} onOpen={openApp} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function AppCard({
  app, isTr, onOpen,
}: {
  app: AppEntry;
  isTr: boolean;
  onOpen: (app: AppEntry) => void;
}) {
  const { Icon, iconBg, iconColor, allowed } = app;

  return (
    <button
      type="button"
      onClick={() => onOpen(app)}
      disabled={!allowed}
      title={allowed ? undefined : isTr ? 'Bu modüle erişiminiz yok' : 'You do not have access to this module'}
      className="group flex cursor-pointer items-start gap-3 rounded-lg border border-zinc-200 bg-white p-3.5 text-left transition-colors hover:border-zinc-400 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-zinc-200 disabled:hover:bg-white dark:border-zinc-800 dark:bg-[#1c1d23] dark:hover:border-zinc-600 dark:hover:bg-zinc-800/50 dark:disabled:hover:border-zinc-800 dark:disabled:hover:bg-[#1c1d23]"
    >
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
        style={{ background: iconBg, color: iconColor }}
      >
        <Icon size={17} />
      </span>
      <span className="flex min-w-0 flex-col gap-1">
        <span className="flex items-center gap-1.5 text-ui-md font-bold text-zinc-900 dark:text-zinc-50">
          {app.name}
          {!allowed && <Lock size={11} className="text-zinc-400" />}
        </span>
        <span className="text-ui-xs leading-snug text-zinc-500 dark:text-zinc-400">
          {app.description}
        </span>
      </span>
    </button>
  );
}
