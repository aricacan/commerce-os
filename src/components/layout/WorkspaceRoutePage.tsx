'use client';

import { useRouter } from 'next/navigation';
import { ServerOff, ShieldOff } from 'lucide-react';
import { LazyWorkspacePanels } from './LazyWorkspacePanels';
import { useModuleAccess } from '../../hooks/useModuleAccess';
import { useModuleCatalog } from '../../hooks/useModuleCatalog';
import { moduleKeyOfWorkspace, TAB_GATED_WORKSPACES } from '../../lib/workspace-routes';
import { EmptyState } from '../ui/EmptyState';
import type { WorkspaceKey } from '../../stores/workspace-panel';

/**
 * Modül rotalarının (/adshub, /radar, …) ortak gövdesi.
 *
 * Modül bileşenleri tam-ekran overlay olarak tasarlandı ve `onClose` bekliyor; rota
 * bağlamında "kapat" = panelin altındaki sayfaya değil panoya dönmek demektir (arkada
 * bir sayfa yok).
 *
 * Erişim kontrolü BURADA da uygulanır: modüller eskiden yalnızca Topbar menüsünden
 * açılıyordu ve kontrol orada yapılıyordu; artık adres doğrudan yazılabildiği için aynı
 * kural rota tarafında da geçerli olmalı (bkz. useModuleAccess).
 */
export function WorkspaceRoutePage({ workspace }: { workspace: WorkspaceKey }) {
  const router = useRouter();
  const { isLoading, isWorkspaceAllowed } = useModuleAccess();
  const catalog = useModuleCatalog();

  // Yetki sorguları dönmeden karar verilmez — aksi hâlde her açılışta bir an "erişim yok"
  // ekranı yanıp sönerdi.
  if (isLoading || catalog.isLoading) return null;

  // Hub'lar erişimi sekme bazında kendi süzer (katalog sekmesi sayfa yetkisiyle açık olabilir).
  if (TAB_GATED_WORKSPACES.has(workspace)) {
    return <LazyWorkspacePanels activeWorkspace={workspace} onClose={() => router.push('/dashboard')} />;
  }

  // Sunucuda hiç yüklenmemiş modül: yetki meselesi değil, "yöneticinizle görüşün" demek
  // yanlış yönlendirirdi. Ekran API'ye hiç istek atmaz (ham 404 metni de görünmez).
  if (!catalog.isAvailableOnServer(moduleKeyOfWorkspace(workspace))) {
    return (
      <div className="flex h-full w-full items-center justify-center p-8">
        <EmptyState
          icon={ServerOff}
          title="Bu modül bu sunucuda kapalı"
          description="Modül bu kurulumda yüklenmemiş (sunucu ortam anahtarı). Ayarlar'dan açılamaz; sunucu yapılandırması değişip yeniden yayına alınması gerekir."
          action={{ label: 'Panoya dön', onClick: () => router.push('/dashboard') }}
        />
      </div>
    );
  }

  if (!isWorkspaceAllowed(workspace)) {
    return (
      <div className="flex h-full w-full items-center justify-center p-8">
        <EmptyState
          icon={ShieldOff}
          title="Bu modüle erişiminiz yok"
          description="Modül kapalı olabilir ya da hesabınıza yetki tanımlanmamış olabilir. Sistem yöneticinizle görüşün."
          action={{ label: 'Panoya dön', onClick: () => router.push('/dashboard') }}
        />
      </div>
    );
  }

  return <LazyWorkspacePanels activeWorkspace={workspace} onClose={() => router.push('/dashboard')} />;
}
